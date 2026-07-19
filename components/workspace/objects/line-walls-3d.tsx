import React from 'react'
import { ClosedShape, EditorRoom, FloorMaterial, FloorPlanState, LineNode, WallMaterial } from '../Tools/constants';
import { deriveClosedPolygons } from '@/lib/helpers';
import * as THREE from 'three'
import { FloorMat } from './floormat';
import { WallMat } from './wallmat';
import { DoorVariant3D } from './door-variants';
import { WindowVariant3D } from './window-variant3d';
import { WallDecorMesh } from '../mesh/wall-decor-mesh';


function LineWalls3DImpl({
    fp, wallRoughness = 0.85, floorMaterial = 'wood', doorStyle = 'natural', closedShapes, wallColor = '#FFFFFF',
    wallMaterial = 'paint',
    interactive = false, selectedId, onSelect, onToggleDoorOpen,
}: {
    fp: FloorPlanState; wallRoughness?: number; floorMaterial?: string; doorStyle?: string; closedShapes?: ClosedShape[]; wallColor?: string;
    wallMaterial?: WallMaterial;
    interactive?: boolean; selectedId?: string | null; onSelect?: (id: string) => void
    onToggleDoorOpen?: (openingId: string) => void
}) {
    const H = fp.roomHeight
    const T = 0.15
    const [hovered, setHovered] = React.useState(false)

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
                if (polygonOverlapsRoom(minX, maxX, minZ, maxZ, fp.rooms)) return null

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
                const isFloorSelected = interactive && !!floorRoomId && selectedId === floorRoomId

                return (
                    <DerivedFloorShape
                        key={`floor_derived_${idx}`}
                        nodeIds={nodeIds}
                        nodes={nodes}
                        minX={minX}
                        minZ={minZ}
                        worldW={worldW}
                        worldD={worldD}
                        shapeMat={shapeMat as FloorMaterial}
                        interactive={interactive}
                        roomId={floorRoomId}
                        selected={isFloorSelected}
                        onSelect={onSelect}
                    />
                )
            })}
            {(fp.lineNodes ?? []).map(node => {
                const owningSeg = (fp.lineSegments ?? []).find(seg => seg.nodeIds.includes(node.id))
                const nodeMat = owningSeg ? (segWallMaterial.get(owningSeg.id) ?? wallMaterial) : wallMaterial

                return (
                    <mesh key={node.id} position={[node.x, H / 2, node.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[T / 2, T / 2, H, 8]} />
                        <WallMat mat={nodeMat} color={wallColor} roughness={wallRoughness} width={T} height={H} depth={T} />
                    </mesh>
                )
            })}

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

// Memoized export — LineWalls3D rebuilds every wall panel, opening cutout,
// and floor shape geometry on every render. None of that needs to re-run
// just because the 2D editor's hover/pan/tooltip state changed elsewhere in
// FloorPlanEditor — same fix as FurnitureMesh/StairsMesh.
export const LineWalls3D = React.memo(LineWalls3DImpl)

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
                // NOTE: Room3D's room floor mesh also renders at y≈0.002.
                // If a line-wall closed polygon (rendered here) spatially
                // overlaps a fp.rooms room's own footprint — which happens
                // whenever line-walls are drawn adjacent to or inside an
                // existing room — the two floor meshes end up coplanar,
                // and the GPU can't reliably decide which to draw on top:
                // z-fighting, which shows up as flickering/overlapping
                // texture exactly like what's being reported. Bumping this
                // one slightly higher than Room3D's floor removes the
                // ambiguity regardless of whether the shapes actually
                // overlap. This is a mitigation, not a fix for the root
                // cause (two floor systems rendering the same area) — see
                // the accompanying note about deduping overlapping regions.
                position={[0, 0.006, 0]}
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
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} renderOrder={999}>
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


function DerivedFloorShape({
    nodeIds, nodes, minX, minZ, worldW, worldD,
    shapeMat, interactive, roomId, selected, onSelect,
}: {
    nodeIds: string[]
    nodes: LineNode[]
    minX: number; minZ: number; worldW: number; worldD: number
    shapeMat: FloorMaterial
    interactive: boolean
    roomId: string | null
    selected: boolean
    onSelect?: (id: string) => void
}) {
    const geometry = React.useMemo(() => {
        const shape = new THREE.Shape()
        shape.moveTo(nodes[0]!.x, -nodes[0]!.z)
        for (let i = 1; i < nodes.length; i++) {
            shape.lineTo(nodes[i]!.x, -nodes[i]!.z)
        }
        shape.closePath()

        const geo = new THREE.ShapeGeometry(shape)

        const posAttr = geo.attributes.position
        const uvArr = new Float32Array(posAttr.count * 2)
        for (let i = 0; i < posAttr.count; i++) {
            const px = posAttr.getX(i)
            const py = posAttr.getY(i)
            uvArr[i * 2] = (px - minX) / (worldW || 1)
            uvArr[i * 2 + 1] = (-py - minZ) / (worldD || 1)
        }
        geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))

        return geo
    }, [nodeIds.join(','), ...nodes.flatMap(n => [n.x, n.z]), minX, minZ, worldW, worldD])

    return (
        <FloorPiece
            geometry={geometry}
            shapeMat={shapeMat}
            worldW={worldW}
            worldD={worldD}
            interactive={interactive}
            roomId={roomId}
            selected={selected}
            onSelect={onSelect}
        />
    )
}


function polygonOverlapsRoom(
    minX: number, maxX: number, minZ: number, maxZ: number,
    rooms: EditorRoom[], tolerance = 0.2,
) {
    return rooms.some(room =>
        minX >= room.x - tolerance && maxX <= room.x + room.width + tolerance &&
        minZ >= room.z - tolerance && maxZ <= room.z + room.depth + tolerance
    )
}