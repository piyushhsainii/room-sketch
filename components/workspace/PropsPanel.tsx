import { applyShapeExteriorMaterial, deriveClosedPolygons, snapFurniture, snapM, uid } from "@/lib/helpers"
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
import { DEFAULT_RAILING, DEFAULT_SKIRT, DEFAULT_TREAD, FlightRailingConfig, RailingSideConfig } from "./objects/stair-config"

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
    const [segWallSide, setSegWallSide] = useState<'interior' | 'exterior' | 'both'>('interior')
    const [shapeWallSide, setShapeWallSide] = useState<'interior' | 'exterior' | 'both'>('interior')
    const wallMaterials = getMaterialsFor('wall')
    const floorMaterials = getMaterialsFor('floor')
    const furnitureMaterials = getMaterialsFor('furniture')
    const [skirtFlightTab, setSkirtFlightTab] = useState<'0' | '1'>('0')
    const wallSel = selectedId?.includes('::wall::')
        ? { roomId: selectedId.split('::wall::')[0], wall: selectedId.split('::wall::')[1] as 'north' | 'south' | 'east' | 'west' }
        : null
    const wallRoom = wallSel ? fp.rooms.find(r => r.id === wallSel.roomId) : null
    const [railingFlightTab, setRailingFlightTab] = useState<'0' | '1'>('0')
    const [railingSideTab, setRailingSideTab] = useState<'left' | 'right'>('left')


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

    const applyShapeWallTexture = (
        side: 'interior' | 'exterior' | 'both',
        material: WallMaterial | undefined
    ) => {
        if (!shape) return

        const exists = (fp.closedShapes ?? []).some(
            sh => sh.id === shape.id
        )

        const patch: Partial<ClosedShape> = {}
        if (side === 'interior' || side === 'both') {
            patch.wallMaterial = material
        }
        if (side === 'exterior' || side === 'both') {
            patch.exteriorWallMaterial = material
        }

        const nextShapes = exists
            ? (fp.closedShapes ?? []).map(sh =>
                sh.id === shape.id
                    ? { ...sh, ...patch }
                    : sh
            )
            : [
                ...(fp.closedShapes ?? []),
                { ...shape, ...patch },
            ]

        onChange({
            ...fp,
            closedShapes: nextShapes,
        })
    }

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

    function getOpeningWorldPos(op: EditorOpening, fp: FloorPlanState): { x: number; z: number } | null {
        if (!op.segmentNodeIds) return null
        const a = fp.lineNodes.find(n => n.id === op.segmentNodeIds![0])
        const b = fp.lineNodes.find(n => n.id === op.segmentNodeIds![1])
        if (!a || !b) return null
        const t = op.segmentT ?? 0
        return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
    }

    function findNearestStairsTopHeight(fp: FloorPlanState, op: EditorOpening): number | null {
        const pos = getOpeningWorldPos(op, fp)
        if (!pos) return null
        let best: { dist: number; top: number } | null = null
        for (const s of fp.stairs ?? []) {
            const cx = s.x + s.width / 2, cz = s.z + s.depth / 2
            const dist = Math.hypot(cx - pos.x, cz - pos.z)
            if (dist > 4) continue // ignore stairs unrelated to this wall
            if (!best || dist < best.dist) best = { dist, top: s.rise ?? fp.roomHeight }
        }
        return best?.top ?? null
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
                    <SectionLabel>Wall Texture</SectionLabel>
                    <PropField label="Side">
                        <SegmentedControl
                            options={[
                                { value: 'interior', label: 'Interior' },
                                { value: 'exterior', label: 'Exterior' },
                                { value: 'both', label: 'Both' },
                            ] as const}
                            value={shapeWallSide}
                            onChange={(side) => setShapeWallSide(side)}
                        />
                    </PropField>
                    <div style={{ fontSize: 11, color: COLOR.textFaint, marginBottom: -4 }}>
                        {shapeWallSide === 'exterior'
                            ? 'Applies to the outside face of this wall.'
                            : shapeWallSide === 'both'
                                ? 'Applies to both faces of this wall.'
                                : 'Applies to the inside face of this wall.'}
                    </div>
                    <MaterialTexturePicker
                        label={
                            shapeWallSide === 'both'
                                ? 'Wall Texture'
                                : shapeWallSide === 'exterior'
                                    ? 'Exterior Wall Texture'
                                    : 'Interior Wall Texture'
                        }
                        items={wallMaterials}
                        currentId={
                            shapeWallSide === 'exterior'
                                ? shape.exteriorWallMaterial
                                : shape.wallMaterial
                        }
                        onSelect={(id) =>
                            applyShapeWallTexture(
                                shapeWallSide,
                                id as WallMaterial
                            )
                        }
                        onClear={() =>
                            applyShapeWallTexture(
                                shapeWallSide,
                                undefined
                            )
                        }
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
                    {
                        seg &&
                        <MaterialTexturePicker
                            label="Wall Texture"
                            items={wallMaterials}
                            currentId={
                                segWallSide === 'exterior'
                                    ? segSceneConfig?.exteriorWallMaterial
                                    : segSceneConfig?.wallMaterial
                            }
                            onSelect={(id) => {
                                const patch: Partial<RoomSceneConfig> = {}
                                if (segWallSide === 'interior' || segWallSide === 'both') patch.wallMaterial = id as WallMaterial
                                if (segWallSide === 'exterior' || segWallSide === 'both') patch.exteriorWallMaterial = id as WallMaterial
                                patchRoomSceneById(seg.id, patch)
                            }}
                            onClear={() => {
                                const patch: Partial<RoomSceneConfig> = {}
                                if (segWallSide === 'interior' || segWallSide === 'both') patch.wallMaterial = undefined
                                if (segWallSide === 'exterior' || segWallSide === 'both') patch.exteriorWallMaterial = undefined
                                patchRoomSceneById(seg.id, patch)
                            }}
                            theme={pickerTheme}
                        />
                    }
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
                                { value: 'both', label: 'Both' },
                            ] as const}
                            value={segWallSide}
                            onChange={(side) => {
                                setSegWallSide(side)
                                patchRoomSceneById(seg.id, { wallMaterialSide: side })
                            }}
                        />
                    </PropField>

                    <PropField label="Wall color">
                        <ColorSwatchInput
                            value={segSceneConfig?.wallColor ?? '#FFFFFF'}
                            onChange={v =>
                                patchRoomSceneById(seg.id, {
                                    wallColor: v,
                                })
                            }
                        />
                    </PropField>

                    <Divider />

                    <div style={{
                        fontSize: 11,
                        color: COLOR.textFaint,
                        marginBottom: -4
                    }}>
                        {segWallSide === 'interior'
                            ? 'Applies to the interior face of this wall.'
                            : segWallSide === 'exterior'
                                ? 'Applies to the exterior face of this wall.'
                                : 'Applies to both faces of this wall.'}
                    </div>

                    <MaterialTexturePicker
                        label="Wall Texture"
                        items={wallMaterials}
                        currentId={
                            segWallSide === 'interior'
                                ? segSceneConfig?.wallMaterial
                                : segWallSide === 'exterior'
                                    ? segSceneConfig?.exteriorWallMaterial
                                    : undefined
                        }
                        onSelect={(id) => {
                            const patch: Partial<RoomSceneConfig> = {}
                            if (segWallSide === 'interior' || segWallSide === 'both') patch.wallMaterial = id as WallMaterial
                            if (segWallSide === 'exterior' || segWallSide === 'both') patch.exteriorWallMaterial = id as WallMaterial
                            patchRoomSceneById(seg.id, patch)
                        }}
                        onClear={() => {
                            const patch: Partial<RoomSceneConfig> = {}
                            if (segWallSide === 'interior' || segWallSide === 'both') patch.wallMaterial = undefined
                            if (segWallSide === 'exterior' || segWallSide === 'both') patch.exteriorWallMaterial = undefined
                            patchRoomSceneById(seg.id, patch)
                        }}
                        theme={pickerTheme}
                    />
                </Card>
            </>}

            {opening && <>
                <Card>
                    <PropField label="Width (m)"><NumInput value={opening.width} min={0.5} max={4} step={0.1} onChange={v => patchOpening({ width: v })} /></PropField>
                    {opening.type === 'window' && <>
                        <PropField label="Height (m)">...</PropField>
                    </>}
                    {(opening.type === 'window' || opening.type === 'door') && (
                        <PropField label={opening.type === 'door' ? 'Height above floor (m)' : 'Sill (m)'}>
                            <NumInput value={opening.sillHeight} min={0} max={fp.roomHeight - 0.3} step={0.05}
                                onChange={v => patchOpening({ sillHeight: v })} />
                        </PropField>
                    )}
                    {opening.type === 'window' && opening.variant === 'window-bay' && (
                        <PropField label="Openable panel">
                            <select
                                value={opening.bayDoorIndex ?? ''}
                                onChange={e => patchOpening({ bayDoorIndex: e.target.value === '' ? undefined : Number(e.target.value) })}
                            >
                                <option value="">None (fixed)</option>
                                {Array.from({ length: opening.bayPanelCount ?? 3 }).map((_, i) => (
                                    <option key={i} value={i}>Panel {i + 1}</option>
                                ))}
                            </select>
                        </PropField>
                    )}
                    {opening.type === 'door' && (opening.variant ?? 'door-swing-single') === 'door-sliding-panorama' && (
                        <Card>
                            <div style={{ fontSize: 11.5, color: COLOR.textFaint, marginBottom: -4 }}>
                                Configure glass transparency for this sliding panorama door.
                            </div>

                            <PropField label="Glass finish">
                                <select
                                    value={(opening as any).glass?.finish ?? 'clear'}
                                    onChange={e => patchOpening({
                                        glass: { ...((opening as any).glass ?? {}), finish: e.target.value },
                                    } as any)}
                                    style={{ height: 30, borderRadius: 6, width: '100%', border: `1px solid ${COLOR.borderStrong}`, background: COLOR.bgCard, color: COLOR.text, fontSize: 12.5, padding: '0 8px', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="clear">Clear</option>
                                    <option value="tinted">Tinted</option>
                                    <option value="frosted">Frosted</option>
                                    <option value="reflective">Reflective</option>
                                </select>
                            </PropField>

                            <PropField label="Visibility">
                                <select
                                    value={(opening as any).glass?.viewMode ?? 'two-way'}
                                    onChange={e => patchOpening({
                                        glass: { ...((opening as any).glass ?? {}), viewMode: e.target.value },
                                    } as any)}
                                    style={{ height: 30, borderRadius: 6, width: '100%', border: `1px solid ${COLOR.borderStrong}`, background: COLOR.bgCard, color: COLOR.text, fontSize: 12.5, padding: '0 8px', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="two-way">See-through both sides</option>
                                    <option value="one-way">One-way (privacy)</option>
                                </select>
                            </PropField>

                            {(opening as any).glass?.viewMode === 'one-way' && (
                                <>
                                    <PropField label="Viewable from">
                                        <select
                                            value={(opening as any).glass?.oneWayViewableFrom ?? 'front'}
                                            onChange={e => patchOpening({
                                                glass: { ...((opening as any).glass ?? {}), oneWayViewableFrom: e.target.value },
                                            } as any)}
                                            style={{ height: 30, borderRadius: 6, width: '100%', border: `1px solid ${COLOR.borderStrong}`, background: COLOR.bgCard, color: COLOR.text, fontSize: 12.5, padding: '0 8px', outline: 'none', cursor: 'pointer' }}
                                        >
                                            <option value="front">Front</option>
                                            <option value="back">Back</option>
                                        </select>
                                    </PropField>

                                    <PropField label="Blocked-side finish">
                                        <select
                                            value={(opening as any).glass?.backFinish ?? 'reflective'}
                                            onChange={e => patchOpening({
                                                glass: { ...((opening as any).glass ?? {}), backFinish: e.target.value },
                                            } as any)}
                                            style={{ height: 30, borderRadius: 6, width: '100%', border: `1px solid ${COLOR.borderStrong}`, background: COLOR.bgCard, color: COLOR.text, fontSize: 12.5, padding: '0 8px', outline: 'none', cursor: 'pointer' }}
                                        >
                                            <option value="reflective">Reflective</option>
                                            <option value="frosted">Frosted</option>
                                            <option value="tinted">Tinted</option>
                                        </select>
                                    </PropField>
                                </>
                            )}

                            <PropField label="Sides">
                                <Button
                                    variant="secondary"
                                    onClick={() => patchOpening({ invertGlassSide: !(opening as any).invertGlassSide } as any)}
                                >
                                    {(opening as any).invertGlassSide ? '⇋ Inverted' : '⇋ Invert left/right'}
                                </Button>
                            </PropField>
                        </Card>
                    )}

                    {opening.type === 'door' && (
                        <PropField label="Snap">
                            <Button variant="secondary" onClick={() => {
                                const target = findNearestStairsTopHeight(fp, opening)
                                if (target !== null) patchOpening({ sillHeight: target })
                            }}>
                                ⤒ Snap to nearest stairs landing
                            </Button>
                        </PropField>
                    )}

                    {opening.type === 'window' && (
                        ['window-casement', 'window-sliding', 'window-single-hung', 'window-double-hung', 'window-awning']
                            .includes(opening.variant ?? 'window-fixed')
                    ) && (
                            <>
                                <PropField label="State">
                                    <Button
                                        variant="secondary"
                                        onClick={() => patchOpening({
                                            isOpen: !opening.isOpen,
                                            // Keep openAmount in sync so the slider below reflects
                                            // the toggle instead of freezing at its old value.
                                            openAmount: !opening.isOpen ? (opening.openAmount ?? 1) : opening.openAmount,
                                        })}
                                    >
                                        {opening.isOpen ? '🪟 Open' : '🪟 Closed'}
                                    </Button>
                                </PropField>
                                <PropField label="Open amount">
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={opening.openAmount ?? (opening.isOpen ? 1 : 0)}
                                        onChange={e => {
                                            const v = parseFloat(e.target.value)
                                            patchOpening({ openAmount: v, isOpen: v > 0 })
                                        }}
                                    />
                                </PropField>
                            </>
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
                <Card>
                    <SectionLabel>Railing</SectionLabel>
                    <PropField label="Enabled">
                        <Button
                            variant="secondary"
                            onClick={() => onChange({
                                ...fp,
                                stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                    ? { ...s, railing: { ...(s.railing ?? DEFAULT_RAILING), enabled: !(s.railing?.enabled ?? true) } }
                                    : s)
                            })}
                        >
                            {(stairs.railing?.enabled ?? true) ? '☑ On' : '☐ Off'}
                        </Button>
                    </PropField>

                    {(stairs.railing?.enabled ?? true) && <>
                        {(stairs.type === 'stairs-l' || stairs.type === 'stairs-u') && (
                            <PropField label="Flight">
                                <SegmentedControl
                                    options={[
                                        { value: '0', label: 'Flight 1' },
                                        { value: '1', label: 'Flight 2' },
                                    ] as const}
                                    value={railingFlightTab}
                                    onChange={setRailingFlightTab}
                                />
                            </PropField>
                        )}

                        {/* Side tabs — this is the piece that was missing. Each side is
            now edited and stored independently via perFlight, instead of
            one shared Style/Height/Color applied to "Both" sides at once. */}
                        <PropField label="Editing side">
                            <SegmentedControl
                                options={[
                                    { value: 'left', label: 'Left' },
                                    { value: 'right', label: 'Right' },
                                ] as const}
                                value={railingSideTab}
                                onChange={setRailingSideTab}
                            />
                        </PropField>

                        {(() => {
                            const isMultiFlight = stairs.type === 'stairs-l' || stairs.type === 'stairs-u'
                            const flightIndex = isMultiFlight ? Number(railingFlightTab) : 0
                            const perFlight = stairs.railing?.perFlight ?? []
                            const flightCfg = perFlight.find(p => p.flightIndex === flightIndex)
                            const sideCfg: RailingSideConfig = flightCfg?.[railingSideTab] ?? {
                                enabled: stairs.railing?.side === 'both' || stairs.railing?.side === railingSideTab,
                                style: stairs.railing?.style ?? 'baluster',
                                height: stairs.railing?.height ?? 0.9,
                                color: stairs.railing?.color,
                                postSpacing: stairs.railing?.postSpacing,
                                railingWidth: stairs.railing?.railingWidth,
                            }

                            const updateSide = (patch: Partial<RailingSideConfig>) => {
                                const nextSideCfg = { ...sideCfg, ...patch }
                                const nextFlightCfg: FlightRailingConfig = {
                                    flightIndex,
                                    left: flightCfg?.left,
                                    right: flightCfg?.right,
                                    [railingSideTab]: nextSideCfg,
                                }
                                const nextPerFlight = flightCfg
                                    ? perFlight.map(p => p.flightIndex === flightIndex ? nextFlightCfg : p)
                                    : [...perFlight, nextFlightCfg]
                                onChange({
                                    ...fp,
                                    stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                        ? { ...s, railing: { ...(s.railing ?? DEFAULT_RAILING), perFlight: nextPerFlight } }
                                        : s)
                                })
                            }

                            return <>
                                <PropField label={`${railingSideTab === 'left' ? 'Left' : 'Right'} side`}>
                                    <Button variant="secondary" onClick={() => updateSide({ enabled: !sideCfg.enabled })}>
                                        {sideCfg.enabled ? '☑ On' : '☐ Off'}
                                    </Button>
                                </PropField>

                                {sideCfg.enabled && <>
                                    <PropField label="Style">
                                        <SegmentedControl
                                            options={[
                                                { value: 'baluster', label: 'Baluster' },
                                                { value: 'glass', label: 'Glass' },
                                                { value: 'cable', label: 'Cable' },
                                                { value: 'solid-panel', label: 'Solid' },
                                                { value: 'criss-cross', label: 'Criss-Cross' },
                                            ] as const}
                                            value={sideCfg.style}
                                            onChange={style => updateSide({ style })}
                                        />
                                    </PropField>
                                    <PropField label="Height (m)">
                                        <NumInput value={sideCfg.height} min={0.6} max={1.2} step={0.05}
                                            onChange={height => updateSide({ height })} />
                                    </PropField>
                                    <PropField label="Rail width (m)">
                                        <NumInput value={sideCfg.railingWidth ?? 0.05} min={0.02} max={0.12} step={0.01}
                                            onChange={railingWidth => updateSide({ railingWidth })} />
                                    </PropField>
                                    {(sideCfg.style === 'baluster' || sideCfg.style === 'cable') && (
                                        <PropField label="Post spacing (m)">
                                            <NumInput value={sideCfg.postSpacing ?? 0.12} min={0.05} max={0.3} step={0.01}
                                                onChange={postSpacing => updateSide({ postSpacing })} />
                                        </PropField>
                                    )}
                                    <PropField label="Color">
                                        <ColorSwatchInput
                                            value={sideCfg.color ?? '#6B5B4E'}
                                            onChange={color => updateSide({ color })}
                                        />
                                    </PropField>
                                </>}
                            </>
                        })()}
                    </>}
                </Card>

                <Card>
                    <SectionLabel>Skirt (closed sides)</SectionLabel>
                    <PropField label="Enabled">
                        <Button
                            variant="secondary"
                            onClick={() => onChange({
                                ...fp,
                                stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                    ? { ...s, skirt: { ...(s.skirt ?? DEFAULT_SKIRT), enabled: !(s.skirt?.enabled ?? false) } }
                                    : s)
                            })}
                        >
                            {(stairs.skirt?.enabled ?? false) ? '☑ Closed' : '☐ Open (hollow)'}
                        </Button>
                    </PropField>

                    {(stairs.skirt?.enabled ?? false) && <>
                        {(stairs.type === 'stairs-l' || stairs.type === 'stairs-u') ? (
                            <PropField label="Flight">
                                <SegmentedControl
                                    options={[
                                        { value: '0', label: 'Flight 1' },
                                        { value: '1', label: 'Flight 2' },
                                    ] as const}
                                    value={skirtFlightTab}
                                    onChange={setSkirtFlightTab}
                                />
                            </PropField>
                        ) : null}

                        {(['left', 'right', 'front'] as const).map(side => {
                            const activeFlight = (stairs.type === 'stairs-l' || stairs.type === 'stairs-u') ? Number(skirtFlightTab) : 0
                            const flightCfg = stairs.skirt?.perFlight?.find(p => p.flightIndex === activeFlight)
                            const active = flightCfg?.sides?.includes(side) ?? false
                            return (
                                <PropField key={side} label={side[0].toUpperCase() + side.slice(1)}>
                                    <Button
                                        variant={active ? 'secondary' : 'ghost'}
                                        onClick={() => {
                                            const perFlight = stairs.skirt?.perFlight ?? []
                                            const existing = perFlight.find(p => p.flightIndex === activeFlight)
                                            const nextSides = existing
                                                ? (active ? existing.sides.filter(s => s !== side) : [...existing.sides, side])
                                                : [side]
                                            const nextPerFlight = existing
                                                ? perFlight.map(p => p.flightIndex === activeFlight ? { ...p, sides: nextSides } : p)
                                                : [...perFlight, { flightIndex: activeFlight, sides: nextSides }]
                                            onChange({
                                                ...fp,
                                                stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                                    ? { ...s, skirt: { ...(s.skirt ?? DEFAULT_SKIRT), perFlight: nextPerFlight } }
                                                    : s)
                                            })
                                        }}
                                    >
                                        {active ? '☑' : '☐'}
                                    </Button>
                                </PropField>
                            )
                        })}
                        <Divider />
                        <MaterialTexturePicker
                            label="Skirt Material"
                            items={getMaterialsFor('stairs')}
                            currentId={stairs.skirt?.materialId}
                            onSelect={(id) => onChange({
                                ...fp,
                                stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                    ? { ...s, skirt: { ...(s.skirt ?? DEFAULT_SKIRT), materialId: id } }
                                    : s)
                            })}
                            onClear={() => onChange({
                                ...fp,
                                stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                    ? { ...s, skirt: { ...(s.skirt ?? DEFAULT_SKIRT), materialId: undefined } }
                                    : s)
                            })}
                            theme={pickerTheme}
                        />
                    </>}
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

                    {/* NEW — total flight length, independent of step count. Changes d,
        which StraightStairs/LStairs/UStairs all already use to recompute
        each tread's run/spacing without touching numTreads. */}
                    {stairs.type !== 'stairs-spiral' && (
                        <PropField label="Length (m)">
                            <NumInput
                                value={stairs.depth}
                                min={1}
                                max={12}
                                step={0.1}
                                onChange={v => onChange({
                                    ...fp,
                                    stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, depth: v } : s)
                                })}
                            />
                        </PropField>
                    )}

                    <PropField label="Rise (m)">
                        <NumInput value={stairs.rise ?? fp.roomHeight} min={1} max={6} step={0.1}
                            onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rise: v } : s) })} />
                    </PropField>
                    <Card>
                        <SectionLabel>Tread Style</SectionLabel>
                        <PropField label="Style">
                            <SegmentedControl
                                options={[
                                    { value: 'floating', label: 'Open Riser' },
                                    { value: 'closed', label: 'Closed Riser' },
                                ] as const}
                                value={stairs.tread?.mode ?? 'floating'}
                                onChange={mode => onChange({
                                    ...fp,
                                    stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                        ? { ...s, tread: { ...(s.tread ?? DEFAULT_TREAD), mode } }
                                        : s)
                                })}
                            />
                        </PropField>

                        {(stairs.tread?.mode ?? 'floating') === 'floating' && (
                            <PropField label="Gap (m)">
                                <NumInput value={stairs.tread?.gap ?? 0.03} min={0.005} max={0.1} step={0.005}
                                    onChange={v => onChange({
                                        ...fp,
                                        stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                            ? { ...s, tread: { ...(s.tread ?? DEFAULT_TREAD), gap: v } }
                                            : s)
                                    })} />
                            </PropField>
                        )}

                        <PropField label="Tread depth (m)">
                            <NumInput value={stairs.tread?.depth ?? 0} min={0} max={0.6} step={0.01}
                                onChange={v => onChange({
                                    ...fp,
                                    stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                        ? { ...s, tread: { ...(s.tread ?? DEFAULT_TREAD), depth: v || undefined } }
                                        : s)
                                })} />
                        </PropField>
                        <PropField label="Tread thickness (m)">
                            <NumInput value={stairs.tread?.thickness ?? 0} min={0} max={0.15} step={0.005}
                                onChange={v => onChange({
                                    ...fp,
                                    stairs: (fp.stairs ?? []).map(s => s.id === stairs.id
                                        ? { ...s, tread: { ...(s.tread ?? DEFAULT_TREAD), thickness: v || undefined } }
                                        : s)
                                })} />
                        </PropField>
                    </Card>
                    {(stairs.type === 'stairs-l' || stairs.type === 'stairs-u') ? (
                        <>
                            <PropField label="Steps (flight 1)">
                                <NumInput value={stairs.steps1 ?? Math.round(((stairs.rise ?? fp.roomHeight) / 2) / 0.18)} min={3} max={30} step={1}
                                    onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, steps1: Math.round(v) } : s) })} />
                            </PropField>
                            <PropField label="Steps (flight 2)">
                                <NumInput value={stairs.steps2 ?? Math.round(((stairs.rise ?? fp.roomHeight) / 2) / 0.18)} min={3} max={30} step={1}
                                    onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, steps2: Math.round(v) } : s) })} />
                            </PropField>
                        </>
                    ) : (stairs.type === 'stairs-straight' || stairs.type === 'stairs-spiral') && (
                        <PropField label="Steps">
                            <NumInput value={stairs.steps ?? 20} min={3} max={40} step={1}
                                onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, steps: Math.round(v) } : s) })} />
                        </PropField>
                    )}
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