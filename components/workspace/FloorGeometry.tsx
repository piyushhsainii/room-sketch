// New: FloorGeometry.tsx — extracted verbatim from Scene3D's existing JSX,
// just parameterized by fp/cfg/opacity/interactive instead of closing over
// Scene3D's own props directly.

import { Room3D } from "./3dRoom"
import { LineWalls3D } from "./objects/line-walls-3d"
import { StairsMesh } from "./mesh/stairsMesh"
import { FurnitureMesh } from "./mesh/furnitureMesh"
import { LightFixtureMesh } from "./mesh/lights-mesh"
import { OutdoorObjectMesh } from "./mesh/outdoor-object-mesh"
import { StringLightsMesh } from "./mesh/string-lights-mesh"
import type { FloorPlanState } from "./lib/constants"
import type { SceneConfig } from "./FloorPlanEditor"
import type { RefObject } from "react"
import { FloorCap } from "./FloorCap"

type FloorGeometryProps = {
    fp: FloorPlanState
    cfg: SceneConfig
    exportRootRef?: RefObject<any>
    interactive: boolean
    selectedId?: string | null
    onSelect?: (id: string | null) => void
    onToggleDoorOpen?: (openingId: string) => void
    opacity: number
    overlappingIds?: Set<string>
    renderCap?: boolean
    floorAboveFp?: FloorPlanState
}

export function FloorGeometry({
    fp,
    cfg,
    exportRootRef,
    interactive,
    selectedId,
    onSelect,
    onToggleDoorOpen,
    opacity,
    overlappingIds,   // NEW
    renderCap,
    floorAboveFp

}: FloorGeometryProps) {
    const transparent = opacity < 1

    return (
        <>
            {
                renderCap &&
                floorAboveFp &&
                <FloorCap
                    fp={fp}
                    height={fp.roomHeight}
                    floorAbove={floorAboveFp} />
            }
            <group ref={exportRootRef}>
                {fp.rooms.map(room => {
                    const roomCfg = cfg.rooms.find(r => r.roomId === room.id)
                    return (
                        <Room3D
                            key={room.id}
                            room={room}
                            openings={fp.openings.filter(o => o.roomId === room.id)}
                            roomHeight={fp.roomHeight}
                            wallColor={roomCfg?.wallColor ?? '#FFFFFF'}
                            wallRoughness={cfg.wallRoughness}
                            wallTextured={cfg.wallTextured}
                            floorMat={roomCfg?.floorMaterial ?? cfg.globalFloorMaterial ?? 'plain'}
                            doorStyle={cfg.doorStyle ?? 'natural'}
                            wallDecor={fp.wallDecor}
                            interactive={interactive}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            wallMaterial={roomCfg?.wallMaterial ?? cfg.globalWallMaterial ?? 'paint'}
                            onSelectRoom={(roomId) => onSelect?.(roomId)}
                            onToggleDoorOpen={onToggleDoorOpen}
                            roomWallOverrides={roomCfg?.wallOverrides}
                            opacity={opacity}
                            transparent={transparent}
                        />
                    )
                })}
                {(fp.lights ?? []).filter(l => l.type === 'string_lights').map(l => (
                    <StringLightsMesh key={l.id} light={l} fp={fp} selected={interactive && selectedId === l.id}
                        onSelect={interactive ? () => onSelect?.(l.id) : undefined} />
                ))}
                {(fp.lights ?? []).filter(l => l.type !== 'string_lights').map(light => {
                    let pos: [number, number, number]
                    let rot = 0
                    const T = 0.15, normalOffset = T / 2 + 0.05
                    const inward = light.facingInward ?? true
                    const faceDir = inward ? 1 : -1

                    if (light.segmentNodeIds) {
                        const a = fp.lineNodes.find(n => n.id === light.segmentNodeIds![0])
                        const b = fp.lineNodes.find(n => n.id === light.segmentNodeIds![1])
                        if (!a || !b) return null
                        const t = light.segmentT ?? 0
                        const px = a.x + (b.x - a.x) * t
                        const pz = a.z + (b.z - a.z) * t
                        const angle = Math.atan2(b.z - a.z, b.x - a.x)
                        const nx = Math.sin(angle), nz = -Math.cos(angle)
                        pos = [px + nx * normalOffset * faceDir, light.heightOffset, pz + nz * normalOffset * faceDir]
                        rot = inward ? -angle : -angle + Math.PI
                    } else if (light.roomId && light.wall) {
                        const room = fp.rooms.find(r => r.id === light.roomId)
                        if (!room) return null
                        if (light.wall === 'north') {
                            pos = [room.x + (light.position ?? 0), light.heightOffset, room.z + normalOffset * faceDir]
                            rot = inward ? 0 : Math.PI
                        } else if (light.wall === 'south') {
                            pos = [room.x + (light.position ?? 0), light.heightOffset, room.z + room.depth - normalOffset * faceDir]
                            rot = inward ? Math.PI : 0
                        } else if (light.wall === 'west') {
                            pos = [room.x + normalOffset * faceDir, light.heightOffset, room.z + (light.position ?? 0)]
                            rot = inward ? Math.PI / 2 : -Math.PI / 2
                        } else {
                            pos = [room.x + room.width - normalOffset * faceDir, light.heightOffset, room.z + (light.position ?? 0)]
                            rot = inward ? -Math.PI / 2 : Math.PI / 2
                        }
                    } else {
                        pos = [light.x ?? 0, light.heightOffset, light.z ?? 0]
                    }

                    return (
                        <LightFixtureMesh
                            key={light.id}
                            light={light}
                            position={pos}
                            rotation={rot}
                            selected={interactive && selectedId === light.id}
                            onSelect={interactive ? () => onSelect?.(light.id) : undefined}
                            opacity={opacity}
                            transparent={transparent}
                        />
                    )
                })}
                {(fp.outdoorObjects ?? []).map(o => (
                    <OutdoorObjectMesh
                        key={o.id}
                        obj={o}
                        selected={interactive && selectedId === o.id}
                        interactive={interactive}
                        onSelect={interactive ? () => onSelect?.(o.id) : undefined}
                        opacity={opacity}
                        transparent={transparent}
                    />
                ))}
                <LineWalls3D
                    fp={fp}
                    wallRoughness={cfg.wallRoughness}
                    wallColor="#FFFFFF"
                    wallMaterial={cfg.globalWallMaterial ?? 'paint'}
                    floorMaterial={cfg.globalFloorMaterial ?? 'plain'}
                    doorStyle={cfg.doorStyle ?? 'natural'}
                    closedShapes={fp.closedShapes}
                    interactive={interactive}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onToggleDoorOpen={onToggleDoorOpen}
                    roomSceneConfigs={cfg.rooms}
                    opacity={opacity}
                    transparent={transparent}
                />
            </group>
            {cfg.showFurniture !== false && (fp.furniture ?? []).map(f => (
                <group key={f.id} /* ...unchanged... */>
                    <FurnitureMesh f={f} selected={interactive && selectedId === f.id} opacity={opacity} transparent={transparent}
                        overlapping={overlappingIds?.has(f.id)} />
                </group>
            ))}
            {cfg.showFurniture !== false && (fp.stairs ?? []).map(s => {
                const anchorSeg = s.anchorSegmentId
                    ? fp.lineSegments?.find(seg => seg.id === s.anchorSegmentId)
                    : undefined
                const effectiveHeight = anchorSeg?.height ?? fp.roomHeight

                return (
                    <group
                        key={s.id}
                        onClick={interactive ? (e) => { e.stopPropagation(); onSelect?.(s.id) } : undefined}
                        onPointerOver={interactive ? () => { document.body.style.cursor = 'pointer' } : undefined}
                        onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
                    >
                        <StairsMesh s={s} roomHeight={effectiveHeight} opacity={opacity} transparent={transparent} />
                    </group>
                )
            })}
        </>
    )
}