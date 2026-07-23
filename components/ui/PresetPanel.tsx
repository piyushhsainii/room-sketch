import { useState } from 'react'
import { ROOM_TEMPLATES, RoomTemplate, WALL_PRESETS, WallPreset } from '../workspace/lib/presets'
import { THEME } from '../workspace/FloorPlanEditor'

type Tab = 'walls' | 'rooms'

export function PresetsPanel({
    onSelectWallPreset,
    onSelectRoomTemplate,
    armedWallPresetId,
    armedTemplateId,
}: {
    onSelectWallPreset: (preset: WallPreset) => void
    onSelectRoomTemplate: (template: RoomTemplate) => void
    /** Currently-armed preset, if any — shown highlighted so the user knows
     *  what they're about to draw/place before they click the canvas. */
    armedWallPresetId?: string | null
    armedTemplateId?: string | null
}) {
    const [tab, setTab] = useState<Tab>('walls')

    const tabBtnStyle = (active: boolean): React.CSSProperties => ({
        flex: 1, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: 11.5, fontWeight: 600,
        background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
        color: active ? 'rgba(99,102,241,0.95)' : THEME.textMuted,
    })

    return (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.7)' }}>
                ROOM PRESETS
            </div>

            <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 8, padding: 3 }}>
                <button style={tabBtnStyle(tab === 'walls')} onClick={() => setTab('walls')}>Walls</button>
                <button style={tabBtnStyle(tab === 'rooms')} onClick={() => setTab('rooms')}>Rooms</button>
            </div>

            {tab === 'walls' && (
                <>
                    <div style={{ fontSize: 10.5, color: THEME.textFaint, lineHeight: 1.4 }}>
                        Pick a wall type, then draw with Line/Bend as usual — the preset applies to walls you draw next.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {WALL_PRESETS.map(p => (
                            <PresetCard
                                key={p.id}
                                label={p.label}
                                active={armedWallPresetId === p.id}
                                sublabel={`${(p.thickness * 100).toFixed(0)}cm`}
                                onClick={() => onSelectWallPreset(p)}
                            />
                        ))}
                    </div>
                </>
            )}

            {tab === 'rooms' && (
                <>
                    <div style={{ fontSize: 10.5, color: THEME.textFaint, lineHeight: 1.4 }}>
                        Pick a template, then click anywhere on the canvas to place it.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {ROOM_TEMPLATES.map(t => (
                            <PresetCard
                                key={t.id}
                                label={t.label}
                                active={armedTemplateId === t.id}
                                sublabel={`${t.rooms[0].width}m × ${t.rooms[0].depth}m`}
                                onClick={() => onSelectRoomTemplate(t)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

function PresetCard({ label, sublabel, active, onClick }: {
    label: string
    sublabel: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                padding: '10px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                border: active ? '1.5px solid rgba(99,102,241,0.8)' : `1px solid ${THEME.borderStrong}`,
                background: active ? 'rgba(99,102,241,0.08)' : '#FAFAFA',
            }}
        >
            <div style={{
                width: '100%', height: 40, borderRadius: 5, marginBottom: 2,
                background: active ? 'rgba(99,102,241,0.18)' : 'rgba(148,163,184,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: active ? 'rgba(99,102,241,0.8)' : THEME.textFaint,
            }}>
                ▦
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: THEME.text }}>{label}</span>
            <span style={{ fontSize: 10, color: THEME.textFaint }}>{sublabel}</span>
        </button>
    )
}