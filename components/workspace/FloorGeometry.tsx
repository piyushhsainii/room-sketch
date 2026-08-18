import { memo } from "react"
import { Room3D } from "./3dRoom"
import { LineWalls3D } from "./objects/line-walls-3d"
import { StairsMesh } from "./mesh/stairsMesh"
import { FurnitureMesh } from "./mesh/furnitureMesh"
import { OutdoorObjectMesh } from "./mesh/outdoor-object-mesh"
import type { FloorPlanState } from "./lib/constants"
import type { SceneConfig } from "./FloorPlanEditor"
import type { RefObject } from "react"
import { FloorCap } from "./FloorCap"
import { LightsLayer } from "./lib/lights/LightsLayer"

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
    shadowEligibleIds?: Set<string>
    floorAboveId?: string,
    cutoutDrawInProgress: boolean
}

function FloorGeometryImpl({
    fp, cfg, exportRootRef, interactive, selectedId, onSelect, onToggleDoorOpen,
    opacity, overlappingIds, renderCap, floorAboveFp, shadowEligibleIds, floorAboveId, cutoutDrawInProgress
}: FloorGeometryProps) {
    const transparent = opacity < 1
    // NOTE: removed two console.logs that used to sit here:
    //   console.log('[FP ROOMS CHECK]', ...)          — ran once per render of this component
    //   console.log('[CUTOUT DEBUG]', room.label, ...) — ran once PER ROOM per render (worse)
    // Both were in the render body (not gated behind an effect or a dev flag),
    // so every re-render — including ones caused by unrelated 2D-canvas hover
    // state in a shared parent — was spamming these to the console, once per
    // room for the cutout one. If you need this debug info again, gate it:
    //   if (process.env.NODE_ENV === 'development' && DEBUG_CUTOUTS) console.log(...)
    return (
        <>
            {renderCap && floorAboveFp && (
                <FloorCap fp={fp} height={fp.roomHeight} floorAbove={floorAboveFp} floorAboveId={floorAboveId} />
            )}
            <group ref={exportRootRef}>
                {fp.rooms.map(room => {
                    const roomCfg = cfg.rooms.find(r => r.roomId === room.id)
                    const roomCutouts = (fp.closedShapes ?? [])
                        .filter(sh => sh.cutout?.enabled)
                        .map(sh => sh.nodeIds.map(id => fp.lineNodes.find(n => n.id === id)).filter(Boolean) as { x: number; z: number }[])
                        .filter(poly => poly.some(p => p.x >= room.x && p.x <= room.x + room.width && p.z >= room.z && p.z <= room.z + room.depth))

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
                            cutouts={roomCutouts}
                        />
                    )
                })}
                <LightsLayer
                    fp={fp}
                    interactive={interactive}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    opacity={opacity}
                    transparent={transparent}
                />
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
                    cutoutDrawInProgress={cutoutDrawInProgress}
                />
            </group>
            {cfg.showFurniture !== false && (fp.furniture ?? []).map(f => (
                <group key={f.id}>
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

// Wrapped in memo with the default shallow prop comparison. This is safe here
// (unlike Scene3D, no custom comparator needed) as long as the parent passes
// stable references for onSelect/onToggleDoorOpen (see Scene3D fix — those
// must be wrapped in useCallback upstream) and overlappingIds (useState/useMemo,
// not recreated inline). If FloorGeometry still re-renders unexpectedly after
// this, the leak is a prop reference from Scene3D or its parent, not this file.
export const FloorGeometry = memo(FloorGeometryImpl)