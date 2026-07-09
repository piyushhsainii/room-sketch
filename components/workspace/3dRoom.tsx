import { ArchHeader3D } from "./objects/arch-header";
import { DoorVariant3D } from "./objects/door-variants";
import { FloorMat } from "./objects/floormat";
import { WallDecorMesh } from "./objects/wall-decor-mesh";
import { WallMat } from "./objects/wallmat";
import { WindowVariant3D } from "./objects/window-variant3d";
import { EditorOpening, EditorRoom, FloorMaterial, PlacedWallDecor, WallMaterial } from "./Tools/constants";

function Room3D({
    room,
    openings = [], // Guard against undefined/null openings array on initial loads
    roomHeight,
    wallColor = '#FFFFFF',
    wallRoughness = 0.95,
    wallTextured = false,
    floorMat = 'plain',
    doorStyle = 'natural',
    wallDecor,
    wallMaterial = 'paint',
    onSelectRoom
}: {
    room: EditorRoom;
    openings?: EditorOpening[];
    roomHeight: number
    wallColor?: string;
    wallRoughness?: number;
    wallTextured?: boolean;
    floorMat?: string;
    doorStyle?: string
    wallDecor?: PlacedWallDecor[]
    wallMaterial?: WallMaterial
    onSelectRoom?: (roomId: string) => void
}) {
    const cx = room.x + room.width / 2
    const cz = room.z + room.depth / 2
    const W = room.width, D = room.depth, H = roomHeight, T = 0.15

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

    const handleWallClick = (e: any) => { e.stopPropagation(); onSelectRoom?.(room.id) }

    return (
        <group>
            {/* Floor */}
            <mesh
                position={[cx, 0.002, cz]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
                onClick={handleWallClick}
            >
                <planeGeometry args={[W - T * 2, D - T * 2]} />
                <FloorMat mat={floorMat as FloorMaterial} width={W - T * 2} depth={D - T * 2} />
            </mesh>

            {/* Walls */}
            {walls.map(wall => {
                const wallOpenings = openings.filter(o => o.wall === wall.name && !o.segmentNodeIds)
                const wallLen = wall.axis === 'x' ? W : D
                const wPos = wallWorldPos(wall.name)

                if (wallOpenings.length === 0) {
                    const size = wallSize(wall.axis)
                    return (
                        <mesh
                            key={wall.name}
                            position={wPos}
                            castShadow receiveShadow
                            onClick={handleWallClick}
                        >
                            <boxGeometry args={size} />
                            <WallMat mat={wallMaterial} color={wallColor} roughness={wallRoughness} textured={wallTextured} width={size[0]} height={size[1]} depth={size[2]} />
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
                            <mesh key={`l${i}`} position={pos} castShadow receiveShadow onClick={handleWallClick}>
                                <boxGeometry args={size} />
                                <WallMat mat={wallMaterial} color={wallColor} roughness={wallRoughness} textured={wallTextured} width={size[0]} height={size[1]} depth={size[2]} />
                            </mesh>
                        )
                    }

                    if (op) {
                        const isPassage = op.type === 'opening' && op.variant === 'opening-passage'
                        const isArchway = op.type === 'opening' && op.variant === 'opening-archway'
                        const headerH = H - op.height

                        if (!isPassage && headerH > 0.02) {
                            const opMid = op.position
                            const basePos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid, op.height, wPos[2]]
                                : [wPos[0], op.height, room.z + opMid]

                            if (isArchway) {
                                panels.push(
                                    <group key={`h${i}`} position={basePos}>
                                        <ArchHeader3D width={op.width} headerH={headerH} thickness={T} wallAxis={wall.axis} color={wallColor} roughness={wallRoughness} />
                                    </group>
                                )
                            } else {
                                const hSize: [number, number, number] = wall.axis === 'x' ? [op.width, headerH, T] : [T, headerH, op.width]
                                panels.push(
                                    <mesh key={`h${i}`} position={[basePos[0], op.height + headerH / 2, basePos[2]]} castShadow receiveShadow onClick={handleWallClick}>
                                        <boxGeometry args={hSize} />
                                        <WallMat mat={wallMaterial} color={wallColor} roughness={wallRoughness} textured={wallTextured} width={hSize[0]} height={hSize[1]} depth={hSize[2]} />
                                    </mesh>
                                )
                            }
                        }

                        if (op.type === 'window' && op.sillHeight > 0.02) {
                            const opMid = op.position
                            const sPos: [number, number, number] = wall.axis === 'x' ? [room.x + opMid, op.sillHeight / 2, wPos[2]] : [wPos[0], op.sillHeight / 2, room.z + opMid]
                            const sSize: [number, number, number] = wall.axis === 'x' ? [op.width, op.sillHeight, T] : [T, op.sillHeight, op.width]
                            panels.push(
                                <mesh key={`s${i}`} position={sPos} castShadow receiveShadow onClick={handleWallClick}>
                                    <boxGeometry args={sSize} />
                                    <WallMat mat={wallMaterial} color={wallColor} roughness={wallRoughness} textured={wallTextured} width={sSize[0]} height={sSize[1]} depth={sSize[2]} />
                                </mesh>
                            )
                        }

                        if (op.type === 'window') {
                            const opMid = op.position
                            const angle = wall.axis === 'x' ? 0 : Math.PI / 2
                            const winBasePos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid, op.sillHeight + op.height / 2, wPos[2]]
                                : [wPos[0], op.sillHeight + op.height / 2, room.z + opMid]
                            panels.push(
                                <WindowVariant3D key={`g${i}`} op={op} angle={angle} basePos={winBasePos} />
                            )
                        }

                        if (op.type === 'door') {
                            const opMid = op.position
                            const angle = wall.axis === 'x' ? 0 : Math.PI / 2
                            const doorBasePos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid, op.height / 2, wPos[2]]
                                : [wPos[0], op.height / 2, room.z + opMid]
                            panels.push(
                                <DoorVariant3D
                                    key={`door${i}`}
                                    op={op}
                                    angle={angle}
                                    basePos={doorBasePos}
                                    doorStyle={doorStyle}
                                />
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
                const angle = isH ? 0 : Math.PI / 2

                const normalOffset = T / 2 + 0.02
                let dx: number, dz: number
                if (d.wall === 'north') { dx = room.x + d.position; dz = room.z + normalOffset }
                else if (d.wall === 'south') { dx = room.x + d.position; dz = room.z + D - normalOffset }
                else if (d.wall === 'west') { dx = room.x + normalOffset; dz = room.z + d.position }
                else { dx = room.x + W - normalOffset; dz = room.z + d.position }

                return (
                    <WallDecorMesh
                        key={d.id}
                        decor={d}
                        angle={angle}
                        basePos={[dx, d.heightOffset, dz]}
                    />
                )
            })}
        </group>
    )
}

export { Room3D }