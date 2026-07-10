import React from 'react'
import { ClosedShape, FloorMaterial, FloorPlanState, LineNode, WallMaterial } from '../Tools/constants';
import { deriveClosedPolygons } from '@/lib/helpers';
import * as THREE from 'three'
import { FloorMat } from './floormat';
import { WallMat } from './wallmat';
import { DoorVariant3D } from './door-variants';
import { WindowVariant3D } from './window-variant3d';
import { WallDecorMesh } from './wall-decor-mesh';


export function LineWalls3D({
    fp, wallRoughness = 0.85, floorMaterial = 'wood', doorStyle = 'natural', closedShapes, wallColor = '#FFFFFF',
    wallMaterial = 'paint',
    interactive = false, selectedId, onSelect,
}: {
    fp: FloorPlanState; wallRoughness?: number; floorMaterial?: string; doorStyle?: string; closedShapes?: ClosedShape[]; wallColor?: string;
    wallMaterial?: WallMaterial;
    interactive?: boolean; selectedId?: string | null; onSelect?: (id: string) => void
}) {
    const H = fp.roomHeight
    const T = 0.15
    const [hovered, setHovered] = React.useState(false)

    // Per-room click/hover handlers. Room id === seg.id for line-wall loops.
    const makeRoomHandlers = (roomId: string, hovered: boolean, setHovered: (v: boolean) => void) => ({
        onClick: (e: any) => {
            if (!interactive) return
            e.stopPropagation()
            onSelect?.(roomId)
        },
        onPointerOver: (e: any) => {
            if (!interactive) return
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
        },
        onPointerOut: (e: any) => {
            if (!interactive) return
            e.stopPropagation()
            setHovered(false)
            document.body.style.cursor = 'auto'
        },
    })

    // Precompute per-segment wall material: a segment "belongs" to a closed shape if
    // that shape's node-loop matches the segment's own node chain (same pattern the
    // floor loop below already uses via matchedShape/matchedSeg). This lets a shape's
    // wallMaterial override (set in MaterialsPanel's "Area Overrides") apply to the
    // walls that trace it, instead of only ever using the flat global wallMaterial prop.
    const segWallMaterial = new Map<string, WallMaterial>()
    for (const seg of fp.lineSegments ?? []) {
        const nodeIdSet = new Set(seg.nodeIds)
        const matchedShape = (closedShapes ?? fp.closedShapes ?? []).find(s =>
            s.nodeIds.length === seg.nodeIds.length &&
            s.nodeIds.every(id => nodeIdSet.has(id))
        )
        segWallMaterial.set(seg.id, matchedShape?.wallMaterial ?? wallMaterial)
    }

    return (
        <>
            {(fp.lineSegments ?? []).map(seg => {
                const nodes = seg.nodeIds
                    .map(nid => fp.lineNodes.find(n => n.id === nid))
                    .filter(Boolean) as LineNode[]
                if (nodes.length < 2) return null

                const isRoomSelected = interactive && selectedId === seg.id
                const panels: React.ReactNode[] = []
                const segMat = segWallMaterial.get(seg.id) ?? wallMaterial

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

                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    const handlers = interactive ? makeRoomHandlers(seg.id, hovered, setHovered) : {}
                    const showOutline = interactive && (isRoomSelected || hovered)

                    if (segOpenings.length === 0) {
                        panels.push(
                            <group key={`${seg.id}_${i}`}>
                                <mesh
                                    position={[mcx, H / 2, mcz]}
                                    rotation={[0, -angle, 0]}
                                    castShadow
                                    receiveShadow
                                    {...handlers}
                                >
                                    <boxGeometry args={[len, H, T]} />
                                    <WallMat mat={segMat} color={wallColor} roughness={wallRoughness} width={len} height={H} depth={T} />
                                </mesh>
                                {showOutline && (
                                    <mesh position={[mcx, H / 2, mcz]} rotation={[0, -angle, 0]} renderOrder={999}>
                                        <boxGeometry args={[len * 1.01, H * 1.01, T * 1.4]} />
                                        <meshBasicMaterial
                                            color={isRoomSelected ? '#3B82F6' : '#93C5FD'}
                                            wireframe
                                            transparent
                                            opacity={isRoomSelected ? 0.9 : 0.5}
                                            depthTest={false}
                                        />
                                    </mesh>
                                )}
                            </group>
                        )
                    } else {
                        const sorted = [...segOpenings].sort((a, b) => (a.segmentT ?? 0) - (b.segmentT ?? 0))
                        let cursor = 0

                        for (let si = 0; si <= sorted.length; si++) {
                            const op = sorted[si]
                            const opPos = op ? (op.segmentT ?? 0) * len : len
                            const segEnd = op ? opPos - op.width / 2 : len
                            const segLen = segEnd - cursor

                            if (segLen > 0.02) {
                                const segMid = cursor + segLen / 2
                                const wx = a.x + (dx / len) * segMid
                                const wz = a.z + (dz / len) * segMid
                                panels.push(
                                    <group key={`${seg.id}_${i}_l${si}`}>
                                        <mesh
                                            position={[wx, H / 2, wz]}
                                            rotation={[0, -angle, 0]}
                                            castShadow
                                            receiveShadow
                                            {...handlers}
                                        >
                                            <boxGeometry args={[segLen, H, T]} />
                                            <WallMat mat={segMat} color={wallColor} roughness={wallRoughness} width={segLen} height={H} depth={T} />
                                        </mesh>
                                        {showOutline && (
                                            <mesh position={[wx, H / 2, wz]} rotation={[0, -angle, 0]} renderOrder={999}>
                                                <boxGeometry args={[segLen * 1.01, H * 1.01, T * 1.4]} />
                                                <meshBasicMaterial
                                                    color={isRoomSelected ? '#3B82F6' : '#93C5FD'}
                                                    wireframe
                                                    transparent
                                                    opacity={isRoomSelected ? 0.9 : 0.5}
                                                    depthTest={false}
                                                />
                                            </mesh>
                                        )}
                                    </group>
                                )
                            }

                            if (op) {
                                const opPos2 = (op.segmentT ?? 0) * len

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
                                            {...handlers}
                                        >
                                            <boxGeometry args={[op.width, headerH, T]} />
                                            <WallMat mat={segMat} color={wallColor} roughness={wallRoughness} width={op.width} height={headerH} depth={T} />
                                        </mesh>
                                    )
                                }

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
                                            {...handlers}
                                        >
                                            <boxGeometry args={[op.width, op.sillHeight, T]} />
                                            <WallMat mat={segMat} color={wallColor} roughness={wallRoughness} width={op.width} height={op.sillHeight} depth={T} />
                                        </mesh>
                                    )
                                }

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

                const matchedSeg = (fp.lineSegments ?? []).find(s =>
                    s.nodeIds.length === nodeIds.length &&
                    s.nodeIds.every(id => nodeIdSet.has(id))
                )
                const floorRoomId = matchedSeg?.id ?? matchedShape?.id ?? null

                const shape = new THREE.Shape()
                shape.moveTo(nodes[0]!.x, -nodes[0]!.z)
                for (let i = 1; i < nodes.length; i++) {
                    shape.lineTo(nodes[i]!.x, -nodes[i]!.z)
                }
                shape.closePath()

                const geometry = new THREE.ShapeGeometry(shape)
                const isFloorSelected = interactive && !!floorRoomId && selectedId === floorRoomId

                return (
                    <FloorPiece
                        key={`floor_derived_${idx}`}
                        geometry={geometry}
                        shapeMat={shapeMat as FloorMaterial}
                        worldW={worldW}
                        worldD={worldD}
                        interactive={interactive}
                        roomId={floorRoomId}
                        selected={isFloorSelected}
                        onSelect={onSelect}
                    />
                )
            })}
            {(fp.lineNodes ?? []).map(node => (
                <mesh key={node.id} position={[node.x, H / 2, node.z]}>
                    <cylinderGeometry args={[T / 2, T / 2, H, 8]} />
                    <meshStandardMaterial color={wallColor} roughness={wallRoughness} />
                </mesh>
            ))}

            {/* Wall decor on line-wall segments — click passes through to parent room */}
            {(fp.wallDecor ?? []).filter(d => d.segmentNodeIds).map(d => {
                const a = fp.lineNodes.find(n => n.id === d.segmentNodeIds![0])
                const b = fp.lineNodes.find(n => n.id === d.segmentNodeIds![1])
                if (!a || !b) return null
                const t = d.segmentT ?? 0
                const angle = Math.atan2(b.z - a.z, b.x - a.x)
                const dx = a.x + (b.x - a.x) * t
                const dz = a.z + (b.z - a.z) * t
                return (
                    <group
                        key={d.id}
                        onClick={(e: any) => {
                            if (!interactive) return
                            e.stopPropagation()
                            onSelect?.(d.id)
                        }}
                    >
                        <WallDecorMesh
                            decor={d}
                            angle={angle}
                            basePos={[dx, d.heightOffset, dz]}
                        />
                    </group>
                )
            })}
        </>
    )
}

// Separate component so the floor mesh can carry its own hover state cleanly.
function FloorPiece({
    geometry, shapeMat, worldW, worldD, interactive, roomId, selected, onSelect,
}: {
    geometry: THREE.ShapeGeometry
    shapeMat: FloorMaterial
    worldW: number
    worldD: number
    interactive: boolean
    roomId: string | null
    selected: boolean
    onSelect?: (id: string) => void
}) {
    const [hovered, setHovered] = React.useState(false)
    const clickable = interactive && !!roomId

    return (
        <group>
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.002, 0]}
                receiveShadow
                onClick={(e: any) => {
                    if (!clickable) return
                    e.stopPropagation()
                    onSelect?.(roomId!)
                }}
                onPointerOver={(e: any) => {
                    if (!clickable) return
                    e.stopPropagation()
                    setHovered(true)
                    document.body.style.cursor = 'pointer'
                }}
                onPointerOut={(e: any) => {
                    if (!clickable) return
                    e.stopPropagation()
                    setHovered(false)
                    document.body.style.cursor = 'auto'
                }}
            >
                <primitive object={geometry} attach="geometry" />
                <FloorMat mat={shapeMat} width={worldW} depth={worldD} />
            </mesh>
            {clickable && (selected || hovered) && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} renderOrder={999}>
                    <primitive object={geometry} attach="geometry" />
                    <meshBasicMaterial
                        color={selected ? '#3B82F6' : '#93C5FD'}
                        wireframe
                        transparent
                        opacity={selected ? 0.7 : 0.4}
                        depthTest={false}
                    />
                </mesh>
            )}
        </group>
    )
}