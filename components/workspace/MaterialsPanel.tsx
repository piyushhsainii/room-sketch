// components/workspace/MaterialsPanel.tsx
'use client'

import React, { useMemo } from 'react'
import { FloorPlanState, FLOOR_MAT_DEFS, WALL_MAT_DEFS, FloorMaterial, WallMaterial, DOOR_STYLES, ClosedShape } from './Tools/constants'
import { SceneConfig, RoomSceneConfig } from './FloorPlanEditor'
import { deriveClosedPolygons } from '@/lib/helpers'
import { MP_THEME as T, MaterialCategory, CollapsibleCard, SectionHeading, toMaterialItems, labelize } from './MaterialPicker'

function uid() { return Math.random().toString(36).slice(2, 9) }

interface Props {
    fp: FloorPlanState
    config: SceneConfig
    onChange: (cfg: SceneConfig) => void
    onChangeFp?: (fp: FloorPlanState) => void
}

export function MaterialsPanel({ fp, config, onChange, onChangeFp }: Props) {
    const wallItems = useMemo(() => toMaterialItems(WALL_MAT_DEFS), [])
    const floorItems = useMemo(() => toMaterialItems(FLOOR_MAT_DEFS), [])
    const doorItems = useMemo(
        () => DOOR_STYLES.map(d => ({ key: d.value, label: d.label, color: d.color })),
        []
    )

    const updateRoom = (roomId: string, changes: Partial<RoomSceneConfig>) => {
        const existing = config.rooms.find(r => r.roomId === roomId) ?? { roomId }
        const updated = { ...existing, ...changes }
        const newRooms = [...config.rooms.filter(r => r.roomId !== roomId), updated]
        onChange({ ...config, rooms: newRooms })
    }

    const derivedPolygons = useMemo(
        () => deriveClosedPolygons(fp.lineNodes, fp.lineSegments),
        [fp.lineNodes, fp.lineSegments]
    )

    const updateShape = (nodeIds: string[], matchedShape: ClosedShape | undefined, shapeLabel: string, patch: Partial<ClosedShape>) => {
        if (!onChangeFp) return
        let shapes = [...(fp.closedShapes ?? [])]
        if (matchedShape) {
            shapes = shapes.map(s => s.id === matchedShape.id ? { ...s, ...patch } : s)
        } else {
            shapes.push({ id: uid(), nodeIds: [...nodeIds], label: shapeLabel, color: '#8B7B6B', ...patch })
        }
        onChangeFp({ ...fp, closedShapes: shapes })
    }

    // NOTE: no ScrollableList / fixed maxHeight wrapper here — this panel is
    // rendered inside the Dock's own content container, which already owns
    // scrolling via `flex: 1, overflowY: 'auto', minHeight: 0` (same pattern
    // FurnitureToolbar uses: a plain div, no competing scroll container of
    // its own). Stacking a second fixed-height scroll container inside that
    // caused the overflow-with-no-scrollbar bug — only one element should
    // ever own vertical scroll for this panel.
    return (
        <div style={{ padding: '14px 16px 24px', background: T.bg, fontFamily: 'system-ui, sans-serif', minWidth: 0 }}>

            {/* ── GLOBAL DEFAULT MATERIALS ─────────────────────────── */}
            <SectionHeading>Global Default Materials</SectionHeading>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 14px', boxShadow: T.shadow, marginBottom: 20, minWidth: 0 }}>
                <MaterialCategory
                    icon="🧱" title="Wall Materials"
                    items={wallItems} currentVal={config.globalWallMaterial || 'paint'}
                    onSelect={v => onChange({ ...config, globalWallMaterial: v as WallMaterial })}
                />
                <MaterialCategory
                    icon="🪵" title="Floor Materials"
                    items={floorItems} currentVal={config.globalFloorMaterial || 'plain'}
                    onSelect={v => onChange({ ...config, globalFloorMaterial: v as FloorMaterial })}
                />
                <MaterialCategory
                    icon="🚪" title="Door Style"
                    items={doorItems} currentVal={config.doorStyle}
                    onSelect={v => onChange({ ...config, doorStyle: v as typeof config.doorStyle })}
                />
            </div>

            {/* ── ROOM OVERRIDES ───────────────────────────────────── */}
            <SectionHeading>Room Overrides</SectionHeading>
            {fp.rooms.length === 0 ? (
                <div style={{ fontSize: 12, color: T.textFaint, padding: '12px 2px' }}>No rooms yet.</div>
            ) : (
                fp.rooms.map(room => {
                    const roomOverride = config.rooms.find(r => r.roomId === room.id)
                    const activeWall = roomOverride?.wallMaterial || config.globalWallMaterial || 'paint'
                    const activeFloor = roomOverride?.floorMaterial || config.globalFloorMaterial || 'plain'
                    const hasOverride = Boolean(roomOverride?.wallMaterial || roomOverride?.floorMaterial)

                    return (
                        <CollapsibleCard
                            key={room.id}
                            title={room.label || 'Unnamed Room'}
                            subtitle={hasOverride ? `${labelize(activeWall)} · ${labelize(activeFloor)}` : 'Using global defaults'}
                        >
                            <MaterialCategory
                                icon="🧱" title="Wall" items={wallItems} currentVal={activeWall}
                                onSelect={v => updateRoom(room.id, { wallMaterial: v as WallMaterial })}
                            />
                            <MaterialCategory
                                icon="🪵" title="Floor" items={floorItems} currentVal={activeFloor}
                                onSelect={v => updateRoom(room.id, { floorMaterial: v as FloorMaterial })}
                            />
                        </CollapsibleCard>
                    )
                })
            )}

            {/* ── AREA OVERRIDES ───────────────────────────────────── */}
            <SectionHeading>Area Overrides</SectionHeading>
            {derivedPolygons.length === 0 ? (
                <div style={{ fontSize: 12, color: T.textFaint, padding: '12px 2px' }}>
                    No closed areas detected. Connect line walls to form an enclosed shape.
                </div>
            ) : (
                derivedPolygons.map((nodeIds, idx) => {
                    const nodeIdSet = new Set(nodeIds)
                    const matchedShape = (fp.closedShapes ?? []).find(s =>
                        s.nodeIds.length === nodeIds.length && s.nodeIds.every(id => nodeIdSet.has(id))
                    )
                    const shapeLabel = matchedShape?.label ?? `Area ${idx + 1}`
                    const activeWall = matchedShape?.wallMaterial || config.globalWallMaterial || 'paint'
                    const activeFloor = matchedShape?.floorMaterial || config.globalFloorMaterial || 'plain'
                    const hasOverride = Boolean(matchedShape?.wallMaterial || matchedShape?.floorMaterial)

                    return (
                        <CollapsibleCard
                            key={idx}
                            title={shapeLabel}
                            subtitle={hasOverride ? `${labelize(activeWall)} · ${labelize(activeFloor)}` : 'Using global defaults'}
                        >
                            <MaterialCategory
                                icon="🧱" title="Wall" items={wallItems} currentVal={activeWall}
                                onSelect={v => updateShape(nodeIds, matchedShape, shapeLabel, { wallMaterial: v as WallMaterial })}
                            />
                            <MaterialCategory
                                icon="🪵" title="Floor" items={floorItems} currentVal={activeFloor}
                                onSelect={v => updateShape(nodeIds, matchedShape, shapeLabel, { floorMaterial: v as FloorMaterial })}
                            />
                        </CollapsibleCard>
                    )
                })
            )}
        </div>
    )
}