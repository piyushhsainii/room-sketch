import { useMemo, useState } from "react"
import { RoomSceneConfig, SceneConfig, THEME } from "./FloorPlanEditor"
import { DEFAULT_SCENE_CONFIG, DOOR_STYLES, FLOOR_MATERIALS, FloorMaterial, FloorPlanState, WALL_COLORS } from "./Tools/constants"
import { deriveClosedPolygons } from "@/lib/helpers"

export function SceneConfigPanel({
    fp, config, onChange, onChangeFp, embedded
}: {
    fp: FloorPlanState
    config: SceneConfig
    onChange: (c: SceneConfig) => void
    onChangeFp?: (fp: FloorPlanState) => void
    embedded?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [tab, setTab] = useState<'rooms' | 'shapes' | 'scene'>('rooms')
    const [selectedRoomId, setSelectedRoomId] = useState<string>(fp.rooms[0]?.id ?? '')
    const [applyAll, setApplyAll] = useState(false)
    const roomCfg = selectedRoomId ? getRoomSceneCfg(config, selectedRoomId) : null

    const derivedPolygons = useMemo(() => deriveClosedPolygons(fp.lineNodes, fp.lineSegments), [fp.lineNodes, fp.lineSegments])

    function patchRoom(patch: Partial<RoomSceneConfig>) {
        const targetIds = applyAll ? fp.rooms.map(r => r.id) : [selectedRoomId]
        let rooms = [...config.rooms]
        for (const id of targetIds) {
            const existing = rooms.find(r => r.roomId === id)
            rooms = existing
                ? rooms.map(r => r.roomId === id ? { ...r, ...patch } : r)
                : [...rooms, { roomId: id, ...patch }]
        }
        onChange({ ...config, rooms })
    }

    function patchScene(patch: Partial<SceneConfig>) {
        onChange({ ...config, ...patch })
    }

    const panelBody = (
        <div style={{
            width: embedded ? '100%' : 272,
            maxHeight: embedded ? 'none' : 440,
            height: embedded ? '100%' : undefined,
            borderRadius: embedded ? 0 : 12,
            border: embedded ? 'none' : '1px solid var(--fp-border)',
            background: embedded ? 'transparent' : 'var(--fp-bg)',
            boxShadow: embedded ? 'none' : '0 12px 32px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            fontFamily: 'system-ui, sans-serif',
        }}>
            {/* Header + tabs */}
            <div style={{ padding: '10px 12px 0', background: embedded ? 'transparent' : 'linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 100%)' }}>
                {!embedded && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fp-text)', letterSpacing: '0.02em' }}>Scene Configuration</span>
                        <button onClick={() => setOpen(false)} style={{ width: 20, height: 20, borderRadius: 4, border: 'none', background: 'var(--fp-bg-hover)', color: 'var(--fp-text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 2, background: 'var(--fp-bg-subtle)', borderRadius: 7, padding: 3, marginBottom: 0 }}>
                    {(['rooms', 'shapes', 'scene'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 26, borderRadius: 5, border: 'none', background: tab === t ? 'var(--fp-accent)' : 'transparent', color: tab === t ? 'white' : 'var(--fp-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms' }}>
                            {t === 'rooms' ? '🏠 Rooms' : t === 'shapes' ? '⬡ Shapes' : '✨ Scene'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ── ROOMS TAB ────────────────────────────────────────── */}
                {tab === 'rooms' && <>
                    {fp.rooms.length === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--fp-text-faint)', textAlign: 'center', padding: '20px 0' }}>No rooms yet. Draw rooms first.</div>
                    ) : <>
                        <div>
                            <CfgLabel>Select Room</CfgLabel>
                            <select value={selectedRoomId} onChange={e => setSelectedRoomId(e.target.value)} style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid var(--fp-border-strong)', background: 'var(--fp-bg-subtle)', color: 'var(--fp-text)', fontSize: 12, padding: '0 8px', outline: 'none', cursor: 'pointer' }}>
                                {fp.rooms.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                        </div>

                        <div onClick={() => setApplyAll(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: applyAll ? 'var(--fp-accent-bg)' : 'var(--fp-bg-subtle)', border: `1px solid ${applyAll ? 'var(--fp-accent-border)' : 'var(--fp-border)'}`, cursor: 'pointer', transition: 'all 150ms' }}>
                            <div style={{ width: 26, height: 14, borderRadius: 99, background: applyAll ? 'var(--fp-accent)' : 'rgba(26,26,26,0.18)', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
                                <div style={{ position: 'absolute', top: 1, left: applyAll ? 12 : 1, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left 200ms', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, color: applyAll ? 'var(--fp-accent)' : 'var(--fp-text-muted)' }}>Apply to all rooms</span>
                        </div>

                        {roomCfg && <>
                            <div>
                                <CfgLabel>Wall Color</CfgLabel>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {WALL_COLORS.map(c => (
                                        <ColorSwatch key={c} color={c} selected={roomCfg.wallColor === c} onClick={() => patchRoom({ wallColor: c })} />
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                    <span style={{ fontSize: 10, color: 'var(--fp-text-muted)' }}>Custom:</span>
                                    <input type="color" value={roomCfg.wallColor} onChange={e => patchRoom({ wallColor: e.target.value })}
                                        style={{ width: 32, height: 24, borderRadius: 5, border: '1px solid var(--fp-border-strong)', background: 'none', cursor: 'pointer', padding: 1 }} />
                                    <code style={{ fontSize: 10, color: 'var(--fp-accent)', background: 'var(--fp-accent-bg)', padding: '2px 5px', borderRadius: 3 }}>{roomCfg.wallColor}</code>
                                </div>
                            </div>

                            <div style={{ height: 1, background: 'var(--fp-border)' }} />

                            <div>
                                <CfgLabel>Floor Material</CfgLabel>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                                    {FLOOR_MATERIALS.map(m => (
                                        <button key={m.id} onClick={() => patchRoom({ floorMaterial: m.id })} style={{ height: 46, borderRadius: 7, border: roomCfg.floorMaterial === m.id ? '1.5px solid var(--fp-accent-border)' : '1px solid var(--fp-border)', background: roomCfg.floorMaterial === m.id ? 'var(--fp-accent-bg-strong)' : 'var(--fp-bg-subtle)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'all 130ms' }}>
                                            <div style={{ width: 20, height: 14, borderRadius: 3, background: m.color, border: '1px solid var(--fp-border-strong)' }} />
                                            <span style={{ fontSize: 9, fontWeight: roomCfg.floorMaterial === m.id ? 700 : 400, color: roomCfg.floorMaterial === m.id ? 'var(--fp-accent)' : 'var(--fp-text-muted)' }}>{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>}

                        <div style={{ height: 1, background: 'var(--fp-border)' }} />

                        <div>
                            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: THEME.text }}>Door Style</h4>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                    </>}
                </>}

                {/* ── SHAPES TAB ─────────────────────────────────────────── */}
                {tab === 'shapes' && <>
                    {derivedPolygons.length === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--fp-text-faint)', textAlign: 'center', padding: '20px 0' }}>No closed shapes detected. Connect line walls to form enclosed areas.</div>
                    ) : (
                        derivedPolygons.map((nodeIds, idx) => {
                            const nodeIdSet = new Set(nodeIds)
                            const matchedShape = (fp.closedShapes ?? []).find(s =>
                                s.nodeIds.length === nodeIds.length &&
                                s.nodeIds.every(id => nodeIdSet.has(id))
                            )
                            const currentMat = matchedShape?.floorMaterial ?? config.globalFloorMaterial ?? 'wood'
                            const shapeLabel = matchedShape?.label ?? `Shape ${idx + 1}`

                            return (
                                <div key={idx}>
                                    <CfgLabel>{shapeLabel} · Floor Material</CfgLabel>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                                        {FLOOR_MATERIALS.map(m => (
                                            <button key={m.id} onClick={() => {
                                                if (!onChangeFp) return
                                                let shapes = [...(fp.closedShapes ?? [])]
                                                if (matchedShape) {
                                                    shapes = shapes.map(s => s.id === matchedShape.id ? { ...s, floorMaterial: m.id } : s)
                                                } else {
                                                    shapes.push({ id: uid(), nodeIds: [...nodeIds], label: shapeLabel, color: '#8B7B6B', floorMaterial: m.id })
                                                }
                                                onChangeFp({ ...fp, closedShapes: shapes })
                                            }}
                                                style={{
                                                    height: 36, borderRadius: 6,
                                                    border: currentMat === m.id ? '1.5px solid var(--fp-accent-border)' : '1px solid var(--fp-border)',
                                                    background: currentMat === m.id ? 'var(--fp-accent-bg-strong)' : 'var(--fp-bg-subtle)',
                                                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center', gap: 2,
                                                    transition: 'all 130ms',
                                                }}>
                                                <div style={{ width: 16, height: 10, borderRadius: 2, background: m.color, border: '1px solid var(--fp-border-strong)' }} />
                                                <span style={{ fontSize: 8, fontWeight: currentMat === m.id ? 700 : 400, color: currentMat === m.id ? 'var(--fp-accent)' : 'var(--fp-text-muted)' }}>{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {idx < derivedPolygons.length - 1 && <div style={{ height: 1, background: 'var(--fp-border)', marginTop: 10 }} />}
                                </div>
                            )
                        })
                    )}
                </>}

                {/* ── SCENE TAB ────────────────────────────────────────── */}
                {tab === 'scene' && <>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <CfgLabel>Ambient Light</CfgLabel>
                            <code style={{ fontSize: 10, color: 'var(--fp-accent)', background: 'var(--fp-accent-bg)', padding: '1px 4px', borderRadius: 3 }}>{config.ambientIntensity.toFixed(1)}</code>
                        </div>
                        <input type="range" min={0.5} max={4.0} step={0.1} value={config.ambientIntensity} onChange={e => patchScene({ ambientIntensity: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: 'var(--fp-accent)', cursor: 'pointer' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--fp-text-faint)', marginTop: 2 }}><span>dim</span><span>bright</span></div>
                    </div>

                    <div>
                        <CfgLabel>Floor Material (all shapes)</CfgLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                            {FLOOR_MATERIALS.map(m => (
                                <button key={m.id} onClick={() => patchScene({ globalFloorMaterial: m.id })}
                                    style={{ height: 46, borderRadius: 7, border: config.globalFloorMaterial === m.id ? '1.5px solid var(--fp-accent-border)' : '1px solid var(--fp-border)', background: config.globalFloorMaterial === m.id ? 'var(--fp-accent-bg-strong)' : 'var(--fp-bg-subtle)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'all 130ms' }}>
                                    <div style={{ width: 20, height: 14, borderRadius: 3, background: m.color, border: '1px solid var(--fp-border-strong)' }} />
                                    <span style={{ fontSize: 9, fontWeight: config.globalFloorMaterial === m.id ? 700 : 400, color: config.globalFloorMaterial === m.id ? 'var(--fp-accent)' : 'var(--fp-text-muted)' }}>{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ height: 1, background: 'var(--fp-border)' }} />
                    <CfgToggle label="Show Furniture" value={config.showFurniture} onChange={v => patchScene({ showFurniture: v })} />
                    <CfgToggle label="Show Room Labels" value={config.showLabels} onChange={v => patchScene({ showLabels: v })} />
                    <CfgToggle label="Atmospheric Fog" value={config.fogEnabled} onChange={v => patchScene({ fogEnabled: v })} />

                    <div style={{ height: 1, background: 'var(--fp-border)' }} />

                    <button onClick={() => onChange({ ...DEFAULT_SCENE_CONFIG, rooms: config.rooms })} style={{ height: 28, borderRadius: 6, border: '1px solid var(--fp-border-strong)', background: 'transparent', color: 'var(--fp-text-muted)', fontSize: 11, cursor: 'pointer', transition: 'all 150ms' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--fp-danger-border)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--fp-border-strong)'}>
                        Reset scene to defaults
                    </button>
                    <CfgToggle label="Show Furniture" value={config.showFurniture} onChange={v => patchScene({ showFurniture: v })} />
                    <CfgToggle label="Show Room Labels" value={config.showLabels} onChange={v => patchScene({ showLabels: v })} />
                    <CfgToggle label="Atmospheric Fog" value={config.fogEnabled} onChange={v => patchScene({ fogEnabled: v })} />
                    <CfgToggle label="Textured Walls" value={config.wallTextured} onChange={v => patchScene({ wallTextured: v })} />
                </>}

            </div>
        </div>
    )

    if (embedded) return panelBody

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{
                    position: 'absolute', bottom: 12, left: 12, zIndex: 10,
                    height: 28, padding: '0 10px', borderRadius: 7,
                    border: open ? '1px solid var(--fp-accent-border)' : '1px solid var(--fp-border-strong)',
                    background: open ? 'var(--fp-accent-bg)' : 'var(--fp-bg)',
                    color: open ? 'var(--fp-accent)' : 'var(--fp-text-muted)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 150ms',
                    boxShadow: 'var(--fp-shadow)',
                }}
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
                </svg>
                {open ? 'Close Config' : 'Scene Config'}
            </button>

            {open && (
                <div style={{ position: 'absolute', bottom: 48, left: 12, zIndex: 20 }}>
                    {panelBody}
                </div>
            )}
        </>
    )
}

function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
    return (
        <div onClick={onClick} title={color} style={{
            width: 24, height: 24, borderRadius: 5, background: color, cursor: 'pointer',
            border: selected ? '2px solid var(--fp-accent)' : '2px solid transparent',
            boxShadow: selected ? '0 0 0 1px var(--fp-accent-border)' : '0 0 0 1px rgba(0,0,0,0.06)',
            transition: 'transform 100ms',
            flexShrink: 0,
        }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        />
    )
}

function CfgLabel({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--fp-text-muted)', marginBottom: 6 }}>{children}</div>
}

function CfgToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 0' }}>
            <div style={{ width: 28, height: 16, borderRadius: 99, background: value ? 'var(--fp-accent)' : 'rgba(26,26,26,0.18)', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: value ? 13 : 2, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
            </div>
            <span style={{ fontSize: 11, color: value ? 'var(--fp-accent)' : 'var(--fp-text-muted)' }}>{label}</span>
        </div>
    )
}

function uid() { return Math.random().toString(36).slice(2, 9) }

function getRoomSceneCfg(config: SceneConfig, roomId: string): RoomSceneConfig {
    return config.rooms.find(r => r.roomId === roomId) ?? { roomId }
}