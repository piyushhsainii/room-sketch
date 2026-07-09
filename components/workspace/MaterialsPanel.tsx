// components/workspace/MaterialsPanel.tsx
import React from 'react'
import { FloorPlanState, FLOOR_MAT_DEFS, WALL_MAT_DEFS, FloorMaterial, WallMaterial, DOOR_STYLES } from './Tools/constants'
import { SceneConfig, RoomSceneConfig } from './FloorPlanEditor'

const THEME = { border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', bg: '#FFFFFF', bgHover: '#F3F4F6', accent: '#2563EB' }

interface Props {
    fp: FloorPlanState
    config: SceneConfig
    onChange: (cfg: SceneConfig) => void
}

export function MaterialsPanel({ fp, config, onChange }: Props) {
    const updateRoom = (roomId: string, changes: Partial<RoomSceneConfig>) => {
        const existing = config.rooms.find(r => r.roomId === roomId) ?? { roomId }
        const updated = { ...existing, ...changes }
        const newRooms = [
            ...config.rooms.filter(r => r.roomId !== roomId),
            updated
        ]
        onChange({ ...config, rooms: newRooms })
    }

    const renderSwatches = (
        type: 'wall' | 'floor',
        currentVal: string,
        onSelect: (val: WallMaterial | FloorMaterial) => void
    ) => {
        const defs = type === 'wall' ? WALL_MAT_DEFS : FLOOR_MAT_DEFS
        return (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {Object.entries(defs).map(([key, def]) => {
                    const hasImagePreview = def.preview?.startsWith('/')
                    return (
                        <button
                            key={key}
                            onClick={() => onSelect(key as WallMaterial | FloorMaterial)}
                            title={key}
                            style={{
                                width: 28, height: 28, borderRadius: 4, cursor: 'pointer',
                                backgroundColor: hasImagePreview ? undefined : def.color,
                                backgroundImage: hasImagePreview ? `url(${def.preview})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                border: currentVal === key ? `2px solid ${THEME.accent}` : `1px solid ${THEME.border}`,
                                boxShadow: currentVal === key ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none'
                            }}
                        />
                    )
                })}
            </div>
        )
    }

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, color: THEME.text }}>Global Default Materials</h4>
                <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: THEME.textMuted }}>Wall Material</span>
                    {renderSwatches('wall', config.globalWallMaterial || 'paint', (v) => onChange({ ...config, globalWallMaterial: v as WallMaterial }))}
                </div>
                <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: THEME.textMuted }}>Floor Material</span>
                    {renderSwatches('floor', config.globalFloorMaterial || 'plain', (v) => onChange({ ...config, globalFloorMaterial: v as FloorMaterial }))}
                </div>
                <div>
                    <span style={{ fontSize: 12, color: THEME.textMuted }}>Door Style</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {DOOR_STYLES.map(d => (
                            <button
                                key={d.value}
                                onClick={() => onChange({ ...config, doorStyle: d.value })}
                                title={d.label}
                                style={{
                                    width: 28, height: 28, borderRadius: 4, cursor: 'pointer',
                                    backgroundColor: d.color,
                                    border: config.doorStyle === d.value ? `2px solid ${THEME.accent}` : `1px solid ${THEME.border}`,
                                    boxShadow: config.doorStyle === d.value ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ height: 1, background: THEME.border }} />

            <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, color: THEME.text }}>Room Overrides</h4>
                {fp.rooms.map(room => {
                    const roomOverride = config.rooms.find(r => r.roomId === room.id)
                    const activeWall = roomOverride?.wallMaterial || config.globalWallMaterial || 'paint'
                    const activeFloor = roomOverride?.floorMaterial || config.globalFloorMaterial || 'plain'

                    return (
                        <div key={room.id} style={{ padding: '8px 0', borderBottom: `1px dashed ${THEME.border}` }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, marginBottom: 8 }}>{room.label || 'Unnamed Room'}</div>
                            <div style={{ marginBottom: 8 }}>
                                <span style={{ fontSize: 11, color: THEME.textMuted }}>Wall</span>
                                {renderSwatches('wall', activeWall, (v) => updateRoom(room.id, { wallMaterial: v as WallMaterial }))}
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: THEME.textMuted }}>Floor</span>
                                {renderSwatches('floor', activeFloor, (v) => updateRoom(room.id, { floorMaterial: v as FloorMaterial }))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}