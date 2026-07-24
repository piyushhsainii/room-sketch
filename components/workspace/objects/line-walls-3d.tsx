import React from 'react'
import { ClosedShape, FloorMaterial, FloorPlanState, LineNode, WallMaterial } from '../lib/constants';
import { deriveClosedPolygons } from '@/lib/helpers';
import * as THREE from 'three'
import { FloorMat } from './floormat';
import { WallMat } from './wallmat';
import { DoorVariant3D } from './door-variants';
import { WindowVariant3D } from './window-variant3d';
import { WallDecorMesh } from '../mesh/wall-decor-mesh';
import { RoomSceneConfig } from '../FloorPlanEditor';
import { Railing3D } from './railing-3d';
import { matchClosedShape } from '../MaterialsPanel';
import { Text } from '@react-three/drei';
type WallSideOverride = {
    material?: WallMaterial | null
    color?: string
    exteriorMaterial?: WallMaterial | null
    exteriorColor?: string
} | undefined

function resolveWallSides(
    pieceOverride: WallSideOverride,
    baseMat: WallMaterial,
    baseColor: string,
    baseExteriorMat?: WallMaterial,
    baseExteriorColor?: string,
) {
    const interior = {
        mat: pieceOverride?.material ?? baseMat,
        color: pieceOverride?.color ?? baseColor,
    }
    const exterior = {
        // Precedence: this piece's own exterior override > the segment's
        // exterior default (set via the whole-segment picker in PropsPanel)
        // > this piece's resolved interior (old single-material behavior).
        // That last fallback is what keeps every wall that's never had an
        // exterior configured looking exactly as it did before this existed.
        mat: pieceOverride?.exteriorMaterial ?? baseExteriorMat ?? interior.mat,
        color: pieceOverride?.exteriorColor ?? baseExteriorColor ?? interior.color,
    }
    return { interior, exterior }
}

function segmentBelongsToShape(segNodeIds: string[], shapeNodeIds: string[]): boolean {
    for (let i = 0; i < shapeNodeIds.length; i++) {
        const a = shapeNodeIds[i]!
        const b = shapeNodeIds[(i + 1) % shapeNodeIds.length]!
        for (let j = 0; j < segNodeIds.length - 1; j++) {
            const sa = segNodeIds[j]!, sb = segNodeIds[j + 1]!
            if ((sa === a && sb === b) || (sa === b && sb === a)) return true
        }
    }
    return false
}
/* ------------------------------------------------------------------ */

export function insertNodeIntoShapesOnSplit(
    closedShapes: ClosedShape[] | undefined,
    fromId: string,
    toId: string,
    newNodeId: string,
): ClosedShape[] | undefined {
    if (!closedShapes || closedShapes.length === 0) return closedShapes
    return closedShapes.map((s) => {
        const ids = s.nodeIds
        for (let i = 0; i < ids.length; i++) {
            const a = ids[i]!
            const b = ids[(i + 1) % ids.length]!
            if ((a === fromId && b === toId) || (a === toId && b === fromId)) {
                const next = [...ids];
                // insert newNodeId right after position i (works for either direction)
                next.splice(i + 1, 0, newNodeId);
                return { ...s, nodeIds: next };
            }
        }
        return s;
    });
}

function LineWalls3DImpl({
    fp, wallRoughness = 0.85, floorMaterial = 'wood', doorStyle = 'natural', closedShapes, wallColor = '#FFFFFF',
    wallMaterial = 'paint',
    interactive = false, selectedId, onSelect, onToggleDoorOpen,
    roomSceneConfigs,
}: {
    fp: FloorPlanState; wallRoughness?: number; floorMaterial?: string; doorStyle?: string; closedShapes?: ClosedShape[]; wallColor?: string;
    wallMaterial?: WallMaterial;
    interactive?: boolean; selectedId?: string | null; onSelect?: (id: string) => void
    onToggleDoorOpen?: (openingId: string) => void
    roomSceneConfigs?: RoomSceneConfig[]

}) {
    const H = fp.roomHeight
    const T = 0.15
    const FACE_EPS = 0.003 // gap between the box's own face and the overlay plane, avoids z-fighting
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
    const segWallColor = new Map<string, string>()   // NEW — same treatment for color, same bug applied there too
    // Exterior-side defaults for the whole segment, sourced from the
    // whole-segment picker in PropsPanel (RoomSceneConfig.exteriorWallMaterial
    // / exteriorWallColor — new, optional fields; see the patch note below).
    // Left unset (undefined) when the segment has no exterior override, so
    // resolveWallSides falls all the way back to each piece's interior.
    const segExteriorWallMaterial = new Map<string, WallMaterial | undefined>()
    const segExteriorWallColor = new Map<string, string | undefined>()
    for (const seg of fp.lineSegments ?? []) {
        const nodeIdSet = new Set(seg.nodeIds)
        const matchedShape = (closedShapes ?? fp.closedShapes ?? []).find(s =>
            segmentBelongsToShape(seg.nodeIds, s.nodeIds)
        )
        // Precedence: this-exact-segment override (from the PropsPanel whole-
        // segment picker) > shape-level Area Override > global default.
        const segCfg = roomSceneConfigs?.find(r => r.roomId === seg.id) as (RoomSceneConfig & {
            exteriorWallMaterial?: WallMaterial
            exteriorWallColor?: string
        }) | undefined
        segWallMaterial.set(seg.id, segCfg?.wallMaterial ?? matchedShape?.wallMaterial ?? wallMaterial)
        segWallColor.set(seg.id, segCfg?.wallColor ?? wallColor)
        segExteriorWallMaterial.set(seg.id, segCfg?.exteriorWallMaterial)
        segExteriorWallColor.set(seg.id, segCfg?.exteriorWallColor)
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
                const matchedShape = (closedShapes ?? fp.closedShapes ?? []).find(s =>
                    segmentBelongsToShape(seg.nodeIds, s.nodeIds)
                )
                const wallType = seg.wallType ?? 'solid'

                for (let i = 0; i < nodes.length - 1; i++) {
                    const a = nodes[i]!, b = nodes[i + 1]!
                    const dx = b.x - a.x, dz = b.z - a.z
                    const len = Math.hypot(dx, dz)
                    if (len < 0.05) continue

                    const mcx = (a.x + b.x) / 2
                    const mcz = (a.z + b.z) / 2
                    const angle = Math.atan2(dz, dx)

                    // Openings are rejected at placement time on non-solid segments
                    // (see handleMouseDown), so this should normally be empty for
                    // railing/open segments — but if data ever arrives from an older
                    // save or an external edit, treat as solid-with-openings rather
                    // than silently dropping the openings.
                    const segOpenings = fp.openings.filter(op =>
                        op.roomId === seg.id &&
                        op.segmentNodeIds?.[0] === a.id &&
                        op.segmentNodeIds?.[1] === b.id
                    )

                    const pieceKey = `${seg.id}_${i}`
                    const pieceOverride = matchedShape?.wallOverrides?.[pieceKey] as WallSideOverride
                    const baseMat = segWallMaterial.get(seg.id) ?? wallMaterial
                    const baseColor = segWallColor.get(seg.id) ?? wallColor
                    const baseExteriorMat = segExteriorWallMaterial.get(seg.id)
                    const baseExteriorColor = segExteriorWallColor.get(seg.id)
                    const { interior, exterior } = resolveWallSides(pieceOverride, baseMat, baseColor, baseExteriorMat, baseExteriorColor)
                    const pieceId = `${seg.id}::piece::${i}`
                    const isPieceSelected = interactive && selectedId === pieceId

                    const handlers = interactive ? {
                        onClick: (e: any) => { e.stopPropagation(); onSelect?.(pieceId) },
                        onPointerOver: (e: any) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' },
                        onPointerOut: (e: any) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto' },
                    } : {}
                    const showOutline = interactive && (isPieceSelected || isRoomSelected || hovered)
                    const wallType = seg.wallType ?? 'solid'
                    const segT = seg.thickness ?? 0.15
                    const outlineMesh = (
                        <mesh position={[mcx, H / 2, mcz]} rotation={[0, -angle, 0]} renderOrder={999}>
                            {/* OLD: <boxGeometry args={[len * 1.01, H * 1.01, T * 1.4]} /> */}
                            <boxGeometry args={[len * 1.01, H * 1.01, segT * 1.4]} />
                            <meshBasicMaterial
                                color={isPieceSelected || isRoomSelected ? '#3B82F6' : '#93C5FD'}
                                wireframe
                                transparent
                                opacity={isPieceSelected || isRoomSelected ? 0.9 : 0.5}
                                depthTest={false}
                            />
                        </mesh>
                    )

                    if (segOpenings.length === 0) {
                        if (wallType === 'open') {
                            // True gap — no physical geometry. Keep an invisible clickable
                            // volume in interactive mode so the edge is still selectable
                            // (e.g. to switch it back to solid/railing later).
                            panels.push(
                                <group key={`${seg.id}_${i}`}>
                                    {interactive && (
                                        <mesh
                                            position={[mcx, H / 2, mcz]}
                                            rotation={[0, -angle, 0]}
                                            {...handlers}
                                            visible={false}
                                        >
                                            <boxGeometry args={[len, H, T]} />
                                            <meshBasicMaterial />
                                        </mesh>
                                    )}
                                    {showOutline && outlineMesh}
                                </group>
                            )
                        } else if (wallType === 'railing') {
                            panels.push(
                                <group key={`${seg.id}_${i}`} position={[mcx, 0, mcz]} rotation={[0, -angle, 0]}>
                                    <group {...handlers}>
                                        <Railing3D len={len} wallRoughness={wallRoughness} color={interior.color} />
                                    </group>
                                    {showOutline && (
                                        <mesh position={[0, H / 2, 0]} renderOrder={999}>
                                            <boxGeometry args={[len * 1.01, H * 1.01, T * 1.4]} />
                                            <meshBasicMaterial
                                                color={isPieceSelected || isRoomSelected ? '#3B82F6' : '#93C5FD'}
                                                wireframe
                                                transparent
                                                opacity={isPieceSelected || isRoomSelected ? 0.9 : 0.5}
                                                depthTest={false}
                                            />
                                        </mesh>
                                    )}
                                </group>
                            )
                        } else {
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
                                        <WallMat mat={interior.mat} color={interior.color} roughness={wallRoughness} width={len} height={H} depth={T} />
                                    </mesh>
                                    {/* Exterior overlay — sits just outside the box's -z face.
                                        Falls back to `interior` when no exterior override is
                                        set, so it's visually a no-op (just an extra draw call)
                                        until someone actually configures a different exterior
                                        texture for this piece. */}
                                    <group position={[mcx, H / 2, mcz]} rotation={[0, -angle, 0]}>
                                        <mesh position={[0, 0, -(T / 2 + FACE_EPS)]} rotation={[0, Math.PI, 0]}>
                                            <planeGeometry args={[len, H]} />
                                            <WallMat mat={exterior.mat} color={exterior.color} roughness={wallRoughness} width={len} height={H} depth={0.01} />
                                        </mesh>
                                    </group>
                                    {showOutline && outlineMesh}
                                </group>
                            )
                        }
                    } else {
                        // Solid-with-openings path — ...
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
                                            {/* OLD: <boxGeometry args={[segLen, H, T]} /> */}
                                            <boxGeometry args={[segLen, H, segT]} />
                                            {/* OLD: ... depth={T} /> */}
                                            <WallMat mat={interior.mat} color={interior.color} roughness={wallRoughness} width={segLen} height={H} depth={segT} />
                                        </mesh>
                                        <group position={[wx, H / 2, wz]} rotation={[0, -angle, 0]}>
                                            {/* OLD: <mesh position={[0, 0, -(T / 2 + FACE_EPS)]} rotation={[0, Math.PI, 0]}> */}
                                            <mesh position={[0, 0, -(segT / 2 + FACE_EPS)]} rotation={[0, Math.PI, 0]}>
                                                <planeGeometry args={[segLen, H]} />
                                                <WallMat mat={exterior.mat} color={exterior.color} roughness={wallRoughness} width={segLen} height={H} depth={0.01} />
                                            </mesh>
                                        </group>
                                        {showOutline && (
                                            <mesh position={[wx, H / 2, wz]} rotation={[0, -angle, 0]} renderOrder={999}>
                                                {/* OLD: <boxGeometry args={[segLen * 1.01, H * 1.01, T * 1.4]} /> */}
                                                <boxGeometry args={[segLen * 1.01, H * 1.01, segT * 1.4]} />
                                                <meshBasicMaterial
                                                    color={isPieceSelected || isRoomSelected ? '#3B82F6' : '#93C5FD'}
                                                    wireframe
                                                    transparent
                                                    opacity={isPieceSelected || isRoomSelected ? 0.9 : 0.5}
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
                                            {/* OLD: <boxGeometry args={[op.width, headerH, T]} /> */}
                                            <boxGeometry args={[op.width, headerH, segT]} />
                                            {/* OLD: ... depth={T} /> */}
                                            <WallMat mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={headerH} depth={segT} />
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
                                            <boxGeometry args={[op.width, op.sillHeight, segT]} />
                                            <WallMat mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={op.sillHeight} depth={segT} />
                                        </mesh>
                                    )
                                }

                                // window/door WindowVariant3D/DoorVariant3D calls unchanged — they don't use T

                                const ox = a.x + (dx / len) * opPos2
                                const oz = a.z + (dz / len) * opPos2

                                if (op.type === 'window') {
                                    const glazingCenterY = op.sillHeight + op.height / 2
                                    panels.push(
                                        <WindowVariant3D
                                            key={`${seg.id}_${i}_w${si}`}
                                            op={op}
                                            angle={angle}
                                            basePos={[ox, glazingCenterY, oz]}
                                        />
                                    )
                                } else if (op.type === 'door') {
                                    panels.push(
                                        <DoorVariant3D
                                            key={`${seg.id}_${i}_d${si}`}
                                            op={op}
                                            angle={angle}
                                            basePos={[ox, op.height / 2, oz]}
                                            doorStyle={doorStyle}
                                            interactive={interactive}
                                            onToggleOpen={onToggleDoorOpen}
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
                const matchedShape = matchClosedShape(nodeIds, fp.lineNodes, closedShapes ?? fp.closedShapes ?? [])
                const shapeMat = matchedShape?.floorMaterial ?? floorMaterial
                const centroidX = xs.reduce((s, x) => s + x, 0) / xs.length
                const centroidZ = zs.reduce((s, z) => s + z, 0) / zs.length
                const shapeLabel = matchedShape?.label || 'Area'
                const nodeIdSet = new Set(nodeIds)
                const matchedSeg = (fp.lineSegments ?? []).find(s =>
                    s.nodeIds.length === nodeIds.length &&
                    s.nodeIds.every(id => nodeIdSet.has(id))
                )
                const floorRoomId = matchedSeg?.id ?? matchedShape?.id ?? null
                const isFloorSelected = interactive && !!floorRoomId && selectedId === floorRoomId

                return (
                    <React.Fragment key={`floor_derived_${idx}`}>
                        <DerivedFloorShape
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
                        <Text
                            position={[centroidX, 0.05, centroidZ]}
                            rotation={[-Math.PI / 2, 0, 0]}
                            fontSize={0.35}
                            color="#6B5B4E"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#FFFFFF"
                        >
                            {shapeLabel}
                        </Text>
                    </React.Fragment>
                )
            })}
            {(fp.lineNodes ?? []).map(node => {
                const owningSeg = (fp.lineSegments ?? []).find(seg => seg.nodeIds.includes(node.id))
                const nodeMat = owningSeg ? (segWallMaterial.get(owningSeg.id) ?? wallMaterial) : wallMaterial
                const nodeT = owningSeg?.thickness ?? 0.15

                return (
                    <mesh key={node.id} position={[node.x, H / 2, node.z]} castShadow receiveShadow>
                        <cylinderGeometry args={[nodeT / 2, nodeT / 2, H, 8]} />
                        <WallMat mat={nodeMat} color={wallColor} roughness={wallRoughness} width={nodeT} height={H} depth={nodeT} />
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
    }, [
        nodeIds.join(','),
        nodes.map(n => `${n.x},${n.z}`).join('|'),   // one fixed-size string dep instead of a spread array
        minX, minZ, worldW, worldD,
    ])

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