import { useMemo, useState } from "react"
import { RoomSceneConfig, SceneConfig } from "./FloorPlanEditor"
import { DEFAULT_SCENE_CONFIG, DOOR_STYLES, FLOOR_MATERIALS, FloorMaterial, FloorPlanState, WALL_COLORS } from "./Tools/constants"
import { deriveClosedPolygons } from "@/lib/helpers"
import * as THREE from 'three'


export function SceneConfigPanel({
    fp, config, onChange, onChangeFp,
}: {
    fp: FloorPlanState
    config: SceneConfig
    onChange: (c: SceneConfig) => void
    onChangeFp?: (fp: FloorPlanState) => void
}) {
    const [open, setOpen] = useState(false)
    const [tab, setTab] = useState<'rooms' | 'shapes' | 'scene'>('rooms')
    const [selectedRoomId, setSelectedRoomId] = useState<string>(fp.rooms[0]?.id ?? '')
    const [applyAll, setApplyAll] = useState(false)

    const roomCfg = selectedRoomId ? getRoomSceneCfg(config, selectedRoomId) : null
    const wallTextureCache = new Map<string, THREE.CanvasTexture>()

    // Derive closed shapes for the shapes tab
    const derivedPolygons = useMemo(() => deriveClosedPolygons(fp.lineNodes, fp.lineSegments), [fp.lineNodes, fp.lineSegments])

    function patchRoom(patch: Partial<RoomSceneConfig>) {
        if (patch.wallColor) {
            wallTextureCache.delete(patch.wallColor)
        }
        const targetIds = applyAll ? fp.rooms.map(r => r.id) : [selectedRoomId]
        let rooms = [...config.rooms]
        for (const id of targetIds) {
            const existing = rooms.find(r => r.roomId === id)
            if (existing) {
                rooms = rooms.map(r => r.roomId === id ? { ...r, ...patch } : r)
            } else {
                rooms = [...rooms, { roomId: id, wallColor: '#8B7B6B', floorMaterial: 'wood' as FloorMaterial, ...patch }]
            }
        }
        onChange({ ...config, rooms })
    }

    function patchScene(patch: Partial<SceneConfig>) {
        onChange({ ...config, ...patch })
    }

    return (
        <>
            {/* Toggle button */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{
                    position: 'absolute', bottom: 12, left: 12, zIndex: 10,
                    height: 28, padding: '0 10px', borderRadius: 7,
                    border: open ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: open ? 'rgba(99,102,241,0.2)' : 'rgba(10,9,7,0.75)',
                    backdropFilter: 'blur(10px)',
                    color: open ? 'rgba(165,168,255,0.95)' : 'rgba(148,163,184,0.75)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 150ms',
                }}
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
                </svg>
                {open ? 'Close Config' : 'Scene Config'}
            </button>

            {/* Panel */}
            {open && (
                <div style={{
                    position: 'absolute', bottom: 48, left: 12, zIndex: 20,
                    width: 272, maxHeight: 440,
                    borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(10,9,7,0.94)', backdropFilter: 'blur(20px)',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    fontFamily: 'system-ui, sans-serif',
                }}>
                    {/* Header + tabs */}
                    <div style={{ padding: '10px 12px 0', background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.9)', letterSpacing: '0.02em' }}>Scene Configuration</span>
                            <button onClick={() => setOpen(false)} style={{ width: 20, height: 20, borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.6)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: 3, marginBottom: 0 }}>
                            {(['rooms', 'shapes', 'scene'] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 26, borderRadius: 5, border: 'none', background: tab === t ? 'rgba(99,102,241,0.75)' : 'transparent', color: tab === t ? 'white' : 'rgba(148,163,184,0.6)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms' }}>
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
                                <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.5)', textAlign: 'center', padding: '20px 0' }}>No rooms yet. Draw rooms first.</div>
                            ) : <>
                                {/* Room selector */}
                                <div>
                                    <CfgLabel>Select Room</CfgLabel>
                                    <select value={selectedRoomId} onChange={e => setSelectedRoomId(e.target.value)} style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(226,232,240,0.9)', fontSize: 12, padding: '0 8px', outline: 'none', cursor: 'pointer' }}>
                                        {fp.rooms.map(r => <option key={r.id} value={r.id} style={{ background: '#1a1814' }}>{r.label}</option>)}
                                    </select>
                                </div>

                                {/* Apply all toggle */}
                                <div onClick={() => setApplyAll(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: applyAll ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${applyAll ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', transition: 'all 150ms' }}>
                                    <div style={{ width: 26, height: 14, borderRadius: 99, background: applyAll ? 'rgba(99,102,241,0.85)' : 'rgba(100,116,139,0.25)', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
                                        <div style={{ position: 'absolute', top: 1, left: applyAll ? 12 : 1, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left 200ms' }} />
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: applyAll ? 'rgba(165,168,255,0.9)' : 'rgba(100,116,139,0.55)' }}>Apply to all rooms</span>
                                </div>

                                {roomCfg && <>
                                    {/* Wall color */}
                                    <div>
                                        <CfgLabel>Wall Color</CfgLabel>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                            {WALL_COLORS.map(c => (
                                                <ColorSwatch key={c} color={c} selected={roomCfg.wallColor === c} onClick={() => patchRoom({ wallColor: c })} />
                                            ))}
                                        </div>
                                        {/* Custom color */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                            <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.6)' }}>Custom:</span>
                                            <input type="color" value={roomCfg.wallColor} onChange={e => patchRoom({ wallColor: e.target.value })}
                                                style={{ width: 32, height: 24, borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)', background: 'none', cursor: 'pointer', padding: 1 }} />
                                            <code style={{ fontSize: 10, color: 'rgba(165,168,255,0.7)', background: 'rgba(99,102,241,0.08)', padding: '2px 5px', borderRadius: 3 }}>{roomCfg.wallColor}</code>
                                        </div>
                                    </div>

                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                                    {/* Floor material */}
                                    <div>
                                        <CfgLabel>Floor Material</CfgLabel>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                                            {FLOOR_MATERIALS.map(m => (
                                                <button key={m.id} onClick={() => patchRoom({ floorMaterial: m.id })} style={{ height: 46, borderRadius: 7, border: roomCfg.floorMaterial === m.id ? '1.5px solid rgba(99,102,241,0.85)' : '1px solid rgba(255,255,255,0.08)', background: roomCfg.floorMaterial === m.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'all 130ms' }}>
                                                    <div style={{ width: 20, height: 14, borderRadius: 3, background: m.color, border: '1px solid rgba(255,255,255,0.15)' }} />
                                                    <span style={{ fontSize: 9, fontWeight: roomCfg.floorMaterial === m.id ? 700 : 400, color: roomCfg.floorMaterial === m.id ? 'rgba(165,168,255,0.95)' : 'rgba(148,163,184,0.65)' }}>{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>}

                                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                                {/* Door style */}
                                <div>
                                    <CfgLabel>Door Style</CfgLabel>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                                        {DOOR_STYLES.map(d => (
                                            <button key={d.value} onClick={() => patchScene({ doorStyle: d.value })} style={{ height: 36, borderRadius: 7, border: config.doorStyle === d.value ? '1.5px solid rgba(99,102,241,0.85)' : '1px solid rgba(255,255,255,0.08)', background: config.doorStyle === d.value ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px', transition: 'all 130ms' }}>
                                                <div style={{ width: 14, height: 14, borderRadius: 3, background: d.color, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, opacity: d.value === 'glass' ? 0.5 : 1 }} />
                                                <span style={{ fontSize: 10, fontWeight: config.doorStyle === d.value ? 700 : 400, color: config.doorStyle === d.value ? 'rgba(165,168,255,0.95)' : 'rgba(148,163,184,0.65)' }}>{d.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>}
                        </>}

                        {/* ── SHAPES TAB ─────────────────────────────────────────── */}
                        {tab === 'shapes' && <>
                            {derivedPolygons.length === 0 ? (
                                <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.5)', textAlign: 'center', padding: '20px 0' }}>No closed shapes detected. Connect line walls to form enclosed areas.</div>
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
                                                        // Find or create closedShape entry
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
                                                            border: currentMat === m.id ? '1.5px solid rgba(99,102,241,0.85)' : '1px solid rgba(255,255,255,0.08)',
                                                            background: currentMat === m.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                                                            cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                                            alignItems: 'center', justifyContent: 'center', gap: 2,
                                                            transition: 'all 130ms',
                                                        }}>
                                                        <div style={{ width: 16, height: 10, borderRadius: 2, background: m.color, border: '1px solid rgba(255,255,255,0.15)' }} />
                                                        <span style={{ fontSize: 8, fontWeight: currentMat === m.id ? 700 : 400, color: currentMat === m.id ? 'rgba(165,168,255,0.95)' : 'rgba(148,163,184,0.65)' }}>{m.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {idx < derivedPolygons.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginTop: 10 }} />}
                                        </div>
                                    )
                                })
                            )}
                        </>}

                        {/* ── SCENE TAB ────────────────────────────────────────── */}
                        {tab === 'scene' && <>
                            {/* Ambient light */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <CfgLabel>Ambient Light</CfgLabel>
                                    <code style={{ fontSize: 10, color: 'rgba(165,168,255,0.8)', background: 'rgba(99,102,241,0.1)', padding: '1px 4px', borderRadius: 3 }}>{config.ambientIntensity.toFixed(1)}</code>
                                </div>
                                <input type="range" min={0.5} max={4.0} step={0.1} value={config.ambientIntensity} onChange={e => patchScene({ ambientIntensity: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: 'rgba(99,102,241,0.9)', cursor: 'pointer' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(100,116,139,0.4)', marginTop: 2 }}><span>dim</span><span>bright</span></div>
                            </div>

                            {/* Wall roughness */}
                            <div>
                                <CfgLabel>Floor Material (all shapes)</CfgLabel>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                                    {FLOOR_MATERIALS.map(m => (
                                        <button key={m.id} onClick={() => patchScene({ globalFloorMaterial: m.id })}
                                            style={{ height: 46, borderRadius: 7, border: config.globalFloorMaterial === m.id ? '1.5px solid rgba(99,102,241,0.85)' : '1px solid rgba(255,255,255,0.08)', background: config.globalFloorMaterial === m.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'all 130ms' }}>
                                            <div style={{ width: 20, height: 14, borderRadius: 3, background: m.color, border: '1px solid rgba(255,255,255,0.15)' }} />
                                            <span style={{ fontSize: 9, fontWeight: config.globalFloorMaterial === m.id ? 700 : 400, color: config.globalFloorMaterial === m.id ? 'rgba(165,168,255,0.95)' : 'rgba(148,163,184,0.65)' }}>{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                            {/* Toggles */}
                            <CfgToggle label="Show Furniture" value={config.showFurniture} onChange={v => patchScene({ showFurniture: v })} />
                            <CfgToggle label="Show Room Labels" value={config.showLabels} onChange={v => patchScene({ showLabels: v })} />
                            <CfgToggle label="Atmospheric Fog" value={config.fogEnabled} onChange={v => patchScene({ fogEnabled: v })} />

                            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                            {/* Reset */}
                            <button onClick={() => onChange({ ...DEFAULT_SCENE_CONFIG, rooms: config.rooms })} style={{ height: 28, borderRadius: 6, border: '1px solid rgba(148,163,184,0.12)', background: 'transparent', color: 'rgba(100,116,139,0.55)', fontSize: 11, cursor: 'pointer', transition: 'all 150ms' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)'}>
                                Reset scene to defaults
                            </button>
                        </>}
                    </div>
                </div>
            )}
        </>
    )
}



function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
    return (
        <div onClick={onClick} title={color} style={{
            width: 24, height: 24, borderRadius: 5, background: color, cursor: 'pointer',
            border: selected ? '2px solid rgba(99,102,241,0.9)' : '2px solid transparent',
            boxShadow: selected ? '0 0 0 1px rgba(99,102,241,0.4)' : 'none',
            transition: 'transform 100ms',
            flexShrink: 0,
        }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        />
    )
}

function CfgLabel({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.55)', marginBottom: 6 }}>{children}</div>
}

function CfgToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 0' }}>
            <div style={{ width: 28, height: 16, borderRadius: 99, background: value ? 'rgba(99,102,241,0.85)' : 'rgba(100,116,139,0.25)', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: value ? 13 : 2, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
            <span style={{ fontSize: 11, color: value ? 'rgba(165,168,255,0.9)' : 'rgba(100,116,139,0.65)' }}>{label}</span>
        </div>
    )
}

function uid() { return Math.random().toString(36).slice(2, 9) }


function getRoomSceneCfg(config: SceneConfig, roomId: string): RoomSceneConfig {
    return config.rooms.find(r => r.roomId === roomId) ?? {
        roomId,
        wallColor: '#8B7B6B',
        floorMaterial: 'wood',
    }
}