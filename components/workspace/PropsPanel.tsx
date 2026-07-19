import { snapFurniture, snapM } from "@/lib/helpers"
import { RoomSceneConfig, SceneConfig, THEME } from "./FloorPlanEditor"
import { EditorOpening, EditorRoom, FLOOR_MATERIALS, FloorMaterial, FloorPlanState, FURNITURE_LABELS, FURNITURE_MATERIALS, LineNode, OPENING_VARIANT_LABELS, STAIRS_LABELS, supportsFurnitureTexture, WALL_DECOR_LABELS, WallMaterial } from "./Tools/constants"
import { getMaterialsFor } from "./texture/universalMaterials"
import { MaterialTexturePicker } from "./texture/MaterialPicker"
import { getMaterialsForDomain } from './Tools/constants'

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

    const pickerTheme = { border: THEME.border, borderStrong: THEME.borderStrong, textMuted: THEME.textMuted }
    const wallMaterials = getMaterialsFor('wall')
    const floorMaterials = getMaterialsFor('floor')
    const furnitureMaterials = getMaterialsFor('furniture')


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

    // Helper functions to patch configurations
    const patchRoomScene = (patch: Partial<RoomSceneConfig>) => {
        const targetId = room?.id || wallRoom?.id
        if (!targetId) return
        const existing = sceneConfig.rooms.find(r => r.roomId === targetId)
        const nextRooms = existing
            ? sceneConfig.rooms.map(r => r.roomId === targetId ? { ...r, ...patch } : r)
            : [...sceneConfig.rooms, { roomId: targetId, wallColor: '#FFFFFF', floorMaterial: 'plain' as FloorMaterial, ...patch }]
        onChangeSceneConfig({ ...sceneConfig, rooms: nextRooms })
    }

    const patchRoomSceneById = (roomId: string, patch: Partial<RoomSceneConfig>) => {
        const existing = sceneConfig.rooms.find(r => r.roomId === roomId)
        const nextRooms = existing
            ? sceneConfig.rooms.map(r => r.roomId === roomId ? { ...r, ...patch } : r)
            : [...sceneConfig.rooms, { roomId, wallColor: '#FFFFFF', floorMaterial: 'plain' as FloorMaterial, ...patch }]
        onChangeSceneConfig({ ...sceneConfig, rooms: nextRooms })
    }

    const patchFurniture = (patch: Partial<typeof furniture>) => {
        if (!furniture) return
        onChange({
            ...fp,
            furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, ...patch } : f)
        })
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

    const roomConfig = sceneConfig.rooms.find(r => r.roomId === wallRoom?.id)
    const specificWallColor = wallSel ? roomConfig?.wallOverrides?.[wallSel.wall]?.color : undefined
    const specificWallTexture = wallSel ? roomConfig?.wallOverrides?.[wallSel.wall]?.material : undefined

    const patchSpecificWall = (patch: { color?: string; material?: WallMaterial | null }) => {
        if (!wallSel || !wallRoom) return
        const existing = sceneConfig.rooms.find(r => r.roomId === wallRoom.id) || { roomId: wallRoom.id, wallColor: '#FFFFFF', floorMaterial: 'plain' }
        const currentOverrides = existing.wallOverrides || {}

        const nextRooms = sceneConfig.rooms.filter(r => r.roomId !== wallRoom.id)
        nextRooms.push({
            ...existing,
            wallOverrides: {
                ...currentOverrides,
                [wallSel.wall]: {
                    ...currentOverrides[wallSel.wall],
                    ...patch
                }
            }
        })
        onChangeSceneConfig({ ...sceneConfig, rooms: nextRooms })
    }

    const segSceneConfig = seg ? sceneConfig.rooms.find(r => r.roomId === seg.id) : undefined
    return (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.7)' }}>
                {wallRoom ? 'WALL' : room || seg ? 'ROOM' : opening ? (OPENING_VARIANT_LABELS[opening.variant ?? opening.type] ?? opening.type).toUpperCase() : node ? 'WALL NODE' : furniture ? 'FURNITURE' : stairs ? 'STAIRS / ELEVATOR' : wallDecor ? WALL_DECOR_LABELS[wallDecor.type].toUpperCase() : 'WALL SEGMENT'}
            </div>

            {wallRoom && wallSel && (
                <>
                    <PropField label="Room">
                        <span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600 }}>
                            {wallRoom.label}
                        </span>
                    </PropField>
                    <PropField label="Side">
                        <button
                            onClick={() => onChange({
                                ...fp,
                                wallDecor: (fp.wallDecor ?? []).map(d => d.id === wallDecor?.id
                                    ? { ...d, facingInward: !(d.facingInward ?? true) }
                                    : d)
                            })}
                            style={{ height: 26, padding: '0 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: 'rgba(165,168,255,0.9)', fontSize: 11, fontWeight: 600 }}
                        >
                            {(wallDecor?.facingInward ?? true) ? 'Interior side' : 'Exterior side'}
                        </button>
                    </PropField>

                    <div style={{ height: 1, background: THEME.border, margin: '6px 0' }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em' }}>
                        WALL APPEARANCE
                    </div>

                    <PropField label="Paint Color">
                        <input
                            type="color"
                            value={specificWallColor ?? roomConfig?.wallColor ?? '#FFFFFF'}
                            onChange={e => patchSpecificWall({ color: e.target.value })}
                            style={{ width: 40, height: 26, border: `1px solid ${THEME.borderStrong}`, borderRadius: 5, padding: 0, cursor: 'pointer' }}
                        />
                    </PropField>

                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em', marginTop: 4 }}>
                        TEXTURE
                    </div>
                    <MaterialTexturePicker
                        items={wallMaterials}
                        currentId={specificWallTexture}
                        onSelect={(id) => patchSpecificWall({ material: id as WallMaterial })}
                        onClear={() => patchSpecificWall({ material: null })}
                        theme={pickerTheme}
                    />
                </>
            )}

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
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em', marginTop: 4 }}>WALL TEXTURE</div>
                <MaterialTexturePicker
                    items={wallMaterials}
                    currentId={sceneConfig.rooms.find(r => r.roomId === room.id)?.wallMaterial}
                    onSelect={(id) => patchRoomScene({ wallMaterial: id as WallMaterial })}
                    onClear={() => patchRoomScene({ wallMaterial: undefined })}
                    theme={pickerTheme}
                />
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em', marginTop: 8 }}>FLOOR TEXTURE</div>
                <MaterialTexturePicker
                    items={floorMaterials}
                    currentId={sceneConfig.rooms.find(r => r.roomId === room.id)?.floorMaterial}
                    onSelect={(id) => patchRoomScene({ floorMaterial: id as FloorMaterial })}
                    onClear={() => patchRoomScene({ floorMaterial: undefined })}
                    theme={pickerTheme}
                />
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
                        value={segSceneConfig?.wallColor ?? '#FFFFFF'}
                        onChange={e => patchRoomSceneById(seg.id, { wallColor: e.target.value })}
                        style={{ width: 40, height: 26, border: `1px solid ${THEME.borderStrong}`, borderRadius: 5, padding: 0, cursor: 'pointer' }} />
                </PropField>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em', marginTop: 4 }}>WALL TEXTURE</div>
                <MaterialTexturePicker
                    items={wallMaterials}
                    currentId={segSceneConfig?.wallMaterial}
                    onSelect={(id) => patchRoomSceneById(seg.id, { wallMaterial: id as WallMaterial })}
                    onClear={() => patchRoomSceneById(seg.id, { wallMaterial: undefined })}
                    theme={pickerTheme}
                />

                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em', marginTop: 8 }}>FLOOR TEXTURE</div>
                <MaterialTexturePicker
                    items={floorMaterials}
                    currentId={segSceneConfig?.floorMaterial}
                    onSelect={(id) => patchRoomSceneById(seg.id, { floorMaterial: id as FloorMaterial })}
                    onClear={() => patchRoomSceneById(seg.id, { floorMaterial: undefined })}
                    theme={pickerTheme}
                />
            </>}

            {opening && <>
                <PropField label="Width (m)"><NumInput value={opening.width} min={0.5} max={4} step={0.1} onChange={v => patchOpening({ width: v })} /></PropField>
                {opening.type === 'window' && <>
                    <PropField label="Height (m)"><NumInput value={opening.height} min={0.3} max={2.5} step={0.1} onChange={v => patchOpening({ height: v })} /></PropField>
                    <PropField label="Sill (m)"><NumInput value={opening.sillHeight} min={0} max={2} step={0.1} onChange={v => patchOpening({ sillHeight: v })} /></PropField>
                </>}
                <PropField label="Position (m)"><NumInput value={opening.position} min={0.3} max={20} step={0.1} onChange={v => patchOpening({ position: v })} /></PropField>
                {opening.type === 'door' && (
                    <>

                        <PropField label="Swing">
                            <button onClick={() => patchOpening({ swingDirection: opening.swingDirection === 'inward' ? 'outward' : 'inward' })}
                                style={{ height: 26, padding: '0 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: 'rgba(165,168,255,0.9)', fontSize: 11, fontWeight: 600 }}>
                                {opening.swingDirection === 'inward' ? '← Inward' : '→ Outward'}
                            </button>
                        </PropField>
                        <PropField label="State">
                            <button
                                onClick={() => patchOpening({ isOpen: !opening.isOpen })}
                                style={{ height: 26, padding: '0 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid rgba(99,102,241,0.4)', background: opening.isOpen ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', color: 'rgba(165,168,255,0.9)', fontSize: 11, fontWeight: 600 }}
                            >
                                {opening.isOpen ? '🚪 Open' : '🚪 Closed'}
                            </button>
                        </PropField>

                        <div style={{ height: 1, background: THEME.border, margin: '6px 0' }} />
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em' }}>
                            MATERIAL
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(100,116,139,0.55)', marginBottom: 2 }}>
                            Overrides the global door style for this door only. Leave on "Default" to follow the scene-wide setting.
                        </div>
                        <MaterialTexturePicker
                            items={getMaterialsForDomain('door').map(({ key, def }) => ({
                                id: key,
                                label: def.label ?? key,
                                swatch: def.color,
                                thumbnail: def.textureUrl,
                                category: def.category as any,
                                appliesTo: ['door'],
                            }))}
                            currentId={opening.material}
                            onSelect={(id) => patchOpening({ material: id as any })}
                            onClear={() => patchOpening({ material: undefined })}
                            theme={pickerTheme}
                        />
                    </>
                )}
            </>
            }

            {furniture && <>
                <PropField label="Type">
                    <span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600 }}>
                        {FURNITURE_LABELS[furniture.type] ?? furniture.type}
                    </span>
                </PropField>
                <PropField label="X pos (m)">
                    <NumInput value={furniture.x} min={-50} max={50} step={0.5}
                        onChange={v => patchFurniture({ x: snapFurniture(v) })} />
                </PropField>
                <PropField label="Z pos (m)">
                    <NumInput value={furniture.z} min={-50} max={50} step={0.5}
                        onChange={v => patchFurniture({ z: snapFurniture(v) })} />
                </PropField>

                <PropField label="Scale">
                    <input type="range" min={50} max={150} step={5}
                        value={Math.round((furniture.scale ?? 1) * 100)}
                        onChange={e => patchFurniture({ scale: parseFloat(e.target.value) / 100 })}
                        style={{ flex: 1, accentColor: '#6366F1' }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', marginLeft: 4 }}>
                        {Math.round((furniture.scale ?? 1) * 100)}%
                    </span>
                </PropField>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button
                        onClick={() => patchFurniture({ rotation: furniture.rotation - Math.PI / 2 })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↺ −90°
                    </button>
                    <button
                        onClick={() => patchFurniture({ rotation: furniture.rotation + Math.PI / 2 })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↻ +90°
                    </button>
                </div>

                {supportsFurnitureTexture(furniture.type) && (
                    <>
                        <div style={{ height: 1, background: THEME.border, margin: '8px 0 4px 0' }} />
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em' }}>
                            FURNITURE TEXTURE
                        </div>
                        {furnitureMaterials.length > 0 ? (
                            <MaterialTexturePicker
                                items={furnitureMaterials}
                                currentId={furniture.materialId}
                                onSelect={(id) => patchFurniture({ materialId: id })}
                                onClear={() => patchFurniture({ materialId: undefined })}
                                theme={pickerTheme}
                            />
                        ) : (
                            <div style={{ fontSize: 10, color: 'rgba(100,116,139,0.5)' }}>
                                No furniture materials wired into the universal catalog yet —
                                see the commented-out FURNITURE_MATERIALS import in universalMaterials.ts.
                            </div>
                        )}
                    </>
                )}
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
                {/* NEW — which face of the wall this mounts on. Lets two items share
        the same wall/position without overlapping (e.g. one per side of a
        wall shared between two rooms), and lets exterior-facing decor be
        placed at all. Defaults to true (interior side) to match all prior
        placements, which never set this field. */}
                <PropField label="Side">
                    <button
                        onClick={() => onChange({
                            ...fp,
                            wallDecor: (fp.wallDecor ?? []).map(d => d.id === wallDecor.id
                                ? { ...d, facingInward: !(d.facingInward ?? true) }
                                : d)
                        })}
                        style={{
                            height: 26, padding: '0 10px', borderRadius: 5, cursor: 'pointer',
                            border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)',
                            color: 'rgba(165,168,255,0.9)', fontSize: 11, fontWeight: 600,
                        }}
                    >
                        {(wallDecor.facingInward ?? true) ? 'Interior side' : 'Exterior side'}
                    </button>
                </PropField>
                <PropField label="Rotation">
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="range" min={-180} max={180} step={5}
                            value={Math.round(((wallDecor.rotation ?? 0) * 180) / Math.PI)}
                            onChange={e => onChange({
                                ...fp,
                                wallDecor: (fp.wallDecor ?? []).map(d => d.id === wallDecor.id
                                    ? { ...d, rotation: (parseFloat(e.target.value) * Math.PI) / 180 }
                                    : d)
                            })}
                            style={{ flex: 1, accentColor: '#6366F1' }} />
                        <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', width: 34, flexShrink: 0 }}>
                            {Math.round(((wallDecor.rotation ?? 0) * 180) / Math.PI)}°
                        </span>
                    </div>
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