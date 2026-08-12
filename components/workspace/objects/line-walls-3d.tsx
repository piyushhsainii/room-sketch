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
import { ArchHeader3D } from './arch-header';

type WallSideOverride = {
    material?: WallMaterial | null
    color?: string
    exteriorMaterial?: WallMaterial | null
    exteriorColor?: string
} | undefined

function shapesForSegment(segNodeIds: string[], shapes: ClosedShape[]): ClosedShape[] {
    return shapes.filter(s => segmentBelongsToShape(segNodeIds, s.nodeIds))
}

function pointInPolygon(px: number, pz: number, nodeIds: string[], nodesById: Map<string, LineNode>): boolean {
    const pts = nodeIds.map(id => nodesById.get(id)).filter(Boolean) as LineNode[]
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i]!.x, zi = pts[i]!.z, xj = pts[j]!.x, zj = pts[j]!.z
        const intersect = ((zi > pz) !== (zj > pz)) &&
            (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)
        if (intersect) inside = !inside
    }
    return inside
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
    opacity = 1,
    transparent = false,
    cutoutDrawInProgress = false,
}: {
    fp: FloorPlanState; wallRoughness?: number; floorMaterial?: string; doorStyle?: string; closedShapes?: ClosedShape[]; wallColor?: string;
    wallMaterial?: WallMaterial;
    interactive?: boolean; selectedId?: string | null; onSelect?: (id: string) => void
    onToggleDoorOpen?: (openingId: string) => void
    roomSceneConfigs?: RoomSceneConfig[]
    opacity?: number
    transparent?: boolean
    cutoutDrawInProgress?: boolean
}) {
    const H = fp.roomHeight
    const T = 0.15
    const FACE_EPS = 0.003
    const [hovered, setHovered] = React.useState(false)

    // FIX #2 — hoisted out of render-time inline call, memoized on the
    // actual geometry inputs. Was previously called fresh on every render
    // with no memoization at all.
    const derivedPolygons = React.useMemo(
        () => deriveClosedPolygons(fp.lineNodes, fp.lineSegments),
        [fp.lineNodes, fp.lineSegments]
    )

    // FIX #3 — hoisted out of the innermost per-piece loop. Was previously
    // rebuilt from scratch for every wall piece on every segment.
    const nodesById = React.useMemo(
        () => new Map(fp.lineNodes.map(n => [n.id, n])),
        [fp.lineNodes]
    )

    const segWallMaterial = new Map<string, WallMaterial | undefined>()
    const segWallColor = new Map<string, string | undefined>()
    const segWallMaterialSide = new Map<
        string,
        'interior' | 'exterior' | 'both'
    >()
    // const segExteriorWallMaterial = new Map<string, WallMaterial | undefined>()
    // const segExteriorWallColor = new Map<string, string | undefined>()

    // in LineWalls3D, alongside the existing maps
    // alongside the existing maps, near segWallMaterial/segWallColor
    const segWallExteriorMaterial = new Map<string, WallMaterial | undefined>()

    for (const seg of fp.lineSegments ?? []) {
        const segCfg = roomSceneConfigs?.find(r => r.roomId === seg.id)
        segWallMaterial.set(seg.id, segCfg?.wallMaterial)
        segWallExteriorMaterial.set(seg.id, segCfg?.exteriorWallMaterial)   // NEW
        segWallColor.set(seg.id, segCfg?.wallColor)
        segWallMaterialSide.set(seg.id, segCfg?.wallMaterialSide ?? 'interior')
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
                const effH = seg.height ?? H
                const segT = seg.thickness ?? 0.15

                for (let i = 0; i < nodes.length - 1; i++) {
                    const a = nodes[i]!
                    const b = nodes[i + 1]!

                    const dx = b.x - a.x
                    const dz = b.z - a.z
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
                    const matchingShapes = shapesForSegment(
                        [a.id, b.id],
                        closedShapes ?? fp.closedShapes ?? []
                    )
                    // NEW — skip building a wall for this piece entirely if every shape
                    // bordering it is a cutout.
                    const anyBorderingShapeIsCutout =
                        matchingShapes.length > 0 &&
                        matchingShapes.some(s => s?.cutout?.enabled)

                    if (anyBorderingShapeIsCutout) continue
                    const isUnclosedCutoutInProgress =
                        cutoutDrawInProgress && matchingShapes.length === 0

                    if (anyBorderingShapeIsCutout || isUnclosedCutoutInProgress) continue
                    const nx = Math.sin(angle)
                    const nz = -Math.cos(angle)
                    const probeDist = 0.3

                    let shapeFacingA: ClosedShape | undefined
                    let shapeFacingB: ClosedShape | undefined

                    if (matchingShapes.length === 2) {
                        const [s1, s2] = matchingShapes

                        const insideS1AtPlusNormal = pointInPolygon(
                            mcx + nx * probeDist,
                            mcz + nz * probeDist,
                            s1!.nodeIds,
                            nodesById
                        )

                        if (insideS1AtPlusNormal) {
                            shapeFacingA = s1
                            shapeFacingB = s2
                        } else {
                            shapeFacingA = s2
                            shapeFacingB = s1
                        }
                    } else if (matchingShapes.length === 1) {
                        const onlyShape = matchingShapes[0]

                        const shapeIsAtPlusNormal = pointInPolygon(
                            mcx + nx * probeDist,
                            mcz + nz * probeDist,
                            onlyShape!.nodeIds,
                            nodesById
                        )

                        if (shapeIsAtPlusNormal) {
                            shapeFacingA = onlyShape
                        } else {
                            shapeFacingB = onlyShape
                        }
                    }

                    const pieceKey = `${seg.id}_${i}`

                    const overrideA =
                        shapeFacingA?.wallOverrides?.[pieceKey] as WallSideOverride

                    const overrideB =
                        shapeFacingB?.wallOverrides?.[pieceKey] as WallSideOverride
                    const INTERIOR_ATTACH = 'material-4'
                    const EXTERIOR_ATTACH = 'material-5'
                    const interiorIsPlusNormal = !!shapeFacingA
                    const interiorFaceAttach = INTERIOR_ATTACH

                    const exteriorFaceAttach = EXTERIOR_ATTACH

                    console.log('[WALL FACE ORIENTATION]', {
                        segment: seg.id,
                        piece: i,
                        shapeFacingA: shapeFacingA?.id,
                        shapeFacingB: shapeFacingB?.id,
                        interiorIsPlusNormal,
                        interiorFaceAttach,
                        exteriorFaceAttach,
                    })

                    const selectedWallSide =
                        segWallMaterialSide.get(seg.id) ?? 'interior'

                    const selectedWallMaterial =
                        segWallMaterial.get(seg.id)

                    const selectedWallColor =
                        segWallColor.get(seg.id)

                    console.group(
                        `%c[WALL MATERIAL DEBUG] ${seg.id} piece ${i}`,
                        'color: #00aaff; font-weight: bold;'
                    )

                    console.log('SEGMENT:', {
                        id: seg.id,
                        nodeIds: seg.nodeIds,
                        angle,
                        rotationY: -angle,
                    })

                    console.log('SELECTED SIDE:', selectedWallSide)

                    console.log('SELECTED MATERIAL:', {
                        material: selectedWallMaterial,
                        color: selectedWallColor,
                    })

                    console.log('SHAPES:', {
                        matchingShapes: matchingShapes.length,
                        shapeFacingA: shapeFacingA?.id,
                        shapeFacingB: shapeFacingB?.id,
                    })

                    console.log('OVERRIDES:', {
                        overrideA,
                        overrideB,
                    })

                    console.groupEnd()
                    /*
                     * --------------------------------------------------------
                     * BASE MATERIALS
                     * --------------------------------------------------------
                     *
                     * Start with the material belonging to each side's room.
                     *
                     * If there is a segment-level material selection, it
                     * replaces ONLY the selected physical face.
                     */
                    // Default wall on both sides
                    let interiorMat: WallMaterial = wallMaterial
                    let exteriorMat: WallMaterial = wallMaterial
                    let interiorColor: string = wallColor
                    let exteriorColor: string = wallColor

                    if (shapeFacingA) {
                        interiorMat = shapeFacingA.wallMaterial ?? wallMaterial
                    } else if (shapeFacingB && matchingShapes.length === 1) {
                        interiorMat = shapeFacingB.wallMaterial ?? wallMaterial
                    }

                    if (matchingShapes.length === 2 && shapeFacingB) {
                        exteriorMat = shapeFacingB.wallMaterial ?? wallMaterial
                    } else {
                        const soloShape = shapeFacingA ?? shapeFacingB
                        exteriorMat = soloShape?.exteriorWallMaterial ?? exteriorMat
                    }
                    /*
                     * --------------------------------------------------------
                     * SEGMENT SIDE SELECTION
                     * --------------------------------------------------------
                     *
                     * IMPORTANT:
                     *
                     * We do NOT apply selectedWallMaterial to both faces
                     * unless the user explicitly selected "both".
                     */

                    // replace the old side-gated if/else block with:
                    const selectedWallExteriorMaterial = segWallExteriorMaterial.get(seg.id)
                    if (selectedWallMaterial) interiorMat = selectedWallMaterial
                    if (selectedWallExteriorMaterial) exteriorMat = selectedWallExteriorMaterial

                    // ── FINAL FACE MATERIALS ──
                    const interior = {
                        mat: overrideA?.material ?? interiorMat,
                        color: overrideA?.color ?? interiorColor,
                    }
                    const exterior = {
                        mat: overrideB?.material ?? overrideA?.exteriorMaterial ?? exteriorMat,
                        color: overrideB?.color ?? overrideA?.exteriorColor ?? exteriorColor,
                    }

                    console.group(
                        `%c FINAL MATERIALS — ${seg.id} / piece ${i}`,
                        'color: #ff9900; font-weight: bold;'
                    )

                    console.log('INTERIOR:', interior)

                    console.log('EXTERIOR:', exterior)

                    console.log('SIDE SELECTED:', selectedWallSide)

                    console.groupEnd()

                    console.groupEnd()
                    /*
                     * --------------------------------------------------------
                     * SELECTION / INTERACTION
                     * --------------------------------------------------------
                     */
                    const pieceId = `${seg.id}::piece::${i}`

                    const isPieceSelected =
                        interactive &&
                        selectedId === pieceId

                    const handlers = interactive
                        ? {
                            onClick: (e: any) => {
                                e.stopPropagation()
                                onSelect?.(pieceId)
                            },

                            onPointerOver: (e: any) => {
                                e.stopPropagation()
                                setHovered(true)
                                document.body.style.cursor = 'pointer'
                            },

                            onPointerOut: (e: any) => {
                                e.stopPropagation()
                                setHovered(false)
                                document.body.style.cursor = 'auto'
                            },
                        }
                        : {}

                    const showOutline =
                        interactive &&
                        (isPieceSelected ||
                            isRoomSelected ||
                            hovered)

                    const wallType =
                        seg.wallType ?? 'solid'

                    const outlineMesh = (
                        <mesh
                            position={[
                                mcx,
                                effH / 2,
                                mcz,
                            ]}
                            rotation={[0, -angle, 0]}
                            renderOrder={999}
                        >
                            <boxGeometry
                                args={[
                                    len * 1.01,
                                    effH * 1.01,
                                    segT * 1.4,
                                ]}
                            />

                            <meshBasicMaterial
                                color={
                                    isPieceSelected ||
                                        isRoomSelected
                                        ? '#3B82F6'
                                        : '#93C5FD'
                                }
                                wireframe
                                transparent
                                opacity={
                                    isPieceSelected ||
                                        isRoomSelected
                                        ? 0.9
                                        : 0.5
                                }
                                depthTest={false}
                            />
                        </mesh>
                    )

                    if (segOpenings.length === 0) {
                        if (wallType === 'open') {
                            panels.push(
                                <group key={`${seg.id}_${i}`}>
                                    {interactive && (
                                        <mesh
                                            position={[
                                                mcx,
                                                effH / 2,
                                                mcz,
                                            ]}
                                            rotation={[
                                                0,
                                                -angle,
                                                0,
                                            ]}
                                            {...handlers}
                                            visible={false}
                                        >
                                            <boxGeometry
                                                args={[
                                                    len,
                                                    effH,
                                                    T,
                                                ]}
                                            />

                                            <meshBasicMaterial />
                                        </mesh>
                                    )}

                                    {showOutline && outlineMesh}
                                </group>
                            )

                            /*
                             * ----------------------------------------------------
                             * RAILING (full-segment)
                             * ----------------------------------------------------
                             */
                        } else if (wallType === 'railing') {
                            panels.push(
                                <group
                                    key={`${seg.id}_${i}`}
                                    position={[
                                        mcx,
                                        0,
                                        mcz,
                                    ]}
                                    rotation={[
                                        0,
                                        -angle,
                                        0,
                                    ]}
                                >
                                    <group {...handlers}>
                                        <Railing3D
                                            from={[
                                                -len / 2,
                                                0,
                                                0,
                                            ]}
                                            to={[
                                                len / 2,
                                                0,
                                                0,
                                            ]}
                                            wallRoughness={
                                                wallRoughness
                                            }
                                            color={
                                                interior.color
                                            }
                                            height={effH}
                                        />
                                    </group>

                                    {showOutline && (
                                        <mesh
                                            position={[
                                                0,
                                                effH / 2,
                                                0,
                                            ]}
                                            renderOrder={999}
                                        >
                                            <boxGeometry
                                                args={[
                                                    len * 1.01,
                                                    effH * 1.01,
                                                    T * 1.4,
                                                ]}
                                            />

                                            <meshBasicMaterial
                                                color={
                                                    isPieceSelected ||
                                                        isRoomSelected
                                                        ? '#3B82F6'
                                                        : '#93C5FD'
                                                }
                                                wireframe
                                                transparent
                                                opacity={
                                                    isPieceSelected ||
                                                        isRoomSelected
                                                        ? 0.9
                                                        : 0.5
                                                }
                                                depthTest={false}
                                            />
                                        </mesh>
                                    )}
                                </group>
                            )

                            /*
                             * ----------------------------------------------------
                             * SOLID WALL
                             * ----------------------------------------------------
                             */
                        } else {
                            panels.push(
                                <group key={`${seg.id}_${i}`}>
                                    <mesh
                                        position={[
                                            mcx,
                                            effH / 2,
                                            mcz,
                                        ]}
                                        rotation={[
                                            0,
                                            -angle,
                                            0,
                                        ]}
                                        castShadow
                                        receiveShadow
                                        {...handlers}
                                    >
                                        <boxGeometry
                                            args={[
                                                len,
                                                effH,
                                                segT,
                                            ]}
                                        />
                                        {/* End cap +X */}
                                        <WallMat
                                            attach="material-0"
                                            mat={interior.mat}
                                            color={interior.color}
                                            roughness={wallRoughness}
                                            width={len}
                                            height={effH}
                                            depth={segT}
                                            opacity={opacity}
                                            transparent={transparent}
                                        />

                                        {/* End cap -X */}
                                        <WallMat
                                            attach="material-1"
                                            mat={interior.mat}
                                            color={interior.color}
                                            roughness={wallRoughness}
                                            width={len}
                                            height={effH}
                                            depth={segT}
                                            opacity={opacity}
                                            transparent={transparent}
                                        />

                                        {/* Top */}
                                        <WallMat
                                            attach="material-2"
                                            mat={interior.mat}
                                            color={interior.color}
                                            roughness={wallRoughness}
                                            width={len}
                                            height={effH}
                                            depth={segT}
                                            opacity={opacity}
                                            transparent={transparent}
                                        />

                                        {/* Bottom */}
                                        <WallMat
                                            attach="material-3"
                                            mat={interior.mat}
                                            color={interior.color}
                                            roughness={wallRoughness}
                                            width={len}
                                            height={effH}
                                            depth={segT}
                                            opacity={opacity}
                                            transparent={transparent}
                                        />

                                        {/* +Z = EXTERIOR */}
                                        <WallMat
                                            attach={exteriorFaceAttach}
                                            mat={exterior.mat}
                                            color={exterior.color}
                                            roughness={wallRoughness}
                                            width={len}
                                            height={effH}
                                            depth={segT}
                                            opacity={opacity}
                                            transparent={transparent}
                                        />

                                        {/* -Z = INTERIOR */}
                                        <WallMat
                                            attach={interiorFaceAttach}
                                            mat={interior.mat}
                                            color={interior.color}
                                            roughness={wallRoughness}
                                            width={len}
                                            height={effH}
                                            depth={segT}
                                            opacity={opacity}
                                            transparent={transparent}
                                        />
                                    </mesh>

                                    {showOutline && outlineMesh}
                                </group>
                            )
                        }

                        /*
                         * ========================================================
                         * WALL HAS OPENINGS
                         * ========================================================
                         */
                    } else {
                        const sorted = [...segOpenings].sort(
                            (a, b) =>
                                (a.segmentT ?? 0) -
                                (b.segmentT ?? 0)
                        )

                        let cursor = 0

                        for (
                            let si = 0;
                            si <= sorted.length;
                            si++
                        ) {
                            const op = sorted[si]

                            const opPos = op
                                ? (op.segmentT ?? 0) * len
                                : len

                            const segEnd = op
                                ? opPos - op.width / 2
                                : len

                            const segLen =
                                segEnd - cursor

                            /*
                             * ------------------------------------------------
                             * WALL SECTION BETWEEN OPENINGS
                             * ------------------------------------------------
                             */
                            if (segLen > 0.02) {
                                const segMid =
                                    cursor + segLen / 2

                                const wx =
                                    a.x +
                                    (dx / len) * segMid

                                const wz =
                                    a.z +
                                    (dz / len) * segMid

                                panels.push(
                                    <group
                                        key={`${seg.id}_${i}_l${si}`}
                                    >
                                        <mesh
                                            position={[
                                                wx,
                                                effH / 2,
                                                wz,
                                            ]}
                                            rotation={[
                                                0,
                                                -angle,
                                                0,
                                            ]}
                                            castShadow
                                            receiveShadow
                                            {...handlers}
                                        >
                                            <boxGeometry
                                                args={[
                                                    segLen,
                                                    effH,
                                                    segT,
                                                ]}
                                            />

                                            {/* End cap +X */}
                                            <WallMat
                                                attach="material-0"
                                                mat={interior.mat}
                                                color={interior.color}
                                                roughness={wallRoughness}
                                                width={segLen}
                                                height={effH}
                                                depth={segT}
                                                opacity={opacity}
                                                transparent={transparent}
                                            />

                                            {/* End cap -X */}
                                            <WallMat
                                                attach="material-1"
                                                mat={interior.mat}
                                                color={interior.color}
                                                roughness={wallRoughness}
                                                width={segLen}
                                                height={effH}
                                                depth={segT}
                                                opacity={opacity}
                                                transparent={transparent}
                                            />

                                            {/* Top */}
                                            <WallMat
                                                attach="material-2"
                                                mat={interior.mat}
                                                color={interior.color}
                                                roughness={wallRoughness}
                                                width={segLen}
                                                height={effH}
                                                depth={segT}
                                                opacity={opacity}
                                                transparent={transparent}
                                            />

                                            {/* Bottom */}
                                            <WallMat
                                                attach="material-3"
                                                mat={interior.mat}
                                                color={interior.color}
                                                roughness={wallRoughness}
                                                width={segLen}
                                                height={effH}
                                                depth={segT}
                                                opacity={opacity}
                                                transparent={transparent}
                                            />

                                            {/* +Z = EXTERIOR */}
                                            <WallMat
                                                attach={exteriorFaceAttach}
                                                mat={exterior.mat}
                                                color={exterior.color}
                                                roughness={wallRoughness}
                                                width={segLen}
                                                height={effH}
                                                depth={segT}
                                                opacity={opacity}
                                                transparent={transparent}
                                            />

                                            {/* -Z = INTERIOR */}
                                            <WallMat
                                                attach={interiorFaceAttach}
                                                mat={interior.mat}
                                                color={interior.color}
                                                roughness={wallRoughness}
                                                width={segLen}
                                                height={effH}
                                                depth={segT}
                                                opacity={opacity}
                                                transparent={transparent}
                                            />
                                        </mesh>
                                        {showOutline && (
                                            <mesh
                                                position={[
                                                    wx,
                                                    effH / 2,
                                                    wz,
                                                ]}
                                                rotation={[
                                                    0,
                                                    -angle,
                                                    0,
                                                ]}
                                                renderOrder={999}
                                            >
                                                <boxGeometry
                                                    args={[
                                                        segLen * 1.01,
                                                        effH * 1.01,
                                                        segT * 1.4,
                                                    ]}
                                                />

                                                <meshBasicMaterial
                                                    color={
                                                        isPieceSelected ||
                                                            isRoomSelected
                                                            ? '#3B82F6'
                                                            : '#93C5FD'
                                                    }
                                                    wireframe
                                                    transparent
                                                    opacity={
                                                        isPieceSelected ||
                                                            isRoomSelected
                                                            ? 0.9
                                                            : 0.5
                                                    }
                                                    depthTest={false}
                                                />
                                            </mesh>
                                        )}
                                    </group>
                                )
                            }

                            /*
                             * ------------------------------------------------
                             * OPENING
                             * ------------------------------------------------
                             */
                            if (op) {
                                const opPos2 = (op.segmentT ?? 0) * len
                                const openingBottom = op.sillHeight ?? 0
                                const openingTop = openingBottom + op.height
                                const headerH = effH - openingTop
                                const isPassage = op.type === 'opening' && op.variant === 'opening-passage'
                                const isArchway = op.type === 'opening' && op.variant === 'opening-archway'
                                // NEW — a partial railing span should never get a solid
                                // header slab above it, same reasoning as a passage: it's
                                // meant to be open to the ceiling, not boxed in.
                                const isRailingSpan = op.type === 'railing'

                                /*
                                 * ------------------------------------------------
                                 * HEADER
                                 * ------------------------------------------------
                                 */
                                if (!isPassage && !isRailingSpan && headerH > 0.02) {
                                    const hx = a.x + (dx / len) * opPos2
                                    const hz = a.z + (dz / len) * opPos2

                                    if (isArchway) {
                                        panels.push(
                                            <group key={`${seg.id}_${i}_h${si}`} position={[hx, openingTop, hz]}>
                                                <ArchHeader3D
                                                    width={op.width}
                                                    headerH={headerH}
                                                    thickness={segT}
                                                    angle={-angle}
                                                    mat={interior.mat}
                                                    color={interior.color}
                                                    roughness={wallRoughness}
                                                />
                                            </group>
                                        )
                                    } else {
                                        panels.push(
                                            <mesh
                                                key={`${seg.id}_${i}_h${si}`}
                                                position={[hx, openingTop + headerH / 2, hz]}
                                                rotation={[0, -angle, 0]}
                                                castShadow
                                                receiveShadow
                                                {...handlers}
                                            >
                                                <boxGeometry args={[op.width, headerH, segT]} />
                                                <WallMat attach="material-0" mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={headerH} depth={segT} opacity={opacity} transparent={transparent} />
                                                <WallMat attach="material-1" mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={headerH} depth={segT} opacity={opacity} transparent={transparent} />
                                                <WallMat attach="material-2" mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={headerH} depth={segT} opacity={opacity} transparent={transparent} />
                                                <WallMat attach="material-3" mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={headerH} depth={segT} opacity={opacity} transparent={transparent} />
                                                <WallMat attach={exteriorFaceAttach} mat={exterior.mat} color={exterior.color} roughness={wallRoughness} width={op.width} height={headerH} depth={segT} opacity={opacity} transparent={transparent} />
                                                <WallMat attach={interiorFaceAttach} mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={headerH} depth={segT} opacity={opacity} transparent={transparent} />
                                            </mesh>
                                        )
                                    }
                                }

                                /*
                                 * ------------------------------------------------
                                 * SILL
                                 * ------------------------------------------------
                                 */
                                if ((op.type === 'window' || op.type === 'door') && openingBottom > 0.02) {
                                    const sx = a.x + (dx / len) * opPos2
                                    const sz = a.z + (dz / len) * opPos2

                                    panels.push(
                                        <mesh
                                            key={`${seg.id}_${i}_s${si}`}
                                            position={[sx, openingBottom / 2, sz]}
                                            rotation={[0, -angle, 0]}
                                            castShadow
                                            receiveShadow
                                            {...handlers}
                                        >
                                            <boxGeometry args={[op.width, openingBottom, segT]} />
                                            <WallMat attach="material-0" mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={openingBottom} depth={segT} opacity={opacity} transparent={transparent} />
                                            <WallMat attach="material-1" mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={openingBottom} depth={segT} opacity={opacity} transparent={transparent} />
                                            <WallMat attach="material-2" mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={openingBottom} depth={segT} opacity={opacity} transparent={transparent} />
                                            <WallMat attach="material-3" mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={openingBottom} depth={segT} opacity={opacity} transparent={transparent} />
                                            <WallMat attach={exteriorFaceAttach} mat={exterior.mat} color={exterior.color} roughness={wallRoughness} width={op.width} height={openingBottom} depth={segT} opacity={opacity} transparent={transparent} />
                                            <WallMat attach={interiorFaceAttach} mat={interior.mat} color={interior.color} roughness={wallRoughness} width={op.width} height={openingBottom} depth={segT} opacity={opacity} transparent={transparent} />
                                        </mesh>
                                    )
                                }

                                const ox = a.x + (dx / len) * opPos2
                                const oz = a.z + (dz / len) * opPos2

                                /*
                                 * ------------------------------------------------
                                 * WINDOW
                                 * ------------------------------------------------
                                 */
                                if (op.type === 'window') {
                                    const glazingCenterY =
                                        op.sillHeight +
                                        op.height / 2

                                    panels.push(
                                        <WindowVariant3D
                                            key={`${seg.id}_${i}_w${si}`}
                                            op={op}
                                            angle={angle}
                                            basePos={[
                                                ox,
                                                glazingCenterY,
                                                oz,
                                            ]}
                                            interactive={
                                                interactive
                                            }
                                            onToggleOpen={
                                                onToggleDoorOpen
                                                    ? () =>
                                                        onToggleDoorOpen(
                                                            op.id
                                                        )
                                                    : undefined
                                            }
                                        />
                                    )
                                } else if (
                                    op.type === 'door'
                                ) {
                                    panels.push(
                                        <DoorVariant3D
                                            key={`${seg.id}_${i}_d${si}`}
                                            op={op}
                                            angle={angle}
                                            basePos={[
                                                ox,
                                                openingBottom +
                                                op.height / 2,
                                                oz,
                                            ]}
                                            doorStyle={
                                                doorStyle
                                            }
                                            interactive={
                                                interactive
                                            }
                                            onToggleOpen={
                                                onToggleDoorOpen
                                            }
                                        />
                                    )
                                    /*
                                     * ------------------------------------------------
                                     * PARTIAL RAILING (balcony) — NEW
                                     * ------------------------------------------------
                                     * Same span-in-wall mechanism as doors/windows above
                                     * (ox/oz already computed, header/sill already
                                     * skipped via isRailingSpan), but renders a Railing3D
                                     * run instead of a door/window mesh, leaving the rest
                                     * of the segment as ordinary solid wall.
                                     */
                                } else if (op.type === 'railing') {
                                    panels.push(
                                        <group
                                            key={`${seg.id}_${i}_r${si}`}
                                            position={[ox, 0, oz]}
                                            rotation={[0, -angle, 0]}
                                        >
                                            <group {...handlers}>
                                                <Railing3D
                                                    from={[-op.width / 2, 0, 0]}
                                                    to={[op.width / 2, 0, 0]}
                                                    wallRoughness={wallRoughness}
                                                    color={op.railingColor ?? interior.color}
                                                    height={op.railingHeight ?? 0.9}
                                                    style={op.railingStyle ?? 'baluster'}
                                                    postSpacing={op.railingPostSpacing}
                                                    railingWidth={op.railingWidthDim}
                                                />
                                            </group>

                                            {showOutline && (
                                                <mesh
                                                    position={[0, effH / 2, 0]}
                                                    renderOrder={999}
                                                >
                                                    <boxGeometry
                                                        args={[
                                                            op.width * 1.01,
                                                            effH * 1.01,
                                                            segT * 1.4,
                                                        ]}
                                                    />
                                                    <meshBasicMaterial
                                                        color={
                                                            isPieceSelected || isRoomSelected
                                                                ? '#3B82F6'
                                                                : '#93C5FD'
                                                        }
                                                        wireframe
                                                        transparent
                                                        opacity={
                                                            isPieceSelected || isRoomSelected
                                                                ? 0.9
                                                                : 0.5
                                                        }
                                                        depthTest={false}
                                                    />
                                                </mesh>
                                            )}
                                        </group>
                                    )
                                }

                                cursor =
                                    opPos +
                                    op.width / 2
                            }
                        }
                    }
                }

                return (
                    <group key={seg.id}>
                        {panels}
                    </group>
                )
            })}

            {derivedPolygons.map((nodeIds, idx) => {
                const nodes = nodeIds.map(nid => fp.lineNodes.find(n => n.id === nid)).filter(Boolean) as LineNode[]
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
                console.log('[LINEWALLS POLY]', idx, {
                    label: matchedShape?.label,
                    id: matchedShape?.id,
                    cutoutEnabled: matchedShape?.cutout?.enabled,
                    bbox: { minX, maxX, minZ, maxZ },
                    nodeIds,
                })

                // NEW — this polygon IS a cutout: don't render it as floor at all
                if (matchedShape?.cutout?.enabled) return null

                const shapeMat = matchedShape?.floorMaterial ?? floorMaterial
                const centroidX = xs.reduce((s, x) => s + x, 0) / xs.length
                const centroidZ = zs.reduce((s, z) => s + z, 0) / zs.length
                const shapeLabel = matchedShape?.label || 'Area'
                const nodeIdSet = new Set(nodeIds)
                const matchedSeg = (fp.lineSegments ?? []).find(s =>
                    s.nodeIds.length === nodeIds.length && s.nodeIds.every(id => nodeIdSet.has(id))
                )
                const floorRoomId = matchedSeg?.id ?? matchedShape?.id ?? null
                const isFloorSelected = interactive && !!floorRoomId && selectedId === floorRoomId

                // NEW — any OTHER polygon on this floor that's a cutout AND whose
                // points fall inside this polygon's bounding box becomes a hole here
                const holesForThisFloor = derivedPolygons
                    .filter(otherIds => otherIds !== nodeIds)
                    .map(otherIds => ({
                        shape: matchClosedShape(otherIds, fp.lineNodes, closedShapes ?? fp.closedShapes ?? []),
                        points: otherIds.map(id => nodesById.get(id)).filter(Boolean) as { x: number; z: number }[],
                        rawIdCount: otherIds.length,
                    }))
                    .filter(o => o.shape?.cutout?.enabled)
                    .filter(o => o.points.some(p => p.x >= minX && p.x <= maxX && p.z >= minZ && p.z <= maxZ))

                if (matchedShape?.label === 'Area 1') {
                    console.log('[HOLE POINT RESOLUTION]', holesForThisFloor.map(h => ({
                        label: h.shape?.label,
                        rawIdCount: h.rawIdCount,
                        resolvedPointCount: h.points.length,
                        points: h.points,
                    })))
                }

                const holePointArrays = holesForThisFloor.map(o => o.points)

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
                            opacity={opacity}
                            transparent={transparent}
                            holes={holePointArrays}
                        />
                        <Text position={[centroidX, 0.05, centroidZ]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.35} color="#6B5B4E" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#FFFFFF" fillOpacity={opacity}>
                            {shapeLabel}
                        </Text>
                    </React.Fragment>
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

export const LineWalls3D = React.memo(LineWalls3DImpl)


function FloorPiece({
    geometry, shapeMat, worldW, worldD, interactive, roomId, selected, onSelect,
    opacity = 1, transparent = false,
}: {
    geometry: THREE.ShapeGeometry
    shapeMat: FloorMaterial
    worldW: number
    worldD: number
    interactive: boolean
    roomId: string | null
    selected: boolean
    onSelect?: (id: string) => void
    opacity?: number
    transparent?: boolean
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
                <FloorMat mat={shapeMat} width={worldW} depth={worldD} opacity={opacity} transparent={transparent} />
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
    opacity = 1, transparent = false,
    holes,
}: {
    nodeIds: string[]
    nodes: LineNode[]
    minX: number; minZ: number; worldW: number; worldD: number
    shapeMat: FloorMaterial
    interactive: boolean
    roomId: string | null
    selected: boolean
    onSelect?: (id: string) => void
    opacity?: number
    transparent?: boolean
    holes?: { x: number; z: number }[][]
}) {
    const geometry = React.useMemo(() => {
        console.log('[GEOMETRY REBUILD]', nodeIds[0], 'holeCount:', holes?.length ?? 0, holes)
        const shape = new THREE.Shape()
        shape.moveTo(nodes[0]!.x, -nodes[0]!.z)
        for (let i = 1; i < nodes.length; i++) {
            shape.lineTo(nodes[i]!.x, -nodes[i]!.z)
        }
        shape.closePath()

        if (holes && holes.length > 0) {
            for (const holePts of holes) {
                if (holePts.length < 3) continue
                const path = new THREE.Path()
                path.moveTo(holePts[0]!.x, -holePts[0]!.z)
                for (let i = 1; i < holePts.length; i++) {
                    path.lineTo(holePts[i]!.x, -holePts[i]!.z)
                }
                path.closePath()
                shape.holes.push(path)
            }
        }

        console.log('[SHAPE HOLES CHECK]', {
            outerPointCount: shape.getPoints().length,
            holesCount: shape.holes.length,
            holePointsEach: shape.holes.map(h => h.getPoints().length),
        })

        const geo = new THREE.ShapeGeometry(shape)
        console.log('[GEOMETRY VERTEX COUNT]', geo.attributes.position.count)

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
        nodes.map(n => `${n.x},${n.z}`).join('|'),
        minX, minZ, worldW, worldD,
        holes ? holes.map(h => h.map(p => `${p.x},${p.z}`).join(';')).join('|') : '',
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
            opacity={opacity}
            transparent={transparent}
        />
    )
}