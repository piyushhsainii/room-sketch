import React from 'react'
import { ClosedShape, FloorMaterial, FloorPlanState, LineNode } from '../Tools/constants';
import { deriveClosedPolygons } from '@/lib/helpers';
import * as THREE from 'three'
import { DoorMat } from './doormat';
import { FloorMat } from './floormat';
import { WallMat } from './wallmat';
import { DoorVariant3D } from './door-variants';
import { WindowVariant3D } from './window-variant3d';
import { WallDecorMesh } from './wall-decor-mesh';


export function LineWalls3D({ fp, wallRoughness = 0.85, floorMaterial = 'wood', doorStyle = 'natural', closedShapes, wallColor = '#FFFFFF' }: {
    fp: FloorPlanState; wallRoughness?: number; floorMaterial?: string; doorStyle?: string; closedShapes?: ClosedShape[]; wallColor?: string
}) {
    const H = fp.roomHeight
    const T = 0.15

    return (
        <>
            {(fp.lineSegments ?? []).map(seg => {
                const nodes = seg.nodeIds
                    .map(nid => fp.lineNodes.find(n => n.id === nid))
                    .filter(Boolean) as LineNode[]
                if (nodes.length < 2) return null

                const panels: React.ReactNode[] = []

                for (let i = 0; i < nodes.length - 1; i++) {
                    const a = nodes[i]!, b = nodes[i + 1]!
                    const dx = b.x - a.x, dz = b.z - a.z
                    const len = Math.hypot(dx, dz)
                    if (len < 0.05) continue

                    const mcx = (a.x + b.x) / 2
                    const mcz = (a.z + b.z) / 2
                    const angle = Math.atan2(dz, dx)

                    const segOpenings = fp.openings.filter(op =>
                        op.roomId === seg.id &&
                        op.segmentNodeIds?.[0] === a.id &&
                        op.segmentNodeIds?.[1] === b.id
                    )

                    if (segOpenings.length === 0) {
                        // No openings — single solid wall panel
                        panels.push(
                            <mesh
                                key={`${seg.id}_${i}`}
                                position={[mcx, H / 2, mcz]}
                                rotation={[0, -angle, 0]}
                                castShadow
                                receiveShadow
                            >
                                <boxGeometry args={[len, H, T]} />
                                <WallMat color={wallColor} roughness={wallRoughness} />
                            </mesh>
                        )
                    } else {
                        const sorted = [...segOpenings].sort((a, b) => (a.segmentT ?? 0) - (b.segmentT ?? 0))
                        let cursor = 0

                        for (let si = 0; si <= sorted.length; si++) {
                            const op = sorted[si]
                            const opPos = op ? (op.segmentT ?? 0) * len : len
                            const segEnd = op ? opPos - op.width / 2 : len
                            const segLen = segEnd - cursor

                            // Wall segment between openings
                            if (segLen > 0.02) {
                                const segMid = cursor + segLen / 2
                                const wx = a.x + (dx / len) * segMid
                                const wz = a.z + (dz / len) * segMid
                                panels.push(
                                    <mesh
                                        key={`${seg.id}_${i}_l${si}`}
                                        position={[wx, H / 2, wz]}
                                        rotation={[0, -angle, 0]}
                                        castShadow
                                        receiveShadow
                                    >
                                        <boxGeometry args={[segLen, H, T]} />
                                        <WallMat color={wallColor} roughness={wallRoughness} />
                                    </mesh>
                                )
                            }

                            if (op) {
                                const opPos2 = (op.segmentT ?? 0) * len

                                // Header above opening
                                const headerH = H - op.height
                                if (headerH > 0.02) {
                                    const hx = a.x + (dx / len) * opPos2
                                    const hz = a.z + (dz / len) * opPos2
                                    panels.push(
                                        <mesh
                                            key={`${seg.id}_${i}_h${si}`}
                                            position={[hx, op.height + headerH / 2, hz]}
                                            rotation={[0, -angle, 0]}
                                            castShadow
                                            receiveShadow
                                        >
                                            <boxGeometry args={[op.width, headerH, T]} />
                                            <WallMat color={wallColor} roughness={wallRoughness} />
                                        </mesh>
                                    )
                                }

                                // Window sill
                                if (op.type === 'window' && op.sillHeight > 0.02) {
                                    const sx = a.x + (dx / len) * opPos2
                                    const sz = a.z + (dz / len) * opPos2
                                    panels.push(
                                        <mesh
                                            key={`${seg.id}_${i}_s${si}`}
                                            position={[sx, op.sillHeight / 2, sz]}
                                            rotation={[0, -angle, 0]}
                                            castShadow
                                            receiveShadow
                                        >
                                            <boxGeometry args={[op.width, op.sillHeight, T]} />
                                            <WallMat color={wallColor} roughness={wallRoughness} />
                                        </mesh>
                                    )
                                }

                                // Window glass pane
                                if (op.type === 'window') {
                                    const gx = a.x + (dx / len) * opPos2
                                    const gz = a.z + (dz / len) * opPos2
                                    panels.push(
                                        <WindowVariant3D
                                            key={`${seg.id}_${i}_g${si}`}
                                            op={op}
                                            angle={angle}
                                            basePos={[gx, op.sillHeight + op.height / 2, gz]}
                                        />
                                    )
                                }

                                // Door leaf — hinge at one edge, slightly ajar (30°)
                                if (op.type === 'door') {
                                    const doorX = a.x + (dx / len) * opPos2
                                    const doorZ = a.z + (dz / len) * opPos2
                                    panels.push(
                                        <DoorVariant3D
                                            key={`${seg.id}_${i}_door${si}`}
                                            op={op}
                                            angle={angle}
                                            basePos={[doorX, op.height / 2, doorZ]}
                                            doorStyle={doorStyle}
                                        />
                                    )
                                }

                                cursor = opPos + op.width / 2
                            }
                        }
                    }
                }

                return <group key={seg.id}>{panels}</group>
            })}

            {/* Floors — exact polygon ShapeGeometry per closed shape */}
            {deriveClosedPolygons(fp.lineNodes, fp.lineSegments).map((nodeIds, idx) => {
                const nodes = nodeIds
                    .map(nid => fp.lineNodes.find(n => n.id === nid))
                    .filter(Boolean) as LineNode[]
                if (nodes.length < 3) return null

                let area2 = 0
                for (let i = 0; i < nodes.length; i++) {
                    const p1 = nodes[i]!, p2 = nodes[(i + 1) % nodes.length]!
                    area2 += p1.x * p2.z - p2.x * p1.z
                }
                if (Math.abs(area2) / 2 < 0.05) return null

                const xs = nodes.map(n => n.x), zs = nodes.map(n => n.z)
                const minX = Math.min(...xs), maxX = Math.max(...xs)
                const minZ = Math.min(...zs), maxZ = Math.max(...zs)
                const worldW = maxX - minX
                const worldD = maxZ - minZ
                const nodeIdSet = new Set(nodeIds)
                const matchedShape = (closedShapes ?? fp.closedShapes ?? []).find(s =>
                    s.nodeIds.length === nodeIds.length &&
                    s.nodeIds.every(id => nodeIdSet.has(id))
                )
                const shapeMat = matchedShape?.floorMaterial ?? floorMaterial

                const shape = new THREE.Shape()
                shape.moveTo(nodes[0]!.x, -nodes[0]!.z)
                for (let i = 1; i < nodes.length; i++) {
                    shape.lineTo(nodes[i]!.x, -nodes[i]!.z)
                }
                shape.closePath()

                const geometry = new THREE.ShapeGeometry(shape)

                return (
                    <mesh
                        key={`floor_derived_${idx}`}
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, 0.002, 0]}
                        receiveShadow
                    >
                        <primitive object={geometry} attach="geometry" />
                        <FloorMat
                            mat={shapeMat as FloorMaterial}
                            width={worldW}
                            depth={worldD}
                        />
                    </mesh>
                )
            })}
            {(fp.lineNodes ?? []).map(node => (
                <mesh key={node.id} position={[node.x, H / 2, node.z]}>
                    <cylinderGeometry args={[T / 2, T / 2, H, 8]} />
                    <meshStandardMaterial color={wallColor} roughness={wallRoughness} />
                </mesh>
            ))}

            {/* Wall decor on line-wall segments */}
            {(fp.wallDecor ?? []).filter(d => d.segmentNodeIds).map(d => {
                const a = fp.lineNodes.find(n => n.id === d.segmentNodeIds![0])
                const b = fp.lineNodes.find(n => n.id === d.segmentNodeIds![1])
                if (!a || !b) return null
                const t = d.segmentT ?? 0
                const angle = Math.atan2(b.z - a.z, b.x - a.x)
                const dx = a.x + (b.x - a.x) * t
                const dz = a.z + (b.z - a.z) * t
                return (
                    <WallDecorMesh
                        key={d.id}
                        decor={d}
                        angle={angle}
                        basePos={[dx, d.heightOffset, dz]}
                    />
                )
            })}
        </>
    )
}