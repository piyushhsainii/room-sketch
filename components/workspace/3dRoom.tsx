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
    const W = room.width, D = room.depth, H = roomHeight, T = 0.15
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

            {walls.map(wall => {
                const wallOpenings = openings.filter(o => o.wall === wall.name && !o.segmentNodeIds)
                const wallLen = wall.axis === 'x' ? W : D
                const wPos = wallWorldPos(wall.name)
                const wallId = `${room.id}::wall::${wall.name}`
                const isWallSelected = interactive && selectedId === wallId
                const wallOverride = roomWallOverrides?.[wall.name]
                const resolvedWallMaterial = wallOverride?.material ?? wallMaterial
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
                            <WallMat mat={resolvedWallMaterial} color={isWallSelected ? '#A5A6F5' : resolvedWallColor}
                                roughness={wallRoughness} textured={wallTextured}
                                width={wallRunLength(wall.axis)} height={wallSize(wall.axis)[1]} depth={wallSize(wall.axis)[2]}
                                opacity={opacity} transparent={transparent} />
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
                                <WallMat mat={resolvedWallMaterial} color={isWallSelected ? '#A5A6F5' : resolvedWallColor}
                                    roughness={wallRoughness} textured={wallTextured}
                                    width={segLen} height={size[1]} depth={size[2]}
                                    opacity={opacity} transparent={transparent} />
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
                                        <WallMat
                                            mat={resolvedWallMaterial}
                                            color={isWallSelected ? '#A5A6F5' : resolvedWallColor}
                                            roughness={wallRoughness} textured={wallTextured}
                                            width={op.width}
                                            height={hSize[1]}
                                            depth={hSize[2]}
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
                                    <WallMat
                                        mat={resolvedWallMaterial}
                                        color={isWallSelected ? '#A5A6F5' : resolvedWallColor}
                                        roughness={wallRoughness} textured={wallTextured}
                                        width={sSize[0]}
                                        height={sSize[1]}
                                        depth={sSize[2]}
                                        opacity={opacity}
                                        transparent={transparent} />
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

            {/* Wall Decor */}
            {(wallDecor ?? []).filter(d => d.roomId === room.id && !d.segmentNodeIds).map(d => {
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