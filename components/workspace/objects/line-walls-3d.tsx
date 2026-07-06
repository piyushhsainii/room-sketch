import React from 'react'
import { ClosedShape, FloorPlanState, LineNode } from '../Tools/constants';
import { deriveClosedPolygons } from '@/lib/helpers';
import * as THREE from 'three'
import { DoorMat } from './doormat';
import { FloorMat } from './floormat';
import { WallMat } from './wallmat';


export function LineWalls3D({ fp, wallRoughness = 0.85, floorMaterial = 'wood', doorStyle = 'natural', closedShapes }: {
    fp: FloorPlanState; wallRoughness?: number; floorMaterial?: string; doorStyle?: string; closedShapes?: ClosedShape[]
}) {
    const wallColor = '#8B7B6B'
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
                                        <mesh
                                            key={`${seg.id}_${i}_g${si}`}
                                            position={[gx, op.sillHeight + op.height / 2, gz]}
                                            rotation={[0, -angle, 0]}
                                        >
                                            <boxGeometry args={[op.width, op.height, 0.025]} />
                                            <meshStandardMaterial
                                                color="#93C5FD"
                                                transparent
                                                opacity={0.35}
                                                roughness={0.05}
                                                metalness={0.15}
                                                side={THREE.DoubleSide}
                                            />
                                        </mesh>
                                    )
                                }

                                // Door leaf — hinge at one edge, slightly ajar (30°)
                                if (op.type === 'door') {
                                    const openAngle = Math.PI / 6 // 30° open
                                    const dirX = dx / len, dirZ = dz / len
                                    const perpX = -dirZ, perpZ = dirX
                                    // Hinge at the left edge of the opening
                                    const hingeX = a.x + dirX * (opPos2 - op.width / 2)
                                    const hingeZ = a.z + dirZ * (opPos2 - op.width / 2)
                                    // Door leaf center offset from hinge along the open direction
                                    const leafCx = hingeX + (Math.cos(openAngle) * dirX + Math.sin(openAngle) * perpX) * (op.width / 2)
                                    const leafCz = hingeZ + (Math.cos(openAngle) * dirZ + Math.sin(openAngle) * perpZ) * (op.width / 2)
                                    panels.push(
                                        <mesh
                                            key={`${seg.id}_${i}_door${si}`}
                                            position={[leafCx, op.height / 2, leafCz]}
                                            rotation={[0, -angle + openAngle, 0]}
                                            castShadow
                                        >
                                            <boxGeometry args={[op.width, op.height, 0.04]} />
                                            <DoorMat style={doorStyle} />
                                        </mesh>
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

                // Compute bounding box for aspect-correct textures
                const xs = nodes.map(n => n.x), zs = nodes.map(n => n.z)
                const minX = Math.min(...xs), maxX = Math.max(...xs)
                const minZ = Math.min(...zs), maxZ = Math.max(...zs)
                const worldW = maxX - minX
                const worldD = maxZ - minZ

                // Look up per-shape floor material
                const nodeIdSet = new Set(nodeIds)
                const matchedShape = (closedShapes ?? fp.closedShapes ?? []).find(s =>
                    s.nodeIds.length === nodeIds.length &&
                    s.nodeIds.every(id => nodeIdSet.has(id))
                )
                const shapeMat = matchedShape?.floorMaterial ?? floorMaterial

                // THREE.Shape is in XY plane.
                // After rotation [-PI/2, 0, 0]: shape X → world X, shape Y → world -Z
                // Pass (node.x, -node.z) so the floor aligns with the walls.
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
                        <FloorMat mat={shapeMat} worldWidth={worldW} worldDepth={worldD} />
                    </mesh>
                )
            })}

            {/* Column joints at nodes */}
            {(fp.lineNodes ?? []).map(node => (
                <mesh key={node.id} position={[node.x, H / 2, node.z]}>
                    <cylinderGeometry args={[T / 2, T / 2, H, 8]} />
                    <meshStandardMaterial color="#6B5B4E" roughness={0.8} />
                </mesh>
            ))}
        </>
    )
}