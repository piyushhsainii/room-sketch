import { ArchHeader3D } from "./objects/arch-header";
import { FloorMat } from "./objects/floormat";
import { WallDecorMesh } from "./mesh/wall-decor-mesh";
import { WallMat } from "./objects/wallmat";
import { WindowVariant3D } from "./objects/window-variant3d";
import { DoorStyle, EditorOpening, EditorRoom, FloorMaterial, PlacedWallDecor, WallMaterial } from "./lib/constants";
import { DoorVariant3D } from "./objects/door-variants";
import { Railing3D } from "./objects/railing-3d";
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { makeClickVsDragHandlers } from "@/lib/helpers";

function wallFaceAttach(wallName: 'north' | 'south' | 'east' | 'west'): { interior: number; exterior: number; ends: number[] } {
    switch (wallName) {
        case 'north': return { interior: 4, exterior: 5, ends: [0, 1, 2, 3] } // interior faces +z (toward center)
        case 'south': return { interior: 5, exterior: 4, ends: [0, 1, 2, 3] } // interior faces -z (toward center)
        case 'east': return { interior: 1, exterior: 0, ends: [2, 3, 4, 5] }  // interior faces -x (toward center)
        case 'west': return { interior: 0, exterior: 1, ends: [2, 3, 4, 5] }  // interior faces +x (toward center)
    }
}


function WallFaceMaterials({
    wallName, interiorMat, exteriorMat, interiorColor, exteriorColor,
    isSelected, roughness, textured, runLength, runHeight, runDepth, opacity, transparent,
}: {
    wallName: 'north' | 'south' | 'east' | 'west'
    interiorMat: WallMaterial
    exteriorMat: WallMaterial
    interiorColor: string
    exteriorColor: string
    isSelected: boolean
    roughness: number
    textured: boolean
    runLength: number
    runHeight: number
    runDepth: number
    opacity: number
    transparent: boolean
}) {
    const { interior, exterior, ends } = wallFaceAttach(wallName)
    const selColor = '#A5A6F5'
    return (
        <>
            <WallMat attach={`material-${interior}`} mat={interiorMat} color={isSelected ? selColor : interiorColor}
                roughness={roughness} textured={textured} width={runLength} height={runHeight} depth={runDepth}
                opacity={opacity} transparent={transparent} />
            <WallMat attach={`material-${exterior}`} mat={exteriorMat} color={isSelected ? selColor : exteriorColor}
                roughness={roughness} textured={textured} width={runLength} height={runHeight} depth={runDepth}
                opacity={opacity} transparent={transparent} />
            {ends.map(i => (
                <WallMat key={i} attach={`material-${i}`} mat={interiorMat} color={isSelected ? selColor : interiorColor}
                    roughness={roughness} textured={textured} width={runLength} height={runHeight} depth={runDepth}
                    opacity={opacity} transparent={transparent} />
            ))}
        </>
    )
}

function Room3D({
    room,
    openings = [],
    roomHeight,
    wallColor = '#FFFFFF',
    wallRoughness = 0.95,
    wallTextured = false,
    floorMat = 'plain',
    doorStyle = 'glass_clear',
    wallDecor,
    wallMaterial = 'paint',
    onSelectRoom,
    interactive = false,
    selectedId,
    onSelect,
    onToggleDoorOpen,
    roomWallOverrides,   // NEW
    opacity = 1,          // NEW
    transparent = false,  // NEW
    cutouts
}: {
    room: EditorRoom;
    openings?: EditorOpening[];
    roomHeight: number
    wallColor?: string;
    wallRoughness?: number;
    wallTextured?: boolean;
    floorMat?: FloorMaterial;
    doorStyle?: DoorStyle
    wallDecor?: PlacedWallDecor[]
    wallMaterial?: WallMaterial
    onSelectRoom?: (roomId: string) => void
    interactive?: boolean
    selectedId?: string | null
    onSelect?: (id: string | null) => void
    onToggleDoorOpen?: (openingId: string) => void
    roomWallOverrides?: Partial<Record<'north' | 'south' | 'east' | 'west', { color?: string; material?: WallMaterial }>>
    opacity?: number
    transparent?: boolean
    cutouts?: { x: number; z: number }[][]

}) {
    const cx = room.x + room.width / 2
    const cz = room.z + room.depth / 2
    const W = room.width, D = room.depth, H = roomHeight
    // CHANGED — was a hardcoded const T = 0.15; now reads room.wallThickness,
    // defaulting to the old hardcoded value so existing saved rooms render
    // identically until a user explicitly changes it.
    const T = room.wallThickness ?? 0.15
    // NEW — whole-room wall type, mirrors LineSegment.wallType but applies
    // to all 4 walls at once since rooms have no per-segment identity.
    const wallType = room.wallType ?? 'solid'
    const floorDownPos = useRef<{ x: number; y: number } | null>(null)
    const walls = [
        { name: 'north' as const, axis: 'x' as const },
        { name: 'south' as const, axis: 'x' as const },
        { name: 'west' as const, axis: 'z' as const },
        { name: 'east' as const, axis: 'z' as const },
    ]

    function wallWorldPos(name: 'north' | 'south' | 'east' | 'west'): [number, number, number] {
        if (name === 'north') return [cx, H / 2, room.z + T / 2]
        if (name === 'south') return [cx, H / 2, room.z + D - T / 2]
        if (name === 'west') return [room.x + T / 2, H / 2, cz]
        return [room.x + W - T / 2, H / 2, cz]
    }

    function wallSize(axis: 'x' | 'z'): [number, number, number] {
        return axis === 'x' ? [W, H, T] : [T, H, D]
    }

    // NEW — the horizontal run-length for texture UVs, independent of box thickness
    function wallRunLength(axis: 'x' | 'z'): number {
        return axis === 'x' ? W : D
    }

    function getWindowBasePos(
        wall: "north" | "south" | "east" | "west",
        opMid: number,
        sillHeight: number,
        openingHeight: number
    ): [number, number, number] {

        const OFFSET = T / 2 + 0.04

        switch (wall) {

            case "north":
                return [
                    room.x + opMid,
                    sillHeight + openingHeight / 2,
                    room.z + OFFSET,
                ]

            case "south":
                return [
                    room.x + opMid,
                    sillHeight + openingHeight / 2,
                    room.z + D - OFFSET,
                ]

            case "west":
                return [
                    room.x + OFFSET,
                    sillHeight + openingHeight / 2,
                    room.z + opMid,
                ]

            case "east":
                return [
                    room.x + W - OFFSET,
                    sillHeight + openingHeight / 2,
                    room.z + opMid,
                ]
        }
    }

    const floorShape = useMemo(() => {
        const s = new THREE.Shape()
        const hx = W / 2 - T, hz = D / 2 - T // half-extents matching the old plane's W-T*2 / D-T*2 size
        s.moveTo(-hx, -hz)
        s.lineTo(hx, -hz)
        s.lineTo(hx, hz)
        s.lineTo(-hx, hz)
        s.closePath()

        for (const poly of cutouts ?? []) {
            if (poly.length < 3) continue
            const hole = new THREE.Path()
            // convert world coords to this shape's local space (centered on cx, cz)
            hole.moveTo(poly[0]!.x - cx, poly[0]!.z - cz)
            for (let i = 1; i < poly.length; i++) hole.lineTo(poly[i]!.x - cx, poly[i]!.z - cz)
            hole.closePath()
            s.holes.push(hole)
        }
        return s
    }, [W, D, T, cx, cz, cutouts])

    return (
        <group>
            {/* Floor */}
            <mesh position={[cx, 0.002, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow
                onPointerDown={interactive ? (e) => { floorDownPos.current = { x: e.clientX, y: e.clientY } } : undefined}
                onPointerUp={interactive ? (e) => {
                    const d = floorDownPos.current
                    floorDownPos.current = null
                    if (!d) return
                    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) {
                        e.stopPropagation()
                        onSelect?.(room.id)
                    }
                } : undefined}
                onPointerOver={interactive ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined}
                onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
            >
                <shapeGeometry args={[floorShape]} />
                <FloorMat mat={floorMat} opacity={opacity} transparent={transparent} />
            </mesh>

            {/* NEW — wallType === 'open': skip all wall/opening geometry for this
                room entirely. Openings (doors/windows/etc.) on an open-wall room
                are meaningless since there's no wall to cut them into, so they're
                skipped too. Wall Decor is separately gated below for the same
                reason (nothing to mount to). */}
            {wallType !== 'open' && walls.map(wall => {

                const wPos = wallWorldPos(wall.name)
                const wallLen = wall.axis === 'x' ? W : D

                // NEW — wallType === 'railing': one railing run across the wall's
                // full length instead of the box+openings machinery. Openings are
                // ignored for a whole-wall railing, same reasoning as 'open' above.
                if (wallType === 'railing') {
                    const angle = wall.axis === 'x' ? 0 : Math.PI / 2
                    const wallOverride = roomWallOverrides?.[wall.name]
                    const resolvedWallColor = wallOverride?.color ?? wallColor
                    const wallId = `${room.id}::wall::${wall.name}`
                    const isWallSelected = interactive && selectedId === wallId
                    const wallClickHandlers = interactive ? {
                        ...makeClickVsDragHandlers((e: any) => { e.stopPropagation(); onSelect?.(wallId) }),
                        onPointerOver: (e: any) => { e.stopPropagation(); document.body.style.cursor = 'pointer' },
                        onPointerOut: () => { document.body.style.cursor = 'auto' },
                    } : {}
                    return (
                        <group key={wall.name} position={wPos} rotation={[0, angle, 0]} {...wallClickHandlers}>
                            <Railing3D
                                from={[-wallLen / 2, 0, 0]}
                                to={[wallLen / 2, 0, 0]}
                                wallRoughness={wallRoughness}
                                color={isWallSelected ? '#A5A6F5' : resolvedWallColor}
                                height={0.9}
                                style="baluster"
                            />
                        </group>
                    )
                }

                // wallType === 'solid' from here down
                const wallOpenings = openings.filter(o => o.wall === wall.name && !o.segmentNodeIds)
                const wallId = `${room.id}::wall::${wall.name}`
                const isWallSelected = interactive && selectedId === wallId
                const wallOverride = roomWallOverrides?.[wall.name]
                // CHANGED — resolvedWallMaterial now also checks room.wallMaterial
                // (new per-room interior default) before falling back to the old
                // wallMaterial prop; resolvedExteriorMaterial is new, falling back
                // to the interior value when unset (matches PropsPanel's "Both"
                // semantics: unset exterior = same as interior).
                const resolvedWallMaterial = wallOverride?.material ?? room.wallMaterial ?? wallMaterial
                const resolvedExteriorMaterial = room.exteriorWallMaterial ?? resolvedWallMaterial
                const resolvedWallColor = wallOverride?.color ?? wallColor
                const wallClickHandlers = interactive ? {
                    ...makeClickVsDragHandlers((e: any) => { e.stopPropagation(); onSelect?.(wallId) }),
                    onPointerOver: (e: any) => { e.stopPropagation(); document.body.style.cursor = 'pointer' },
                    onPointerOut: () => { document.body.style.cursor = 'auto' },
                } : {}
                if (wallOpenings.length === 0) {
                    return (
                        <mesh key={wall.name} position={wPos} castShadow receiveShadow {...wallClickHandlers}>
                            <boxGeometry args={wallSize(wall.axis)} />
                            <WallFaceMaterials
                                wallName={wall.name}
                                interiorMat={resolvedWallMaterial}
                                exteriorMat={resolvedExteriorMaterial}
                                interiorColor={resolvedWallColor}
                                exteriorColor={resolvedWallColor}
                                isSelected={isWallSelected}
                                roughness={wallRoughness}
                                textured={wallTextured}
                                runLength={wallRunLength(wall.axis)}
                                runHeight={wallSize(wall.axis)[1]}
                                runDepth={wallSize(wall.axis)[2]}
                                opacity={opacity}
                                transparent={transparent}
                            />
                        </mesh>
                    )
                }
                const panels: React.ReactNode[] = []
                const sorted = [...wallOpenings].sort((a, b) => a.position - b.position)
                let cursor = 0

                for (let i = 0; i <= sorted.length; i++) {
                    const op = sorted[i]
                    const segEnd = op ? op.position - op.width / 2 : wallLen
                    const segLen = segEnd - cursor

                    if (segLen > 0.02) {
                        const size: [number, number, number] = wall.axis === 'x' ? [segLen, H, T] : [T, H, segLen]
                        const segMid = cursor + segLen / 2
                        const pos: [number, number, number] = wall.axis === 'x'
                            ? [room.x + segMid, H / 2, wPos[2]]
                            : [wPos[0], H / 2, room.z + segMid]

                        panels.push(
                            <mesh key={`l${i}`} position={pos} castShadow receiveShadow {...wallClickHandlers}>
                                <boxGeometry args={size} />
                                <WallFaceMaterials
                                    wallName={wall.name}
                                    interiorMat={resolvedWallMaterial}
                                    exteriorMat={resolvedExteriorMaterial}
                                    interiorColor={resolvedWallColor}
                                    exteriorColor={resolvedWallColor}
                                    isSelected={isWallSelected}
                                    roughness={wallRoughness}
                                    textured={wallTextured}
                                    runLength={segLen}
                                    runHeight={size[1]}
                                    runDepth={size[2]}
                                    opacity={opacity}
                                    transparent={transparent}
                                />
                            </mesh>
                        )
                    }

                    if (op) {
                        const isPassage = op.type === 'opening' && op.variant === 'opening-passage'
                        const isArchway = op.type === 'opening' && op.variant === 'opening-archway'
                        const isRailingSpan = op.type === 'railing' && !op.railingSolidAbove
                        const openingTop = op.sillHeight + op.height
                        const headerH = H - openingTop

                        const effOpeningTop = op.type === 'railing' && op.railingSolidAbove
                            ? (op.railingWallStart ?? op.railingHeight ?? 0.9)
                            : openingTop
                        const effHeaderH = H - effOpeningTop

                        if (!isPassage && !isRailingSpan && effHeaderH > 0.02) {
                            const opMid = op.position
                            const basePos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid, effOpeningTop, wPos[2]]
                                : [wPos[0], effOpeningTop, room.z + opMid]

                            if (isArchway) {
                                // NOTE — ArchHeader3D still takes a single mat/color
                                // (not split interior/exterior). Not changed here:
                                // haven't seen this component's internals, so not
                                // guessing at its prop shape — flag if it needs the
                                // same split treatment.
                                panels.push(
                                    <group key={`h${i}`} position={basePos}>
                                        <ArchHeader3D
                                            width={op.width}
                                            headerH={headerH}
                                            thickness={T}
                                            angle={wall.axis === 'x' ? 0 : Math.PI / 2}
                                            mat={resolvedWallMaterial}
                                            color={isWallSelected ? '#A5A6F5' : resolvedWallColor}
                                            roughness={wallRoughness}
                                            opacity={opacity}
                                            transparent={transparent}
                                        />
                                    </group>
                                )
                            } else {
                                const hSize: [number, number, number] = wall.axis === 'x' ? [op.width, effHeaderH, T] : [T, effHeaderH, op.width]

                                panels.push(
                                    <mesh key={`h${i}`} position={[basePos[0], effOpeningTop + effHeaderH / 2, basePos[2]]} castShadow receiveShadow {...wallClickHandlers}>
                                        <boxGeometry args={hSize} />
                                        <WallFaceMaterials
                                            wallName={wall.name}
                                            interiorMat={resolvedWallMaterial}
                                            exteriorMat={resolvedExteriorMaterial}
                                            interiorColor={resolvedWallColor}
                                            exteriorColor={resolvedWallColor}
                                            isSelected={isWallSelected}
                                            roughness={wallRoughness}
                                            textured={wallTextured}
                                            runLength={op.width}
                                            runHeight={hSize[1]}
                                            runDepth={hSize[2]}
                                            opacity={opacity}
                                            transparent={transparent}
                                        />
                                    </mesh>
                                )
                            }
                        }

                        if ((op.type === 'window' || op.type === 'door') && op.sillHeight > 0.02) {
                            const opMid = op.position
                            const sPos: [number, number, number] = wall.axis === 'x' ? [room.x + opMid, op.sillHeight / 2, wPos[2]] : [wPos[0], op.sillHeight / 2, room.z + opMid]
                            const sSize: [number, number, number] = wall.axis === 'x' ? [op.width, op.sillHeight, T] : [T, op.sillHeight, op.width]
                            panels.push(
                                <mesh key={`s${i}`} position={sPos} castShadow receiveShadow {...wallClickHandlers}>
                                    <boxGeometry args={sSize} />
                                    <WallFaceMaterials
                                        wallName={wall.name}
                                        interiorMat={resolvedWallMaterial}
                                        exteriorMat={resolvedExteriorMaterial}
                                        interiorColor={resolvedWallColor}
                                        exteriorColor={resolvedWallColor}
                                        isSelected={isWallSelected}
                                        roughness={wallRoughness}
                                        textured={wallTextured}
                                        runLength={sSize[0]}
                                        runHeight={sSize[1]}
                                        runDepth={sSize[2]}
                                        opacity={opacity}
                                        transparent={transparent}
                                    />
                                </mesh>
                            )
                        }

                        if (op.type === 'window') {
                            const opMid = op.position
                            const angle = wall.axis === "x" ? 0 : Math.PI / 2

                            const winBasePos = getWindowBasePos(
                                wall.name,
                                opMid,
                                op.sillHeight,
                                op.height
                            )

                            panels.push(
                                <group
                                    key={`g${i}`}
                                    onClick={interactive ? (e) => { e.stopPropagation(); onSelect?.(op.id) } : undefined}
                                    onPointerOver={interactive ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined}
                                    onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
                                >
                                    <WindowVariant3D key={`g${i}`} op={op} angle={angle} basePos={winBasePos} opacity={opacity} transparent={transparent} />
                                </group>
                            )
                        }

                        if (op.type === 'door') {
                            const opMid = op.position
                            const angle = wall.axis === 'x' ? 0 : Math.PI / 2
                            const doorBasePos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid, op.sillHeight + op.height / 2, wPos[2]]
                                : [wPos[0], op.sillHeight + op.height / 2, room.z + opMid]


                            panels.push(
                                <group
                                    key={`door${i}`}
                                    onClick={interactive ? (e) => { e.stopPropagation(); onSelect?.(op.id) } : undefined}
                                    onPointerOver={interactive ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined}
                                    onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
                                >
                                    <DoorVariant3D
                                        key={`door${i}`}
                                        op={op}
                                        angle={angle}
                                        basePos={doorBasePos}
                                        doorStyle={doorStyle} onToggleOpen={onToggleDoorOpen} interactive={interactive}
                                        opacity={opacity} transparent={transparent}
                                    />
                                </group>
                            )
                        }
                        if (op.type === 'railing') {
                            const opMid = op.position
                            const angle = wall.axis === 'x' ? 0 : Math.PI / 2
                            const railBasePos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid, 0, wPos[2]]
                                : [wPos[0], 0, room.z + opMid]

                            panels.push(
                                <group
                                    key={`rail${i}`}
                                    position={railBasePos}
                                    rotation={[0, angle, 0]}
                                    onClick={interactive ? (e) => { e.stopPropagation(); onSelect?.(op.id) } : undefined}
                                    onPointerOver={interactive ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined}
                                    onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
                                >
                                    <Railing3D
                                        from={[-op.width / 2, 0, 0]}
                                        to={[op.width / 2, 0, 0]}
                                        wallRoughness={wallRoughness}
                                        color={op.railingColor ?? (isWallSelected ? '#A5A6F5' : resolvedWallColor)}
                                        height={op.railingHeight ?? 0.9}
                                        style={op.railingStyle ?? 'baluster'}
                                        postSpacing={op.railingPostSpacing}
                                        railingWidth={op.railingWidthDim}
                                    />
                                </group>
                            )
                        }

                        cursor = op.position + op.width / 2
                    }
                }
                return <group key={wall.name}>{panels}</group>
            })}

            {/* Wall Decor — gated to wallType === 'solid' only; nothing to mount
                a decor item to on an open or railing wall. */}
            {wallType === 'solid' && (wallDecor ?? []).filter(d => d.roomId === room.id && !d.segmentNodeIds).map(d => {
                if (!d.wall) return null
                const isH = d.wall === 'north' || d.wall === 'south'
                const inward = d.facingInward ?? true
                // NEW — flipping the face also flips the direction the item should
                // face, otherwise a painting mounted on the outer face would render
                // backwards (front pressed against the wall).
                const angle = (isH ? 0 : Math.PI / 2) + (inward ? 0 : Math.PI)
                let dx: number, dz: number
                const off = inward ? 1 : -1
                if (d.wall === 'north') { dx = room.x + d.position; dz = room.z + T / 2 * off }
                else if (d.wall === 'south') { dx = room.x + d.position; dz = room.z + D - T / 2 * off }
                else if (d.wall === 'west') { dx = room.x + T / 2 * off; dz = room.z + d.position }
                else { dx = room.x + W - T / 2 * off; dz = room.z + d.position }
                return (
                    <group
                        key={d.id}
                        onClick={interactive ? (e) => { e.stopPropagation(); onSelect?.(d.id) } : undefined}
                        onPointerOver={interactive ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined}
                        onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
                    >
                        <WallDecorMesh
                            decor={d}
                            angle={angle + (d.rotation ?? 0)}
                            basePos={[dx, d.heightOffset, dz]}
                            opacity={opacity}
                            transparent={transparent} />
                    </group>
                )
            })}
        </group>
    )
}

export { Room3D }