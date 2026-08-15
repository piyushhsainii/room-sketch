'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ResilientCanvas from './ResilientCanvas'
import { TOOL_CURSORS, Toolbar } from './Tools/ToolBar'
import { Annotation, ClosedShape, DEFAULT_FP, DEFAULT_SCENE_CONFIG, DoorStyle, EditorOpening, EditorRoom, EditorTool, FloorMaterial, FloorPlanState, FURNITURE_CATALOG, FURNITURE_CATEGORIES, FurnitureCategory, getFurnitureByCategory, isFurnitureNew, KEY_TO_DEFAULT_TOOL, LineNode, LineSegment, MIN_ROOM, OPENING_VARIANT_LABELS, PlacedWallDecor, PX_PER_M, STAIRS_FOOTPRINTS, STAIRS_LABELS, WALL_DECOR_DEFAULTS, WALL_DECOR_LABELS, WallDecorType, WallMaterial } from './lib/constants'
import { bboxForEntity, bboxFullyInside, deriveClosedPolygons, getFloorContentBounds, getSegmentOpeningWorldPos, getWallHit, labelForHover, roomContainsPoint, snapFurniture, snapM, toCanvas, toWorld, tryConvertClosedLineShape, uid } from '@/lib/helpers'
import * as THREE from 'three'
import * as Icons from 'lucide-react'
import { ScrollableList } from '../ui/ScrollableList'
import { matchClosedShape, MaterialsPanel } from './MaterialsPanel'
import Scene3D, { Scene3DHandle } from './3DScene'
import { PropsPanel } from './PropsPanel'
import { draw2D } from './2dDraw'
import WorkspaceNav from '../ui/WorkspaceNav'
import ToolHintBar from '../ui/ToolHint'
import { createPortal } from 'react-dom'
import { LIGHT_FIXTURE_DEFAULTS, LIGHT_PLACEMENT_KIND, LightFixtureType, PlacedLight } from './lights-constant'
import { OUTDOOR_OBJECT_FOOTPRINTS, OutdoorObjectType, PlacedOutdoorObject } from './lib/outdoor-constants'
import { CameraView, getBuiltInViews } from './lib/camera'
import { CameraViewPicker } from './CameraViewPicker'
import { duplicateClosedShape, duplicateRoom, MirrorAxis, mirrorRoom } from './lib/duplicate'
import { duplicateFurniture, duplicateOpening, duplicateOutdoorObject, duplicateStairs, duplicateWallDecor } from './lib/duplicate-items'
import { FloatingDock } from '../ui/FloatingDock'
import { useFurnitureCollisions } from './hooks/useFurnitureCollisions'
import { FURNITURE_FOOTPRINTS, FURNITURE_LABELS, FurnitureType, PlacedFurniture } from './lib/furniture-constants'
import { bendSegment, classifySelection, getSelectionAnchorWorld, QuickActionMenu } from './QuickActionMenu'
import { RoomTemplate, WallPreset } from './lib/presets'
import { PresetsPanel } from '../ui/PresetPanel'
import { useDelayedUnmount } from './hooks/useDelayedAmt'
import { insertNodeIntoShapesOnSplit } from './objects/line-walls-3d'
import { DragKindEntry, DragOrigin, pastThreshold, runActiveDrag } from '@/lib/drag-controller'
import { FloatingMenu } from '../ui/FloatingMenu'
import { CameraViewPickerV2 } from '../ui/CameraViewPicker'
import { deriveFlatPlan2D } from './lib/export/flatten2d'
import { createClient } from '@/lib/supabase/client'
import { SunScenePanel } from '../ui/SunCompassPanel'
import { PlacedStairs, StairsType } from './lib/stairs-constants'
import { checkPlacementValidity, findNearestWallPoint } from './lib/lights-drag-utils'
import { migrateToMultiFloor, recomputeFloorElevations } from './lib/migrateToMultiFloor'
import { createEmptyFloor, DEFAULT_ROOF, Floor, ProjectFloorPlan, RoofConfig } from './lib/floor-data'
import { computeDerivedFloorData } from './computeDerivedFloorData'
import ViewModeControl from '../ui/ViewModeControl'
import { useAnimatedMount } from './hooks/useAnimatedMount'
import { getToolGroups } from './lib/tool-constants'

export type RoomSceneConfig = {
    roomId: string
    wallColor?: string
    wallMaterial?: WallMaterial
    floorMaterial?: FloorMaterial
    wallOverrides?: Partial<Record<'north' | 'south' | 'east' | 'west', { color?: string; material?: WallMaterial }>>
    exteriorWallColor?: string
    exteriorWallMaterial?: WallMaterial
    wallMaterialSide?: 'interior' | 'exterior' | 'both'
}

export type SceneConfig = {
    ambientIntensity: number
    wallRoughness: number
    wallTextured: boolean
    showFurniture: boolean
    showLabels: boolean
    fogEnabled: boolean
    doorStyle: DoorStyle
    globalFloorMaterial: FloorMaterial
    globalWallMaterial?: WallMaterial
    groundMaterial?: string
    rooms: RoomSceneConfig[]
    lights: PlacedLight[]
    sunToolEnabled?: boolean
    sunTimeOfDay?: number      // 0–24, default 12
    sunCompassHeading?: number // 0–360°, default 180
}

export const THEME = {
    bg: '#F7F7F5',
    bgPanel: '#FFFFFF',
    bgCanvas: '#FAFAF8',
    border: 'rgba(15,15,15,0.08)',
    borderStrong: 'rgba(15,15,15,0.14)',
    text: '#1A1A1A',
    textMuted: 'rgba(26,26,26,0.55)',
    textFaint: 'rgba(26,26,26,0.35)',
    accent: '#6366F1',
    shadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    shadowLg: '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
}

type Props = {
    projectId?: string,
    onSave?: (
        projectFloorPlan: ProjectFloorPlan,
        sceneConfig: SceneConfig,
        thumbnailUrl?: string
    ) => Promise<{ projectId: string } | void>
    onClose?: () => void
    initialState?: FloorPlanState              // legacy — single-floor draft/fallback
    initialProjectFloorPlan?: ProjectFloorPlan  // new — preferred when present
    initialSceneConfig?: SceneConfig
    isSaving?: boolean
    isSaved?: boolean
}

export default function FloorPlanEditor({
    projectId,
    onSave,
    onClose,
    initialState,
    initialProjectFloorPlan,
    initialSceneConfig,
    isSaving = false,
    isSaved = false,
}: Props) {
    // ─────────────────────────────────────────────────────────────────────────
    // Canvas / viewport
    // ─────────────────────────────────────────────────────────────────────────
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasDivRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<HTMLDivElement>(null)
    const [zoom, setZoom] = useState(1)
    const zoomRef = useRef(zoom)
    const [pan, setPan] = useState({ x: 30, y: 30 })
    const panRef = useRef(pan)
    const [canvasCursor, setCanvasCursor] = useState('default')
    const [midPan, setMidPan] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const spaceHeldRef = useRef(false)
    const spacePanRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const panToolRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const pendingCutoutRef = useRef(false)
    // ─────────────────────────────────────────────────────────────────────────
    // Floor plan data + scene config
    // ─────────────────────────────────────────────────────────────────────────
    // const [fp, setFp] = useState<FloorPlanState>(initialState ?? DEFAULT_FP)
    // const fpRef = useRef(fp); fpRef.current = fp
    // const [sceneConfig, setSceneConfig] = useState<SceneConfig>(initialSceneConfig ?? DEFAULT_SCENE_CONFIG)
    const [sceneConfig, setSceneConfig] = useState<SceneConfig>(initialSceneConfig ?? DEFAULT_SCENE_CONFIG)
    const sceneConfigRef = useRef(sceneConfig)
    const historyRef = useRef<HistoryEntry[]>([])
    const historyIndexRef = useRef(-1)

    // MULTI FLOOR 

    // New state, alongside the existing fp/setFp/sceneConfig — nothing existing removed.
    const [floors, setFloors] = useState<Floor[]>(() =>
        initialProjectFloorPlan?.floors
        ?? migrateToMultiFloor(initialState ?? DEFAULT_FP).floors
    )
    const [activeFloorId, setActiveFloorId] = useState<string>(() =>
        initialProjectFloorPlan?.activeFloorId
        ?? migrateToMultiFloor(initialState ?? DEFAULT_FP).activeFloorId
    )
    const [viewMode, setViewMode] = useState<'single' | 'stacked' | 'stacked-full'>(
        initialProjectFloorPlan?.viewMode ?? 'single'
    )
    const [roof, setRoof] = useState<RoofConfig>(
        initialProjectFloorPlan?.roof ?? DEFAULT_ROOF
    )
    const [fp, setFp] = useState<FloorPlanState>(() => {
        const resolvedFloors = initialProjectFloorPlan?.floors
            ?? migrateToMultiFloor(initialState ?? DEFAULT_FP).floors
        const resolvedActiveId = initialProjectFloorPlan?.activeFloorId
            ?? migrateToMultiFloor(initialState ?? DEFAULT_FP).activeFloorId
        return resolvedFloors.find(f => f.id === resolvedActiveId)?.state ?? DEFAULT_FP
    })
    const fpRef = useRef(fp); fpRef.current = fp
    const [layersOpen, setLayersOpen] = useState(false);

    const [lastSavedSnapshot, setLastSavedSnapshot] = useState<{ fp: FloorPlanState; sceneConfig: SceneConfig } | null>(
        () => ({ fp, sceneConfig })
    )

    const switchToFloor = useCallback((newFloorId: string) => {
        if (newFloorId === activeFloorId) return
        const target = floors.find(f => f.id === newFloorId)
        if (!target) return

        setFloors(prev => prev.map(f => f.id === activeFloorId ? { ...f, state: fpRef.current } : f))
        setFp(target.state)
        setActiveFloorId(newFloorId)
        setSelectedId(null)
        setSelectedIds([])
    }, [activeFloorId, floors])

    const addFloor = useCallback((direction: 'above' | 'below' = 'above') => {
        const maxOrder = Math.max(...floors.map(f => f.order))
        const minOrder = Math.min(...floors.map(f => f.order))
        const newOrder = direction === 'above' ? maxOrder + 1 : minOrder - 1
        const label = direction === 'above' ? `Level ${newOrder + 1}` : `Basement ${Math.abs(newOrder)}`
        const newFloor = createEmptyFloor(label, newOrder, 0) // elevation recomputed below

        setFloors(prev => {
            const withCurrentSaved = prev.map(f =>
                f.id === activeFloorId ? { ...f, state: fpRef.current } : f
            )
            return recomputeFloorElevations([...withCurrentSaved, newFloor])
        })
        setFp(newFloor.state)
        setActiveFloorId(newFloor.id)
        setSelectedId(null)
        setSelectedIds([])
    }, [activeFloorId, floors])

    const renameFloor = useCallback((floorId: string, newLabel: string) => {
        setFloors(prev => prev.map(f => f.id === floorId ? { ...f, label: newLabel } : f))
    }, [])

    const toggleFloorVisible = useCallback((floorId: string) => {
        setFloors(prev => prev.map(f => f.id === floorId ? { ...f, visible: !f.visible } : f))
    }, [])


    const [showUnderlay, setShowUnderlay] = useState<boolean>(
        initialProjectFloorPlan?.showUnderlay ?? true
    )


    // ─────────────────────────────────────────────────────────────────────────
    // Tool / mode
    // ─────────────────────────────────────────────────────────────────────────
    const [tool, setTool] = useState<EditorTool>('room')
    const isWallDecorTool = tool.startsWith('wall-decor-')
    const isDoorTool = tool.startsWith('door-')
    const isWindowTool = tool.startsWith('window-')
    const isOpeningTool = tool.startsWith('opening-')
    const isStairsTool = tool.startsWith('stairs-') || tool === 'elevator'
    const [interactiveMode, setInteractiveMode] = useState(false)
    const [walkMode, setWalkMode] = useState(false)
    const justToggledRef = useRef(false)

    // ─────────────────────────────────────────────────────────────────────────
    // Selection                                                          NEW/CHANGED
    // ─────────────────────────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<string[]>([])          // NEW — replaces selectedId as source of truth
    const selectedIdsRef = useRef<string[]>([]); selectedIdsRef.current = selectedIds  // NEW
    const selectedId = selectedIds.length === 1 ? selectedIds[0] : null   // CHANGED — derived, not primary state
    const setSelectedId = useCallback((id: string | null) => {
        const next = id ? [id] : []
        selectedIdsRef.current = next
        setSelectedIds(next)
    }, [])
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const hoveredIdRef = useRef<string | null>(null)                      // (referenced in your handleMouseMove — add if not already present)

    // ─────────────────────────────────────────────────────────────────────────
    // Marquee select (Plan 4)                                             NEW
    // ─────────────────────────────────────────────────────────────────────────
    const marqueeRef = useRef<{ startWx: number; startWz: number; curWx: number; curWz: number } | null>(null)
    const marqueeRectRef = useRef<{ x: number; z: number; w: number; d: number } | null>(null)
    const groupDragStartRef = useRef<{
        entityStarts: Map<string, { x: number; z: number }>
        nodeStarts: Map<string, { x: number; z: number }>   // NEW — raw lineNode id -> start pos, for shape/segment members
    } | null>(null)
    // ─────────────────────────────────────────────────────────────────────────
    // Mouse-down bookkeeping / drag threshold (shared across all drag kinds)
    // ─────────────────────────────────────────────────────────────────────────
    const isMouseDownRef = useRef(false)
    const dragOriginRef = useRef<DragOrigin>(null)
    const dragConfirmedRef = useRef(false)
    const [isDraggingSelection, setIsDraggingSelection] = useState(false)  // confirm current usage before reusing for marquee

    // ─────────────────────────────────────────────────────────────────────────
    // Per-entity-type drag refs (single-select drag; group-move in Step 5
    // layers on top of these via groupDragStartRef, doesn't replace them)
    // ─────────────────────────────────────────────────────────────────────────
    const dragRoomRef = useRef<{ id: string; ox: number; oz: number; type: 'room' | 'node' } | null>(null)
    const wallDragRef = useRef<{ roomId: string; wall: 'north' | 'south' | 'east' | 'west'; startRoom: EditorRoom } | null>(null)
    const resizeHandleRef = useRef<{ handle: string; room: EditorRoom; startWx: number; startWz: number } | null>(null)
    const shapeDragRef = useRef<{ shapeId: string; ox: number; oz: number; startPositions: Map<string, { x: number; z: number }> } | null>(null)
    const shapeResizeRef = useRef<{ shapeId: string; handle: string; startNodes: Map<string, { x: number; z: number }>; bbox: { minX: number; maxX: number; minZ: number; maxZ: number } } | null>(null)
    const segDragRef = useRef<{ segId: string; ox: number; oz: number; nodeIds?: string[]; startPositions?: Map<string, { x: number; z: number }> } | null>(null)
    const furnitureDragRef = useRef<{ id: string; ox: number; oz: number } | null>(null)
    const outdoorDragRef = useRef<{ id: string; ox: number; oz: number } | null>(null)
    const wallDecorDragRef = useRef<{ id: string; roomId: string; wall?: 'north' | 'south' | 'east' | 'west'; segmentNodeIds?: string[] } | null>(null)
    const lightDragRef = useRef<{ id: string; roomId?: string; wall?: 'north' | 'south' | 'east' | 'west'; segmentNodeIds?: string[]; isFree: boolean } | null>(null)
    const toolbarRef = useRef<HTMLDivElement | null>(null)
    // ─────────────────────────────────────────────────────────────────────────
    // Drawing tools (room-rect, pencil, line/bend)
    // ─────────────────────────────────────────────────────────────────────────
    const isDrawingRef = useRef(false)
    const drawStartRef = useRef<{ x: number; z: number } | null>(null)
    const drawRectRef = useRef<{ x: number; z: number; w: number; d: number } | null>(null)
    const [drawStart, setDrawStart] = useState<{ x: number; z: number } | null>(null)
    const [drawRect, setDrawRect] = useState<{ x: number; z: number; w: number; d: number } | null>(null)
    const isPencilDrawing = useRef(false)
    const [pencilPoints, setPencilPoints] = useState<{ x: number; z: number }[]>([])
    const lineActiveNodeRef = useRef<string | null>(null)
    const [preview, setPreview] = useState<{ x: number; z: number } | null>(null)
    const pathDraftRef = useRef<string[] | null>(null)
    const pencilPointsRef = useRef<{ x: number, z: number }[]>([])
    const openingDragRef = useRef<{
        id: string
        width: number
        wall?: 'north' | 'south' | 'east' | 'west'
        roomId?: string
        segmentNodeIds?: [string, string]
    } | null>(null)
    // Furniture placement + collisions
    // ─────────────────────────────────────────────────────────────────────────
    const [selectedFurnitureType, setSelectedFurnitureType] = useState<FurnitureType>('sofa')
    const [openFurnitureCats, setOpenFurnitureCats] = useState<any>(new Set(FURNITURE_CATEGORIES.map(c => c.id)))
    const { checkCollisions, overlappingRef, hasChanged, clear } = useFurnitureCollisions()
    const [overlappingIds, setOverlappingIds] = useState<Set<string>>(new Set())
    const furnitureByCategory = useMemo(() => getFurnitureByCategory(), [])
    const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
        seating: 'Seating',
        tables: 'Tables',
        bedroom: 'Bedroom',
        kitchen: 'Kitchen',
        bathroom: 'Bathroom',
        storage: 'Storage',
        decor: 'Decor',
        lighting: 'Lighting',
        wall: 'Wall',
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Annotations
    // ─────────────────────────────────────────────────────────────────────────
    const [editingAnnotation, setEditingAnnotation] = useState<{ id: string; text: string; x: number; y: number } | null>(null)
    const annotationInputRef = useRef<HTMLInputElement>(null)

    // ─────────────────────────────────────────────────────────────────────────
    // UI chrome (panels, tooltip, fullscreen)
    // ─────────────────────────────────────────────────────────────────────────
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [rightPanelOpen, setRightPanelOpen] = useState(true)
    const [rightTab, setRightTab] = useState<'properties' | 'scene' | 'materials' | 'sun'>('properties')
    const [hoverTooltip, setHoverTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
    const [moveArmedForId, setMoveArmedForId] = useState<string | null>(null)  // QuickActionMenu click-to-relocate, unrelated to marquee

    const [showRecenterPrompt, setShowRecenterPrompt] = useState(false)
    const recenterPromptShownRef = useRef(false)

    const handleToggleInteractive = () => {
        justToggledRef.current = true
        setInteractiveMode(m => !m)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => { justToggledRef.current = false })
        })
    }

    // 
    // ANIMATION
    // 
    const propertiesRendered = useAnimatedMount(sheetOpen && rightTab === 'properties')
    const sceneRendered = useAnimatedMount(sheetOpen && rightTab === 'scene')
    const sunRendered = useAnimatedMount(sheetOpen && rightTab === 'sun')


    const handleArmMove = useCallback(() => {
        setMoveArmedForId(prev => (prev === selectedId ? null : selectedId))
    }, [selectedId])

    useEffect(() => {
        lineActiveNodeRef.current = null
        pathDraftRef.current = null
    }, [tool])


    const hitOutdoorObject = useCallback((wx: number, wz: number) => {
        return (fpRef.current.outdoorObjects ?? []).findLast(o => {

            const fp2 = OUTDOOR_OBJECT_FOOTPRINTS[o.type] ?? { w: 0.5, d: 0.5 }
            const dx = wx - o.x, dz = wz - o.z
            const cosR = Math.cos(-o.rotation), sinR = Math.sin(-o.rotation)
            const lx = dx * cosR - dz * sinR
            const lz = dx * sinR + dz * cosR
            return Math.abs(lx) < (fp2.w * (o.scale ?? 1)) / 2 + 0.05 && Math.abs(lz) < (fp2.d * (o.scale ?? 1)) / 2 + 0.05
        })
    }, [])
    const handleToolClick = useCallback((id: EditorTool) => {
        setTool(prev => (id === 'presets' && prev === 'presets') ? 'select' : id)
    }, [])


    const presetsMounted = useDelayedUnmount(tool === 'presets')
    const presetsOpen = tool === 'presets'

    const handleSceneSelect = (id: string | null) => {
        if (justToggledRef.current) return
        setSelectedId(id)
        if (id) setRightTab('materials')
    }
    type HistoryEntry = {
        fp: FloorPlanState
        sceneConfig: SceneConfig
    }
    const pushHistory = useCallback((overrideFp?: FloorPlanState, overrideSceneConfig?: SceneConfig) => {
        const entry: HistoryEntry = {
            fp: overrideFp ?? fpRef.current,
            sceneConfig: overrideSceneConfig ?? sceneConfigRef.current,
        }
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
        historyRef.current.push(JSON.parse(JSON.stringify(entry)))
        historyIndexRef.current = historyRef.current.length - 1
    }, [])

    const quickMenuAnchor = useMemo(() => {
        if (!canvasRef.current) return null
        const rect = canvasRef.current.getBoundingClientRect()
        const scale = PX_PER_M * zoomRef.current

        if (selectedIds.length > 1) {
            const boxes = selectedIds
                .map(id => bboxForEntity(fp, id))
                .filter((b): b is NonNullable<typeof b> => b !== null)
            if (boxes.length === 0) return null

            const minX = Math.min(...boxes.map(b => b.minX))
            const maxX = Math.max(...boxes.map(b => b.maxX))
            const minZ = Math.min(...boxes.map(b => b.minZ))

            const worldX = (minX + maxX) / 2
            const worldZ = minZ

            return {
                x: worldX * scale + panRef.current.x + rect.left,
                y: worldZ * scale + panRef.current.y + rect.top,
            }
        }

        // Single-select — unchanged
        if (!selectedId) return null
        const kind = classifySelection(fp, selectedId)
        const world = getSelectionAnchorWorld(fp, selectedId, kind)
        if (!world) return null
        return {
            x: world.x * scale + panRef.current.x + rect.left,
            y: world.z * scale + panRef.current.y + rect.top,
        }
    }, [fp, selectedId, selectedIds, pan, zoom])

    const handleBendSelectedSegment = useCallback((segId: string) => {
        pushHistory()
        setFp(prev => bendSegment(prev, segId, uid))
    }, [pushHistory])

    // Call at the top of every hit-test branch, right where you'd normally
    // do setSelectedId(hitId). Returns true if group-drag was armed (caller
    // should skip the normal single-select call); false means proceed as
    // single-select normally.
    function tryArmGroupDrag(hitId: string): boolean {
        if (selectedIdsRef.current.length > 1 && selectedIdsRef.current.includes(hitId)) {
            const entityStarts = new Map<string, { x: number; z: number }>()
            const nodeStarts = new Map<string, { x: number; z: number }>()

            for (const id of selectedIdsRef.current) {
                const b = bboxForEntity(fpRef.current, id)
                if (b) entityStarts.set(id, { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 })

                // If this id is a closed shape, also snapshot every one of its
                // constituent lineNodes' own positions — needed to translate the
                // shape's actual geometry, since a shape has no x/z of its own.
                const shape = (fpRef.current.closedShapes ?? []).find(s => s.id === id)
                if (shape) {
                    for (const nid of shape.nodeIds) {
                        const n = fpRef.current.lineNodes.find(nd => nd.id === nid)
                        if (n) nodeStarts.set(nid, { x: n.x, z: n.z })
                    }
                }
            }
            groupDragStartRef.current = { entityStarts, nodeStarts }
            return true
        }
        groupDragStartRef.current = null
        return false
    }

    const restoreHistoryEntry = useCallback((entry: HistoryEntry) => {
        const cloned = JSON.parse(JSON.stringify(entry)) as HistoryEntry
        setFp(cloned.fp)
        setSceneConfig(cloned.sceneConfig)
    }, [])
    const rafIdRef = useRef(0)
    const lastCanvasSizeRef = useRef({ w: 0, h: 0 })
    const groupAnchorsRef = useRef<Record<string, HTMLDivElement | null>>({})
    const [furnitureAnchorRect, setFurnitureAnchorRect] = useState<DOMRect | null>(null)
    const [presetsAnchorRect, setPresetsAnchorRect] = useState<DOMRect | null>(null)
    const scene3DRef = useRef<Scene3DHandle>(null)
    const pendingTooltipRef = useRef<{ text: string; x: number; y: number } | null | undefined>(undefined)
    const tooltipRafRef = useRef<number | null>(null)
    const exportRootRef = useRef<THREE.Group>(null)

    function scheduleTooltipUpdate(next: { text: string; x: number; y: number } | null) {
        pendingTooltipRef.current = next
        if (tooltipRafRef.current !== null) return // already scheduled this frame
        tooltipRafRef.current = requestAnimationFrame(() => {
            tooltipRafRef.current = null
            setHoverTooltip(prev => {
                const p = pendingTooltipRef.current
                if (p === undefined) return prev
                if (!p) return prev === null ? prev : null
                if (prev && prev.text === p.text && Math.abs(prev.x - p.x) < 2 && Math.abs(prev.y - p.y) < 2) return prev
                return p
            })
        })
    }
    const getShapeNodeIds = useCallback((shapeId: string): string[] | null => {
        const existing = (fpRef.current.closedShapes ?? []).find(sh => sh.id === shapeId)
        if (existing) return existing.nodeIds
        if (shapeId.startsWith('unconfigured::')) {
            return shapeId.slice('unconfigured::'.length).split(',')
        }
        return null
    }, [])

    const PAN_FIT_PADDING = 0.8 // leave ~20% margin around content

    function computeCenteredView(fp: FloorPlanState, canvasEl: HTMLCanvasElement): { pan: { x: number; y: number }; zoom: number } {
        const bounds = getFloorContentBounds(fp)
        const cw = canvasEl.offsetWidth
        const ch = canvasEl.offsetHeight

        if (!bounds) {
            // blank floor — just put world origin at canvas center, no scale guessing
            return { pan: { x: cw / 2, y: ch / 2 }, zoom: 1 }
        }

        const { minX, maxX, minZ, maxZ } = bounds
        const contentW = Math.max(maxX - minX, 0.1)
        const contentH = Math.max(maxZ - minZ, 0.1)

        // zoom such that content fits inside canvas * padding, in px-per-meter terms
        const fitZoom = Math.min(
            (cw * PAN_FIT_PADDING) / (contentW * PX_PER_M),
            (ch * PAN_FIT_PADDING) / (contentH * PX_PER_M)
        )
        const zoom = Math.max(0.1, Math.min(fitZoom, 3))

        const worldCx = (minX + maxX) / 2
        const worldCz = (minZ + maxZ) / 2

        // solve toCanvas(worldC, pan, zoom) = canvasCenter  →  pan = canvasCenter - worldC * PX_PER_M * zoom
        const pan = {
            x: cw / 2 - worldCx * PX_PER_M * zoom,
            y: ch / 2 - worldCz * PX_PER_M * zoom,
        }

        return { pan, zoom }
    }

    function centerOnContent(fp: FloorPlanState, canvasEl: HTMLCanvasElement | null) {
        if (!canvasEl) return
        const { pan: newPan, zoom: newZoom } = computeCenteredView(fp, canvasEl)
        panRef.current = newPan
        setPan(newPan)
        zoomRef.current = newZoom
        setZoom(newZoom)
    }

    const deleteClosedShape = useCallback((shapeId: string) => {
        const nodeIds = getShapeNodeIds(shapeId)
        if (!nodeIds) return false
        const targetSet = new Set(nodeIds)

        const allFaces = deriveClosedPolygons(fpRef.current.lineNodes, fpRef.current.lineSegments)
        const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

        const edgeFaceCount = new Map<string, number>()
        const targetEdges = new Set<string>()
        for (const face of allFaces) {
            const isTarget = face.length === nodeIds.length && face.every(id => targetSet.has(id))
            for (let i = 0; i < face.length; i++) {
                const key = edgeKey(face[i]!, face[(i + 1) % face.length]!)
                edgeFaceCount.set(key, (edgeFaceCount.get(key) ?? 0) + 1)
                if (isTarget) targetEdges.add(key)
            }
        }

        const segIdsToRemove = new Set(
            fpRef.current.lineSegments
                .filter(seg => {
                    for (let i = 0; i < seg.nodeIds.length - 1; i++) {
                        const key = edgeKey(seg.nodeIds[i]!, seg.nodeIds[i + 1]!)
                        if (targetEdges.has(key) && (edgeFaceCount.get(key) ?? 0) <= 1) return true
                    }
                    return false
                })
                .map(s => s.id)
        )

        pushHistory()
        setFp(prev => {
            const remainingSegments = prev.lineSegments.filter(s => !segIdsToRemove.has(s.id))
            const referencedNodeIds = new Set(remainingSegments.flatMap(s => s.nodeIds))
            const remainingNodes = prev.lineNodes.filter(n => !targetSet.has(n.id) || referencedNodeIds.has(n.id))

            return {
                ...prev,
                closedShapes: (prev.closedShapes ?? []).filter(sh => sh.id !== shapeId),
                lineSegments: remainingSegments,
                lineNodes: remainingNodes,
                openings: prev.openings.filter(o => !segIdsToRemove.has(o.roomId)),
                wallDecor: (prev.wallDecor ?? []).filter(d => !segIdsToRemove.has(d.roomId)),
                lights: (prev.lights ?? []).filter(l => !l.roomId || !segIdsToRemove.has(l.roomId)),
            }
        })
        return true
    }, [getShapeNodeIds, pushHistory])

    useEffect(() => {
        const topView = getBuiltInViews(fp).find(v => v.id === "preset-top")
        if (!topView) return

        let raf: number
        const tryFly = () => {
            if (scene3DRef.current) {
                scene3DRef.current.flyTo(topView)
            } else {
                raf = requestAnimationFrame(tryFly)
            }
        }
        raf = requestAnimationFrame(tryFly)
        return () => cancelAnimationFrame(raf)
    }, [])

    // Re-measure whenever the furniture tool becomes active (mirrors the
    // pattern GroupButton already uses for its own flyouts).
    useEffect(() => {
        if (tool !== 'furniture') {
            setFurnitureAnchorRect(null)
            return
        }
        const el = groupAnchorsRef.current['furniture'] // match your TOOL_GROUPS id
        if (el) setFurnitureAnchorRect(el.getBoundingClientRect())

        const onResize = () => {
            const node = groupAnchorsRef.current['furniture']
            if (node) setFurnitureAnchorRect(node.getBoundingClientRect())
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [tool])

    // const closedPolygonsCacheRef = useRef<{ segs: FloorPlanState['lineSegments']; result: string[][] } | null>(null)
    const openingsIndexCacheRef = useRef<{
        openings: FloorPlanState['openings']
        byRoom: Map<string, FloorPlanState['openings']>
        bySegment: Map<string, FloorPlanState['openings']>
    } | null>(null)
    const shapesIndexCacheRef = useRef<{
        shapes: FloorPlanState['closedShapes']
        map: Map<string, NonNullable<FloorPlanState['closedShapes']>[number]>
    } | null>(null)

    function getOpeningsIndex(fp: FloorPlanState) {
        const cache = openingsIndexCacheRef.current
        if (cache && cache.openings === fp.openings) return cache
        const byRoom = new Map<string, FloorPlanState['openings']>()
        const bySegment = new Map<string, FloorPlanState['openings']>()
        for (const o of fp.openings) {
            const target = o.segmentNodeIds ? bySegment : byRoom
            const arr = target.get(o.roomId)
            if (arr) arr.push(o)
            else target.set(o.roomId, [o])
        }
        const next = { openings: fp.openings, byRoom, bySegment }
        openingsIndexCacheRef.current = next
        return next
    }

    function getShapesIndex(fp: FloorPlanState) {
        const cache = shapesIndexCacheRef.current
        if (cache && cache.shapes === fp.closedShapes) return cache.map
        const map = new Map<string, NonNullable<FloorPlanState['closedShapes']>[number]>()
        for (const s of fp.closedShapes ?? []) {
            map.set([...s.nodeIds].sort().join(','), s)
        }
        shapesIndexCacheRef.current = { shapes: fp.closedShapes, map }
        return map
    }

    const flat2D = useMemo(() => deriveFlatPlan2D(fp), [fp])
    const flat2DRef = useRef(flat2D)
    useEffect(() => { flat2DRef.current = flat2D }, [flat2D])

    const openingsIndex = useMemo(() => getOpeningsIndex(fp), [fp])
    const openingsIndexRef = useRef(openingsIndex)
    useEffect(() => { openingsIndexRef.current = openingsIndex }, [openingsIndex])

    const shapesIndex = useMemo(() => getShapesIndex(fp), [fp])
    const shapesIndexRef = useRef(shapesIndex)
    useEffect(() => { shapesIndexRef.current = shapesIndex }, [shapesIndex])

    const nodesById = useMemo(
        () => new Map(fp.lineNodes.map(n => [n.id, n])),
        [fp.lineNodes]
    )
    const nodesByIdRef = useRef(nodesById)
    useEffect(() => { nodesByIdRef.current = nodesById }, [nodesById])

    const roomsById = useMemo(
        () => new Map(fp.rooms.map(r => [r.id, r])),
        [fp.rooms]
    )
    const roomsByIdRef = useRef(roomsById)
    useEffect(() => { roomsByIdRef.current = roomsById }, [roomsById])

    const previewRef = useRef<{ x: number; z: number } | null>(null)

    const scheduleRedraw = useCallback(() => {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = requestAnimationFrame(() => {
            const canvas = canvasRef.current
            if (!canvas) return
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const cw = canvas.offsetWidth, ch = canvas.offsetHeight

            const bounds = getFloorContentBounds(fpRef.current)
            if (bounds) {
                const worldCx = (bounds.minX + bounds.maxX) / 2
                const worldCz = (bounds.minZ + bounds.maxZ) / 2
                const contentCanvasX = toCanvas(worldCx, panRef.current.x, zoomRef.current)
                const contentCanvasY = toCanvas(worldCz, panRef.current.y, zoomRef.current)
                const dx = contentCanvasX - cw / 2
                const dy = contentCanvasY - ch / 2
                const dist = Math.sqrt(dx * dx + dy * dy)
                const diagonal = Math.sqrt(cw * cw + ch * ch)

                const isFar = dist > diagonal * 1.2
                if (isFar && !recenterPromptShownRef.current) {
                    recenterPromptShownRef.current = true
                    setShowRecenterPrompt(true)
                } else if (!isFar && recenterPromptShownRef.current) {
                    recenterPromptShownRef.current = false
                    setShowRecenterPrompt(false)
                }
            }

            if (lastCanvasSizeRef.current.w !== cw || lastCanvasSizeRef.current.h !== ch) {
                canvas.width = cw
                canvas.height = ch
                lastCanvasSizeRef.current = { w: cw, h: ch }
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            for (const { floor, derived } of ghostFloorsDerivedRef.current) {
                ctx.save()
                ctx.globalAlpha = 0.25
                draw2D(
                    ctx, floor.state, 'select', null, [], null,
                    null, [],
                    zoom, pan, null, null, new Set(),
                    derived.closedPolygons,
                    derived.openingsByRoom, derived.openingsBySegment,
                    derived.shapesIndex, null,
                    derived.nodesById, derived.roomsById,
                    sceneConfig.showFurniture, sceneConfig.showLabels
                )
                ctx.restore()
            }

            // Active floor — full opacity, full interactivity, exactly as before
            ctx.globalAlpha = 1
            draw2D(
                ctx, fpRef.current, tool, selectedId, selectedIds, hoveredIdRef.current,
                drawRectRef.current, pencilPointsRef.current,
                zoom, pan, previewRef.current, lineActiveNodeRef.current, overlappingIds,
                flat2DRef.current.closedPolygons,
                openingsIndexRef.current.byRoom, openingsIndexRef.current.bySegment,
                shapesIndexRef.current, marqueeRectRef.current,
                nodesByIdRef.current, roomsByIdRef.current,
                sceneConfig.showFurniture, sceneConfig.showLabels
            )
        })
    }, [tool, selectedId, selectedIds, zoom, pan, overlappingIds, sceneConfig.showFurniture, sceneConfig.showLabels])

    useEffect(() => { scheduleRedraw() }, [scheduleRedraw, fp, pencilPoints, preview, hoveredId])
    useEffect(() => () => cancelAnimationFrame(rafIdRef.current), [])



    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ro = new ResizeObserver(() => scheduleRedraw())
        ro.observe(canvas)
        return () => ro.disconnect()
    }, [scheduleRedraw])

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            const key = e.key.toLowerCase()

            if (KEY_TO_DEFAULT_TOOL[key]) {
                setTool(KEY_TO_DEFAULT_TOOL[key])
            }

            if (key === 'escape') {
                setTool('select')
                lineActiveNodeRef.current = null
                setPreview(null)
                setDrawStart(null)
                setDrawRect(null)
            }
            if ((key === 'delete' || key === 'backspace') && selectedId) {
                const isKnownShape = (fpRef.current.closedShapes ?? []).some(sh => sh.id === selectedId)
                    || selectedId.startsWith('unconfigured::')
                if (isKnownShape) {
                    deleteClosedShape(selectedId)
                    setSelectedId(null)
                    return
                }
                setFp(prev => {
                    const isRoom = prev.rooms.some(r => r.id === selectedId)
                    const isNode = prev.lineNodes.some(n => n.id === selectedId)
                    const isSeg = prev.lineSegments.some(s => s.id === selectedId)
                    // isShape branch removed — handled above
                    if (isRoom) return { ...prev, rooms: prev.rooms.filter(r => r.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                    if (isNode) return { ...prev, lineNodes: prev.lineNodes.filter(n => n.id !== selectedId), lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(selectedId)) }
                    if (isSeg) return { ...prev, lineSegments: prev.lineSegments.filter(s => s.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                    const isFurniture = (prev.furniture ?? []).some(f => f.id === selectedId)
                    if (isFurniture) return { ...prev, furniture: (prev.furniture ?? []).filter(f => f.id !== selectedId) }
                    const isStairs = (prev.stairs ?? []).some(s => s.id === selectedId)
                    if (isStairs) return { ...prev, stairs: (prev.stairs ?? []).filter(s => s.id !== selectedId) }
                    const isWallDecor = (prev.wallDecor ?? []).some(d => d.id === selectedId)
                    if (isWallDecor) return { ...prev, wallDecor: (prev.wallDecor ?? []).filter(d => d.id !== selectedId) }
                    return { ...prev, openings: prev.openings.filter(o => o.id !== selectedId) }
                })
                setSelectedId(null)
            }
            if (key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                if (historyIndexRef.current > 0) {
                    historyIndexRef.current--
                    const snapshot = historyRef.current[historyIndexRef.current]!
                    restoreHistoryEntry(snapshot)
                }
            }
            if (key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
                if (historyIndexRef.current < historyRef.current.length - 1) {
                    historyIndexRef.current++
                    const snapshot = historyRef.current[historyIndexRef.current]!
                    restoreHistoryEntry(snapshot)
                }
            }
            if (key === 'd' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault() // stop the browser's own Ctrl/CmdD (bookmark) from firing
                handleDuplicateSelected()
            }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [selectedId])

    useEffect(() => { setMoveArmedForId(null) }, [selectedId])

    const toggleFullscreen = useCallback(async () => {
        if (!document.fullscreenElement) { await editorRef.current?.requestFullscreen(); setIsFullscreen(true) }
        else { await document.exitFullscreen(); setIsFullscreen(false) }
    }, [])

    useEffect(() => {
        const h = () => setIsFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', h)
        return () => document.removeEventListener('fullscreenchange', h)
    }, [])

    useEffect(() => { panRef.current = pan }, [pan])
    useEffect(() => { zoomRef.current = zoom }, [zoom])

    const evWorld = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect()
        return {
            wx: toWorld(e.clientX - rect.left, panRef.current.x, zoomRef.current),
            wz: toWorld(e.clientY - rect.top, panRef.current.y, zoomRef.current),
            cx: e.clientX - rect.left,
            cy: e.clientY - rect.top,
        }
    }, [])

    // ── Hit testing ──────────────────────────────────────────────────────────
    const hitRoom = useCallback((wx: number, wz: number) => {
        const rooms = [...fpRef.current.rooms].reverse()
        return rooms.find(r => roomContainsPoint(r, wx, wz)) ?? null
    }, [])
    const hitLight = useCallback((wx: number, wz: number) => {
        const threshold = 0.5;
        for (const l of fpRef.current.lights ?? []) {
            const kind = LIGHT_PLACEMENT_KIND[l.type]

            if (kind === 'wall-strip') {
                // identical resolution + width-aware threshold to hitWallDecor
                if (l.segmentNodeIds) {
                    const a = fpRef.current.lineNodes.find(n => n.id === l.segmentNodeIds![0])
                    const b = fpRef.current.lineNodes.find(n => n.id === l.segmentNodeIds![1])
                    if (!a || !b) continue
                    const t = l.segmentT ?? 0
                    const px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t
                    if (Math.hypot(wx - px, wz - pz) < Math.max((l.width ?? 1) / 2, threshold)) return l
                } else if (l.wall && l.roomId) {
                    const room = fpRef.current.rooms.find(r => r.id === l.roomId)
                    if (!room) continue
                    const isH = l.wall === 'north' || l.wall === 'south'
                    let dx: number, dz: number
                    if (l.wall === 'north') { dx = room.x + (l.position ?? 0); dz = room.z }
                    else if (l.wall === 'south') { dx = room.x + (l.position ?? 0); dz = room.z + room.depth }
                    else if (l.wall === 'west') { dx = room.x; dz = room.z + (l.position ?? 0) }
                    else { dx = room.x + room.width; dz = room.z + (l.position ?? 0) }
                    const along = isH ? Math.abs(wx - dx) : Math.abs(wz - dz)
                    const across = isH ? Math.abs(wz - dz) : Math.abs(wx - dx)
                    if (along < (l.width ?? 1) / 2 + threshold * 0.3 && across < threshold) return l
                }
                continue
            }

            if (kind === 'path') {
                const nodes = (l.pathNodeIds ?? []).map(id => fpRef.current.lineNodes.find(n => n.id === id)).filter(Boolean) as LineNode[]
                for (let i = 0; i < nodes.length - 1; i++) {
                    const a = nodes[i]!, b = nodes[i + 1]!
                    const dx = b.x - a.x, dz = b.z - a.z
                    const len2 = dx * dx + dz * dz
                    if (len2 === 0) continue
                    const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wz - a.z) * dz) / len2))
                    const dist = Math.hypot(wx - (a.x + t * dx), wz - (a.z + t * dz))
                    if (dist < threshold) return l
                }
                continue
            }

            // wall-point and free-point — unchanged from your current A/B/C logic
            if (l.segmentNodeIds && l.segmentNodeIds.length >= 2) {
                const a = fpRef.current.lineNodes.find(n => n.id === l.segmentNodeIds![0]);
                const b = fpRef.current.lineNodes.find(n => n.id === l.segmentNodeIds![1]);
                if (!a || !b) continue;
                const t = l.segmentT ?? 0.5;
                const px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t;
                if (Math.hypot(wx - px, wz - pz) < threshold) return l;
            } else if (l.wall && l.roomId) {
                const room = fpRef.current.rooms.find(r => r.id === l.roomId);
                if (!room) continue;
                const isH = l.wall === 'north' || l.wall === 'south';
                let dx: number, dz: number;
                if (l.wall === 'north') { dx = room.x + (l.position ?? 0); dz = room.z; }
                else if (l.wall === 'south') { dx = room.x + (l.position ?? 0); dz = room.z + room.depth; }
                else if (l.wall === 'west') { dx = room.x; dz = room.z + (l.position ?? 0); }
                else { dx = room.x + room.width; dz = room.z + (l.position ?? 0); }
                const along = isH ? Math.abs(wx - dx) : Math.abs(wz - dz);
                const across = isH ? Math.abs(wz - dz) : Math.abs(wx - dx);
                if (along < threshold + 0.15 && across < threshold + 0.15) return l;
            } else {
                const lx = l.x ?? 0, lz = l.z ?? 0;
                if (Math.hypot(wx - lx, wz - lz) < threshold) return l;
            }
        }
        return null;
    }, []);
    const hitLineNode = useCallback((wx: number, wz: number) => {
        return fpRef.current.lineNodes.find(n =>
            Math.hypot(wx - n.x, wz - n.z) < 0.5 / zoomRef.current
        ) ?? null
    }, [])

    const hitLineSegment = useCallback((wx: number, wz: number) => {
        const threshold = 0.35 / zoomRef.current
        for (const seg of fpRef.current.lineSegments ?? []) {
            const nodes = seg.nodeIds.map(nid => fpRef.current.lineNodes.find(n => n.id === nid)).filter(Boolean) as LineNode[]
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i]!, b = nodes[i + 1]!
                const dx = b.x - a.x, dz = b.z - a.z
                const len2 = dx * dx + dz * dz
                if (len2 === 0) continue
                const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wz - a.z) * dz) / len2))
                const dist = Math.hypot(wx - (a.x + t * dx), wz - (a.z + t * dz))
                if (dist < threshold) return { seg, subIndex: i, t, ax: a.x, az: a.z, bx: b.x, bz: b.z, fromId: a.id, toId: b.id }
            }
        }
        return null
    }, [])

    const hitCutoutGuardEdge = useCallback((wx: number, wz: number) => {
        const threshold = 0.35 / zoomRef.current
        for (const shape of fpRef.current.closedShapes ?? []) {
            if (!shape.cutout?.enabled || !shape.cutout.guard?.enabled) continue
            const ids = shape.nodeIds
            for (let i = 0; i < ids.length; i++) {
                const a = fpRef.current.lineNodes.find(n => n.id === ids[i])
                const b = fpRef.current.lineNodes.find(n => n.id === ids[(i + 1) % ids.length])
                if (!a || !b) continue
                const dx = b.x - a.x, dz = b.z - a.z
                const len2 = dx * dx + dz * dz
                if (len2 === 0) continue
                const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wz - a.z) * dz) / len2))
                const dist = Math.hypot(wx - (a.x + t * dx), wz - (a.z + t * dz))
                if (dist < threshold) return { shapeId: shape.id, edgeIndex: i }
            }
        }
        return null
    }, [])

    const hitWallDecor = useCallback((wx: number, wz: number) => {
        const threshold = 0.35 / zoomRef.current
        for (const d of fpRef.current.wallDecor ?? []) {
            if (d.segmentNodeIds) {
                const a = fpRef.current.lineNodes.find(n => n.id === d.segmentNodeIds![0])
                const b = fpRef.current.lineNodes.find(n => n.id === d.segmentNodeIds![1])
                if (!a || !b) continue
                const t = d.segmentT ?? 0
                const px = a.x + (b.x - a.x) * t
                const pz = a.z + (b.z - a.z) * t
                if (Math.hypot(wx - px, wz - pz) < Math.max(d.width / 2, threshold)) return d
            } else {
                const room = fpRef.current.rooms.find(r => r.id === d.roomId)
                if (!room || !d.wall) continue
                const isH = d.wall === 'north' || d.wall === 'south'
                let dx: number, dz: number
                if (d.wall === 'north') { dx = room.x + d.position; dz = room.z }
                else if (d.wall === 'south') { dx = room.x + d.position; dz = room.z + room.depth }
                else if (d.wall === 'west') { dx = room.x; dz = room.z + d.position }
                else { dx = room.x + room.width; dz = room.z + d.position }
                const along = isH ? Math.abs(wx - dx) : Math.abs(wz - dz)
                const across = isH ? Math.abs(wz - dz) : Math.abs(wx - dx)
                if (along < d.width / 2 + threshold * 0.3 && across < threshold) return d
            }
        }
        return null
    }, [])

    const hitOpening = useCallback((wx: number, wz: number) => {
        const threshold = 0.4 / zoomRef.current
        for (const op of fpRef.current.openings) {
            if (op.segmentNodeIds) {
                const pos = getSegmentOpeningWorldPos(op, fpRef.current.lineNodes)
                if (!pos) continue
                if (Math.hypot(wx - pos.wx, wz - pos.wz) < Math.max(op.width / 2, threshold)) return op
            } else {
                const room = fpRef.current.rooms.find(r => r.id === op.roomId)
                if (!room) continue
                const isH = op.wall === 'north' || op.wall === 'south'
                let opx: number, opz: number
                if (op.wall === 'north') { opx = room.x + op.position; opz = room.z }
                else if (op.wall === 'south') { opx = room.x + op.position; opz = room.z + room.depth }
                else if (op.wall === 'west') { opx = room.x; opz = room.z + op.position }
                else { opx = room.x + room.width; opz = room.z + op.position }
                const along = isH ? Math.abs(wx - opx) : Math.abs(wz - opz)
                const across = isH ? Math.abs(wz - opz) : Math.abs(wx - opx)
                if (along < op.width / 2 + threshold * 0.3 && across < threshold) return op
            }
        }
        return null
    }, [])

    const hitRoomWall = useCallback((wx: number, wz: number) => {
        const threshold = 0.25 / zoomRef.current
        const rooms = [...fpRef.current.rooms].reverse()
        for (const room of rooms) {
            if (wx < room.x - threshold || wx > room.x + room.width + threshold ||
                wz < room.z - threshold || wz > room.z + room.depth + threshold) continue
            const wall = getWallHit(room, wx, wz, threshold)
            if (!wall) continue
            const d = wall === 'north' ? Math.abs(wz - room.z)
                : wall === 'south' ? Math.abs(wz - (room.z + room.depth))
                    : wall === 'west' ? Math.abs(wx - room.x)
                        : Math.abs(wx - (room.x + room.width))
            if (d < threshold) return { room, wall }
        }
        return null
    }, [])

    const hitClosedShape = useCallback((wx: number, wz: number) => {
        const polygons = deriveClosedPolygons(fpRef.current.lineNodes, fpRef.current.lineSegments)

        let best: { nodeIds: string[]; area: number } | null = null

        for (const nodeIds of polygons) {
            const nodes = nodeIds.map(nid => fpRef.current.lineNodes.find(n => n.id === nid)).filter(Boolean) as LineNode[]
            if (nodes.length < 3) continue

            let inside = false
            for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
                const xi = nodes[i]!.x, zi = nodes[i]!.z, xj = nodes[j]!.x, zj = nodes[j]!.z
                if ((zi > wz) !== (zj > wz) && wx < ((xj - xi) * (wz - zi)) / (zj - zi) + xi) inside = !inside
            }
            if (!inside) continue

            let area2 = 0
            for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
                area2 += (nodes[j]!.x + nodes[i]!.x) * (nodes[j]!.z - nodes[i]!.z)
            }
            const area = Math.abs(area2) / 2

            if (!best || area < best.area) best = { nodeIds, area }
        }

        if (!best) return null

        const existing = matchClosedShape(best.nodeIds, fpRef.current.lineNodes, fpRef.current.closedShapes ?? [])
        if (existing) return existing
        return { id: `unconfigured::${[...best.nodeIds].sort().join(',')}`, nodeIds: best.nodeIds, label: undefined } as ClosedShape
    }, [])
    const commitMove = useCallback((id: string, wx: number, wz: number) => {
        const currentFp = fpRef.current
        const kind = classifySelection(currentFp, id)
        if (!kind) return

        switch (kind) {
            case 'furniture': {
                const nx = snapFurniture(wx), nz = snapFurniture(wz)
                pushHistory()
                setFp(prev => ({ ...prev, furniture: (prev.furniture ?? []).map(f => f.id === id ? { ...f, x: nx, z: nz } : f) }))
                return
            }
            case 'stairs': {
                const s = (currentFp.stairs ?? []).find(s => s.id === id)
                if (!s) return
                const nx = snapM(wx - s.width / 2), nz = snapM(wz - s.depth / 2)
                pushHistory()
                setFp(prev => ({ ...prev, stairs: (prev.stairs ?? []).map(st => st.id === id ? { ...st, x: nx, z: nz } : st) }))
                return
            }
            case 'outdoor': {
                const nx = snapM(wx), nz = snapM(wz)
                pushHistory()
                setFp(prev => ({ ...prev, outdoorObjects: (prev.outdoorObjects ?? []).map(o => o.id === id ? { ...o, x: nx, z: nz } : o) }))
                return
            }
            case 'room': {
                const room = currentFp.rooms.find(r => r.id === id)
                if (!room) return
                const nx = snapM(wx - room.width / 2)
                const nz = snapM(wz - room.depth / 2)
                pushHistory()
                setFp(prev => ({ ...prev, rooms: prev.rooms.map(r => r.id === id ? { ...r, x: nx, z: nz } : r) }))
                return
            }
            case 'segment': {
                // Same connected-chain BFS your segHit drag-start already does —
                // reused here so "move the whole wall loop" behaves identically
                // whether triggered by drag or by Move-commit.
                const seg = currentFp.lineSegments.find(s => s.id === id)
                if (!seg) return
                const adj = new Map<string, string[]>()
                for (const s of currentFp.lineSegments) {
                    for (let i = 0; i < s.nodeIds.length - 1; i++) {
                        const a = s.nodeIds[i]!, b = s.nodeIds[i + 1]!
                        if (!adj.has(a)) adj.set(a, [])
                        if (!adj.has(b)) adj.set(b, [])
                        adj.get(a)!.push(b); adj.get(b)!.push(a)
                    }
                }
                const visited = new Set<string>()
                const queue = [seg.nodeIds[0]!]
                while (queue.length) {
                    const cur = queue.shift()!
                    if (visited.has(cur)) continue
                    visited.add(cur)
                    for (const nb of adj.get(cur) ?? []) if (!visited.has(nb)) queue.push(nb)
                }
                const nodes = [...visited].map(nid => currentFp.lineNodes.find(n => n.id === nid)).filter(Boolean) as LineNode[]
                if (nodes.length === 0) return
                const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
                const cz = nodes.reduce((s, n) => s + n.z, 0) / nodes.length
                const ddx = snapM(wx) - cx, ddz = snapM(wz) - cz
                pushHistory()
                setFp(prev => ({
                    ...prev,
                    lineNodes: prev.lineNodes.map(n => visited.has(n.id) ? { ...n, x: n.x + ddx, z: n.z + ddz } : n),
                }))
                return
            }
            case 'shape': {
                const shape = (currentFp.closedShapes ?? []).find(s => s.id === id)
                if (!shape) return

                // Same shared-node clone as the drag-start fix, so Move-commit
                // can't stretch a neighboring shape either.
                const otherShapes = (currentFp.closedShapes ?? []).filter(s => s.id !== shape.id)
                const sharedNodeIds = new Set(shape.nodeIds.filter(nid => otherShapes.some(o => o.nodeIds.includes(nid))))

                let workingFp = currentFp
                let workingNodeIds = shape.nodeIds

                if (sharedNodeIds.size > 0) {
                    const idRemap = new Map<string, string>()
                    const clonedNodes: LineNode[] = []
                    for (const nid of sharedNodeIds) {
                        const original = workingFp.lineNodes.find(n => n.id === nid)
                        if (!original) continue
                        const clone: LineNode = { id: uid(), x: original.x, z: original.z }
                        idRemap.set(nid, clone.id)
                        clonedNodes.push(clone)
                    }
                    workingNodeIds = shape.nodeIds.map(nid => idRemap.get(nid) ?? nid)
                    const updatedSegments = workingFp.lineSegments.map(seg => {
                        const touchesThisShape = seg.nodeIds.every(nid => shape.nodeIds.includes(nid))
                        if (!touchesThisShape) return seg
                        return { ...seg, nodeIds: seg.nodeIds.map(nid => idRemap.get(nid) ?? nid) }
                    })
                    const updatedShapes = (workingFp.closedShapes ?? []).map(s => s.id === shape.id ? { ...s, nodeIds: workingNodeIds } : s)
                    workingFp = { ...workingFp, lineNodes: [...workingFp.lineNodes, ...clonedNodes], lineSegments: updatedSegments, closedShapes: updatedShapes }
                }

                const nodes = workingNodeIds.map(nid => workingFp.lineNodes.find(n => n.id === nid)).filter(Boolean) as LineNode[]
                if (nodes.length === 0) return
                const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
                const cz = nodes.reduce((s, n) => s + n.z, 0) / nodes.length
                const ddx = snapM(wx) - cx, ddz = snapM(wz) - cz
                const nodeIdSet = new Set(workingNodeIds)

                pushHistory()
                setFp(prev => {
                    const base = sharedNodeIds.size > 0 ? { ...prev, ...workingFp } : prev
                    return {
                        ...base,
                        lineNodes: base.lineNodes.map(n => nodeIdSet.has(n.id) ? { ...n, x: n.x + ddx, z: n.z + ddz } : n),
                    }
                })
                return
            }
            case 'light': {
                const light = (currentFp.lights ?? []).find(l => l.id === id)
                if (!light) return
                if (light.x !== undefined && light.z !== undefined) {
                    // free-placed — simple snap move
                    pushHistory()
                    setFp(prev => ({ ...prev, lights: (prev.lights ?? []).map(l => l.id === id ? { ...l, x: snapM(wx), z: snapM(wz) } : l) }))
                    return
                }
                const cand = findNearestWallPoint(wx, wz, currentFp)
                if (!cand) return // nowhere valid to drop — Move stays armed, nothing happens
                const validity = checkPlacementValidity(cand, currentFp, currentFp.roomHeight)
                if (!validity.valid) return
                pushHistory()
                setFp(prev => ({
                    ...prev,
                    lights: (prev.lights ?? []).map(l => l.id !== id ? l : {
                        ...l,
                        segmentNodeIds: cand.segmentNodeIds,
                        segmentT: cand.segmentT,
                        roomId: cand.roomId,
                        wall: cand.wall,
                        position: cand.position,
                        heightOffset: validity.onDoorHeader ? (validity.heightOffset ?? l.heightOffset) : l.heightOffset,
                    }),
                }))
                return
            }
            default:
                return // node / wall / wallDecor / opening / light — no Move button, nothing to commit
        }
    }, [pushHistory])

    const clearAllDragArm = useCallback(() => {
        shapeResizeRef.current = null
        resizeHandleRef.current = null
        wallDragRef.current = null
        outdoorDragRef.current = null
        furnitureDragRef.current = null
        wallDecorDragRef.current = null
        dragRoomRef.current = null
        segDragRef.current = null
        shapeDragRef.current = null
        openingDragRef.current = null
        spacePanRef.current = null
        panToolRef.current = null
        if (lightDragRef) (lightDragRef as any).current = null
        setMoveArmedForId(null)
    }, [])

    function edgeKey(a: string, b: string) {
        return a < b ? `${a}|${b}` : `${b}|${a}`
    }

    function deleteAreaCascade(prev: FloorPlanState, targetNodeIds: string[]): FloorPlanState {
        const allPolys = deriveClosedPolygons(prev.lineNodes, prev.lineSegments)
        const targetKey = [...targetNodeIds].sort().join(',')

        // Edges belonging to every polygon EXCEPT the one being deleted —
        // these must survive untouched.
        const sharedEdges = new Set<string>()
        for (const poly of allPolys) {
            if ([...poly].sort().join(',') === targetKey) continue
            for (let i = 0; i < poly.length; i++) {
                const a = poly[i]!, b = poly[(i + 1) % poly.length]!
                sharedEdges.add(edgeKey(a, b))
            }
        }

        // Edges of the deleted polygon that are NOT shared — safe to remove.
        const exclusiveEdges = new Set<string>()
        for (let i = 0; i < targetNodeIds.length; i++) {
            const a = targetNodeIds[i]!, b = targetNodeIds[(i + 1) % targetNodeIds.length]!
            const k = edgeKey(a, b)
            if (!sharedEdges.has(k)) exclusiveEdges.add(k)
        }

        // Split each LineSegment's polyline into runs, dropping any
        // consecutive pair that's an exclusive edge. Shared edges (and
        // any segment piece not touching the deleted area at all) survive
        // as-is, in full.
        const removedSegmentIds = new Set<string>()
        const nextSegments: typeof prev.lineSegments = []
        for (const seg of prev.lineSegments) {
            let changed = false
            let run: string[] = [seg.nodeIds[0]!]
            const runs: string[][] = []
            for (let i = 0; i < seg.nodeIds.length - 1; i++) {
                const a = seg.nodeIds[i]!, b = seg.nodeIds[i + 1]!
                if (exclusiveEdges.has(edgeKey(a, b))) {
                    changed = true
                    if (run.length > 1) runs.push(run)
                    run = [b]
                } else {
                    run.push(b)
                }
            }
            if (run.length > 1) runs.push(run)

            if (!changed) {
                nextSegments.push(seg)
            } else {
                removedSegmentIds.add(seg.id)
                runs.forEach((nodeIds, i) => {
                    if (nodeIds.length >= 2) {
                        nextSegments.push({ ...seg, id: i === 0 ? seg.id : `${seg.id}_split${i}`, nodeIds })
                    }
                })
            }
        }

        // Drop nodes no longer referenced by any surviving segment.
        const liveNodeIds = new Set<string>()
        for (const seg of nextSegments) for (const id of seg.nodeIds) liveNodeIds.add(id)
        const nextNodes = prev.lineNodes.filter(n => liveNodeIds.has(n.id))

        // Cascade: drop anything anchored to nodes/segments that no longer exist.
        const nextOpenings = prev.openings.filter(o =>
            !o.segmentNodeIds || (liveNodeIds.has(o.segmentNodeIds[0]) && liveNodeIds.has(o.segmentNodeIds[1]))
        )
        const nextWallDecor = (prev.wallDecor ?? []).filter(d =>
            !d.segmentNodeIds || (liveNodeIds.has(d.segmentNodeIds[0]) && liveNodeIds.has(d.segmentNodeIds[1]))
        )
        const nextLights = (prev.lights ?? []).filter(l =>
            !l.segmentNodeIds || (liveNodeIds.has(l.segmentNodeIds[0]) && liveNodeIds.has(l.segmentNodeIds[1]))
        )

        // Finally, drop the (possibly already-missing) closedShapes metadata entry.
        const nextShapes = (prev.closedShapes ?? []).filter(sh => [...sh.nodeIds].sort().join(',') !== targetKey)

        return {
            ...prev,
            lineNodes: nextNodes,
            lineSegments: nextSegments,
            openings: nextOpenings,
            wallDecor: nextWallDecor,
            lights: nextLights,
            closedShapes: nextShapes,
        }
    }
    const [cutoutArmed, setCutoutArmed] = useState(false)
    const handleArmCutoutDraw = () => {
        setCutoutArmed(true)
        setTool('line')
        setSelectedId(null)
    }

    const prevShapeCountRef = useRef(fp.closedShapes?.length ?? 0)

    useEffect(() => {
        const count = fp.closedShapes?.length ?? 0
        if (cutoutArmed && count > prevShapeCountRef.current) {
            const newShape = fp.closedShapes![fp.closedShapes!.length - 1]
            if (!newShape.cutout?.enabled) {
                setFp(prev => ({
                    ...prev,
                    closedShapes: prev.closedShapes!.map(s =>
                        s.id === newShape.id ? { ...s, cutout: { enabled: true, openingOffset: 0.15 } } : s
                    ),
                }))
            }
            setCutoutArmed(false)
            setTool('select')
            setSelectedId(newShape.id)
        }
        prevShapeCountRef.current = count
    }, [fp.closedShapes, cutoutArmed])

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        isMouseDownRef.current = true
        const { wx, wz, cx, cy } = evWorld(e)

        if (spaceHeldRef.current) {
            spacePanRef.current = { sx: cx, sy: cy, px: panRef.current.x, py: panRef.current.y }
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
            return
        }
        if (e.button === 1) {
            setMidPan({ sx: cx, sy: cy, px: panRef.current.x, py: panRef.current.y })
            return
        }

        if (tool === 'template-place' && pendingTemplateRef.current) {
            const template = pendingTemplateRef.current
            const offsetX = snapM(wx)
            const offsetZ = snapM(wz)

            const roomKeyMap = new Map<string, string>()
            const newRooms: EditorRoom[] = template.rooms.map(r => {
                const newId = uid()
                roomKeyMap.set(r.key, newId)
                return {
                    id: newId,
                    x: r.x + offsetX,
                    z: r.z + offsetZ,
                    width: r.width,
                    depth: r.depth,
                    label: r.label,
                }
            })

            const newOpenings: EditorOpening[] = (template.openings ?? []).map(o => ({
                id: uid(),
                roomId: roomKeyMap.get(o.roomKey)!,
                wall: o.wall,
                type: o.type,
                variant: o.variant as any,
                position: o.position,
                width: o.width,
                height: o.height,
                sillHeight: o.sillHeight,
                swingDirection: 'inward',
            }))

            const newFurniture: PlacedFurniture[] = (template.furniture ?? []).map(f => ({
                id: uid(),
                type: f.type,
                x: f.x + offsetX,
                z: f.z + offsetZ,
                rotation: f.rotation,
                scale: f.scale ?? 1,
            }))

            pushHistory()
            setFp(prev => ({
                ...prev,
                rooms: [...prev.rooms, ...newRooms],
                openings: [...prev.openings, ...newOpenings],
                furniture: [...(prev.furniture ?? []), ...newFurniture],
            }))

            // Select the first placed room so it's immediately editable/draggable
            // via the existing select-tool room-drag path, same UX as duplicate.
            setSelectedId(newRooms[0]?.id ?? null)

            pendingTemplateRef.current = null
            setArmedTemplateId(null)
            setTool('select')
            return
        }

        if (tool === 'pan') {
            panToolRef.current = { sx: cx, sy: cy, px: panRef.current.x, py: panRef.current.y }
            return
        }
        // ── Resize handle check (rooms + closed shapes) ──────────────────────
        if (tool === 'select' && selectedId) {
            const selRoom = fpRef.current.rooms.find(r => r.id === selectedId)
            if (selRoom) {
                const scale = PX_PER_M * zoomRef.current
                const handles = [
                    { id: 'se', x: selRoom.x + selRoom.width, z: selRoom.z + selRoom.depth },
                    { id: 'ne', x: selRoom.x + selRoom.width, z: selRoom.z },
                    { id: 'sw', x: selRoom.x, z: selRoom.z + selRoom.depth },
                    { id: 'nw', x: selRoom.x, z: selRoom.z },
                    { id: 'n', x: selRoom.x + selRoom.width / 2, z: selRoom.z },
                    { id: 's', x: selRoom.x + selRoom.width / 2, z: selRoom.z + selRoom.depth },
                    { id: 'e', x: selRoom.x + selRoom.width, z: selRoom.z + selRoom.depth / 2 },
                    { id: 'w', x: selRoom.x, z: selRoom.z + selRoom.depth / 2 },
                ]
                for (const h of handles) {
                    const hcx = h.x * scale + panRef.current.x
                    const hcy = h.z * scale + panRef.current.y
                    const rect = canvasRef.current!.getBoundingClientRect()
                    if (Math.hypot(e.clientX - rect.left - hcx, e.clientY - rect.top - hcy) < 8) {
                        resizeHandleRef.current = { handle: h.id, room: { ...selRoom }, startWx: wx, startWz: wz }
                        return
                    }
                }
            }

            const selShape = fpRef.current.closedShapes?.find(sh => sh.id === selectedId)
            if (selShape) {
                const nodes = selShape.nodeIds.map(id => fpRef.current.lineNodes.find(n => n.id === id)).filter(Boolean) as LineNode[]
                if (nodes.length >= 3) {
                    const xs = nodes.map(n => n.x), zs = nodes.map(n => n.z)
                    const minX = Math.min(...xs), maxX = Math.max(...xs)
                    const minZ = Math.min(...zs), maxZ = Math.max(...zs)
                    const scale = PX_PER_M * zoomRef.current
                    const handles = [
                        { id: 'se', x: maxX, z: maxZ }, { id: 'ne', x: maxX, z: minZ },
                        { id: 'sw', x: minX, z: maxZ }, { id: 'nw', x: minX, z: minZ },
                    ]
                    for (const h of handles) {
                        const hcx = h.x * scale + panRef.current.x
                        const hcy = h.z * scale + panRef.current.y
                        const rect = canvasRef.current!.getBoundingClientRect()
                        if (Math.hypot(e.clientX - rect.left - hcx, e.clientY - rect.top - hcy) < 8) {
                            // NEW — guard: only treat this as a resize if the click's world
                            // position is actually near/inside the currently-selected shape's
                            // own bounds, not just visually close to where its handle happens
                            // to render (which can coincide with an adjacent shape's corner).
                            const margin = 0.3 // meters of slack around the bbox
                            const withinSelectedBounds =
                                wx >= minX - margin && wx <= maxX + margin &&
                                wz >= minZ - margin && wz <= maxZ + margin
                            if (withinSelectedBounds) {
                                const startNodes = new Map<string, { x: number, z: number }>()
                                for (const n of nodes) startNodes.set(n.id, { x: n.x, z: n.z })
                                shapeResizeRef.current = { shapeId: selShape.id, handle: h.id, startNodes, bbox: { minX, maxX, minZ, maxZ } }
                                return
                            }
                        }
                    }
                }
            }
        }
        // ── Select tool ───────────────────────────────────────────────────────
        if (tool === 'select') {
            // 1. HIGHEST PRIORITY: Check Lights first (stops rooms/walls/decor from intercepting)
            if (typeof hitLight === 'function') {
                const lightHit = hitLight(wx, wz);
                if (lightHit) {
                    if (!tryArmGroupDrag(lightHit.id)) setSelectedId(lightHit.id)

                    if (lightDragRef) {
                        (lightDragRef as any).current = {
                            id: lightHit.id,
                            roomId: lightHit.roomId,
                            wall: lightHit.wall,
                            segmentNodeIds: lightHit.segmentNodeIds,
                            isFree: !lightHit.wall && !lightHit.segmentNodeIds
                        };
                    }
                    isMouseDownRef.current = true;
                    return;
                }
            }
            // ── Marquee trigger — only when select tool, empty canvas, no drag armed ──
            if (tool === 'select' && !resizeHandleRef.current && !shapeResizeRef.current) {
                // Re-run the SAME hit-test priority chain used for single-select.
                // If literally nothing is hit, this is empty canvas.
                const hitNode = hitLineNode(wx, wz)
                const hitDecor = hitWallDecor(wx, wz)
                const hitOp = hitOpening(wx, wz)
                const hitWall = hitRoomWall(wx, wz)
                const hitSeg = hitLineSegment(wx, wz)
                const hitShape = hitClosedShape(wx, wz)
                const hitFurn = (fpRef.current.furniture ?? []).findLast(f => {
                    const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }
                    const dx = wx - f.x, dz = wz - f.z
                    const cosR = Math.cos(-f.rotation), sinR = Math.sin(-f.rotation)
                    const lx = dx * cosR - dz * sinR, lz = dx * sinR + dz * cosR
                    return Math.abs(lx) < (fp2.w * (f.scale ?? 1)) / 2 + 0.05 && Math.abs(lz) < (fp2.d * (f.scale ?? 1)) / 2 + 0.05
                })
                const hitStair = (fpRef.current.stairs ?? []).findLast(st => {
                    const dx2 = wx - (st.x + st.width / 2), dz2 = wz - (st.z + st.depth / 2)
                    const cosR2 = Math.cos(-st.rotation), sinR2 = Math.sin(-st.rotation)
                    const lx2 = dx2 * cosR2 - dz2 * sinR2, lz2 = dx2 * sinR2 + dz2 * cosR2
                    return Math.abs(lx2) < st.width / 2 + 0.05 && Math.abs(lz2) < st.depth / 2 + 0.05
                })
                const hitRm = hitRoom(wx, wz)

                const nothingHit = !hitNode && !hitDecor && !hitOp && !hitWall && !hitSeg
                    && !hitShape && !hitFurn && !hitStair && !hitRm

                if (nothingHit) {
                    marqueeRef.current = { startWx: wx, startWz: wz, curWx: wx, curWz: wz }
                    isMouseDownRef.current = true
                    return
                }
            }
            // 2. Decor & Openings on walls
            const wd = hitWallDecor(wx, wz)
            if (wd) {
                setSelectedId(wd.id)
                if (wallDecorDragRef) {
                    wallDecorDragRef.current = { id: wd.id, roomId: wd.roomId, wall: wd.wall, segmentNodeIds: wd.segmentNodeIds }
                }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }

            const op = hitOpening(wx, wz)
            if (op) {
                const isGroupDrag = tryArmGroupDrag(op.id)
                if (!isGroupDrag) setSelectedId(op.id)
                if (isGroupDrag || moveArmedForId === op.id) {
                    openingDragRef.current = {
                        id: op.id,
                        wall: op.wall,
                        roomId: op.roomId,
                        segmentNodeIds: op.segmentNodeIds
                            ? ([op.segmentNodeIds[0], op.segmentNodeIds[1]] as [string, string])
                            : undefined,
                        width: op.width,
                    }
                }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }

            // 3. Line Nodes
            const node = hitLineNode(wx, wz)
            if (node) {
                setSelectedId(node.id);
                dragRoomRef.current = { id: node.id, ox: wx - node.x, oz: wz - node.z, type: 'node' };
                isMouseDownRef.current = true;
                return
            }

            // 4. Furniture & Stairs
            const hitFurnitureFirst = (fpRef.current.furniture ?? []).findLast(f => {
                const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }
                const dx = wx - f.x, dz = wz - f.z
                const cosR = Math.cos(-f.rotation), sinR = Math.sin(-f.rotation)
                const lx = dx * cosR - dz * sinR
                const lz = dx * sinR + dz * cosR
                return Math.abs(lx) < (fp2.w * (f.scale ?? 1)) / 2 + 0.05 && Math.abs(lz) < (fp2.d * (f.scale ?? 1)) / 2 + 0.05
            })
            if (hitFurnitureFirst) {
                const isGroupDrag = tryArmGroupDrag(hitFurnitureFirst.id)
                if (!isGroupDrag) setSelectedId(hitFurnitureFirst.id)
                if (isGroupDrag || moveArmedForId === hitFurnitureFirst.id) {
                    furnitureDragRef.current = { id: hitFurnitureFirst.id, ox: wx - hitFurnitureFirst.x, oz: wz - hitFurnitureFirst.z }
                }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }
            const hitStairsFirst = (fpRef.current.stairs ?? []).findLast(s => {
                const dx = wx - (s.x + s.width / 2), dz = wz - (s.z + s.depth / 2)
                const cosR = Math.cos(-s.rotation), sinR = Math.sin(-s.rotation)
                const lx = dx * cosR - dz * sinR, lz = dx * sinR + dz * cosR
                return Math.abs(lx) < s.width / 2 + 0.05 && Math.abs(lz) < s.depth / 2 + 0.05
            })
            if (hitStairsFirst) {
                const isGroupDrag = tryArmGroupDrag(hitStairsFirst.id)
                if (!isGroupDrag) setSelectedId(hitStairsFirst.id)
                if (isGroupDrag || moveArmedForId === hitStairsFirst.id) {
                    furnitureDragRef.current = { id: hitStairsFirst.id, ox: wx - hitStairsFirst.x, oz: wz - hitStairsFirst.z }
                }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }
            // 5. Wall segments (Room Walls & Line Segments)
            const wallHit = hitRoomWall(wx, wz)
            if (wallHit) {
                setSelectedId(`${wallHit.room.id}::wall::${wallHit.wall}`)
                wallDragRef.current = { roomId: wallHit.room.id, wall: wallHit.wall, startRoom: { ...wallHit.room } }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }
            console.log('shape nodeIds + coords:',
                fpRef.current.closedShapes.find(s => s.id === 's3n3mrj')?.nodeIds
                    .map(id => fpRef.current.lineNodes.find(n => n.id === id))
            )
            const guardHit = hitCutoutGuardEdge(wx, wz)
            if (guardHit && e.altKey) {   // back to original: Alt+click still available as a direct shortcut, but not required
                setSelectedId(`${guardHit.shapeId}::guard::${guardHit.edgeIndex}`)
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }
            const segHit = hitLineSegment(wx, wz)
            if (segHit) {
                const isGroupDrag = tryArmGroupDrag(segHit.seg.id)
                if (!isGroupDrag) setSelectedId(segHit.seg.id)
                if (isGroupDrag || moveArmedForId === segHit.seg.id) {
                    const allSegs = fpRef.current.lineSegments
                    const adj = new Map<string, string[]>()
                    for (const s of allSegs) {
                        for (let i = 0; i < s.nodeIds.length - 1; i++) {
                            const a = s.nodeIds[i]!, b = s.nodeIds[i + 1]!
                            if (!adj.has(a)) adj.set(a, [])
                            if (!adj.has(b)) adj.set(b, [])
                            adj.get(a)!.push(b)
                            adj.get(b)!.push(a)
                        }
                    }
                    const visited = new Set<string>()
                    const queue = [segHit.seg.nodeIds[0]!]
                    while (queue.length) {
                        const cur = queue.shift()!
                        if (visited.has(cur)) continue
                        visited.add(cur)
                        for (const nb of adj.get(cur) ?? []) if (!visited.has(nb)) queue.push(nb)
                    }
                    const startPositions = new Map<string, { x: number, z: number }>()
                    for (const nid of visited) {
                        const n = fpRef.current.lineNodes.find(nd => nd.id === nid)
                        if (n) startPositions.set(nid, { x: n.x, z: n.z })
                    }
                    segDragRef.current = { segId: segHit.seg.id, ox: wx, oz: wz, nodeIds: [...visited], startPositions }
                }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }
            // 6. Closed Shapes — only reached if the click missed every wall segment
            const shape = hitClosedShape(wx, wz)
            if (shape) {
                const isGroupDrag = tryArmGroupDrag(shape.id)
                if (isGroupDrag) {
                    if (moveArmedForId) setMoveArmedForId(null)
                    // don't collapse selection
                } else {
                    if (moveArmedForId && moveArmedForId !== shape.id) setMoveArmedForId(null)
                    setSelectedId(shape.id)
                }
                if (isGroupDrag || moveArmedForId === shape.id) {
                    const startPositions = new Map<string, { x: number, z: number }>()
                    for (const nid of shape.nodeIds) {
                        const n = fpRef.current.lineNodes.find(nd => nd.id === nid)
                        if (n) startPositions.set(nid, { x: n.x, z: n.z })
                    }
                    shapeDragRef.current = { shapeId: shape.id, ox: wx, oz: wz, startPositions }
                }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }
            // 7. LOWEST PRIORITY: Room areas (clicked on the floor area)
            const room = hitRoom(wx, wz)
            if (room) {
                const isGroupDrag = tryArmGroupDrag(room.id)
                if (!isGroupDrag) setSelectedId(room.id)
                if (isGroupDrag || moveArmedForId === room.id) {
                    dragRoomRef.current = { id: room.id, ox: wx - room.x, oz: wz - room.z, type: 'room' }
                }
                isMouseDownRef.current = true
                return
            }
            const hitOutdoorFirst = hitOutdoorObject(wx, wz)
            if (hitOutdoorFirst) {
                const isGroupDrag = tryArmGroupDrag(hitOutdoorFirst.id)
                if (!isGroupDrag) setSelectedId(hitOutdoorFirst.id)
                if (isGroupDrag || moveArmedForId === hitOutdoorFirst.id) {
                    outdoorDragRef.current = { id: hitOutdoorFirst.id, ox: wx - hitOutdoorFirst.x, oz: wz - hitOutdoorFirst.z }
                }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }
            // 8. FALLBACK (Deselect everything if empty canvas clicked)
            setSelectedId(null);
            clearAllDragArm()
        }
        // ── Room tool ─────────────────────────────────────────────────────────
        if (tool === 'room') {
            const snappedX = snapM(wx), snappedZ = snapM(wz)
            drawStartRef.current = { x: snappedX, z: snappedZ }
            drawRectRef.current = { x: snappedX, z: snappedZ, w: 0, d: 0 }
            isDrawingRef.current = true
            setDrawStart({ x: snappedX, z: snappedZ })
            setDrawRect({ x: snappedX, z: snappedZ, w: 0, d: 0 })
            return
        }
        // ── Pencil tool 
        if (tool === 'pencil') {
            isPencilDrawing.current = true
            setPencilPoints([{ x: snapM(wx), z: snapM(wz) }])
            return
        }
        // ── Line / Bend tool ──────────────────────────────────────────────────
        if (tool === 'line' || tool === 'bend') {
            const snapX = snapM(wx), snapZ = snapM(wz)
            const threshold = 0.5 / zoomRef.current

            const existingNode = fpRef.current.lineNodes.find(n =>
                Math.hypot(snapX - n.x, snapZ - n.z) < threshold
            )
            let targetNodeId: string | null = existingNode?.id ?? null
            let splitUpdate: Partial<FloorPlanState> | null = null

            if (!targetNodeId) {
                const segHit = hitLineSegment(snapX, snapZ)
                if (segHit) {
                    const { seg, fromId, toId } = segHit
                    const a = fpRef.current.lineNodes.find(n => n.id === fromId)!
                    const b = fpRef.current.lineNodes.find(n => n.id === toId)!

                    const segLen = Math.hypot(b.x - a.x, b.z - a.z)
                    if (segLen > 0.1) {
                        const newNode: LineNode = { id: uid(), x: snapX, z: snapZ }
                        const segA: LineSegment = { id: uid(), nodeIds: [fromId, newNode.id], thickness: seg.thickness, closed: false, ...(seg.wallType ? { wallType: seg.wallType } : {}) }
                        const segB: LineSegment = { id: uid(), nodeIds: [newNode.id, toId], thickness: seg.thickness, closed: false, ...(seg.wallType ? { wallType: seg.wallType } : {}) }
                        splitUpdate = {
                            lineNodes: [...fpRef.current.lineNodes, newNode],
                            lineSegments: [
                                ...fpRef.current.lineSegments.filter(s => s.id !== seg.id),
                                segA,
                                segB,
                            ],
                            closedShapes: insertNodeIntoShapesOnSplit(fpRef.current.closedShapes, fromId, toId, newNode.id),
                        }
                        targetNodeId = newNode.id
                    }
                }
            }

            if (lineActiveNodeRef.current) {
                const fromId = lineActiveNodeRef.current

                if (targetNodeId && targetNodeId !== fromId) {
                    const toId = targetNodeId
                    lineActiveNodeRef.current = null
                    const newSeg: LineSegment = {
                        id: uid(),
                        nodeIds: [fromId, toId],
                        thickness: pendingWallPresetRef.current?.thickness ?? 0.15,
                        closed: false,
                        ...(pendingWallPresetRef.current?.wallType ? { wallType: pendingWallPresetRef.current.wallType } : {}),
                    }
                    pushHistory()
                    setFp(prev => {
                        const withSplit = splitUpdate ? { ...prev, ...splitUpdate } : prev
                        const w = { ...withSplit, lineSegments: [...withSplit.lineSegments, newSeg] }
                        const result = tryConvertClosedLineShape(w, newSeg.id)

                        const prevCount = (prev.closedShapes ?? []).length
                        const newCount = (result.closedShapes ?? []).length

                        if (cutoutArmed && newCount === prevCount + 1) {
                            const newShape = result.closedShapes![result.closedShapes!.length - 1]
                            return {
                                ...result,
                                closedShapes: result.closedShapes!.map(s =>
                                    s.id === newShape.id ? { ...s, cutout: { enabled: true, openingOffset: 0.15 } } : s
                                ),
                            }
                        }
                        return result
                    })
                    if (cutoutArmed) {
                        setCutoutArmed(false)
                        setTool('select')
                    }
                } else {
                    // Place new node and continue chain
                    const newNode: LineNode = { id: uid(), x: snapX, z: snapZ }

                    if (tool === 'bend') {
                        const fromNode = fpRef.current.lineNodes.find(n => n.id === fromId)!
                        const midNode: LineNode = { id: uid(), x: (fromNode.x + snapX) / 2, z: (fromNode.z + snapZ) / 2 }
                        const seg: LineSegment = { id: uid(), nodeIds: [fromId, midNode.id, newNode.id], thickness: 0.15, closed: false }
                        lineActiveNodeRef.current = newNode.id
                        setFp(prev => ({ ...prev, lineNodes: [...prev.lineNodes, midNode, newNode], lineSegments: [...prev.lineSegments, seg] }))
                    } else {
                        const seg: LineSegment = { id: uid(), nodeIds: [fromId, newNode.id], thickness: 0.15, closed: false }
                        lineActiveNodeRef.current = newNode.id
                        pushHistory()
                        setFp(prev => ({ ...prev, lineNodes: [...prev.lineNodes, newNode], lineSegments: [...prev.lineSegments, seg] }))
                    }
                }
            } else {
                if (targetNodeId) {
                    lineActiveNodeRef.current = targetNodeId
                    if (splitUpdate) {
                        pushHistory()
                        setFp(prev => ({ ...prev, ...splitUpdate }))
                    }
                } else {
                    const newNode: LineNode = { id: uid(), x: snapX, z: snapZ }
                    lineActiveNodeRef.current = newNode.id
                    setFp(prev => ({ ...prev, lineNodes: [...prev.lineNodes, newNode] }))
                }
            }
            return
        }
        const isDoorTool = tool.startsWith('door-')
        const isWindowTool = tool.startsWith('window-')

        if (isDoorTool || isWindowTool) {
            const room = hitRoom(wx, wz)
            if (room) {
                const wallDir = getWallHit(room, wx, wz, 0.5)
                if (!wallDir) return
                const isH = wallDir === 'north' || wallDir === 'south'
                const wallLen = isH ? room.width : room.depth
                const rawPos = isH ? wx - room.x : wz - room.z
                const opW = isDoorTool ? 0.9 : 1.2
                const clampedPos = Math.max(opW / 2, Math.min(wallLen - opW / 2, rawPos))
                const op: EditorOpening = {
                    id: uid(), roomId: room.id, wall: wallDir,
                    type: isDoorTool ? 'door' : 'window',
                    variant: tool,
                    position: parseFloat(clampedPos.toFixed(2)), width: opW,
                    height: isDoorTool ? 2.1 : 1.2,
                    sillHeight: isWindowTool ? 0.9 : 0,
                    swingDirection: 'inward',
                }
                pushHistory()
                setFp(prev => ({ ...prev, openings: [...prev.openings, op] })); setSelectedId(op.id); return
            }
            const segHit = hitLineSegment(wx, wz)
            if (segHit) {
                const segWallType = segHit.seg.wallType ?? 'solid'
                if (segWallType !== 'solid') {
                    return
                }
                const { seg, t, fromId, toId } = segHit
                const a = fpRef.current.lineNodes.find(n => n.id === fromId)!
                const b = fpRef.current.lineNodes.find(n => n.id === toId)!
                const segLen = Math.hypot(b.x - a.x, b.z - a.z)
                const opW = isDoorTool ? 0.9 : 1.2
                const rawPos = t * segLen
                const clampedPos = Math.max(opW / 2, Math.min(segLen - opW / 2, rawPos))
                const clampedT = clampedPos / segLen

                const op: EditorOpening = {
                    id: uid(),
                    roomId: seg.id,
                    wall: 'north',
                    type: isDoorTool ? 'door' : 'window',
                    variant: tool,
                    position: parseFloat(clampedPos.toFixed(2)),
                    width: opW,
                    height: isDoorTool ? 2.1 : 1.2,
                    sillHeight: isWindowTool ? 0.9 : 0,
                    swingDirection: 'inward',
                    segmentNodeIds: [fromId, toId],
                    segmentT: clampedT,
                }
                setFp(prev => ({ ...prev, openings: [...prev.openings, op] }))
                setSelectedId(op.id)
                return
            }
        }
        if (isWallDecorTool) {
            const decorType: WallDecorType = tool === 'wall-decor-led' ? 'led_strip'
                : tool === 'wall-decor-pvc' ? 'wall_panel_pvc'
                    : tool === 'led_tv' ? 'led_tv'
                        : 'painting'
            const defaults = WALL_DECOR_DEFAULTS[decorType]

            const room = hitRoom(wx, wz)
            if (room) {
                const wallDir = getWallHit(room, wx, wz, 0.5)
                if (!wallDir) return
                const isH = wallDir === 'north' || wallDir === 'south'
                const wallLen = isH ? room.width : room.depth
                const rawPos = isH ? wx - room.x : wz - room.z
                const clampedPos = Math.max(defaults.width / 2, Math.min(wallLen - defaults.width / 2, rawPos))
                const newDecor: PlacedWallDecor = {
                    id: uid(), type: decorType, roomId: room.id, wall: wallDir,
                    position: parseFloat(clampedPos.toFixed(2)), width: defaults.width,
                    heightOffset: defaults.heightOffset, scale: 1,
                    facingInward: true, // NEW — explicit default, flip via PropsPanel after placing
                }
                pushHistory()
                setFp(prev => ({ ...prev, wallDecor: [...(prev.wallDecor ?? []), newDecor] }))
                setSelectedId(newDecor.id)
                return
            }

            const segHit = hitLineSegment(wx, wz)
            if (segHit) {
                const { seg, t, fromId, toId } = segHit
                const a = fpRef.current.lineNodes.find(n => n.id === fromId)!
                const b = fpRef.current.lineNodes.find(n => n.id === toId)!
                const segLen = Math.hypot(b.x - a.x, b.z - a.z)
                const rawPos = t * segLen
                const clampedPos = Math.max(defaults.width / 2, Math.min(segLen - defaults.width / 2, rawPos))
                const clampedT = clampedPos / segLen
                const newDecor: PlacedWallDecor = {
                    id: uid(), type: decorType, roomId: seg.id,
                    position: parseFloat(clampedPos.toFixed(2)), width: defaults.width,
                    heightOffset: defaults.heightOffset, scale: 1,
                    segmentNodeIds: [fromId, toId], segmentT: clampedT,
                }
                pushHistory()
                setFp(prev => ({ ...prev, wallDecor: [...(prev.wallDecor ?? []), newDecor] }))
                setSelectedId(newDecor.id)
                return
            }
        }
        if (tool === 'furniture') {
            const clickedFurniture = (fpRef.current.furniture ?? []).find(f => {
                const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }
                // Rotate the test point into furniture local space
                const dx = wx - f.x, dz = wz - f.z
                const cosR = Math.cos(-f.rotation), sinR = Math.sin(-f.rotation)
                const lx = dx * cosR - dz * sinR
                const lz = dx * sinR + dz * cosR
                return Math.abs(lx) < fp2.w / 2 + 0.1 && Math.abs(lz) < fp2.d / 2 + 0.1
            })
            if (clickedFurniture) {
                furnitureDragRef.current = { id: clickedFurniture.id, ox: wx - clickedFurniture.x, oz: wz - clickedFurniture.z }
                return
            }
            // Place new furniture
            const newF: PlacedFurniture = {
                id: uid(),
                type: selectedFurnitureType,
                x: snapFurniture(wx),
                z: snapFurniture(wz),
                rotation: 0,
                scale: 1,
            }
            pushHistory()
            setFp(prev => ({ ...prev, furniture: [...(prev.furniture ?? []), newF] }))
            return
        }
        if (tool === 'annotate') {
            const rect = canvasRef.current!.getBoundingClientRect()
            // Check if clicking an existing annotation to edit it
            const clickedAnn = (fpRef.current.annotations ?? []).find(ann => {
                const ax = toCanvas(ann.x, panRef.current.x, zoomRef.current) + rect.left
                const az = toCanvas(ann.z, panRef.current.y, zoomRef.current) + rect.top
                return Math.hypot(e.clientX - ax, e.clientY - az) < 40
            })
            if (clickedAnn) {
                setEditingAnnotation({
                    id: clickedAnn.id,
                    text: clickedAnn.text,
                    x: e.clientX,
                    y: e.clientY,
                })
                return
            }
            // Place new annotation with a generated id, open editor immediately
            const newAnn: Annotation = { id: uid(), x: snapM(wx), z: snapM(wz), text: '', fontSize: 13 }
            setFp(prev => ({ ...prev, annotations: [...(prev.annotations ?? []), newAnn] }))
            setEditingAnnotation({ id: newAnn.id, text: '', x: e.clientX, y: e.clientY })
            return
        }
        // ── Delete tool ───────────────────────────────────────────────────────
        if (tool === 'delete') {

            const lightToDelete = hitLight(wx, wz)
            if (lightToDelete) {
                pushHistory()
                setFp(prev => ({ ...prev, lights: (prev.lights ?? []).filter(l => l.id !== lightToDelete.id) }))
                return
            }

            // Delete furniture
            const furIdx = (fpRef.current.furniture ?? []).findIndex(f => {
                const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }
                const dx = wx - f.x, dz = wz - f.z
                const cosR = Math.cos(-f.rotation), sinR = Math.sin(-f.rotation)
                const lx = dx * cosR - dz * sinR, lz = dx * sinR + dz * cosR
                return Math.abs(lx) < fp2.w / 2 + 0.15 && Math.abs(lz) < fp2.d / 2 + 0.15
            })

            const outdoorIdx = (fpRef.current.outdoorObjects ?? []).findIndex(o => {
                const fp2 = OUTDOOR_OBJECT_FOOTPRINTS[o.type] ?? { w: 0.5, d: 0.5 }
                const dx = wx - o.x, dz = wz - o.z
                const cosR = Math.cos(-o.rotation), sinR = Math.sin(-o.rotation)
                const lx = dx * cosR - dz * sinR, lz = dx * sinR + dz * cosR
                return Math.abs(lx) < fp2.w / 2 + 0.15 && Math.abs(lz) < fp2.d / 2 + 0.15
            })
            if (outdoorIdx !== -1) {
                pushHistory()
                setFp(prev => ({ ...prev, outdoorObjects: (prev.outdoorObjects ?? []).filter((_, i) => i !== outdoorIdx) }))
                return
            }

            if (furIdx !== -1) {
                pushHistory()
                setFp(prev => ({ ...prev, furniture: (prev.furniture ?? []).filter((_, i) => i !== furIdx) }))
                return
            }
            const annIdx = (fpRef.current.annotations ?? []).findIndex(ann => {
                const ax = toCanvas(ann.x, panRef.current.x, zoomRef.current)
                const az = toCanvas(ann.z, panRef.current.y, zoomRef.current)
                const rect = canvasRef.current!.getBoundingClientRect()
                return Math.hypot(e.clientX - rect.left - ax, e.clientY - rect.top - az) < 40
            })
            if (annIdx !== -1) {
                setFp(prev => ({ ...prev, annotations: (prev.annotations ?? []).filter((_, i) => i !== annIdx) }))
                return
            }
            const opToDelete = hitOpening(wx, wz)
            if (opToDelete) {
                pushHistory()
                setFp(prev => ({ ...prev, openings: prev.openings.filter(o => o.id !== opToDelete.id) }))
                return
            }
            const node = hitLineNode(wx, wz)
            if (node) {
                const isGroupDrag = tryArmGroupDrag(node.id)
                if (!isGroupDrag) setSelectedId(node.id)
                dragRoomRef.current = { id: node.id, ox: wx - node.x, oz: wz - node.z, type: 'node' }
                isMouseDownRef.current = true
                return
            }

            const segHit = hitLineSegment(wx, wz)
            if (segHit) {
                pushHistory();
                setFp(prev => ({
                    ...prev,
                    lineSegments: prev.lineSegments.filter(s => s.id !== segHit.seg.id),
                    openings: prev.openings.filter(o => o.roomId !== segHit.seg.id),
                }))
                return
            }
            const decorToDelete = hitWallDecor(wx, wz)
            if (decorToDelete) {
                pushHistory()
                setFp(prev => ({ ...prev, wallDecor: (prev.wallDecor ?? []).filter(d => d.id !== decorToDelete.id) }))
                return
            }
            const shapeToDelete = hitClosedShape(wx, wz)
            if (shapeToDelete) {
                deleteClosedShape(shapeToDelete.id)
                return
            }
            const room = hitRoom(wx, wz)
            if (room) {
                pushHistory();
                setFp(prev => ({
                    ...prev,
                    rooms: prev.rooms.filter(r => r.id !== room.id),
                    openings: prev.openings.filter(o => o.roomId !== room.id),
                }))
            }

        }
        if (isStairsTool) {
            const stairsType = tool as StairsType
            const fp2 = STAIRS_FOOTPRINTS[stairsType]
            const newStairs: PlacedStairs = {
                id: uid(),
                type: stairsType,
                x: snapM(wx - fp2.w / 2),
                z: snapM(wz - fp2.d / 2),
                width: fp2.w,
                depth: fp2.d,
                rotation: 0,
            }
            pushHistory()
            setFp(prev => ({ ...prev, stairs: [...(prev.stairs ?? []), newStairs] }))
            setSelectedId(newStairs.id)
            return
        }
        if (isOpeningTool || tool === 'railing-partial') {
            const isRailing = tool === 'railing-partial'
            const room = hitRoom(wx, wz)
            if (room) {
                const wallDir = getWallHit(room, wx, wz, 0.5)
                if (!wallDir) return
                const isH = wallDir === 'north' || wallDir === 'south'
                const wallLen = isH ? room.width : room.depth
                const rawPos = isH ? wx - room.x : wz - room.z
                const opW = isRailing ? 1.5 : (tool === 'opening-archway' ? 1.1 : 1.5)
                const clampedPos = Math.max(opW / 2, Math.min(wallLen - opW / 2, rawPos))
                const op: EditorOpening = {
                    id: uid(),
                    roomId: room.id,
                    wall: wallDir,
                    type: isRailing ? 'railing' : 'opening',
                    variant: isRailing ? 'railing-partial' : tool,
                    position: parseFloat(clampedPos.toFixed(2)),
                    width: opW,
                    height:
                        isRailing
                            ? fp.roomHeight
                            : tool === 'opening-archway'
                                ? Math.max(2.1, fp.roomHeight - 0.45)
                                : fp.roomHeight,
                    sillHeight: 0,
                    swingDirection: 'inward',
                    ...(isRailing ? {
                        railingStyle: 'baluster' as const,
                        railingHeight: 0.9,
                        railingSolidAbove: true,
                        railingWallStart: 1.9,
                    } : {}),
                }
                pushHistory()
                setFp(prev => ({ ...prev, openings: [...prev.openings, op] })); setSelectedId(op.id); return
            }
            const segHit = hitLineSegment(wx, wz)
            if (segHit) {
                const { seg, t, fromId, toId } = segHit
                const a = fpRef.current.lineNodes.find(n => n.id === fromId)!
                const b = fpRef.current.lineNodes.find(n => n.id === toId)!
                const segLen = Math.hypot(b.x - a.x, b.z - a.z)
                const opW = isRailing ? 1.5 : (tool === 'opening-archway' ? 1.1 : 1.5)
                const rawPos = t * segLen
                const clampedPos = Math.max(opW / 2, Math.min(segLen - opW / 2, rawPos))
                const clampedT = clampedPos / segLen
                const op: EditorOpening = {
                    id: uid(),
                    roomId: seg.id,
                    wall: 'north',
                    type: isRailing ? 'railing' : 'opening',
                    variant: isRailing ? 'railing-partial' : tool,
                    position: parseFloat(clampedPos.toFixed(2)),
                    width: opW,
                    height:
                        isRailing
                            ? fp.roomHeight
                            : tool === 'opening-archway'
                                ? Math.max(2.1, fp.roomHeight - 0.45)
                                : fp.roomHeight,
                    sillHeight: 0,
                    swingDirection: 'inward',
                    segmentNodeIds: [fromId, toId],
                    segmentT: clampedT,
                    ...(isRailing ? {
                        railingStyle: 'baluster' as const,
                        railingHeight: 0.9,
                        railingSolidAbove: true,
                        railingWallStart: 1.9,
                    } : {}),
                }
                pushHistory()
                setFp(prev => ({ ...prev, openings: [...prev.openings, op] }))
                setSelectedId(op.id)
                return
            }
        }
        const isLightTool = tool.startsWith('light-')
        if (isLightTool) {
            const lightType: LightFixtureType =
                tool === 'light-wall-sconce' ? 'wall_sconce'
                    : tool === 'light-ceiling-pendant' ? 'ceiling_pendant'
                        : tool === 'light-ceiling-recessed' ? 'ceiling_recessed'
                            : tool === 'light-track' ? 'track_lighting'
                                : tool === 'light-chandelier' ? 'chandelier'
                                    : tool === 'light-shelf-strip' ? 'shelf_strip'
                                        : tool === 'light-spotlight' ? 'spotlight'
                                            : tool === 'light-string' ? 'string_lights'
                                                : tool === 'light-outdoor-bollard' ? 'outdoor_bollard'
                                                    : 'floor_lamp'
            const defaults = LIGHT_FIXTURE_DEFAULTS[lightType]
            const kind = LIGHT_PLACEMENT_KIND[lightType]

            if (kind === 'wall-point') {
                const room = hitRoom(wx, wz)
                if (room) {
                    const wallDir = getWallHit(room, wx, wz, 0.5)
                    if (!wallDir) return
                    const isH = wallDir === 'north' || wallDir === 'south'
                    const wallLen = isH ? room.width : room.depth
                    const rawPos = isH ? wx - room.x : wz - room.z
                    const clampedPos = Math.max(0.2, Math.min(wallLen - 0.2, rawPos))
                    // Default aim: face into the room, i.e. opposite the wall's outward normal
                    const defaultAim = wallDir === 'north' ? 0 : wallDir === 'south' ? Math.PI
                        : wallDir === 'west' ? Math.PI / 2 : -Math.PI / 2
                    const newLight: PlacedLight = {
                        id: uid(), type: lightType, roomId: room.id, wall: wallDir,
                        position: parseFloat(clampedPos.toFixed(2)),
                        heightOffset: defaults.heightOffset,
                        color: defaults.color, intensity: defaults.intensity,
                        castShadow: true, scale: 1,
                        facingInward: true,
                        ...(lightType === 'spotlight' ? { aimRotation: defaultAim, aimTilt: -0.3 } : {}),
                    }
                    pushHistory()
                    setFp(prev => ({ ...prev, lights: [...(prev.lights ?? []), newLight] }))
                    setSelectedId(newLight.id)
                    return
                }
                const segHit = hitLineSegment(wx, wz)
                if (segHit) {
                    const { seg, t, fromId, toId } = segHit
                    const a = fpRef.current.lineNodes.find(n => n.id === fromId)!
                    const b = fpRef.current.lineNodes.find(n => n.id === toId)!
                    const segLen = Math.hypot(b.x - a.x, b.z - a.z)
                    const rawPos = t * segLen
                    const clampedPos = Math.max(0.2, Math.min(segLen - 0.2, rawPos))
                    const clampedT = clampedPos / segLen
                    const angle = Math.atan2(b.z - a.z, b.x - a.x)
                    const newLight: PlacedLight = {
                        id: uid(), type: lightType, roomId: seg.id,
                        position: parseFloat(clampedPos.toFixed(2)),
                        heightOffset: defaults.heightOffset,
                        color: defaults.color, intensity: defaults.intensity,
                        castShadow: true, scale: 1,
                        segmentNodeIds: [fromId, toId], segmentT: clampedT,
                        facingInward: true,
                        ...(lightType === 'spotlight' ? { aimRotation: -angle + Math.PI / 2, aimTilt: -0.3 } : {}),
                    }
                    pushHistory()
                    setFp(prev => ({ ...prev, lights: [...(prev.lights ?? []), newLight] }))
                    setSelectedId(newLight.id)
                    return
                }
                return
            }
            if (kind === 'wall-strip') {
                const defaults2 = { width: 1.0, heightOffset: defaults.heightOffset }
                const room = hitRoom(wx, wz)
                if (room) {
                    const wallDir = getWallHit(room, wx, wz, 0.5)
                    if (!wallDir) return
                    const isH = wallDir === 'north' || wallDir === 'south'
                    const wallLen = isH ? room.width : room.depth
                    const rawPos = isH ? wx - room.x : wz - room.z
                    const clampedPos = Math.max(defaults2.width / 2, Math.min(wallLen - defaults2.width / 2, rawPos))
                    const newLight: PlacedLight = {
                        id: uid(), type: lightType, roomId: room.id, wall: wallDir,
                        position: parseFloat(clampedPos.toFixed(2)), width: defaults2.width,
                        heightOffset: defaults.heightOffset,
                        color: defaults.color, intensity: defaults.intensity,
                        castShadow: false, scale: 1, facingInward: true,
                    }
                    pushHistory()
                    setFp(prev => ({ ...prev, lights: [...(prev.lights ?? []), newLight] }))
                    setSelectedId(newLight.id)
                    return
                }
                const segHit = hitLineSegment(wx, wz)
                if (segHit) {
                    const { seg, t, fromId, toId } = segHit
                    const a = fpRef.current.lineNodes.find(n => n.id === fromId)!
                    const b = fpRef.current.lineNodes.find(n => n.id === toId)!
                    const segLen = Math.hypot(b.x - a.x, b.z - a.z)
                    const rawPos = t * segLen
                    const clampedPos = Math.max(defaults2.width / 2, Math.min(segLen - defaults2.width / 2, rawPos))
                    const clampedT = clampedPos / segLen
                    const newLight: PlacedLight = {
                        id: uid(), type: lightType, roomId: seg.id,
                        position: parseFloat(clampedPos.toFixed(2)), width: defaults2.width,
                        heightOffset: defaults.heightOffset,
                        color: defaults.color, intensity: defaults.intensity,
                        castShadow: false, scale: 1,
                        segmentNodeIds: [fromId, toId], segmentT: clampedT,
                    }
                    pushHistory()
                    setFp(prev => ({ ...prev, lights: [...(prev.lights ?? []), newLight] }))
                    setSelectedId(newLight.id)
                    return
                }
                return
            }
            if (kind === 'path') {
                const snapX = snapM(wx), snapZ = snapM(wz)
                const existingNode = fpRef.current.lineNodes.find(n => Math.hypot(snapX - n.x, snapZ - n.z) < 0.5 / zoomRef.current)
                const nodeId = existingNode?.id ?? (() => {
                    const n: LineNode = { id: uid(), x: snapX, z: snapZ }
                    setFp(prev => ({ ...prev, lineNodes: [...prev.lineNodes, n] }))
                    return n.id
                })()

                if (!pathDraftRef.current) {
                    pathDraftRef.current = [nodeId]
                } else {
                    pathDraftRef.current.push(nodeId)
                    // Double-click / clicking the same node again ends the path
                    if (pathDraftRef.current.length > 1 && nodeId === pathDraftRef.current[pathDraftRef.current.length - 2]) {
                        pathDraftRef.current.pop()
                    }
                }
                return
            }

            // ── free-point (pendant, recessed, floor lamp, track, chandelier, bollard) ──
            const room = hitRoom(wx, wz)
            const shape = !room && typeof hitClosedShape === 'function' ? hitClosedShape(wx, wz) : null
            const isOutdoorType = lightType === 'outdoor_bollard'
            if (room || shape || isOutdoorType) {
                const heightOffset = defaults.heightOffset
                const newLight: PlacedLight = {
                    id: uid(), type: lightType,
                    x: snapM(wx), z: snapM(wz),
                    heightOffset,
                    color: defaults.color, intensity: defaults.intensity,
                    castShadow: lightType !== 'string_lights',
                    scale: 1,
                }
                pushHistory()
                setFp(prev => ({ ...prev, lights: [...(prev.lights ?? []), newLight] }))
                setSelectedId(newLight.id)
                return
            }
            return
        }
        const isOutdoorTool = tool.startsWith('outdoor-')
        if (isOutdoorTool) {
            const objType: OutdoorObjectType =
                tool === 'outdoor-crosswalk' ? 'crosswalk'
                    : tool === 'outdoor-dustbin' ? 'dustbin'
                        : tool === 'outdoor-bench' ? 'bench'
                            : 'mailbox'
            const newObj: PlacedOutdoorObject = {
                id: uid(), type: objType,
                x: snapM(wx), z: snapM(wz),
                rotation: 0, scale: 1,
                materialId: objType === 'crosswalk' ? 'paving-stone-149' : undefined,
            }
            pushHistory()
            setFp(prev => ({ ...prev, outdoorObjects: [...(prev.outdoorObjects ?? []), newObj] }))
            setSelectedId(newObj.id)
            outdoorDragRef.current = null   // NEW — make sure no stale drag state carries over
            setTool('select')               // NEW — switch back to select so cursor/tool isn't stuck
            return
        }


    }, [evWorld, tool, hitRoom, hitLineNode, hitLineSegment, hitClosedShape, hitOpening, hitRoomWall, selectedId, pushHistory, selectedFurnitureType, moveArmedForId, commitMove])

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const { wx, wz, cx, cy } = evWorld(e)

        if (marqueeRef.current) {
            const m = marqueeRef.current
            m.curWx = wx
            m.curWz = wz
            marqueeRectRef.current = { x: m.startWx, z: m.startWz, w: wx - m.startWx, d: wz - m.startWz }
            scheduleRedraw()
            return
        }

        // ── Cursor — unchanged from your version ────────────────────────────
        let newCursor: string
        if (spaceHeldRef.current || tool === 'pan') {
            newCursor = spacePanRef.current || panToolRef.current ? 'grabbing' : 'grab'
        } else if (shapeResizeRef.current) {
            newCursor = 'nwse-resize'
        } else if (resizeHandleRef.current) {
            const map: Record<string, string> = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize', n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize' }
            newCursor = map[resizeHandleRef.current.handle] ?? 'move'
        } else if (wallDragRef.current) {
            const map: Record<string, string> = { north: 'n-resize', south: 's-resize', east: 'e-resize', west: 'w-resize' }
            newCursor = map[wallDragRef.current.wall] ?? 'move'
        } else if (shapeDragRef.current) {
            newCursor = 'grabbing'
        } else if (dragRoomRef.current) {
            newCursor = 'grabbing'
        } else {
            newCursor = TOOL_CURSORS[tool] ?? 'default'
        }
        if (canvasDivRef.current && canvasDivRef.current.style.cursor !== newCursor) {
            canvasDivRef.current.style.cursor = newCursor
        }

        // ── Camera panning — NOT threshold-gated, unchanged from your version ──
        if (spacePanRef.current) {
            const sp = spacePanRef.current
            const nx = sp.px + cx - sp.sx, ny = sp.py + cy - sp.sy
            panRef.current = { x: nx, y: ny }
            setPan({ x: nx, y: ny })
            return
        }
        if (panToolRef.current) {
            const pt = panToolRef.current
            const nx = pt.px + cx - pt.sx, ny = pt.py + cy - pt.sy
            panRef.current = { x: nx, y: ny }
            setPan({ x: nx, y: ny })
            return
        }
        if (midPan) {
            setPan({ x: midPan.px + cx - midPan.sx, y: midPan.py + cy - midPan.sy })
            return
        }

        // ── Non-drag tools — unchanged ───────────────────────────────────────
        if (tool === 'pencil' && isPencilDrawing.current) {
            setPencilPoints(prev => {
                const last = prev[prev.length - 1]
                const sx = snapM(wx), sz = snapM(wz)
                if (last && (Math.abs(sx - last.x) > 0.01 || Math.abs(sz - last.z) > 0.01)) return [...prev, { x: sx, z: sz }]
                return prev
            })
            return
        }
        if (tool === 'line' || tool === 'bend') {
            const p = { x: snapM(wx), z: snapM(wz) }
            previewRef.current = p
            setPreview(p)
            scheduleRedraw()
        }
        if (isDrawingRef.current && drawStartRef.current) {
            const ds = drawStartRef.current
            const newRect = { x: ds.x, z: ds.z, w: snapM(wx) - ds.x, d: snapM(wz) - ds.z }
            drawRectRef.current = newRect
            setDrawRect(newRect)
            scheduleRedraw()
            return
        }

        // ── Entity-movement drag kinds — threshold-gated dispatch table ────────
        // Order matches your original if-chain's priority (first match wins).
        const dragEntries: DragKindEntry[] = [
            {
                name: 'shapeResize',
                isActive: () => !!shapeResizeRef.current,
                apply: (wx, wz) => {
                    const { handle, startNodes, bbox } = shapeResizeRef.current!
                    const { minX, maxX, minZ, maxZ } = bbox
                    const w0 = maxX - minX, d0 = maxZ - minZ
                    if (w0 < 0.01 || d0 < 0.01) return
                    let anchorX = minX, anchorZ = minZ
                    if (handle === 'se') { anchorX = minX; anchorZ = minZ }
                    if (handle === 'ne') { anchorX = minX; anchorZ = maxZ }
                    if (handle === 'sw') { anchorX = maxX; anchorZ = minZ }
                    if (handle === 'nw') { anchorX = maxX; anchorZ = maxZ }
                    const rawSx = (wx - anchorX) / (handle.includes('e') ? w0 : -w0)
                    const rawSz = (wz - anchorZ) / (handle.includes('s') ? d0 : -d0)
                    const sx = Math.max(0.2, rawSx)
                    const sz = Math.max(0.2, rawSz)
                    setFp(prev => ({
                        ...prev,
                        lineNodes: prev.lineNodes.map(n => {
                            const start = startNodes.get(n.id)
                            if (!start) return n
                            const nx = anchorX + (start.x - anchorX) * sx
                            const nz = anchorZ + (start.z - anchorZ) * sz
                            return { ...n, x: snapM(nx), z: snapM(nz) }
                        })
                    }))
                },
            },
            {
                name: 'wallDrag',
                isActive: () => !!wallDragRef.current,
                apply: (wx, wz) => {
                    const { roomId, wall, startRoom } = wallDragRef.current!
                    let newX = startRoom.x, newZ = startRoom.z, newW = startRoom.width, newD = startRoom.depth
                    if (wall === 'east') newW = Math.max(MIN_ROOM, snapM(wx) - startRoom.x)
                    if (wall === 'west') { newX = Math.min(snapM(wx), startRoom.x + startRoom.width - MIN_ROOM); newW = startRoom.x + startRoom.width - newX }
                    if (wall === 'south') newD = Math.max(MIN_ROOM, snapM(wz) - startRoom.z)
                    if (wall === 'north') { newZ = Math.min(snapM(wz), startRoom.z + startRoom.depth - MIN_ROOM); newD = startRoom.z + startRoom.depth - newZ }
                    setFp(prev => ({ ...prev, rooms: prev.rooms.map(r => r.id === roomId ? { ...r, x: newX, z: newZ, width: newW, depth: newD } : r) }))
                },
            },
            {
                name: 'resizeHandle',
                isActive: () => !!resizeHandleRef.current,
                apply: (wx, wz) => {
                    const { handle, room } = resizeHandleRef.current!
                    let newX = room.x, newZ = room.z, newW = room.width, newD = room.depth
                    if (handle.includes('e')) newW = Math.max(MIN_ROOM, snapM(wx) - room.x)
                    if (handle.includes('w')) { newX = Math.min(snapM(wx), room.x + room.width - MIN_ROOM); newW = room.x + room.width - newX }
                    if (handle.includes('s')) newD = Math.max(MIN_ROOM, snapM(wz) - room.z)
                    if (handle.includes('n')) { newZ = Math.min(snapM(wz), room.z + room.depth - MIN_ROOM); newD = room.z + room.depth - newZ }
                    setFp(prev => ({ ...prev, rooms: prev.rooms.map(r => r.id === room.id ? { ...r, x: newX, z: newZ, width: newW, depth: newD } : r) }))
                },
            },
            {
                name: 'outdoorDrag',
                isActive: () => !!outdoorDragRef.current,
                apply: (wx, wz) => {
                    const od = outdoorDragRef.current!
                    setFp(prev => ({
                        ...prev,
                        outdoorObjects: (prev.outdoorObjects ?? []).map(o => o.id === od.id ? { ...o, x: snapM(wx - od.ox), z: snapM(wz - od.oz) } : o)
                    }))
                },
            },
            {
                name: 'furnitureDrag',
                isActive: () => !!furnitureDragRef.current,
                apply: (wx, wz) => {
                    const fd = furnitureDragRef.current!
                    const nx = snapFurniture(wx - fd.ox), nz = snapFurniture(wz - fd.oz)
                    setFp(prev => ({
                        ...prev,
                        furniture: (prev.furniture ?? []).map(f => f.id === fd.id ? { ...f, x: nx, z: nz } : f),
                        stairs: (prev.stairs ?? []).map(s => s.id === fd.id ? { ...s, x: nx, z: nz } : s),
                    }))
                    const prevOverlap = overlappingRef.current
                    const newOverlap = checkCollisions(fpRef.current, fd.id, nx, nz)
                    if (hasChanged(newOverlap, prevOverlap)) {
                        setOverlappingIds(newOverlap)
                        scheduleRedraw()
                    }
                },
            },
            {
                name: 'wallDecorDrag',
                isActive: () => !!wallDecorDragRef.current,
                apply: (wx, wz) => {
                    const wd = wallDecorDragRef.current!
                    if (wd.wall) {
                        const room = fpRef.current.rooms.find(r => r.id === wd.roomId)
                        if (room) {
                            const isH = wd.wall === 'north' || wd.wall === 'south'
                            const wallLen = isH ? room.width : room.depth
                            const rawPos = isH ? wx - room.x : wz - room.z
                            setFp(prev => ({
                                ...prev,
                                wallDecor: (prev.wallDecor ?? []).map(d => {
                                    if (d.id !== wd.id) return d
                                    const clamped = Math.max(d.width / 2, Math.min(wallLen - d.width / 2, rawPos))
                                    return { ...d, position: parseFloat(clamped.toFixed(2)) }
                                })
                            }))
                        }
                    } else if (wd.segmentNodeIds) {
                        const a = fpRef.current.lineNodes.find(n => n.id === wd.segmentNodeIds![0])
                        const b = fpRef.current.lineNodes.find(n => n.id === wd.segmentNodeIds![1])
                        if (a && b) {
                            const dx = b.x - a.x, dz = b.z - a.z
                            const segLen = Math.hypot(dx, dz)
                            const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wz - a.z) * dz) / (segLen * segLen)))
                            setFp(prev => ({
                                ...prev,
                                wallDecor: (prev.wallDecor ?? []).map(d => d.id === wd.id ? { ...d, segmentT: t, position: t * segLen } : d)
                            }))
                        }
                    }
                },
            },
            {
                name: 'nodeOrRoomDrag',
                isActive: () => !!dragRoomRef.current,
                apply: (wx, wz) => {
                    const dr = dragRoomRef.current!
                    const nx = snapM(wx - dr.ox)
                    const nz = snapM(wz - dr.oz)
                    if (dr.type === 'node') {
                        setFp(prev => ({ ...prev, lineNodes: prev.lineNodes.map(n => n.id === dr.id ? { ...n, x: nx, z: nz } : n) }))
                    } else {
                        setFp(prev => ({ ...prev, rooms: prev.rooms.map(r => r.id === dr.id ? { ...r, x: nx, z: nz } : r) }))
                    }
                },
            },
            {
                name: 'segDrag',
                isActive: () => !!segDragRef.current,
                apply: (wx, wz) => {
                    const sd = segDragRef.current!
                    const ddx = snapM(wx - sd.ox)
                    const ddz = snapM(wz - sd.oz)
                    if (sd.startPositions && sd.startPositions.size > 0) {
                        setFp(prev => ({
                            ...prev,
                            lineNodes: prev.lineNodes.map(n => {
                                const start = sd.startPositions!.get(n.id)
                                if (!start) return n
                                return { ...n, x: start.x + ddx, z: start.z + ddz }
                            })
                        }))
                    }
                },
            },
            {
                name: 'shapeDrag',
                isActive: () => !!shapeDragRef.current,
                apply: (wx, wz) => {
                    const sd = shapeDragRef.current!
                    const ddx = snapM(wx - sd.ox)
                    const ddz = snapM(wz - sd.oz)
                    setFp(prev => ({
                        ...prev,
                        lineNodes: prev.lineNodes.map(n => {
                            const start = sd.startPositions.get(n.id)
                            if (!start) return n
                            return { ...n, x: start.x + ddx, z: start.z + ddz }
                        })
                    }))
                },
            },
            {
                name: 'lightDrag',
                isActive: () => !!lightDragRef?.current,
                apply: (wx, wz) => {
                    const ld = lightDragRef!.current!

                    // Free-placed lights (ceiling pendant, floor lamp, etc.) aren't
                    // wall-constrained — keep existing behavior untouched.
                    if (ld.isFree) {
                        setFp(prev => ({
                            ...prev,
                            lights: (prev.lights ?? []).map(l => l.id === ld.id ? { ...l, x: snapM(wx), z: snapM(wz) } : l)
                        }))
                        document.body.style.cursor = 'grabbing'
                        return
                    }

                    // Wall-anchored lights now search ALL wall segments/room walls for
                    // the nearest valid point, instead of being locked to the segment
                    // they started on. This is what lets a sconce be dragged from one
                    // wall onto a completely different one.
                    const cand = findNearestWallPoint(wx, wz, fpRef.current)
                    if (!cand) {
                        document.body.style.cursor = 'not-allowed'
                        return // no wall nearby — don't move, effectively holds last valid spot
                    }

                    const validity = checkPlacementValidity(cand, fpRef.current, fpRef.current.roomHeight)
                    if (!validity.valid) {
                        document.body.style.cursor = 'not-allowed'
                        return // over a door body / window — don't move, holds last valid spot
                    }

                    document.body.style.cursor = 'grabbing'
                    setFp(prev => ({
                        ...prev,
                        lights: (prev.lights ?? []).map(l => {
                            if (l.id !== ld.id) return l
                            return {
                                ...l,
                                // Clear whichever anchor style isn't being used this time,
                                // so a light moved from a legacy room wall onto a line
                                // segment (or vice versa) doesn't keep stale fields that
                                // hitLight/rendering would misread.
                                segmentNodeIds: cand.segmentNodeIds,
                                segmentT: cand.segmentT,
                                roomId: cand.roomId,
                                wall: cand.wall,
                                position: cand.position,
                                heightOffset: validity.onDoorHeader ? (validity.heightOffset ?? l.heightOffset) : l.heightOffset,
                            }
                        })
                    }))
                },
            },
            {
                name: 'openingDrag',
                isActive: () => !!openingDragRef.current,
                apply: (wx, wz) => {
                    const od = openingDragRef.current!
                    // FIX: segmentNodeIds must be checked first. od.wall is
                    // non-optional on EditorOpening, so it's always truthy even for
                    // openings placed on a line segment — checking it first meant
                    // segment-placed doors always fell into the room-wall branch,
                    // found no matching room, and silently did nothing.
                    if (od.segmentNodeIds) {
                        const a = fpRef.current.lineNodes.find(n => n.id === od.segmentNodeIds![0])
                        const b = fpRef.current.lineNodes.find(n => n.id === od.segmentNodeIds![1])
                        if (a && b) {
                            const dx = b.x - a.x, dz = b.z - a.z
                            const segLen = Math.hypot(dx, dz)
                            const rawT = segLen > 0
                                ? ((wx - a.x) * dx + (wz - a.z) * dz) / (segLen * segLen)
                                : 0
                            const halfWidthT = segLen > 0 ? (od.width / 2) / segLen : 0
                            const t = Math.max(halfWidthT, Math.min(1 - halfWidthT, rawT))
                            setFp(prev => ({
                                ...prev,
                                openings: prev.openings.map(o => o.id === od.id ? { ...o, segmentT: t, position: t * segLen } : o)
                            }))
                        }
                    } else if (od.wall) {
                        const room = fpRef.current.rooms.find(r => r.id === od.roomId)
                        if (room) {
                            const isH = od.wall === 'north' || od.wall === 'south'
                            const wallLen = isH ? room.width : room.depth
                            const rawPos = isH ? wx - room.x : wz - room.z
                            setFp(prev => ({
                                ...prev,
                                openings: prev.openings.map(o => {
                                    if (o.id !== od.id) return o
                                    const clamped = Math.max(o.width / 2, Math.min(wallLen - o.width / 2, rawPos))
                                    return { ...o, position: parseFloat(clamped.toFixed(2)) }
                                })
                            }))
                        }
                    }
                },
            },
        ]

        const wasActiveDrag = runActiveDrag(dragEntries, dragOriginRef, cx, cy, wx, wz)
        if (wasActiveDrag) {
            if (pastThreshold(dragOriginRef.current, cx, cy)) dragConfirmedRef.current = true

            if (groupDragStartRef.current) {
                const draggedId =
                    dragRoomRef.current?.id ??
                    furnitureDragRef.current?.id ??
                    outdoorDragRef.current?.id ??
                    segDragRef.current?.segId ??
                    shapeDragRef.current?.shapeId ??
                    null

                const { entityStarts, nodeStarts } = groupDragStartRef.current

                if (draggedId && entityStarts.has(draggedId)) {
                    const start = entityStarts.get(draggedId)!
                    const curB = bboxForEntity(fpRef.current, draggedId)

                    if (curB) {
                        const curCx = (curB.minX + curB.maxX) / 2, curCz = (curB.minZ + curB.maxZ) / 2
                        const dx = curCx - start.x, dz = curCz - start.z

                        setFp(prev => {
                            let next = prev
                            for (const [id, s0] of entityStarts) {
                                if (id === draggedId) continue

                                // Closed shape — translate its member lineNodes using
                                // their own recorded starts, not the shape's bbox center.
                                const shape = (prev.closedShapes ?? []).find(sh => sh.id === id)
                                if (shape) {
                                    next = {
                                        ...next,
                                        lineNodes: next.lineNodes.map(n => {
                                            const ns = nodeStarts.get(n.id)
                                            return shape.nodeIds.includes(n.id) && ns
                                                ? { ...n, x: snapM(ns.x + dx), z: snapM(ns.z + dz) }
                                                : n
                                        }),
                                    }
                                    continue
                                }

                                next = {
                                    ...next,
                                    rooms: next.rooms.map(r => r.id === id ? {
                                        ...r,
                                        x: snapM(s0.x + dx - (bboxForEntity(prev, id)!.maxX - bboxForEntity(prev, id)!.minX) / 2),
                                        z: snapM(s0.z + dz - (bboxForEntity(prev, id)!.maxZ - bboxForEntity(prev, id)!.minZ) / 2),
                                    } : r),
                                    furniture: (next.furniture ?? []).map(f => f.id === id ? { ...f, x: snapFurniture(s0.x + dx), z: snapFurniture(s0.z + dz) } : f),
                                    stairs: (next.stairs ?? []).map(s => s.id === id ? { ...s, x: snapM(s0.x + dx - s.width / 2), z: snapM(s0.z + dz - s.depth / 2) } : s),
                                    lineNodes: next.lineNodes.map(n => n.id === id ? { ...n, x: snapM(s0.x + dx), z: snapM(s0.z + dz) } : n),
                                    outdoorObjects: (next.outdoorObjects ?? []).map(o => o.id === id ? { ...o, x: snapM(s0.x + dx), z: snapM(s0.z + dz) } : o),
                                    annotations: (next.annotations ?? []).map(a => a.id === id ? { ...a, x: s0.x + dx, z: s0.z + dz } : a),
                                }
                            }
                            return next
                        })
                    }
                }
            }

            return
        }
        let newHoverId: string | null = null
        const node = hitLineNode(wx, wz)
        if (node) {
            newHoverId = node.id
        } else {
            const hovDecor = hitWallDecor(wx, wz)
            if (hovDecor) {
                newHoverId = hovDecor.id
            } else {
                const hoveredOpening = hitOpening(wx, wz)
                if (hoveredOpening) {
                    newHoverId = hoveredOpening.id
                } else {
                    const wallHit = hitRoomWall(wx, wz)
                    if (wallHit) {
                        newHoverId = `${wallHit.room.id}::wall::${wallHit.wall}`
                    } else {
                        const segHit = hitLineSegment(wx, wz)
                        if (segHit) {
                            newHoverId = segHit.seg.id
                        } else {
                            const hovShape = hitClosedShape(wx, wz)
                            if (hovShape) {
                                newHoverId = hovShape.id
                            } else {
                                const hovFurniture = (fpRef.current.furniture ?? []).findLast(f => {
                                    const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }
                                    const dx = wx - f.x, dz = wz - f.z
                                    const cosR = Math.cos(-f.rotation), sinR = Math.sin(-f.rotation)
                                    const lx = dx * cosR - dz * sinR
                                    const lz = dx * sinR + dz * cosR
                                    return Math.abs(lx) < (fp2.w * (f.scale ?? 1)) / 2 + 0.05 && Math.abs(lz) < (fp2.d * (f.scale ?? 1)) / 2 + 0.05
                                })
                                if (hovFurniture) {
                                    newHoverId = hovFurniture.id
                                } else {
                                    const hovStairs = (fpRef.current.stairs ?? []).findLast(st => {
                                        const dx2 = wx - (st.x + st.width / 2), dz2 = wz - (st.z + st.depth / 2)
                                        const cosR2 = Math.cos(-st.rotation), sinR2 = Math.sin(-st.rotation)
                                        const lx2 = dx2 * cosR2 - dz2 * sinR2, lz2 = dx2 * sinR2 + dz2 * cosR2
                                        return Math.abs(lx2) < st.width / 2 + 0.05 && Math.abs(lz2) < st.depth / 2 + 0.05
                                    })
                                    if (hovStairs) {
                                        newHoverId = hovStairs.id
                                    } else {
                                        const room = hitRoom(wx, wz)
                                        newHoverId = room?.id ?? null
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (hoveredIdRef.current !== newHoverId) {
            hoveredIdRef.current = newHoverId
            setHoveredId(newHoverId)
            scheduleRedraw()
        }
        if (!newHoverId) {
            scheduleTooltipUpdate(null)
        } else {
            scheduleTooltipUpdate({ text: labelForHover(newHoverId, fpRef.current), x: e.clientX, y: e.clientY })
        }
    }, [evWorld, midPan, tool, hitRoom, hitLineNode, hitLineSegment, hitClosedShape, hitOpening, hitRoomWall, hitWallDecor, scheduleRedraw])

    const handleMouseUp = useCallback(() => {
        isMouseDownRef.current = false
        const hadDrag = dragConfirmedRef.current

        setMidPan(null)
        // shapeResizeRef.current = null
        // furnitureDragRef.current = null
        // dragRoomRef.current = null
        // spacePanRef.current = null
        // panToolRef.current = null
        // segDragRef.current = null
        // shapeDragRef.current = null
        // wallDecorDragRef.current = null
        // resizeHandleRef.current = null
        // wallDragRef.current = null
        // outdoorDragRef.current = null
        // furnitureDragRef.current = null
        clearAllDragArm()
        clear()
        setOverlappingIds(new Set())
        if (lightDragRef) (lightDragRef as any).current = null

        dragOriginRef.current = null
        dragConfirmedRef.current = false

        if (hadDrag) pushHistory()

        if (marqueeRef.current) {
            const m = marqueeRef.current
            const minX = Math.min(m.startWx, m.curWx), maxX = Math.max(m.startWx, m.curWx)
            const minZ = Math.min(m.startWz, m.curWz), maxZ = Math.max(m.startWz, m.curWz)

            const draggedFar = Math.hypot(m.curWx - m.startWx, m.curWz - m.startWz) > 0.05 // ~ world-space threshold
            if (draggedFar) {
                const fp = fpRef.current
                const allIds = [
                    ...fp.rooms.map(r => r.id),
                    ...fp.lineNodes.map(n => n.id),
                    ...fp.lineSegments.map(s => s.id),
                    ...(fp.closedShapes ?? []).map(s => s.id),
                    ...(fp.furniture ?? []).map(f => f.id),
                    ...(fp.stairs ?? []).map(s => s.id),
                    ...(fp.lights ?? []).filter(l => l.x !== undefined).map(l => l.id),
                    ...(fp.outdoorObjects ?? []).map(o => o.id),
                    ...(fp.annotations ?? []).map(a => a.id),
                ]
                const matched = allIds.filter(id => {
                    const b = bboxForEntity(fp, id)
                    return b && bboxFullyInside(b, [minX, maxX], [minZ, maxZ])
                })
                selectedIdsRef.current = matched
                setSelectedIds(matched)
            } else {
                // plain click, no real drag → clear selection (Step 8)
                selectedIdsRef.current = []
                setSelectedIds([])
            }
            marqueeRef.current = null
            marqueeRectRef.current = null
            isMouseDownRef.current = false
            return
        }

        if (shapeDragRef.current) {
            shapeDragRef.current = null
            setMoveArmedForId(null)   // one-shot: dragging once consumes the arm
            // ...whatever history-push logic already exists here...
        }
        if (canvasRef.current && spaceHeldRef.current) canvasRef.current.style.cursor = 'grab'
        else if (canvasRef.current) canvasRef.current.style.cursor = ''
        resizeHandleRef.current = null

        if (tool === 'pencil' && isPencilDrawing.current) {
            isPencilDrawing.current = false
            if (pencilPoints.length >= 2) {
                const xs = pencilPoints.map(p => p.x), zs = pencilPoints.map(p => p.z)
                const minX = Math.min(...xs), maxX = Math.max(...xs)
                const minZ = Math.min(...zs), maxZ = Math.max(...zs)
                const w = maxX - minX, d = maxZ - minZ
                if (w >= MIN_ROOM && d >= MIN_ROOM) {
                    const newRoom: EditorRoom = { id: uid(), x: minX, z: minZ, width: w, depth: d, label: `Room ${fpRef.current.rooms.length + 1}` }
                    pushHistory()
                    setFp(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }))
                    setSelectedId(newRoom.id)
                }
            }
            setPencilPoints([])
            return
        }

        if (tool === 'room' && isDrawingRef.current && drawStartRef.current) {
            isDrawingRef.current = false
            const ds = drawStartRef.current
            const currentRect = drawRectRef.current
            drawStartRef.current = null
            drawRectRef.current = null

            setDrawRect(null)
            setDrawStart(null)
            const w = currentRect ? Math.abs(currentRect.w) : 0
            const d = currentRect ? Math.abs(currentRect.d) : 0
            if (w >= MIN_ROOM && d >= MIN_ROOM) {
                const newRoom: EditorRoom = {
                    id: uid(),
                    x: Math.min(ds.x, ds.x + (currentRect?.w ?? 0)),
                    z: Math.min(ds.z, ds.z + (currentRect?.d ?? 0)),
                    width: w,
                    depth: d,
                    label: `Room ${fpRef.current.rooms.length + 1}`,
                }
                setFp(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }))
                setSelectedId(newRoom.id)
            }
        }
    }, [tool, pencilPoints, pushHistory])

    const handleDuplicateSelected = useCallback(() => {
        if (selectedIds.length === 0) return

        let workingFp = fpRef.current
        let workingSceneConfig = sceneConfig
        const newIds: string[] = []

        for (const id of selectedIds) {
            // Room
            const room = workingFp.rooms.find(r => r.id === id)
            if (room) {
                const result = duplicateRoom(workingFp, workingSceneConfig, room.id, room.width + 0.5, 0)
                if (result) {
                    workingFp = result.fp
                    workingSceneConfig = result.sceneConfig
                    newIds.push(result.newRoomId)
                }
                continue
            }
            // Furniture
            const furniture = (workingFp.furniture ?? []).find(f => f.id === id)
            if (furniture) {
                const result = duplicateFurniture(workingFp, furniture.id)
                if (result) { workingFp = result.fp; newIds.push(result.newId) }
                continue
            }
            // Stairs / elevator
            const stairs = (workingFp.stairs ?? []).find(s => s.id === id)
            if (stairs) {
                const result = duplicateStairs(workingFp, stairs.id)
                if (result) { workingFp = result.fp; newIds.push(result.newId) }
                continue
            }
            // Outdoor object
            const outdoorObj = (workingFp.outdoorObjects ?? []).find(o => o.id === id)
            if (outdoorObj) {
                const result = duplicateOutdoorObject(workingFp, outdoorObj.id)
                if (result) { workingFp = result.fp; newIds.push(result.newId) }
                continue
            }
            // Wall decor
            const wallDecor = (workingFp.wallDecor ?? []).find(d => d.id === id)
            if (wallDecor) {
                const result = duplicateWallDecor(workingFp, wallDecor.id)
                if (result) { workingFp = result.fp; newIds.push(result.newId) }
                continue
            }
            // Opening (door / window / archway)
            const opening = workingFp.openings.find(o => o.id === id)
            if (opening) {
                const result = duplicateOpening(workingFp, opening.id)
                if (result) { workingFp = result.fp; newIds.push(result.newId) }
                continue
            }
            // Closed shape (incl. unconfigured derived shapes)
            const targetShape = workingFp.closedShapes?.find(s => s.id === id)
            const shapeNodeIds = targetShape?.nodeIds
                ?? deriveClosedPolygons(workingFp.lineNodes, workingFp.lineSegments).find(
                    ids => [...ids].sort().join(',') === id.replace(/^unconfigured::/, '')
                )
            if (shapeNodeIds) {
                const xs = shapeNodeIds
                    .map(nid => workingFp.lineNodes.find(n => n.id === nid)?.x)
                    .filter((x): x is number => x !== undefined)
                const shapeWidth = xs.length ? Math.max(...xs) - Math.min(...xs) : 3

                const result = duplicateClosedShape(workingFp, workingSceneConfig, id, shapeWidth + 0.5, 0)
                if (result) {
                    workingFp = result.fp
                    workingSceneConfig = result.sceneConfig
                    newIds.push(result.newRoomId)
                }
            }

        }

        if (newIds.length === 0) return
        fpRef.current = workingFp
        sceneConfigRef.current = workingSceneConfig
        setFp(workingFp)
        setSceneConfig(workingSceneConfig)
        selectedIdsRef.current = newIds
        setSelectedIds(newIds)
        pushHistory(workingFp, workingSceneConfig)             // one history entry for the whole batch, same pattern as group-move
    }, [selectedIds, sceneConfig, pushHistory])

    const handleMirrorSelected = useCallback((axis: MirrorAxis) => {
        if (!selectedId) return
        const room = fpRef.current.rooms.find(r => r.id === selectedId)
        if (!room) return // mirror is currently rect-room only — see PropsPanel patch, button only shown for room selection
        setFp(prev => mirrorRoom(prev, room.id, axis))
        pushHistory()
    }, [selectedId, pushHistory])

    const pendingWallPresetRef = useRef<WallPreset | null>(null)
    const [armedWallPresetId, setArmedWallPresetId] = useState<string | null>(null)

    const pendingTemplateRef = useRef<RoomTemplate | null>(null)
    const [armedTemplateId, setArmedTemplateId] = useState<string | null>(null)

    const armWallPreset = (preset: WallPreset) => setArmedWallPresetId(preset.id)

    const armRoomTemplate = useCallback((template: RoomTemplate) => {
        pendingTemplateRef.current = template
        setArmedTemplateId(template.id)
        pendingWallPresetRef.current = null
        setArmedWallPresetId(null)

        setTool('template-place')
    }, [])

    useEffect(() => {
        if (canvasRef.current) centerOnContent(fpRef.current, canvasRef.current)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (tool === 'furniture') {
            const el = groupAnchorsRef.current['furniture']
            setFurnitureAnchorRect(el ? el.getBoundingClientRect() : null)
        } else {
            setFurnitureAnchorRect(null)
        }

        if (tool === 'presets') {
            const el = groupAnchorsRef.current['presets']
            setPresetsAnchorRect(el ? el.getBoundingClientRect() : null)
        } else {
            setPresetsAnchorRect(null)
        }
    }, [tool])
    useEffect(() => {
        if (tool === 'furniture') {
            const el = groupAnchorsRef.current['furniture']
            setFurnitureAnchorRect(el ? el.getBoundingClientRect() : null)
        } else {
            setFurnitureAnchorRect(null)
        }

        if (tool === 'presets') {
            const el = groupAnchorsRef.current['presets']
            setPresetsAnchorRect(el ? el.getBoundingClientRect() : null)
        } else {
            setPresetsAnchorRect(null)
        }
    }, [tool])

    useEffect(() => {
        if (tool !== 'line' && tool !== 'bend') {
            pendingWallPresetRef.current = null
            setArmedWallPresetId(null)
        }
    }, [tool])

    // Native wheel handler
    useEffect(() => {
        const el = canvasDivRef.current
        if (!el) return
        const handler = (e: WheelEvent) => {
            if ((e.target as HTMLElement).closest('[data-panel="right-sidebar"]')) return
            e.preventDefault(); e.stopPropagation()

            const rect = el.getBoundingClientRect()
            const cursorX = e.clientX - rect.left
            const cursorY = e.clientY - rect.top

            const factor = e.deltaY < 0 ? 1.12 : 0.9
            const newZoom = Math.max(0.2, Math.min(5, zoomRef.current * factor))

            // world point currently under the cursor, at the OLD zoom/pan
            const worldX = toWorld(cursorX, panRef.current.x, zoomRef.current)
            const worldY = toWorld(cursorY, panRef.current.y, zoomRef.current)

            // solve pan so that same world point stays under the cursor at the NEW zoom
            const newPan = {
                x: cursorX - worldX * PX_PER_M * newZoom,
                y: cursorY - worldY * PX_PER_M * newZoom,
            }

            panRef.current = newPan
            setPan(newPan)
            zoomRef.current = newZoom
            setZoom(newZoom)
        }
        el.addEventListener('wheel', handler, { passive: false })
        return () => el.removeEventListener('wheel', handler)
    }, [])

    useEffect(() => {
        const el = editorRef.current
        if (!el) return
        const handler = (e: WheelEvent) => {
            if ((e.target as HTMLElement).closest('[data-panel="right-sidebar"]')) return
            e.preventDefault(); e.stopPropagation()
        }
        el.addEventListener('wheel', handler, { passive: false })
        return () => el.removeEventListener('wheel', handler)
    }, [])

    // Space + drag to pan
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !spaceHeldRef.current) {
                if (e.target instanceof HTMLInputElement) return
                e.preventDefault()
                spaceHeldRef.current = true
                if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
            }
        }
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                spaceHeldRef.current = false
                spacePanRef.current = null
                if (canvasRef.current) canvasRef.current.style.cursor = ''
            }
        }
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
    }, [])
    // Open sheet on interactive mode
    useEffect(() => {
        if (interactiveMode && selectedId) {
            setRightTab('properties')
            setSheetOpen(true)
        }
    }, [selectedId, interactiveMode])

    useEffect(() => { sceneConfigRef.current = sceneConfig }, [sceneConfig])


    const [previewOpen, setPreviewOpen] = useState(true)
    const [splitRatio, setSplitRatio] = useState(0.46)
    const splitContainerRef = useRef<HTMLDivElement>(null)
    const dragStateRef = useRef<{ startX: number; startRatio: number; containerWidth: number } | null>(null)

    const handleDividerMouseMove = useCallback((e: MouseEvent) => {
        const drag = dragStateRef.current
        if (!drag) return
        const dx = e.clientX - drag.startX
        // Divider sits between 2D (left) and 3D (right) — dragging right shrinks
        // the 3D pane, dragging left grows it.
        const deltaRatio = -dx / drag.containerWidth
        const next = Math.min(0.75, Math.max(0.22, drag.startRatio + deltaRatio))
        setSplitRatio(next)
    }, [])
    const getProjectFloorPlanForSave = useCallback((): ProjectFloorPlan => {
        const floorsWithCurrent = floors.map(f =>
            f.id === activeFloorId ? { ...f, state: fpRef.current } : f
        )
        return { floors: floorsWithCurrent, activeFloorId, viewMode, showUnderlay, roof }
    }, [floors, activeFloorId, viewMode, showUnderlay, roof])

    const handleSaveWithThumbnail = useCallback(async (fp: FloorPlanState, sceneConfig: SceneConfig) => {
        const projectFloorPlan = getProjectFloorPlanForSave() // full floors array, current fp already folded in

        const saveResult = await onSave?.(projectFloorPlan, sceneConfig, undefined)
        const effectiveProjectId = projectId ?? saveResult?.projectId
        setLastSavedSnapshot({ fp, sceneConfig })
        if (!effectiveProjectId) {
            console.warn('[FloorPlanEditor] no projectId after save, skipping thumbnail')
            return
        }

        try {
            const blob = await scene3DRef.current?.captureSnapshot()
            if (blob) {
                const formData = new FormData()
                formData.append('project_id', effectiveProjectId)
                formData.append('thumbnail', blob, 'thumbnail.jpg')

                const res = await fetch('/api/workspace/thumbnail', { method: 'POST', body: formData })
                if (res.ok) {
                    const body = await res.json() as { thumbnail_url?: string }
                    if (body.thumbnail_url) {
                        await onSave?.(projectFloorPlan, sceneConfig, body.thumbnail_url)
                    }
                } else {
                    console.warn('[FloorPlanEditor] thumbnail upload failed:', await res.text())
                }
            }
        } catch (err) {
            console.warn('[FloorPlanEditor] thumbnail capture failed, continuing:', err)
        }
    }, [onSave, projectId, getProjectFloorPlanForSave])

    const handleDividerMouseUp = useCallback(() => {
        dragStateRef.current = null
        window.removeEventListener('mousemove', handleDividerMouseMove)
        window.removeEventListener('mouseup', handleDividerMouseUp)
    }, [handleDividerMouseMove])

    const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
        const container = splitContainerRef.current
        if (!container) return
        dragStateRef.current = {
            startX: e.clientX,
            startRatio: splitRatio,
            containerWidth: container.getBoundingClientRect().width,
        }
        window.addEventListener('mousemove', handleDividerMouseMove)
        window.addEventListener('mouseup', handleDividerMouseUp)
    }, [splitRatio, handleDividerMouseMove, handleDividerMouseUp])

    const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), [])

    const ghostFloorsDerivedRef = useRef<{ floor: Floor; derived: ReturnType<typeof computeDerivedFloorData> }[]>([])

    const ghostFloorsDerived = useMemo(() => {
        if (viewMode === 'single') {
            // Underlay only — floor directly below active, faded, if enabled
            if (!showUnderlay) return []
            const activeFloor = floors.find(f => f.id === activeFloorId)
            if (!activeFloor) return []
            const belowFloor = [...floors]
                .filter(f => f.order < activeFloor.order && f.visible)
                .sort((a, b) => b.order - a.order)[0]
            return belowFloor ? [{ floor: belowFloor, derived: computeDerivedFloorData(belowFloor.state) }] : []
        }
        return floors
            .filter(f => f.visible && f.id !== activeFloorId)
            .map(f => ({ floor: f, derived: computeDerivedFloorData(f.state) }))
    }, [viewMode, showUnderlay, floors, activeFloorId])


    const toolGroups = useMemo(
        () =>
            getToolGroups({
                furnitureByCategory,
                openFurnitureCats,
                setOpenFurnitureCats,
                selectedFurnitureType,
                setSelectedFurnitureType,
                isFurnitureNew,
                armedWallPresetId,
                armedTemplateId,
                armWallPreset,      // already (preset: WallPreset) => void — matches
                armRoomTemplate,    // already (template: RoomTemplate) => void — matches
            }),
        [
            furnitureByCategory,
            openFurnitureCats,
            selectedFurnitureType,
            armedWallPresetId,
            armedTemplateId,
            armWallPreset,
            armRoomTemplate,
        ]
    )

    useEffect(() => {
        ghostFloorsDerivedRef.current = ghostFloorsDerived
        scheduleRedraw()
    }, [ghostFloorsDerived, scheduleRedraw])

    return (
        <>

            <div
                ref={editorRef}
                style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: THEME.bg, fontFamily: 'system-ui, sans-serif', color: THEME.text, overflow: 'hidden', maxHeight: '100vh', maxWidth: '100vw' }}
            >
                {/* ── Top bar ────────────────────────────────────────────────────── */}
                <div className='z-99999]'>
                    <WorkspaceNav
                        fp={fp}
                        isFullscreen={isFullscreen}
                        sceneConfig={sceneConfig}
                        sceneRootRef={exportRootRef}
                        setFp={setFp}
                        setSelectedId={setSelectedId}
                        setZoom={setZoom}
                        toggleFullscreen={toggleFullscreen}
                        zoom={zoom}
                        isSaved={isSaved}
                        isSaving={isSaving}
                        key={1}
                        onClose={onClose}
                        onSave={handleSaveWithThumbnail}
                        projectId={projectId}
                        floors={floors}
                        activeFloorId={activeFloorId}
                        viewMode={viewMode}
                        onSelectFloor={switchToFloor}
                        onAddFloor={addFloor}
                        onToggleFloorVisible={toggleFloorVisible}
                        onRenameFloor={renameFloor}
                        onSetViewMode={setViewMode}
                        onSetShowUnderlay={setShowUnderlay}
                        showUnderlay={showUnderlay}
                        lastSavedSnapshot={lastSavedSnapshot}
                    />
                </div>
                {/* ── Body ─────────────────────────────────────────────────────────── */}
                <div ref={splitContainerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                    {/* ── Left tool panel ────────────────────────────────── */}
                    <div
                        style={{
                            width: 68, flexShrink: 0,
                            background: THEME.bgPanel,
                            borderRight: `1px solid ${THEME.border}`,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', padding: '10px 0', gap: 4,
                            overflowY: 'auto',
                            animation: 'dockSlideIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                            willChange: 'transform, opacity',
                        }}
                        onAnimationEnd={e => { e.currentTarget.style.willChange = 'auto' }}
                    >
                        <Toolbar
                            tool={tool}
                            setTool={handleToolClick}
                            registerAnchor={(groupId, el) => { groupAnchorsRef.current[groupId] = el }}
                            toolGroups={toolGroups}
                        />

                        <div style={{ flex: 1 }} />
                        <div style={{ fontSize: 9, color: THEME.textFaint, textAlign: 'center', lineHeight: 1.7, paddingBottom: 4 }}>
                            <div>{fp.rooms.length}R</div>
                            <div>{fp.lineSegments.length}W</div>
                            <div>{fp.openings.length}O</div>
                            <div>{(fp.stairs ?? []).length}S</div>
                        </div>

                        {tool === 'furniture' && furnitureAnchorRect && typeof document !== 'undefined' && createPortal(
                            <div
                                style={{
                                    position: 'fixed',
                                    top: furnitureAnchorRect.top,
                                    left: furnitureAnchorRect.right + 10,
                                    background: THEME.bgPanel,
                                    border: `1px solid ${THEME.border}`,
                                    borderRadius: 12,
                                    width: 280,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: THEME.shadowLg,
                                    overflow: 'hidden',
                                    zIndex: 9999,
                                }}
                            >
                                <div style={{
                                    padding: '10px 12px',
                                    borderBottom: `1px solid ${THEME.border}`,
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                                    color: THEME.textMuted,
                                }}>
                                    FURNITURE
                                </div>
                                <div style={{ padding: '8px' }}>
                                    <ScrollableList maxHeight={340}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {(Object.keys(furnitureByCategory) as FurnitureCategory[]).map(catId => {
                                                const items = furnitureByCategory[catId]
                                                if (!items || items.length === 0) return null
                                                const isOpen = openFurnitureCats.has(catId)
                                                return (
                                                    <div
                                                        key={catId}
                                                        style={{
                                                            borderRadius: 10,
                                                            border: `1px solid ${isOpen ? THEME.accent : THEME.border}`,
                                                            background: isOpen ? 'rgba(99,102,241,0.06)' : 'transparent',
                                                            overflow: 'hidden',
                                                            transition: 'border-color 150ms, background 150ms',
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() => setOpenFurnitureCats((prev: any) => {
                                                                const next = new Set(prev)
                                                                next.has(catId) ? next.delete(catId) : next.add(catId)
                                                                return next
                                                            })}
                                                            style={{
                                                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                                                padding: '8px 10px', background: 'transparent', border: 'none',
                                                                cursor: 'pointer', textAlign: 'left',
                                                            }}
                                                        >
                                                            <span style={{
                                                                fontSize: 13, fontWeight: 600, flex: 1, color: THEME.text,
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            }}>
                                                                {CATEGORY_LABELS[catId]}
                                                            </span>
                                                            <span style={{
                                                                fontSize: 10.5, fontWeight: 700, color: THEME.accent,
                                                                background: 'rgba(99,102,241,0.12)', borderRadius: 999,
                                                                padding: '1px 7px', flexShrink: 0, minWidth: 18, textAlign: 'center',
                                                            }}>
                                                                {items.length}
                                                            </span>
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={THEME.textMuted} strokeWidth="2.5"
                                                                style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }}>
                                                                <polyline points="9 18 15 12 9 6" />
                                                            </svg>
                                                        </button>

                                                        {isOpen && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px 8px' }}>
                                                                {items.map(catalogEntry => {
                                                                    const id = catalogEntry.type
                                                                    const isNew = isFurnitureNew(catalogEntry)
                                                                    const Icon = (Icons as any)[catalogEntry.icon] ?? Icons.Box
                                                                    const selected = selectedFurnitureType === id
                                                                    return (
                                                                        <button
                                                                            key={id}
                                                                            onClick={() => setSelectedFurnitureType(id)}
                                                                            style={{
                                                                                display: 'flex', alignItems: 'center', gap: 8,
                                                                                padding: '6px 8px', borderRadius: 8, border: 'none',
                                                                                background: selected ? 'rgba(99,102,241,0.1)' : 'transparent',
                                                                                cursor: 'pointer', textAlign: 'left', width: '100%',
                                                                            }}
                                                                        >
                                                                            <div style={{
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                                                                                background: selected ? 'rgba(99,102,241,0.14)' : THEME.bgCanvas,
                                                                            }}>
                                                                                <Icon size={14} strokeWidth={1.8} color={selected ? THEME.accent : THEME.textMuted} />
                                                                            </div>
                                                                            <span style={{
                                                                                flex: 1, fontSize: 12, fontWeight: selected ? 600 : 400,
                                                                                color: selected ? THEME.accent : THEME.text,
                                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                            }}>
                                                                                {catalogEntry.label}
                                                                            </span>
                                                                            {isNew && (
                                                                                <span style={{
                                                                                    fontSize: 9, fontWeight: 700, letterSpacing: '0.02em',
                                                                                    color: '#fff', background: THEME.accent,
                                                                                    borderRadius: 4, padding: '2px 5px', flexShrink: 0,
                                                                                }}>
                                                                                    NEW
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </ScrollableList>
                                </div>
                            </div>,
                            document.body
                        )}
                        {presetsMounted && presetsAnchorRect && typeof document !== 'undefined' && createPortal(
                            <div
                                style={{
                                    position: 'fixed',
                                    top: presetsAnchorRect.top,
                                    left: presetsAnchorRect.right + 10,
                                    background: THEME.bgPanel,
                                    border: `1px solid ${THEME.border}`,
                                    borderRadius: 12,
                                    width: 280,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: THEME.shadowLg,
                                    overflow: 'hidden',
                                    zIndex: 9999,
                                    transformOrigin: 'top left',
                                    transform: presetsOpen ? 'scale(1)' : 'scale(0.94)',
                                    opacity: presetsOpen ? 1 : 0,
                                    transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 130ms ease-out',
                                    pointerEvents: presetsOpen ? 'auto' : 'none', // avoid intercepting clicks while fading out
                                }}
                            >
                                <PresetsPanel
                                    armedWallPresetId={armedWallPresetId}
                                    armedTemplateId={armedTemplateId}
                                    onSelectWallPreset={armWallPreset}
                                    onSelectRoomTemplate={armRoomTemplate}
                                />
                            </div>,
                            document.body
                        )}
                    </div>

                    {/* 2D canvas */}
                    <div
                        ref={canvasDivRef}
                        style={{
                            cursor: canvasCursor, flex: 1, minWidth: 0, position: 'relative',
                            overflow: 'hidden', alignSelf: 'stretch', background: THEME.bgCanvas,
                            animation: 'canvasFadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            style={{
                                width: '100%', height: '100%', display: 'block', maxHeight
                                    : "800px"
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={() => {
                                isMouseDownRef.current = false;
                                furnitureDragRef.current = null;
                                wallDecorDragRef.current = null
                                setMidPan(null);
                                dragRoomRef.current = null;
                                segDragRef.current = null;
                                setHoverTooltip(null)
                                shapeResizeRef.current = null
                                lightDragRef.current = null
                                wallDragRef.current = null   // ← add this too
                            }}
                            onContextMenu={handleContextMenu}
                        />

                        {/* Tool hint */}
                        <ToolHintBar
                            tool={tool}
                            drawStart={drawStart}
                            lineActiveNodeRef={lineActiveNodeRef}
                            isDoorTool={isDoorTool}
                            isWindowTool={isWindowTool}
                            isOpeningTool={isOpeningTool}
                            isStairsTool={isStairsTool}
                            isWallDecorTool={isWallDecorTool}
                            selectedFurnitureType={selectedFurnitureType}
                        />
                        {showRecenterPrompt && (
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white/95 border rounded-full px-4 py-2 shadow-md flex items-center gap-2 text-sm">
                                <span>You've scrolled away from your plan</span>
                                <button
                                    className="font-medium text-blue-600 hover:underline"
                                    onClick={() => {
                                        centerOnContent(fpRef.current, canvasRef.current)
                                        setShowRecenterPrompt(false)
                                        recenterPromptShownRef.current = false
                                    }}
                                >
                                    Scroll back
                                </button>
                            </div>
                        )}
                        {/* Annotation editor */}
                        {editingAnnotation && (
                            <div style={{ position: 'fixed', left: Math.min(editingAnnotation.x - 80, window.innerWidth - 260), top: Math.min(editingAnnotation.y - 40, window.innerHeight - 120), zIndex: 300, background: THEME.bgPanel, border: `1px solid ${THEME.accent}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: THEME.shadowLg }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: THEME.accent, letterSpacing: '0.08em' }}>LABEL</div>
                                <input
                                    ref={annotationInputRef}
                                    autoFocus
                                    defaultValue={editingAnnotation.text || ''}
                                    placeholder="Enter label..."
                                    style={{ width: 160, height: 28, borderRadius: 5, border: `1px solid ${THEME.accent}`, background: '#FAFAFA', color: THEME.text, fontSize: 13, padding: '0 8px', outline: 'none' }}
                                    onKeyDown={e2 => {
                                        if (e2.key === 'Enter' || e2.key === 'Escape') {
                                            const val = annotationInputRef.current?.value?.trim()
                                            if (val) {
                                                setFp(prev => ({ ...prev, annotations: (prev.annotations ?? []).map(a => a.id === editingAnnotation!.id ? { ...a, text: val } : a) }))
                                            } else {
                                                setFp(prev => ({ ...prev, annotations: (prev.annotations ?? []).filter(a => a.id !== editingAnnotation!.id) }))
                                            }
                                            setEditingAnnotation(null)
                                        }
                                    }}
                                    onBlur={() => {
                                        const val = annotationInputRef.current?.value?.trim()
                                        if (val) {
                                            setFp(prev => ({ ...prev, annotations: (prev.annotations ?? []).map(a => a.id === editingAnnotation!.id ? { ...a, text: val } : a) }))
                                        } else {
                                            setFp(prev => ({ ...prev, annotations: (prev.annotations ?? []).filter(a => a.id !== editingAnnotation!.id) }))
                                        }
                                        setEditingAnnotation(null)
                                    }}
                                />
                                <div style={{ fontSize: 10, color: THEME.textFaint }}>Enter to confirm · Esc to cancel</div>
                            </div>
                        )}
                    </div>


                    {hoverTooltip && (
                        <div style={{
                            position: 'fixed', left: hoverTooltip.x + 14, top: hoverTooltip.y + 14,
                            zIndex: 250, pointerEvents: 'none',
                            background: 'rgba(15,15,15,0.85)', color: '#fff',
                            fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                            whiteSpace: 'nowrap',
                        }}>
                            {hoverTooltip.text}
                        </div>
                    )}
                    <div style={{ width: 1, background: THEME.border, flexShrink: 0 }} />

                    {/* ── Right: 3D preview + collapsible dock ─────────────────────── */}
                    <div style={{ width: 1, background: THEME.border, flexShrink: 0 }} />
                    {previewOpen && (
                        <>
                            <div
                                onMouseDown={handleDividerMouseDown}
                                style={{
                                    width: 6, flexShrink: 0, cursor: 'col-resize', position: 'relative', zIndex: 20,
                                    background: 'transparent',
                                }}
                            >
                                <div style={{ position: 'absolute', left: 2, top: 0, bottom: 0, width: 2, background: THEME.border }} />
                            </div>

                            {/* 3D pane */}
                            <div
                                style={{
                                    width: `${splitRatio * 100}%`, flexShrink: 0, display: 'flex', flexDirection: 'column',
                                    overflow: 'hidden', background: THEME.bgPanel, minWidth: 260, position: 'relative',
                                }}
                            >
                                <div style={{ flex: 1, position: 'relative', minHeight: 0, background: '#EFEFEC' }}>
                                    <ResilientCanvas
                                        frameloop='always'
                                        shadows
                                        gl={{
                                            antialias: true,
                                            alpha: false,
                                            powerPreference: 'low-power',
                                            stencil: true,
                                            depth: true,
                                            preserveDrawingBuffer: true
                                        }}
                                        dpr={[1, 2]}
                                        camera={{
                                            position: [
                                                (fp?.roomHeight ?? 2.8) * 3,
                                                (fp?.roomHeight ?? 2.8) * 4,
                                                (fp?.roomHeight ?? 2.8) * 4
                                            ],
                                            fov: 45, near: 0.1, far: 500
                                        }}
                                        style={{ width: '100%', height: '100%', background: '#EFEFEC', display: 'block' }}
                                        onWheel={e => e.stopPropagation()}
                                        resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
                                    >
                                        <Scene3D
                                            ref={scene3DRef}
                                            exportRootRef={exportRootRef}
                                            floors={floors}
                                            activeFloorId={activeFloorId}
                                            viewMode={viewMode}
                                            showUnderlay={showUnderlay}
                                            sceneConfig={sceneConfig}
                                            walkMode={walkMode}
                                            activeFp={fp}
                                            interactiveMode={interactiveMode}
                                            selectedId={selectedId}
                                            onSelect={handleSceneSelect}
                                            onToggleDoorOpen={(openingId) => setFp(prev => ({ ...prev, openings: prev.openings.map(o => o.id === openingId ? { ...o, isOpen: !o.isOpen } : o) }))}
                                            overlappingIds={overlappingIds}
                                            cutoutDrawInProgress={cutoutArmed}
                                        />
                                    </ResilientCanvas>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                {typeof document !== 'undefined' && createPortal(
                    <div style={{ position: 'fixed', top: 64, right: 16, zIndex: 1000 }}>
                        <FloatingMenu
                            walkMode={walkMode}
                            onToggleWalkMode={() => setWalkMode(w => !w)}
                            interactiveMode={interactiveMode}
                            onToggleInteractive={handleToggleInteractive}
                            showFurniture={sceneConfig.showFurniture}
                            onToggleShowFurniture={() =>
                                setSceneConfig(c => ({ ...c, showFurniture: !c.showFurniture }))
                            }
                            showLabels={sceneConfig.showLabels}
                            onToggleShowLabels={() =>
                                setSceneConfig(c => ({ ...c, showLabels: !c.showLabels }))
                            }
                            previewOpen={previewOpen}
                            onTogglePreview={() => setPreviewOpen(o => !o)}
                            cameraViewPickerSlot={
                                scene3DRef && onSave !== undefined ? (
                                    <CameraViewPickerV2
                                        embedded
                                        fp={fp}
                                        setFp={setFp}
                                        sceneConfig={sceneConfig}
                                        pushHistory={pushHistory}
                                        scene3DRef={scene3DRef}
                                        onSave={(fpArg, cfgArg) => { void handleSaveWithThumbnail(fpArg, cfgArg) }}
                                    />
                                ) : null
                            }
                        />
                    </div>,
                    document.body
                )}
                <div style={{ position: "relative" }} className='flex items-center justify-center'>
                    <FloatingDock
                        orientation="horizontal"
                        activeId={sheetOpen ? rightTab : (layersOpen ? 'layers' : null)}
                        items={[
                            {
                                id: 'layers',
                                title: 'Floor View',
                                icon: (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full">
                                        <path d="M12 2 2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                                        <path d="M2 17l10 5 10-5" strokeLinejoin="round" strokeLinecap="round" />
                                        <path d="M2 12l10 5 10-5" strokeLinejoin="round" strokeLinecap="round" />
                                    </svg>
                                ),
                                onClick: () => setLayersOpen(v => !v),
                            },
                            {
                                id: 'properties',
                                title: 'Properties',
                                icon: <img className='w-full' src={'/icons/properties.png'} />,
                                onClick: () => {
                                    if (sheetOpen && rightTab === 'properties') setSheetOpen(false)
                                    else { setRightTab('properties'); setSheetOpen(true) }
                                },
                            },
                            {
                                id: 'scene',
                                title: 'Scene',
                                icon: <img className='w-full' src={'/icons/scene.png'} />,
                                onClick: () => {
                                    if (sheetOpen && rightTab === 'scene') setSheetOpen(false)
                                    else { setRightTab('scene'); setSheetOpen(true) }
                                },
                            },
                            {
                                id: 'sun',
                                title: 'Sun & Lighting',
                                icon: <img className='w-full' src={'/icons/light.png'} />,
                                onClick: () => {
                                    if (sheetOpen && rightTab === 'sun') setSheetOpen(false)
                                    else { setRightTab('sun'); setSheetOpen(true) }
                                },
                            },
                        ]}
                    />
                    <ViewModeControl
                        open={layersOpen}
                        viewMode={viewMode}
                        onSetViewMode={setViewMode}
                        onClose={() => setLayersOpen(false)}
                    />
                </div>
                <div ref={toolbarRef}>


                    {selectedIds.length > 1 && quickMenuAnchor && !isDraggingSelection ? (
                        <div
                            onMouseDown={e => { e.stopPropagation(); e.preventDefault() }}
                            style={{
                                position: 'fixed',
                                left: quickMenuAnchor.x,
                                top: quickMenuAnchor.y,
                                transform: 'translate(-50%, calc(-100% - 14px))',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                padding: 6,
                                borderRadius: 999,
                                background: 'rgba(28,28,32,0.95)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
                                backdropFilter: 'blur(6px)',
                                zIndex: 50,
                            }}
                        >
                            <button
                                onClick={e => { e.stopPropagation(); e.preventDefault(); handleDuplicateSelected() }}
                                title="Duplicate all"
                                style={{
                                    width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'transparent',
                                    color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="11" height="11" rx="2" />
                                    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                                </svg>
                            </button>
                            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.14)', margin: '0 2px' }} />
                            <button
                                onClick={e => {
                                    e.stopPropagation(); e.preventDefault()
                                    const idSet = new Set(selectedIds.filter(id => !id.includes('::wall::')))
                                    if (idSet.size === 0) return
                                    setFp(prev => ({
                                        ...prev,
                                        rooms: prev.rooms.filter(r => !idSet.has(r.id)),
                                        openings: prev.openings.filter(o => !idSet.has(o.id) && !(o.roomId && idSet.has(o.roomId))),
                                        lineNodes: prev.lineNodes.filter(n => !idSet.has(n.id)),
                                        lineSegments: prev.lineSegments.filter(s => !idSet.has(s.id)).filter(s => !s.nodeIds.some(nid => idSet.has(nid))),
                                        closedShapes: (prev.closedShapes ?? []).filter(sh => !idSet.has(sh.id)),
                                        furniture: (prev.furniture ?? []).filter(f => !idSet.has(f.id)),
                                        stairs: (prev.stairs ?? []).filter(st => !idSet.has(st.id)),
                                        annotations: (prev.annotations ?? []).filter(a => !idSet.has(a.id)),
                                        wallDecor: (prev.wallDecor ?? []).filter(d => !idSet.has(d.id)),
                                        lights: (prev.lights ?? []).filter(l => !idSet.has(l.id)),
                                        outdoorObjects: (prev.outdoorObjects ?? []).filter(o => !idSet.has(o.id)),
                                    }))
                                    selectedIdsRef.current = []
                                    setSelectedIds([])
                                    pushHistory()
                                }}
                                title="Delete all"
                                style={{
                                    width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'transparent',
                                    color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                                </svg>
                            </button>
                        </div>
                    ) : quickMenuAnchor && (
                        <QuickActionMenu
                            fp={fp}
                            selectedId={selectedId}
                            screenX={quickMenuAnchor.x}
                            screenY={quickMenuAnchor.y}
                            visible={!isDraggingSelection && tool === 'select'}
                            onDuplicate={handleDuplicateSelected}
                            onDelete={() => {
                                const rawIds = selectedIds.length > 0
                                    ? selectedIds
                                    : (selectedId ? [selectedId] : [])
                                const idsToDelete = rawIds.filter(id => !id.includes('::wall::'))
                                if (idsToDelete.length === 0) return

                                setFp(prev => {
                                    // Resolve any shape ids (real ClosedShape ids OR synthetic
                                    // `unconfigured::${sorted}` ids from hitClosedShape) to their
                                    // actual boundary node-id arrays, using a SINGLE derive call so
                                    // every resolution in this pass agrees on the same polygon set.
                                    const allPolys = deriveClosedPolygons(prev.lineNodes, prev.lineSegments)
                                    const shapeTargets: string[][] = []
                                    const nonShapeIds = new Set<string>()

                                    for (const id of idsToDelete) {
                                        if (id.startsWith('unconfigured::')) {
                                            const poly = allPolys.find(p => `unconfigured::${[...p].sort().join(',')}` === id)
                                            if (poly) shapeTargets.push(poly)
                                            continue
                                        }
                                        const sh = (prev.closedShapes ?? []).find(sh => sh.id === id)
                                        if (sh) {
                                            const poly = allPolys.find(p => [...p].sort().join(',') === [...sh.nodeIds].sort().join(','))
                                            shapeTargets.push(poly ?? sh.nodeIds)
                                            continue
                                        }
                                        nonShapeIds.add(id)
                                    }

                                    // Cascade-delete each shape target (preserves any edge shared
                                    // with a polygon NOT being deleted in this same pass).
                                    let next = prev
                                    for (const target of shapeTargets) {
                                        next = deleteAreaCascade(next, target)
                                    }

                                    // Everything else (rooms, furniture, stairs, etc.) — unchanged
                                    // generic id-set filtering, just no longer touching lineNodes/
                                    // lineSegments here since deleteAreaCascade already owns that.
                                    if (nonShapeIds.size > 0) {
                                        next = {
                                            ...next,
                                            rooms: next.rooms.filter(r => !nonShapeIds.has(r.id)),
                                            openings: next.openings.filter(o =>
                                                !nonShapeIds.has(o.id) && !(o.roomId && nonShapeIds.has(o.roomId))
                                            ),
                                            furniture: (next.furniture ?? []).filter(f => !nonShapeIds.has(f.id)),
                                            stairs: (next.stairs ?? []).filter(st => !nonShapeIds.has(st.id)),
                                            annotations: (next.annotations ?? []).filter(a => !nonShapeIds.has(a.id)),
                                            wallDecor: (next.wallDecor ?? []).filter(d => !nonShapeIds.has(d.id)),
                                            lights: (next.lights ?? []).filter(l => !nonShapeIds.has(l.id)),
                                            outdoorObjects: (next.outdoorObjects ?? []).filter(o => !nonShapeIds.has(o.id)),
                                        }
                                    }
                                    return next
                                })
                                selectedIdsRef.current = []
                                setSelectedIds([])
                                setSelectedId(null)
                            }}
                            onBend={handleBendSelectedSegment}
                            onMove={handleArmMove}
                            moveArmed={moveArmedForId === selectedId}
                            cutoutArmed={cutoutArmed}
                            onArmCutoutDraw={handleArmCutoutDraw}
                            onOpenProperties={() => {
                                if (sheetOpen && rightTab === 'properties') {
                                    setSheetOpen(false)
                                } else {
                                    setRightTab('properties')
                                    setSheetOpen(true)
                                }
                            }}
                        />
                    )}
                </div>

                {propertiesRendered && (
                    <div
                        data-panel="right-sidebar"
                        style={{
                            position: 'absolute',
                            top: '53%',
                            right: 12,
                            transform: `translateY(-50%) scale(${sheetOpen && rightTab === 'properties' ? 1 : 0.96})`,
                            opacity: sheetOpen && rightTab === 'properties' ? 1 : 0,
                            transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 130ms ease-out',
                            transformOrigin: 'bottom right',
                            pointerEvents: sheetOpen && rightTab === 'properties' ? 'auto' : 'none',
                            height: '75vh',
                            width: 320,
                            background: THEME.bg ?? '#fff',
                            border: `1px solid ${THEME.border}`,
                            borderRadius: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 20,
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0,
                        }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted }}>PROPERTIES</span>
                            <button
                                onClick={() => setSheetOpen(false)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: THEME.textMuted, fontSize: 14, lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>
                        <ScrollableList maxHeight={1200}>
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} onWheel={(e) => e.stopPropagation()} onWheelCapture={(e) => e.stopPropagation()}
                            >
                                {/* <SceneGraphPanel fp={fp} selectedId={selectedId} onSelect={setSelectedId} /> */}
                                <div style={{ height: 1, background: THEME.border, margin: '4px 0' }} />
                                <PropsPanel
                                    fp={fp}
                                    selectedId={selectedId}
                                    onChange={setFp}
                                    onDelete={() => {
                                        if (!selectedId || selectedId.includes('::wall::')) return
                                        setFp(prev => {
                                            const isRoom = prev.rooms.some(r => r.id === selectedId)
                                            const isNode = prev.lineNodes.some(n => n.id === selectedId)
                                            const isSeg = prev.lineSegments.some(s => s.id === selectedId)
                                            const isShape = (prev.closedShapes ?? []).some(sh => sh.id === selectedId)
                                            const isUnconfiguredShape = selectedId.startsWith('unconfigured::')  // NEW
                                            const isFurniture = (prev.furniture ?? []).some(f => f.id === selectedId)
                                            const isStairs = (prev.stairs ?? []).some(st => st.id === selectedId)
                                            const isAnn = (prev.annotations ?? []).some(a => a.id === selectedId)
                                            const isWallDecor = (prev.wallDecor ?? []).some(d => d.id === selectedId)
                                            if (isWallDecor) return { ...prev, wallDecor: (prev.wallDecor ?? []).filter(d => d.id !== selectedId) }

                                            if (isRoom) return { ...prev, rooms: prev.rooms.filter(r => r.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                                            if (isNode) return { ...prev, lineNodes: prev.lineNodes.filter(n => n.id !== selectedId), lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(selectedId)) }
                                            if (isSeg) return { ...prev, lineSegments: prev.lineSegments.filter(s => s.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                                            if (isShape || isUnconfiguredShape) {
                                                const allPolys = deriveClosedPolygons(prev.lineNodes, prev.lineSegments)
                                                const targetNodeIds = isUnconfiguredShape
                                                    ? allPolys.find(poly => `unconfigured::${[...poly].sort().join(',')}` === selectedId)
                                                    : (() => {
                                                        const sh = (prev.closedShapes ?? []).find(sh => sh.id === selectedId)
                                                        if (!sh) return undefined
                                                        return allPolys.find(poly => [...poly].sort().join(',') === [...sh.nodeIds].sort().join(','))
                                                            ?? sh.nodeIds
                                                    })()
                                                if (!targetNodeIds) return prev
                                                return deleteAreaCascade(prev, targetNodeIds)
                                            }

                                            if (isFurniture) return { ...prev, furniture: (prev.furniture ?? []).filter(f => f.id !== selectedId) }
                                            if (isStairs) return { ...prev, stairs: (prev.stairs ?? []).filter(st => st.id !== selectedId) }
                                            if (isAnn) return { ...prev, annotations: (prev.annotations ?? []).filter(a => a.id !== selectedId) }
                                            return { ...prev, openings: prev.openings.filter(o => o.id !== selectedId) }
                                        })
                                        setSelectedId(null)
                                        setSelectedIds([])
                                    }}
                                    sceneConfig={sceneConfig}
                                    onChangeSceneConfig={setSceneConfig}
                                    onDuplicate={handleDuplicateSelected}
                                    onMirror={handleMirrorSelected}
                                />
                            </div>
                        </ScrollableList>
                    </div>
                )}
                {sceneRendered && (
                    <div
                        data-panel="right-sidebar"
                        style={{
                            position: 'absolute',
                            top: '53%',
                            right: 12,
                            transform: `translateY(-50%) scale(${sheetOpen && rightTab === 'scene' ? 1 : 0.96})`,
                            opacity: sheetOpen && rightTab === 'scene' ? 1 : 0,
                            transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 130ms ease-out',
                            transformOrigin: 'bottom right',
                            pointerEvents: sheetOpen && rightTab === 'scene' ? 'auto' : 'none',
                            height: '75vh',
                            width: 320,
                            background: THEME.bg ?? '#fff',
                            border: `1px solid ${THEME.border}`,
                            borderRadius: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 20,
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0,
                        }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted }}>SCENE</span>
                            <button
                                onClick={() => setSheetOpen(false)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: THEME.textMuted, fontSize: 14, lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} onWheel={(e) => e.stopPropagation()} onWheelCapture={(e) => e.stopPropagation()}>
                            <MaterialsPanel
                                fp={fp}
                                config={sceneConfig}
                                onChange={setSceneConfig}
                                onChangeFp={setFp}
                                pushHistory={pushHistory}
                            />

                        </div>
                    </div>

                )}
                {sunRendered && (
                    <div
                        data-panel="right-sidebar"
                        style={{
                            position: 'absolute',
                            top: '53%',
                            right: 12,
                            transform: `translateY(-50%) scale(${sheetOpen && rightTab === 'sun' ? 1 : 0.96})`,
                            opacity: sheetOpen && rightTab === 'sun' ? 1 : 0,
                            transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 130ms ease-out',
                            transformOrigin: 'bottom right',
                            pointerEvents: sheetOpen && rightTab === 'sun' ? 'auto' : 'none',
                            height: '75vh',
                            width: 320,
                            background: THEME.bg ?? '#fff',
                            border: `1px solid ${THEME.border}`,
                            borderRadius: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 20,
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} onWheel={(e) => e.stopPropagation()} onWheelCapture={(e) => e.stopPropagation()}>
                            <SunScenePanel
                                sceneConfig={sceneConfig}
                                onChange={patch => setSceneConfig(prev => ({ ...prev, ...patch }))}
                            />
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes dockSlideIn {
                    from { opacity: 0; transform: translateX(-16px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes canvasFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes panelStaggerIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                `}
            </style>
        </>
    )
}


