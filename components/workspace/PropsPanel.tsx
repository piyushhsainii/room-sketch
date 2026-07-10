import { snapFurniture, snapM } from "@/lib/helpers"
import { RoomSceneConfig, SceneConfig, THEME } from "./FloorPlanEditor"
import { EditorOpening, EditorRoom, FLOOR_MATERIALS, FloorMaterial, FloorPlanState, FURNITURE_LABELS, LineNode, OPENING_VARIANT_LABELS, STAIRS_LABELS, WALL_DECOR_LABELS } from "./Tools/constants"



export function PropsPanel({ fp, selectedId, onChange, onDelete, sceneConfig, onChangeSceneConfig }: {
    fp: FloorPlanState
    selectedId: string | null
    onChange: (fp: FloorPlanState) => void
    onDelete: () => void
    sceneConfig: SceneConfig
    onChangeSceneConfig: (cfg: SceneConfig) => void
}) {

    const inputStyle: React.CSSProperties = {
        height: 26, borderRadius: 5, width: '100%',
        border: `1px solid ${THEME.borderStrong}`,
        background: '#FAFAFA',
        color: THEME.text, fontSize: 12,
        padding: '0 8px', outline: 'none',
    }
    const wallSel = selectedId?.includes('::wall::')
        ? { roomId: selectedId.split('::wall::')[0], wall: selectedId.split('::wall::')[1] as 'north' | 'south' | 'east' | 'west' }
        : null
    const wallRoom = wallSel ? fp.rooms.find(r => r.id === wallSel.roomId) : null

    const shape = fp.closedShapes?.find(s => s.id === selectedId)
    const room = fp.rooms.find(r => r.id === selectedId)
    const opening = fp.openings.find(o => o.id === selectedId)
    const node = fp.lineNodes.find(n => n.id === selectedId)
    const seg = fp.lineSegments.find(s => s.id === selectedId)
    const furniture = (fp.furniture ?? []).find(f => f.id === selectedId)
    const stairs = (fp.stairs ?? []).find(s => s.id === selectedId)
    const wallDecor = (fp.wallDecor ?? []).find(d => d.id === selectedId)

    const patchRoomScene = (patch: Partial<RoomSceneConfig>) => {
        const existing = sceneConfig.rooms.find(r => r.roomId === room?.id)
        const nextRooms = existing
            ? sceneConfig.rooms.map(r => r.roomId === room?.id ? { ...r, ...patch } : r)
            : [...sceneConfig.rooms, { roomId: room!.id, wallColor: '#FFFFFF', floorMaterial: 'plain' as FloorMaterial, ...patch }]
        onChangeSceneConfig({ ...sceneConfig, rooms: nextRooms })
    }

    const patchRoomSceneById = (roomId: string, patch: Partial<RoomSceneConfig>) => {
        const existing = sceneConfig.rooms.find(r => r.roomId === roomId)
        const nextRooms = existing
            ? sceneConfig.rooms.map(r => r.roomId === roomId ? { ...r, ...patch } : r)
            : [...sceneConfig.rooms, { roomId, wallColor: '#FFFFFF', floorMaterial: 'plain' as FloorMaterial, ...patch }]
        onChangeSceneConfig({ ...sceneConfig, rooms: nextRooms })
    }

    if (!room && !opening && !node && !seg && !furniture && !stairs && !wallRoom && !shape && !wallDecor) return (
        <div style={{ padding: 16, fontSize: 11, color: 'rgba(100,116,139,0.5)', textAlign: 'center' }}>
            Select a room, wall, node or opening to edit properties
        </div>
    )
    const patchRoom = (patch: Partial<EditorRoom>) =>
        onChange({ ...fp, rooms: fp.rooms.map(r => r.id === room?.id ? { ...r, ...patch } : r) })

    const patchOpening = (patch: Partial<EditorOpening>) =>
        onChange({ ...fp, openings: fp.openings.map(o => o.id === opening?.id ? { ...o, ...patch } : o) })

    const patchNode = (patch: Partial<LineNode>) =>
        onChange({ ...fp, lineNodes: fp.lineNodes.map(n => n.id === node?.id ? { ...n, ...patch } : n) })

    return (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.7)' }}>
                {room || seg ? 'ROOM' : opening ? opening.type.toUpperCase() : node ? 'WALL NODE' : furniture ? 'FURNITURE' : stairs ? 'STAIRS / ELEVATOR' : 'WALL SEGMENT'}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.7)' }}>
                {wallRoom ? 'WALL' : room ? 'ROOM' : opening ? (OPENING_VARIANT_LABELS[opening.variant ?? opening.type] ?? opening.type).toUpperCase() : node ? 'WALL NODE' : furniture ? 'FURNITURE' : stairs ? 'STAIRS / ELEVATOR' : wallDecor ? WALL_DECOR_LABELS[wallDecor.type].toUpperCase() : 'WALL SEGMENT'}
            </div>

            {wallRoom && wallSel && <>
                <PropField label="Room"><span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600 }}>{wallRoom.label}</span></PropField>
                <PropField label="Side"><span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600, textTransform: 'capitalize' }}>{wallSel.wall}</span></PropField>
                <PropField label="Openings">
                    <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.8)' }}>
                        {fp.openings.filter(o => o.roomId === wallRoom.id && o.wall === wallSel.wall).length} on this wall
                    </span>
                </PropField>
                <div style={{ fontSize: 10, color: 'rgba(100,116,139,0.5)' }}>Rooms don't yet store per-wall data (color/material) — this selection is currently informational.</div>
            </>}
            {shape && <>
                <PropField label="Label">
                    <input value={shape.label ?? ''} onChange={e => onChange({
                        ...fp,
                        closedShapes: (fp.closedShapes ?? []).map(s => s.id === shape.id ? { ...s, label: e.target.value } : s)
                    })} style={inputStyle} />
                </PropField>
            </>}
            {room && <>
                <PropField label="Label"><input value={room.label} onChange={e => patchRoom({ label: e.target.value })} style={inputStyle} /></PropField>
                <PropField label="Width (m)"><NumInput value={room.width} min={1} max={30} step={0.5} onChange={v => patchRoom({ width: v })} /></PropField>
                <PropField label="Depth (m)"><NumInput value={room.depth} min={1} max={30} step={0.5} onChange={v => patchRoom({ depth: v })} /></PropField>
                <PropField label="X pos (m)"><NumInput value={room.x} min={-50} max={50} step={0.5} onChange={v => patchRoom({ x: v })} /></PropField>
                <PropField label="Z pos (m)"><NumInput value={room.z} min={-50} max={50} step={0.5} onChange={v => patchRoom({ z: v })} /></PropField>
                <div style={{ height: 1, background: THEME.border, margin: '6px 0' }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em' }}>APPEARANCE</div>
                <PropField label="Wall color">
                    <input type="color"
                        value={sceneConfig.rooms.find(r => r.roomId === room.id)?.wallColor ?? '#FFFFFF'}
                        onChange={e => patchRoomScene({ wallColor: e.target.value })}
                        style={{ width: 40, height: 26, border: `1px solid ${THEME.borderStrong}`, borderRadius: 5, padding: 0, cursor: 'pointer' }} />
                </PropField>
                <PropField label="Floor">
                    <select
                        value={sceneConfig.rooms.find(r => r.roomId === room.id)?.floorMaterial ?? sceneConfig.globalFloorMaterial ?? 'plain'}
                        onChange={e => patchRoomScene({ floorMaterial: e.target.value as FloorMaterial })}
                        style={{ ...inputStyle, width: 120 }}
                    >
                        {FLOOR_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                </PropField>
            </>}

            {node && <>
                <PropField label="X pos (m)"><NumInput value={node.x} min={-50} max={50} step={0.5} onChange={v => patchNode({ x: snapM(v) })} /></PropField>
                <PropField label="Z pos (m)"><NumInput value={node.z} min={-50} max={50} step={0.5} onChange={v => patchNode({ z: snapM(v) })} /></PropField>
            </>}

            {seg && <>
                <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.6)' }}>
                    Wall/floor loop with {seg.nodeIds.length} nodes. Select individual nodes to reposition.
                </div>
                <div style={{ height: 1, background: THEME.border, margin: '6px 0' }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em' }}>APPEARANCE</div>
                <PropField label="Wall color">
                    <input type="color"
                        value={sceneConfig.rooms.find(r => r.roomId === seg.id)?.wallColor ?? '#FFFFFF'}
                        onChange={e => patchRoomSceneById(seg.id, { wallColor: e.target.value })}
                        style={{ width: 40, height: 26, border: `1px solid ${THEME.borderStrong}`, borderRadius: 5, padding: 0, cursor: 'pointer' }} />
                </PropField>
                <PropField label="Floor">
                    <select
                        value={sceneConfig.rooms.find(r => r.roomId === seg.id)?.floorMaterial ?? sceneConfig.globalFloorMaterial ?? 'plain'}
                        onChange={e => patchRoomSceneById(seg.id, { floorMaterial: e.target.value as FloorMaterial })}
                        style={{ ...inputStyle, width: 120 }}
                    >
                        {FLOOR_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                </PropField>
            </>}

            {opening && <>
                <PropField label="Width (m)"><NumInput value={opening.width} min={0.5} max={4} step={0.1} onChange={v => patchOpening({ width: v })} /></PropField>
                {opening.type === 'window' && <>
                    <PropField label="Height (m)"><NumInput value={opening.height} min={0.3} max={2.5} step={0.1} onChange={v => patchOpening({ height: v })} /></PropField>
                    <PropField label="Sill (m)"><NumInput value={opening.sillHeight} min={0} max={2} step={0.1} onChange={v => patchOpening({ sillHeight: v })} /></PropField>
                </>}
                <PropField label="Position (m)"><NumInput value={opening.position} min={0.3} max={20} step={0.1} onChange={v => patchOpening({ position: v })} /></PropField>
                {opening.type === 'door' && (
                    <PropField label="Swing">
                        <button
                            onClick={() => patchOpening({ swingDirection: opening.swingDirection === 'inward' ? 'outward' : 'inward' })}
                            style={{ height: 26, padding: '0 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: 'rgba(165,168,255,0.9)', fontSize: 11, fontWeight: 600 }}
                        >
                            {opening.swingDirection === 'inward' ? '← Inward' : '→ Outward'}
                        </button>
                    </PropField>
                )}
            </>}

            {furniture && <>
                <PropField label="Type">
                    <span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600 }}>
                        {FURNITURE_LABELS[furniture.type] ?? furniture.type}
                    </span>
                </PropField>
                <PropField label="X pos (m)">
                    <NumInput value={furniture.x} min={-50} max={50} step={0.5}
                        onChange={v => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, x: snapFurniture(v) } : f) })} />
                </PropField>
                <PropField label="Z pos (m)">
                    <NumInput value={furniture.z} min={-50} max={50} step={0.5}
                        onChange={v => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, z: snapFurniture(v) } : f) })} />
                </PropField>
                <PropField label="Rotation">
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="range" min={0} max={360} step={15}
                            value={Math.round((furniture.rotation * 180) / Math.PI)}
                            onChange={e => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, rotation: (parseFloat(e.target.value) * Math.PI) / 180 } : f) })}
                            style={{ flex: 1, accentColor: '#6366F1' }} />
                        <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', width: 30, flexShrink: 0 }}>
                            {Math.round((furniture.rotation * 180) / Math.PI)}°
                        </span>
                    </div>
                </PropField>
                <PropField label="Scale">
                    <input type="range" min={50} max={150} step={5}
                        value={Math.round((furniture.scale ?? 1) * 100)}
                        onChange={e => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, scale: parseFloat(e.target.value) / 100 } : f) })}
                        style={{ flex: 1, accentColor: '#6366F1' }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', marginLeft: 4 }}>
                        {Math.round((furniture.scale ?? 1) * 100)}%
                    </span>
                </PropField>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button
                        onClick={() => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, rotation: f.rotation - Math.PI / 2 } : f) })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↺ −90°
                    </button>
                    <button
                        onClick={() => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, rotation: f.rotation + Math.PI / 2 } : f) })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↻ +90°
                    </button>
                </div>
            </>}

            {stairs && <>
                <PropField label="Type">
                    <span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600 }}>
                        {STAIRS_LABELS[stairs.type] ?? stairs.type}
                    </span>
                </PropField>
                <PropField label="X pos (m)">
                    <NumInput value={stairs.x + stairs.width / 2} min={-50} max={50} step={0.5}
                        onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, x: snapM(v) - s.width / 2 } : s) })} />
                </PropField>
                <PropField label="Z pos (m)">
                    <NumInput value={stairs.z + stairs.depth / 2} min={-50} max={50} step={0.5}
                        onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, z: snapM(v) - s.depth / 2 } : s) })} />
                </PropField>
                <PropField label="Rotation">
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="range" min={0} max={360} step={15}
                            value={Math.round((stairs.rotation * 180) / Math.PI)}
                            onChange={e => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rotation: (parseFloat(e.target.value) * Math.PI) / 180 } : s) })}
                            style={{ flex: 1, accentColor: '#6366F1' }} />
                        <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', width: 30, flexShrink: 0 }}>
                            {Math.round((stairs.rotation * 180) / Math.PI)}°
                        </span>
                    </div>
                </PropField>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button
                        onClick={() => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rotation: s.rotation - Math.PI / 2 } : s) })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↺ −90°
                    </button>
                    <button
                        onClick={() => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rotation: s.rotation + Math.PI / 2 } : s) })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↻ +90°
                    </button>
                </div>
            </>}
            {wallDecor && <>
                <PropField label="Type">
                    <span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600 }}>
                        {WALL_DECOR_LABELS[wallDecor.type]}
                    </span>
                </PropField>
                <PropField label="Position (m)">
                    <NumInput value={wallDecor.position} min={0} max={20} step={0.1}
                        onChange={v => onChange({ ...fp, wallDecor: (fp.wallDecor ?? []).map(d => d.id === wallDecor.id ? { ...d, position: v } : d) })} />
                </PropField>
                <PropField label="Height (m)">
                    <NumInput value={wallDecor.heightOffset} min={0} max={fp.roomHeight} step={0.1}
                        onChange={v => onChange({ ...fp, wallDecor: (fp.wallDecor ?? []).map(d => d.id === wallDecor.id ? { ...d, heightOffset: v } : d) })} />
                </PropField>
                <PropField label="Width (m)">
                    <NumInput value={wallDecor.width} min={0.2} max={4} step={0.1}
                        onChange={v => onChange({ ...fp, wallDecor: (fp.wallDecor ?? []).map(d => d.id === wallDecor.id ? { ...d, width: v } : d) })} />
                </PropField>
            </>}
            <button onClick={onDelete} style={{ marginTop: 4, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: 'rgba(248,113,113,0.8)', fontSize: 11, cursor: 'pointer' }}>
                Delete {room ? 'room' : opening ? 'opening' : node ? 'node' : furniture ? 'furniture' : stairs ? 'stairs' : wallDecor ? 'decor item' : shape ? 'area' : 'segment'}
            </button>
        </div>
    )
}

function PropField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 76, fontSize: 11, color: 'rgba(100,116,139,0.7)', flexShrink: 0 }}>{label}</span>
            {children}
        </div>
    )
}

function NumInput({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {

    const inputStyle: React.CSSProperties = {
        height: 26, borderRadius: 5, width: '100%',
        border: `1px solid ${THEME.borderStrong}`,
        background: '#FAFAFA',
        color: THEME.text, fontSize: 12,
        padding: '0 8px', outline: 'none',
    }
    return (
        <input type="number" min={min} max={max} step={step} value={value.toFixed(2)}
            onChange={e => onChange(Math.max(min, Math.min(max, parseFloat(e.target.value) || min)))}
            style={{ ...inputStyle, width: 72 }} />
    )
}

