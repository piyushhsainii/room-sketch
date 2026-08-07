import { deriveClosedPolygons, snapFurniture, snapM, uid } from "@/lib/helpers"
import { RoomSceneConfig, SceneConfig, THEME } from "./FloorPlanEditor"
import { ClosedShape, EditorOpening, EditorRoom, FloorMaterial, FloorPlanState, LineNode, LineSegment, OPENING_VARIANT_LABELS, STAIRS_LABELS, supportsFurnitureTexture, WALL_DECOR_LABELS, WallMaterial } from "./lib/constants"
import { getMaterialsFor } from "./texture/universalMaterials"
import { MaterialTexturePicker } from "./texture/MaterialPicker"
import { OUTDOOR_OBJECT_LABELS, PlacedOutdoorObject } from "./lib/outdoor-constants"
import { matchClosedShape } from "./MaterialsPanel"
import { useMemo, useState } from "react"
import { getMaterialsForDomain } from "./texture/materials-registry"
import { Button, Card, COLOR, ColorSwatchInput, Divider, EmptyState, IconButton, RangeRow, SectionLabel, SegmentedControl, SPACE } from "./texture/inspector-ui"
import { LIGHT_FIXTURE_LABELS, PlacedLight } from "./lights-constant"
import { FURNITURE_LABELS } from "./lib/furniture-constants"

// Every door geometry variant DoorVariant3D actually knows how to render
// (its switch-case keys) — kept here so the "Type" dropdown can't offer an
// option that silently falls through to the default single-swing door.
const DOOR_VARIANT_OPTIONS = [
    'door-swing-single',
    'door-swing-double',
    'door-swing-double-french',
    'door-swing-double-arched',
    'door-pivot',
    'door-sliding',
    'door-pocket',
    'door-sliding-double',
    'door-folding',
    'door-folding-single',
    'door-folding-french',
    'door-garage',
] as const


export function PropsPanel({ fp, selectedId, onChange, onDelete, sceneConfig, onChangeSceneConfig, onDuplicate, onMirror }: {
    fp: FloorPlanState
    selectedId: string | null
    onChange: (fp: FloorPlanState) => void
    onDelete: () => void
    sceneConfig: SceneConfig
    onChangeSceneConfig: (cfg: SceneConfig) => void
    onDuplicate?: () => void
    onMirror?: (axis: 'horizontal' | 'vertical') => void
}) {

    const pickerTheme = { border: COLOR.border, borderStrong: COLOR.borderStrong, textMuted: COLOR.textMuted }
    const [segWallSide, setSegWallSide] = useState<'interior' | 'exterior'>('interior')
    const wallMaterials = getMaterialsFor('wall')
    const floorMaterials = getMaterialsFor('floor')
    const furnitureMaterials = getMaterialsFor('furniture')


    const wallSel = selectedId?.includes('::wall::')
        ? { roomId: selectedId.split('::wall::')[0], wall: selectedId.split('::wall::')[1] as 'north' | 'south' | 'east' | 'west' }
        : null
    const wallRoom = wallSel ? fp.rooms.find(r => r.id === wallSel.roomId) : null

    const derivedPolygonForSelection = useMemo(
        () => deriveClosedPolygons(fp.lineNodes, fp.lineSegments).find(nodeIds => {
            const sorted = [...nodeIds].sort().join(',')
            return selectedId === `unconfigured::${sorted}` ||
                matchClosedShape(nodeIds, fp.lineNodes, fp.closedShapes ?? [])?.id === selectedId
        }),
        [fp.lineNodes, fp.lineSegments, fp.closedShapes, selectedId]
    )
    const shape: ClosedShape | undefined = derivedPolygonForSelection
        ? (matchClosedShape(derivedPolygonForSelection, fp.lineNodes, fp.closedShapes ?? [])
            ?? { id: selectedId!, nodeIds: derivedPolygonForSelection, label: undefined }) : undefined

    const room = fp.rooms.find(r => r.id === selectedId)
    const opening = fp.openings.find(o => o.id === selectedId)
    const node = fp.lineNodes.find(n => n.id === selectedId)
    const seg = fp.lineSegments.find(s => s.id === selectedId)
    const furniture = (fp.furniture ?? []).find(f => f.id === selectedId)
    const stairs = (fp.stairs ?? []).find(s => s.id === selectedId)
    const wallDecor = (fp.wallDecor ?? []).find(d => d.id === selectedId)
    const outdoorObj = (fp.outdoorObjects ?? []).find(o => o.id === selectedId)
    const light = (fp.lights ?? []).find(l => l.id === selectedId)

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

    // ── FIX: this guard previously omitted `light`, so selecting a light
    // fell through to the empty state before the (correct) second guard
    // further down ever ran. `light` is now part of the single guard below,
    // and the duplicate second guard has been removed entirely. ──
    if (!room && !opening && !node && !seg && !furniture && !stairs && !wallRoom && !shape && !wallDecor && !outdoorObj && !light) return (
        <EmptyState label="Select a room, wall, node or opening to edit properties" />
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
    const patchSegment = (patch: Partial<LineSegment>) =>
        onChange({ ...fp, lineSegments: fp.lineSegments.map(s => s.id === seg?.id ? { ...s, ...patch } : s) })

    const segSceneConfig = seg ? sceneConfig.rooms.find(r => r.roomId === seg.id) : undefined

    const patchShape = (patch: Partial<ClosedShape>) => {
        if (!shape) return
        const shapeNodeSet = new Set(shape.nodeIds)
        const existing = (fp.closedShapes ?? []).find(
            s => s.nodeIds.length === shape.nodeIds.length && s.nodeIds.every(id => shapeNodeSet.has(id))
        )
        const shapes = existing
            ? (fp.closedShapes ?? []).map(s => s === existing ? { ...s, ...patch } : s)
            : [...(fp.closedShapes ?? []), { ...shape, id: uid(), ...patch }]  // always a real fresh id when creating
        onChange({ ...fp, closedShapes: shapes })
    }

    const patchOutdoor = (patch: Partial<PlacedOutdoorObject>) => {
        if (!outdoorObj) return
        onChange({
            ...fp,
            outdoorObjects: (fp.outdoorObjects ?? []).map(o => o.id === outdoorObj.id ? { ...o, ...patch } : o)
        })
    }

    const patchLight = (patch: Partial<PlacedLight>) => {
        if (!light) return
        onChange({
            ...fp,
            lights: (fp.lights ?? []).map(l => l.id === light.id ? { ...l, ...patch } : l)
        })
    }

    const canDuplicate = !!(room || shape || furniture || stairs || outdoorObj || wallDecor || opening || light);
    const VARIANT_TYPES = new Set([
        'sofa_l', 'bed_single', 'bed_double', 'bed_bunk', 'dressing_table',
    ]);

    const VARIANT_OPTIONS: { id: 'modern' | 'classical'; label: string }[] = [
        { id: 'modern', label: 'Modern' },
        { id: 'classical', label: 'Classical' },
    ];

    const title = wallRoom ? 'Wall'
        : room || seg ? 'Room'
            : opening ? (OPENING_VARIANT_LABELS[opening.variant ?? opening.type] ?? opening.type)
                : node ? 'Wall Node'
                    : furniture ? 'Furniture'
                        : stairs ? 'Stairs / Elevator'
                            : wallDecor ? WALL_DECOR_LABELS[wallDecor.type]
                                : light ? LIGHT_FIXTURE_LABELS[light.type]
                                    : outdoorObj ? OUTDOOR_OBJECT_LABELS[outdoorObj.type]
                                        : 'Wall Segment'

    return (
        <div style={{ padding: SPACE.md, display: 'flex', flexDirection: 'column', gap: SPACE.md, background: COLOR.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.xs }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.text }}>
                    {title}
                </div>
                {canDuplicate && onDuplicate && (
                    <IconButton onClick={onDuplicate} title="Duplicate (Ctrl/Cmd+D)">⎘</IconButton>
                )}
            </div>

            {wallRoom && wallSel && (
                <>
                    <Card>
                        <PropField label="Room">
                            <span style={{ fontSize: 12.5, color: COLOR.accent, fontWeight: 600 }}>
                                {wallRoom.label}
                            </span>
                        </PropField>
                        <PropField label="Side">
                            <Button
                                variant="secondary"
                                onClick={() => onChange({
                                    ...fp,
                                    wallDecor: (fp.wallDecor ?? []).map(d => d.id === wallDecor?.id
                                        ? { ...d, facingInward: !(d.facingInward ?? true) }
                                        : d)
                                })}
                            >
                                {(wallDecor?.facingInward ?? true) ? 'Interior side' : 'Exterior side'}
                            </Button>
                        </PropField>
                    </Card>

                    <Card>
                        <SectionLabel>Wall Appearance</SectionLabel>
                        <PropField label="Paint Color">
                            <ColorSwatchInput
                                value={specificWallColor ?? roomConfig?.wallColor ?? '#FFFFFF'}
                                onChange={v => patchSpecificWall({ color: v })}
                            />
                        </PropField>
                        <Divider />
                        <MaterialTexturePicker
                            label="Texture"
                            items={wallMaterials}
                            currentId={specificWallTexture}
                            onSelect={(id) => patchSpecificWall({ material: id as WallMaterial })}
                            onClear={() => patchSpecificWall({ material: null })}
                            theme={pickerTheme}
                        />
                    </Card>
                </>
            )}
            {shape && <>
                <Card>
                    <PropField label="Label">
                        <input value={shape.label ?? ''} onChange={e => patchShape({ label: e.target.value })}
                            style={{ height: 34, borderRadius: 6, width: '100%', border: `1px solid ${COLOR.borderStrong}`, background: COLOR.bgCard, color: COLOR.text, fontSize: 13, padding: '0 10px', outline: 'none' }} />
                    </PropField>
                </Card>

                <Card>
                    <MaterialTexturePicker
                        label="Wall Texture"
                        items={wallMaterials}
                        currentId={shape.wallMaterial}
                        onSelect={(id) => patchShape({ wallMaterial: id as WallMaterial })}
                        onClear={() => patchShape({ wallMaterial: undefined })}
                        theme={pickerTheme}
                    />
                    <Divider />
                    <MaterialTexturePicker
                        label="Floor Texture"
                        items={floorMaterials}
                        currentId={shape.floorMaterial}
                        onSelect={(id) => patchShape({ floorMaterial: id as FloorMaterial })}
                        onClear={() => patchShape({ floorMaterial: undefined })}
                        theme={pickerTheme}
                    />
                </Card>
            </>}

            {room && <>
                <Card>
                    <PropField label="Label">
                        <input value={room.label} onChange={e => patchRoom({ label: e.target.value })}
                            style={{ height: 34, borderRadius: 6, width: '100%', border: `1px solid ${COLOR.borderStrong}`, background: COLOR.bgCard, color: COLOR.text, fontSize: 13, padding: '0 10px', outline: 'none' }} />
                    </PropField>
                    <PropField label="Width (m)"><NumInput value={room.width} min={1} max={30} step={0.5} onChange={v => patchRoom({ width: v })} /></PropField>
                    <PropField label="Depth (m)"><NumInput value={room.depth} min={1} max={30} step={0.5} onChange={v => patchRoom({ depth: v })} /></PropField>
                    <PropField label="X pos (m)"><NumInput value={room.x} min={-50} max={50} step={0.5} onChange={v => patchRoom({ x: v })} /></PropField>
                    <PropField label="Z pos (m)"><NumInput value={room.z} min={-50} max={50} step={0.5} onChange={v => patchRoom({ z: v })} /></PropField>
                </Card>

                <Card>
                    <SectionLabel>Appearance</SectionLabel>
                    <PropField label="Wall color">
                        <ColorSwatchInput
                            value={sceneConfig.rooms.find(r => r.roomId === room.id)?.wallColor ?? '#FFFFFF'}
                            onChange={v => patchRoomScene({ wallColor: v })}
                        />
                    </PropField>
                    <Divider />
                    <MaterialTexturePicker
                        label="Wall Texture"
                        items={wallMaterials}
                        currentId={sceneConfig.rooms.find(r => r.roomId === room.id)?.wallMaterial}
                        onSelect={(id) => patchRoomScene({ wallMaterial: id as WallMaterial })}
                        onClear={() => patchRoomScene({ wallMaterial: undefined })}
                        theme={pickerTheme}
                    />
                    <Divider />
                    <MaterialTexturePicker
                        label="Floor Texture"
                        items={floorMaterials}
                        currentId={sceneConfig.rooms.find(r => r.roomId === room.id)?.floorMaterial}
                        onSelect={(id) => patchRoomScene({ floorMaterial: id as FloorMaterial })}
                        onClear={() => patchRoomScene({ floorMaterial: undefined })}
                        theme={pickerTheme}
                    />
                </Card>
            </>}

            {node && (
                <Card>
                    <PropField label="X pos (m)"><NumInput value={node.x} min={-50} max={50} step={0.5} onChange={v => patchNode({ x: snapM(v) })} /></PropField>
                    <PropField label="Z pos (m)"><NumInput value={node.z} min={-50} max={50} step={0.5} onChange={v => patchNode({ z: snapM(v) })} /></PropField>
                </Card>
            )}

            {seg && <>
                <div style={{ fontSize: 12, color: COLOR.textMuted, lineHeight: 1.5 }}>
                    Wall/floor loop with {seg.nodeIds.length} nodes. Select individual nodes to reposition.
                </div>
                <Card>
                    <SectionLabel>Appearance</SectionLabel>
                    <PropField label="Thickness (m)">
                        <RangeRow
                            value={Math.round((seg.thickness ?? 0.15) * 100)}
                            onChange={v => patchSegment({ thickness: v / 100 })}
                            format={v => `${(v / 100).toFixed(2)}m`}
                            min={2} max={200} step={1}
                        />
                    </PropField>
                    <PropField label="Wall type">
                        <SegmentedControl
                            options={[
                                { value: 'solid', label: 'Solid' },
                                { value: 'railing', label: 'Railing' },
                                { value: 'open', label: 'Open' },
                            ] as const}
                            value={seg.wallType ?? 'solid'}
                            onChange={wt => patchSegment({ wallType: wt })}
                        />
                    </PropField>
                    <PropField label="Height (m)">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                            <RangeRow
                                value={Math.round((seg.height ?? fp.roomHeight) * 100)}
                                onChange={v => patchSegment({ height: v / 100 })}
                                format={v => `${(v / 100).toFixed(2)}m`}
                                min={10} max={1000} step={5}
                            />
                            {seg.height !== undefined && (
                                <button
                                    onClick={() => patchSegment({ height: undefined })}
                                    style={{
                                        alignSelf: 'flex-start', fontSize: 10.5, color: COLOR.accent,
                                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                        textDecoration: 'underline',
                                    }}
                                >
                                    Reset to room height ({fp.roomHeight.toFixed(2)}m)
                                </button>
                            )}
                        </div>
                    </PropField>
                    <PropField label="Side">
                        <SegmentedControl
                            options={[
                                { value: 'interior', label: 'Interior' },
                                { value: 'exterior', label: 'Exterior' },
                            ] as const}
                            value={segWallSide}
                            onChange={setSegWallSide}
                        />
                    </PropField>
                    <PropField label="Wall color">
                        <ColorSwatchInput
                            value={(segWallSide === 'exterior'
                                ? (segSceneConfig as any)?.exteriorWallColor ?? segSceneConfig?.wallColor
                                : segSceneConfig?.wallColor) ?? '#FFFFFF'}
                            onChange={v => patchRoomSceneById(seg.id,
                                segWallSide === 'exterior' ? { exteriorWallColor: v } as any : { wallColor: v })}
                        />
                    </PropField>
                    <Divider />
                    <div style={{ fontSize: 11, color: COLOR.textFaint, marginBottom: -4 }}>
                        {segWallSide === 'exterior'
                            ? "Leave on \"Default\" to mirror the interior texture on this side."
                            : 'Applies to the inside face of this wall loop.'}
                    </div>
                    <MaterialTexturePicker
                        label={segWallSide === 'exterior' ? 'Exterior Wall Texture' : 'Interior Wall Texture'}
                        items={wallMaterials}
                        currentId={segWallSide === 'exterior'
                            ? (segSceneConfig as any)?.exteriorWallMaterial
                            : segSceneConfig?.wallMaterial}
                        onSelect={(id) => patchRoomSceneById(seg.id,
                            segWallSide === 'exterior'
                                ? { exteriorWallMaterial: id as WallMaterial } as any
                                : { wallMaterial: id as WallMaterial })}
                        onClear={() => patchRoomSceneById(seg.id,
                            segWallSide === 'exterior'
                                ? { exteriorWallMaterial: undefined } as any
                                : { wallMaterial: undefined })}
                        theme={pickerTheme}
                    />
                    <Divider />
                    <MaterialTexturePicker
                        label="Floor Texture"
                        items={floorMaterials}
                        currentId={segSceneConfig?.floorMaterial}
                        onSelect={(id) => patchRoomSceneById(seg.id, { floorMaterial: id as FloorMaterial })}
                        onClear={() => patchRoomSceneById(seg.id, { floorMaterial: undefined })}
                        theme={pickerTheme}
                    />
                </Card>
            </>}

            {opening && <>
                <Card>
                    <PropField label="Width (m)"><NumInput value={opening.width} min={0.5} max={4} step={0.1} onChange={v => patchOpening({ width: v })} /></PropField>
                    {opening.type === 'window' && <>
                        <PropField label="Height (m)"><NumInput value={opening.height} min={0.3} max={2.5} step={0.1} onChange={v => patchOpening({ height: v })} /></PropField>
                        <PropField label="Sill (m)"><NumInput value={opening.sillHeight} min={0} max={2} step={0.1} onChange={v => patchOpening({ sillHeight: v })} /></PropField>
                    </>}
                    {opening.type === 'window' && (opening.variant === 'window-casement' || opening.variant === 'window-sliding') && (
                        <PropField label="State">
                            <Button variant="secondary" onClick={() => patchOpening({ isOpen: !opening.isOpen })}>
                                {opening.isOpen ? '🪟 Open' : '🪟 Closed'}
                            </Button>
                        </PropField>
                    )}
                    <PropField label="Position (m)"><NumInput value={opening.position} min={0.3} max={20} step={0.1} onChange={v => patchOpening({ position: v })} /></PropField>
                    {opening.type === 'door' && <>
                        <PropField label="Type">
                            <select
                                value={opening.variant ?? 'door-swing-single'}
                                onChange={e => patchOpening({ variant: e.target.value as any })}
                                style={{ height: 30, borderRadius: 6, width: '100%', border: `1px solid ${COLOR.borderStrong}`, background: COLOR.bgCard, color: COLOR.text, fontSize: 12.5, padding: '0 8px', outline: 'none', cursor: 'pointer' }}
                            >
                                {DOOR_VARIANT_OPTIONS.map(v => (
                                    <option key={v} value={v}>{OPENING_VARIANT_LABELS[v] ?? v}</option>
                                ))}
                            </select>
                        </PropField>
                        <PropField label="Swing">
                            <Button variant="secondary" onClick={() => patchOpening({ swingDirection: opening.swingDirection === 'inward' ? 'outward' : 'inward' })}>
                                {opening.swingDirection === 'inward' ? '← Inward' : '→ Outward'}
                            </Button>
                        </PropField>
                        <PropField label="State">
                            <Button variant="secondary" onClick={() => patchOpening({ isOpen: !opening.isOpen })}>
                                {opening.isOpen ? '🚪 Open' : '🚪 Closed'}
                            </Button>
                        </PropField>
                        {/* Only meaningful for single-leaf doors (swing/pivot) —
                            double-leaf doors are symmetric so flipping which
                            jamb hinges doesn't change anything visually. */}
                        {(opening.variant ?? 'door-swing-single') !== 'door-swing-double'
                            && (opening.variant ?? 'door-swing-single') !== 'door-swing-double-french'
                            && (opening.variant ?? 'door-swing-single') !== 'door-swing-double-arched' && (
                                <PropField label="Hinge Side">
                                    <Button variant="secondary" onClick={() => patchOpening({ flipped: !(opening as any).flipped } as any)}>
                                        ⇋ Flip Horizontal
                                    </Button>
                                </PropField>
                            )}
                    </>}
                </Card>

                {opening.type === 'door' && (
                    <Card>
                        <div style={{ fontSize: 11.5, color: COLOR.textFaint, marginBottom: -4 }}>
                            Overrides the global door style for this door only. Leave on "Default" to follow the scene-wide setting.
                        </div>
                        <MaterialTexturePicker
                            label="Material"
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
                    </Card>
                )}
            </>}

            {furniture && <>
                <Card>
                    <PropField label="Type">
                        <span style={{ fontSize: 12.5, color: COLOR.accent, fontWeight: 600 }}>
                            {FURNITURE_LABELS[furniture.type] ?? furniture.type}
                        </span>
                    </PropField>
                    <PropField label="X pos (m)">
                        <NumInput value={furniture.x} min={-50} max={50} step={0.5}
                            onChange={v => patchFurniture({ x: snapFurniture(v) })} />
                    </PropField>
                    <PropField label="Height (m)">
                        <NumInput value={furniture.heightOffset ?? 0} min={0} max={fp.roomHeight} step={0.1}
                            onChange={v => patchFurniture({ heightOffset: v })} />
                    </PropField>
                    <PropField label="Z pos (m)">
                        <NumInput value={furniture.z} min={-50} max={50} step={0.5}
                            onChange={v => patchFurniture({ z: snapFurniture(v) })} />
                    </PropField>
                    <PropField label="Scale">
                        <RangeRow
                            value={Math.round((furniture.scale ?? 1) * 100)}
                            onChange={v => patchFurniture({ scale: v / 100 })}
                            format={v => `${v}%`}
                            min={50} max={150} step={5}
                        />
                    </PropField>
                    {VARIANT_TYPES.has(furniture.type) && (
                        <PropField label="Style">
                            <div style={{ display: 'flex', gap: SPACE.xxs }}>
                                {VARIANT_OPTIONS.map(opt => {
                                    const active = (furniture.variant ?? 'modern') === opt.id;
                                    return (
                                        <Button
                                            key={opt.id}
                                            flex
                                            variant={active ? 'secondary' : 'ghost'}
                                            onClick={() => patchFurniture({ variant: opt.id })}
                                        >
                                            {opt.label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </PropField>
                    )}
                    <div style={{ display: 'flex', gap: SPACE.xxs }}>
                        <Button flex variant="secondary" onClick={() => patchFurniture({ rotation: furniture.rotation - Math.PI / 2 })}>↺ −90°</Button>
                        <Button flex variant="secondary" onClick={() => patchFurniture({ rotation: furniture.rotation + Math.PI / 2 })}>↻ +90°</Button>
                    </div>
                </Card>

                {furniture && (
                    <Card>
                        {furnitureMaterials.length > 0 ? (
                            <MaterialTexturePicker
                                label="Furniture Texture"
                                items={furnitureMaterials}
                                currentId={furniture.materialId}
                                onSelect={(id) => patchFurniture({ materialId: id })}
                                onClear={() => patchFurniture({ materialId: undefined })}
                                theme={pickerTheme}
                            />
                        ) : (
                            <>
                                <SectionLabel>Furniture Texture</SectionLabel>
                                <div style={{ fontSize: 11.5, color: COLOR.textFaint }}>
                                    No furniture materials wired into the universal catalog yet —
                                    see the commented-out FURNITURE_MATERIALS import in universalMaterials.ts.
                                </div>
                            </>
                        )}
                    </Card>
                )}
            </>}

            {stairs && <>
                <Card>
                    <PropField label="Type">
                        <span style={{ fontSize: 12.5, color: COLOR.accent, fontWeight: 600 }}>
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
                        <RangeRow
                            value={Math.round((stairs.rotation * 180) / Math.PI)}
                            onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rotation: (v * Math.PI) / 180 } : s) })}
                            format={v => `${v}°`}
                            min={0} max={360} step={15}
                        />
                    </PropField>
                    <div style={{ display: 'flex', gap: SPACE.xxs }}>
                        <Button flex variant="secondary" onClick={() => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rotation: s.rotation - Math.PI / 2 } : s) })}>↺ −90°</Button>
                        <Button flex variant="secondary" onClick={() => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rotation: s.rotation + Math.PI / 2 } : s) })}>↻ +90°</Button>
                    </div>
                </Card>
                <Card>
                    <SectionLabel>Type</SectionLabel>
                    <SegmentedControl
                        options={[
                            { value: 'stairs-straight', label: 'Straight' },
                            { value: 'stairs-spiral', label: 'Spiral' },
                        ] as const}
                        value={stairs.type === 'stairs-u' ? 'stairs-l' : stairs.type}
                        onChange={t => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, type: t } : s) })}
                    />
                </Card>
                {stairs && (
                    <Card>
                        <MaterialTexturePicker
                            label="Step Material"
                            items={getMaterialsFor('stairs')}
                            currentId={stairs.materialId}
                            onSelect={(id) => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, materialId: id } : s) })}
                            onClear={() => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, materialId: undefined } : s) })}
                            theme={pickerTheme}
                        />
                    </Card>
                )}
                <Card>
                    <SectionLabel>Geometry</SectionLabel>
                    <PropField label="Width (m)">
                        <NumInput
                            value={stairs.width}
                            min={0.6}
                            max={4}
                            step={0.1}
                            onChange={v => onChange({
                                ...fp,
                                stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                    ? { ...s, width: v, ...(s.type === 'stairs-spiral' ? { depth: v } : {}) }
                                    : s)
                            })}
                        />
                    </PropField>
                    <PropField label="Rise (m)">
                        <NumInput value={stairs.rise ?? fp.roomHeight} min={1} max={6} step={0.1}
                            onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rise: v } : s) })} />
                    </PropField>
                    <PropField label="Steps">
                        <NumInput value={stairs.steps ?? 20} min={3} max={40} step={1}
                            onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, steps: Math.round(v) } : s) })} />
                    </PropField>
                </Card>
            </>}

            {outdoorObj && <>
                <Card>
                    <PropField label="Type">
                        <span style={{ fontSize: 12.5, color: COLOR.accent, fontWeight: 600 }}>
                            {OUTDOOR_OBJECT_LABELS[outdoorObj.type]}
                        </span>
                    </PropField>
                    <PropField label="X pos (m)">
                        <NumInput value={outdoorObj.x} min={-50} max={50} step={0.5} onChange={v => patchOutdoor({ x: snapM(v) })} />
                    </PropField>
                    <PropField label="Z pos (m)">
                        <NumInput value={outdoorObj.z} min={-50} max={50} step={0.5} onChange={v => patchOutdoor({ z: snapM(v) })} />
                    </PropField>
                    <PropField label="Rotation">
                        <RangeRow
                            value={Math.round((outdoorObj.rotation * 180) / Math.PI)}
                            onChange={v => patchOutdoor({ rotation: (v * Math.PI) / 180 })}
                            format={v => `${v}°`}
                            min={0} max={360} step={15}
                        />
                    </PropField>
                    <PropField label="Scale">
                        <RangeRow
                            value={Math.round((outdoorObj.scale ?? 1) * 100)}
                            onChange={v => patchOutdoor({ scale: v / 100 })}
                            format={v => `${v}%`}
                            min={50} max={150} step={5}
                        />
                    </PropField>
                </Card>

                {outdoorObj.type === 'bench' && (
                    <Card>
                        <MaterialTexturePicker
                            label="Material"
                            items={getMaterialsForDomain('outdoor').map(({ key, def }) => ({
                                id: key, label: def.label ?? key, swatch: def.color, thumbnail: def.textureUrl,
                                category: def.category as any, appliesTo: ['outdoor'],
                            }))}
                            currentId={outdoorObj.materialId}
                            onSelect={(id) => patchOutdoor({ materialId: id })}
                            onClear={() => patchOutdoor({ materialId: undefined })}
                            theme={pickerTheme}
                        />
                    </Card>
                )}
            </>}

            {light && <>
                <Card>
                    <PropField label="Type">
                        <span style={{ fontSize: 12.5, color: COLOR.accent, fontWeight: 600 }}>
                            {LIGHT_FIXTURE_LABELS[light.type]}
                        </span>
                    </PropField>

                    {light.x !== undefined && !light.wall && !light.segmentNodeIds && (
                        <>
                            <PropField label="X pos (m)">
                                <NumInput value={light.x} min={-50} max={50} step={0.5}
                                    onChange={v => patchLight({ x: snapM(v) })} />
                            </PropField>
                            <PropField label="Z pos (m)">
                                <NumInput value={light.z ?? 0} min={-50} max={50} step={0.5}
                                    onChange={v => patchLight({ z: snapM(v) })} />
                            </PropField>
                        </>
                    )}

                    {(light.wall || light.segmentNodeIds) && (
                        <>
                            <PropField label="Position (m)">
                                <NumInput value={light.position ?? 0} min={0} max={20} step={0.1}
                                    onChange={v => patchLight({ position: v })} />
                            </PropField>
                            {/* Which side of the wall the fixture faces — mirrors the
                                same control wallDecor already has, using the same
                                facingInward field on PlacedLight. */}
                            <PropField label="Side">
                                <Button
                                    variant="secondary"
                                    onClick={() => patchLight({ facingInward: !(light.facingInward ?? true) })}
                                >
                                    {(light.facingInward ?? true) ? 'Interior side' : 'Exterior side'}
                                </Button>
                            </PropField>
                        </>
                    )}

                    <PropField label="Height (m)">
                        <NumInput value={light.heightOffset} min={0} max={fp.roomHeight} step={0.1}
                            onChange={v => patchLight({ heightOffset: v })} />
                    </PropField>

                    {light.type === 'shelf_strip' && (
                        <PropField label="Width (m)">
                            <NumInput value={light.width ?? 1} min={0.2} max={4} step={0.1}
                                onChange={v => patchLight({ width: v })} />
                        </PropField>
                    )}

                    <PropField label="Color">
                        <ColorSwatchInput value={light.color} onChange={v => patchLight({ color: v })} />
                    </PropField>

                    <PropField label="Intensity">
                        <RangeRow
                            value={Math.round(light.intensity * 10)}
                            onChange={v => patchLight({ intensity: v / 10 })}
                            format={v => (v / 10).toFixed(1)}
                            min={1} max={100} step={1}
                        />
                    </PropField>

                    <PropField label="Scale">
                        <RangeRow
                            value={Math.round((light.scale ?? 1) * 100)}
                            onChange={v => patchLight({ scale: v / 100 })}
                            format={v => `${v}%`}
                            min={50} max={150} step={5}
                        />
                    </PropField>

                    <PropField label="Shadows">
                        <Button variant="secondary" onClick={() => patchLight({ castShadow: !light.castShadow })}>
                            {light.castShadow ? '☑ Casts shadow' : '☐ No shadow'}
                        </Button>
                    </PropField>
                </Card>

                {light.type === 'spotlight' && (
                    <Card>
                        <SectionLabel>Aim</SectionLabel>
                        <PropField label="Yaw">
                            <RangeRow
                                value={Math.round(((light.aimRotation ?? 0) * 180) / Math.PI)}
                                onChange={v => patchLight({ aimRotation: (v * Math.PI) / 180 })}
                                format={v => `${v}°`}
                                min={-180} max={180} step={5}
                            />
                        </PropField>
                        <PropField label="Tilt">
                            <RangeRow
                                value={Math.round(((light.aimTilt ?? -0.3) * 180) / Math.PI)}
                                onChange={v => patchLight({ aimTilt: (v * Math.PI) / 180 })}
                                format={v => `${v}°`}
                                min={-80} max={10} step={5}
                            />
                        </PropField>
                    </Card>
                )}

                {light.type === 'string_lights' && (
                    <Card>
                        <SectionLabel>String</SectionLabel>
                        <PropField label="Bulb count">
                            <NumInput value={light.bulbCount ?? 12} min={4} max={40} step={1}
                                onChange={v => patchLight({ bulbCount: Math.round(v) })} />
                        </PropField>
                    </Card>
                )}
            </>}

            {wallDecor && (
                <Card>
                    <PropField label="Type">
                        <span style={{ fontSize: 12.5, color: COLOR.accent, fontWeight: 600 }}>
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
                    <PropField label="Side">
                        <Button
                            variant="secondary"
                            onClick={() => onChange({
                                ...fp,
                                wallDecor: (fp.wallDecor ?? []).map(d => d.id === wallDecor.id
                                    ? { ...d, facingInward: !(d.facingInward ?? true) }
                                    : d)
                            })}
                        >
                            {(wallDecor.facingInward ?? true) ? 'Interior side' : 'Exterior side'}
                        </Button>
                    </PropField>
                    <PropField label="Rotation">
                        <RangeRow
                            value={Math.round(((wallDecor.rotation ?? 0) * 180) / Math.PI)}
                            onChange={v => onChange({
                                ...fp,
                                wallDecor: (fp.wallDecor ?? []).map(d => d.id === wallDecor.id
                                    ? { ...d, rotation: (v * Math.PI) / 180 }
                                    : d)
                            })}
                            format={v => `${v}°`}
                            min={-180} max={180} step={5}
                        />
                    </PropField>
                </Card>
            )}

            <Button
                variant="danger"
                onClick={onDelete}
                style={{ marginTop: SPACE.xxs }}
            >
                Delete {room ? 'room' : opening ? 'opening' : node ? 'node' : furniture ? 'furniture' : stairs ? 'stairs' : wallDecor ? 'decor item' : light ? 'light' : outdoorObj ? 'object' : shape ? 'area' : 'segment'}
            </Button>
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