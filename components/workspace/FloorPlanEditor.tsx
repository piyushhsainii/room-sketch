'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ResilientCanvas from './ResilientCanvas'
import { Toolbar } from './Tools/ToolBar'
import { Annotation, ClosedShape, DEFAULT_FP, DEFAULT_SCENE_CONFIG, DoorStyle, EditorOpening, EditorRoom, EditorTool, FloorMaterial, FloorPlanState, FURNITURE_CATALOG, FURNITURE_CATEGORIES, FURNITURE_COLORS, FURNITURE_FOOTPRINTS, FURNITURE_LABELS, FurnitureType, GRID_M, isFurnitureNew, KEY_TO_DEFAULT_TOOL, LineNode, LineSegment, MIN_ROOM, OPENING_VARIANT_LABELS, PlacedFurniture, PlacedStairs, PlacedWallDecor, PX_PER_M, STAIRS_FOOTPRINTS, STAIRS_LABELS, StairsType, WALL_DECOR_DEFAULTS, WALL_DECOR_LABELS, WallDecorType, WallMaterial } from './lib/constants'
import { deriveClosedPolygons, getSegmentOpeningWorldPos, snapFurniture, snapM, toCanvas, toWorld, tryConvertClosedLineShape, uid } from '@/lib/helpers'
import { Dock } from '../ui/Dock'
import { SceneGraphPanel } from './objects/scene-graph'
import { ScrollableList } from '../ui/ScrollableList'
import { matchClosedShape, MaterialsPanel } from './MaterialsPanel'
import Scene3D, { Scene3DHandle } from './3DScene'
import { PropsPanel } from './PropsPanel'
import { draw2D } from './2dDraw'
import WorkspaceNav from '../ui/WorkspaceNav'
import ToolHintBar from '../ui/ToolHint'
import { createPortal } from 'react-dom'
import { LIGHT_FIXTURE_DEFAULTS, LightFixtureType, PlacedLight } from './lights-constant'
import { OUTDOOR_OBJECT_FOOTPRINTS, OutdoorObjectType, PlacedOutdoorObject } from './lib/outdoor-constants'
import { CameraView, getBuiltInViews } from './lib/camera'
import { CameraViewPicker } from './CameraViewPicker'
import { duplicateClosedShape, duplicateRoom, MirrorAxis, mirrorRoom } from './lib/duplicate'
import { duplicateFurniture, duplicateOpening, duplicateOutdoorObject, duplicateStairs, duplicateWallDecor } from './lib/duplicate-items'
import { FloatingDock } from '../ui/FloatingDock'
import { HomeIcon } from 'lucide-react'

export type RoomSceneConfig = {
    roomId: string
    wallColor?: string
    wallMaterial?: WallMaterial
    floorMaterial?: FloorMaterial
    wallOverrides?: Partial<Record<'north' | 'south' | 'east' | 'west', { color?: string; material?: WallMaterial }>>
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
    groundMaterial?: string   // ← NEW
    rooms: RoomSceneConfig[]
    lights: PlacedLight[]
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



function labelForHover(id: string, fp: FloorPlanState): string {
    if (id.includes('::wall::')) {
        const wall = id.split('::wall::')[1]
        return `Wall (${wall})`
    }
    const op = fp.openings.find(o => o.id === id)
    if (op) return OPENING_VARIANT_LABELS[op.variant ?? op.type] ?? op.type
    const room = fp.rooms.find(r => r.id === id)
    if (room) return room.label
    const f = (fp.furniture ?? []).find(x => x.id === id)
    if (f) return FURNITURE_LABELS[f.type]
    const s = (fp.stairs ?? []).find(x => x.id === id)
    if (s) return STAIRS_LABELS[s.type]
    if (fp.lineSegments.some(sg => sg.id === id)) return 'Wall segment'
    return ''
}

function roomContainsPoint(room: EditorRoom, wx: number, wz: number) {
    return wx >= room.x && wx <= room.x + room.width &&
        wz >= room.z && wz <= room.z + room.depth
}

function getWallHit(room: EditorRoom, wx: number, wz: number, thresholdM: number): 'north' | 'south' | 'east' | 'west' | null {
    const d = {
        north: Math.abs(wz - room.z),
        south: Math.abs(wz - (room.z + room.depth)),
        west: Math.abs(wx - room.x),
        east: Math.abs(wx - (room.x + room.width)),
    }
    const min = Math.min(d.north, d.south, d.west, d.east)
    if (min > thresholdM) return null
    return (Object.entries(d).find(([, v]) => v === min)![0]) as 'north' | 'south' | 'east' | 'west'
}

type Props = {
    projectId: string,
    onSave?: (fp: FloorPlanState, sceneConfig: SceneConfig) => void
    onClose?: () => void
    initialState?: FloorPlanState
    initialSceneConfig?: SceneConfig
    isSaving?: boolean
    isSaved?: boolean
}
export default function <FloorPlanEditor>({ projectId, onSave, onClose, initialState, initialSceneConfig, isSaving = false, isSaved = false }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [fp, setFp] = useState<FloorPlanState>(initialState ?? DEFAULT_FP)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [sheetOpen, setSheetOpen] = useState(false)
    const editorRef = useRef<HTMLDivElement>(null)
    const drawStartRef = useRef<{ x: number; z: number } | null>(null)
    const drawRectRef = useRef<{ x: number; z: number; w: number; d: number } | null>(null)
    const isDrawingRef = useRef(false)
    const [openFurnitureCats, setOpenFurnitureCats] = useState<Set<string>>(new Set(FURNITURE_CATEGORIES.map(c => c.id)))
    const [tool, setTool] = useState<EditorTool>('room')
    const lightDragRef = useRef<{ id: string; roomId?: string; wall?: 'north' | 'south' | 'east' | 'west'; segmentNodeIds?: string[]; isFree: boolean } | null>(null)
    const [pencilPoints, setPencilPoints] = useState<{ x: number, z: number }[]>([])
    const isPencilDrawing = useRef(false)
    const wallDecorDragRef = useRef<{ id: string; roomId: string; wall?: 'north' | 'south' | 'east' | 'west'; segmentNodeIds?: string[] } | null>(null)
    const isWallDecorTool = tool.startsWith('wall-decor-')
    const [preview, setPreview] = useState<{ x: number; z: number } | null>(null)
    const lineActiveNodeRef = useRef<string | null>(null)
    const spaceHeldRef = useRef(false)
    const spacePanRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const panToolRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const dragRoomRef = useRef<{ id: string; ox: number; oz: number; type: 'room' | 'node' } | null>(null)
    const shapeDragRef = useRef<{ shapeId: string; ox: number; oz: number; startPositions: Map<string, { x: number, z: number }> } | null>(null)
    const segDragRef = useRef<{ segId: string; ox: number; oz: number; nodeIds?: string[]; startPositions?: Map<string, { x: number, z: number }> } | null>(null)
    const isMouseDownRef = useRef(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const canvasDivRef = useRef<HTMLDivElement>(null)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 60, y: 60 })
    const [drawStart, setDrawStart] = useState<{ x: number; z: number } | null>(null)
    const [drawRect, setDrawRect] = useState<{ x: number; z: number; w: number; d: number } | null>(null)
    const [midPan, setMidPan] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const fpRef = useRef(fp); fpRef.current = fp
    const historyRef = useRef<FloorPlanState[]>([])
    const historyIndexRef = useRef(-1)
    const [canvasCursor, setCanvasCursor] = useState('default')
    const [hoverTooltip, setHoverTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
    const isDoorTool = tool.startsWith('door-')
    const isWindowTool = tool.startsWith('window-')
    const isOpeningTool = tool.startsWith('opening-')
    const isStairsTool = tool.startsWith('stairs-') || tool === 'elevator'
    const [sceneConfig, setSceneConfig] = useState<SceneConfig>(initialSceneConfig ?? DEFAULT_SCENE_CONFIG)
    const [walkMode, setWalkMode] = useState(false)
    const [rightPanelOpen, setRightPanelOpen] = useState(true)
    const [rightTab, setRightTab] = useState<'properties' | 'scene' | 'materials'>('properties')
    const [editingAnnotation, setEditingAnnotation] = useState<{ id: string; text: string; x: number; y: number } | null>(null)
    const annotationInputRef = useRef<HTMLInputElement>(null)
    const outdoorDragRef = useRef<{ id: string; ox: number; oz: number } | null>(null)
    const [selectedFurnitureType, setSelectedFurnitureType] = useState<FurnitureType>('sofa')
    const [furnitureCategoryIdx, setFurnitureCategoryIdx] = useState(0)
    const wallDragRef = useRef<{ roomId: string; wall: 'north' | 'south' | 'east' | 'west'; startRoom: EditorRoom } | null>(null)
    const furnitureDragRef = useRef<{ id: string; ox: number; oz: number } | null>(null)
    const shapeResizeRef = useRef<{ shapeId: string; handle: string; startNodes: Map<string, { x: number; z: number }>; bbox: { minX: number; maxX: number; minZ: number; maxZ: number } } | null>(null)
    const resizeHandleRef = useRef<{ handle: string; room: EditorRoom; startWx: number; startWz: number } | null>(null)
    fpRef.current = fp
    // const mainCameraRef = useRef<THREE.Camera | null>(null)
    const [interactiveMode, setInteractiveMode] = useState(false)
    const justToggledRef = useRef(false)
    // const gizmoApiRef = useGizmoApiRef()

    const handleToggleInteractive = () => {
        justToggledRef.current = true
        setInteractiveMode(m => !m)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => { justToggledRef.current = false })
        })
    }

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

    const handleSceneSelect = (id: string | null) => {
        if (justToggledRef.current) return
        setSelectedId(id)
        if (id) setRightTab('materials')
    }
    const pushHistory = useCallback(() => {
        const current = fpRef.current
        // Truncate redo stack
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
        historyRef.current.push(JSON.parse(JSON.stringify(current)))
        historyIndexRef.current = historyRef.current.length - 1
    }, [])
    // ── Optimized Redraw with rAF ────────────────────────────────────────────
    const rafIdRef = useRef(0)
    const hoveredIdRef = useRef<string | null>(null)
    const lastCanvasSizeRef = useRef({ w: 0, h: 0 })
    const chevronRef = useRef<HTMLButtonElement | null>(null)
    const groupAnchorsRef = useRef<Record<string, HTMLDivElement | null>>({})
    const [furnitureAnchorRect, setFurnitureAnchorRect] = useState<DOMRect | null>(null)

    const scene3DRef = useRef<Scene3DHandle>(null)
    const [viewPickerOpen, setViewPickerOpen] = useState(false)

    const builtInViews = useMemo(() => getBuiltInViews(fp), [fp.rooms, fp.lineNodes])
    const allViews = [...builtInViews, ...(fp.savedViews ?? [])]

    const handleSaveCurrentView = () => {
        const current = scene3DRef.current?.getCurrentView()
        if (!current) return
        const name = prompt('Name this view:')
        if (!name) return
        const newView: CameraView = { id: uid(), label: name, ...current }
        pushHistory()
        setFp(prev => ({ ...prev, savedViews: [...(prev.savedViews ?? []), newView] }))
    }

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

    const scheduleRedraw = useCallback(() => {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = requestAnimationFrame(() => {
            const canvas = canvasRef.current
            if (!canvas) return
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            // Only resize canvas when dimensions actually change
            const cw = canvas.offsetWidth, ch = canvas.offsetHeight
            if (lastCanvasSizeRef.current.w !== cw || lastCanvasSizeRef.current.h !== ch) {
                canvas.width = cw
                canvas.height = ch
                lastCanvasSizeRef.current = { w: cw, h: ch }
            }
            draw2D(ctx, fpRef.current, tool, selectedId, hoveredIdRef.current, drawRect, pencilPoints, zoom, pan, preview, lineActiveNodeRef.current)
        })
    }, [tool, selectedId, drawRect, pencilPoints, zoom, pan, preview])

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
                setFp(prev => {
                    const isRoom = prev.rooms.some(r => r.id === selectedId)
                    const isNode = prev.lineNodes.some(n => n.id === selectedId)
                    const isSeg = prev.lineSegments.some(s => s.id === selectedId)
                    const isShape = (prev.closedShapes ?? []).some(sh => sh.id === selectedId)

                    if (isRoom) return { ...prev, rooms: prev.rooms.filter(r => r.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                    if (isNode) return { ...prev, lineNodes: prev.lineNodes.filter(n => n.id !== selectedId), lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(selectedId)) }
                    if (isSeg) return { ...prev, lineSegments: prev.lineSegments.filter(s => s.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                    if (isShape) return { ...prev, closedShapes: (prev.closedShapes ?? []).filter(sh => sh.id !== selectedId) }
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
                    setFp(JSON.parse(JSON.stringify(snapshot)))
                }
            }
            if (key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
                if (historyIndexRef.current < historyRef.current.length - 1) {
                    historyIndexRef.current++
                    const snapshot = historyRef.current[historyIndexRef.current]!
                    setFp(JSON.parse(JSON.stringify(snapshot)))
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

    const toggleFullscreen = useCallback(async () => {
        if (!document.fullscreenElement) { await editorRef.current?.requestFullscreen(); setIsFullscreen(true) }
        else { await document.exitFullscreen(); setIsFullscreen(false) }
    }, [])

    useEffect(() => {
        const h = () => setIsFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', h)
        return () => document.removeEventListener('fullscreenchange', h)
    }, [])

    const panRef = useRef(pan)
    useEffect(() => { panRef.current = pan }, [pan])
    const zoomRef = useRef(zoom)
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
        // Increase hit radius slightly to 0.5 world units so it's easy to tap
        const threshold = 0.5;

        for (const l of fpRef.current.lights ?? []) {
            // A. Wall Sconces mounted on line-segments (shown in your screenshot)
            if (l.segmentNodeIds && l.segmentNodeIds.length >= 2) {
                const a = fpRef.current.lineNodes.find(n => n.id === l.segmentNodeIds![0]);
                const b = fpRef.current.lineNodes.find(n => n.id === l.segmentNodeIds![1]);
                if (!a || !b) continue;

                // Find coordinate along the segment
                const t = l.segmentT ?? 0.5;
                const px = a.x + (b.x - a.x) * t;
                const pz = a.z + (b.z - a.z) * t;

                if (Math.hypot(wx - px, wz - pz) < threshold) {
                    return l;
                }
            }
            // B. Wall Sconces mounted on a classic Room boundary
            else if (l.wall && l.roomId) {
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

                if (along < threshold + 0.15 && across < threshold + 0.15) {
                    return l;
                }
            }
            // C. Free-placed Lights (like Pendant Lights shown in your screenshot)
            else {
                const lx = l.x ?? 0;
                const lz = l.z ?? 0;
                if (Math.hypot(wx - lx, wz - lz) < threshold) {
                    return l;
                }
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
        for (const nodeIds of polygons) {
            const nodes = nodeIds.map(nid => fpRef.current.lineNodes.find(n => n.id === nid)).filter(Boolean) as LineNode[]
            if (nodes.length < 3) continue
            let inside = false
            for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
                const xi = nodes[i]!.x, zi = nodes[i]!.z, xj = nodes[j]!.x, zj = nodes[j]!.z
                if ((zi > wz) !== (zj > wz) && wx < ((xj - xi) * (wz - zi)) / (zj - zi) + xi) inside = !inside
            }
            if (inside) {
                // Prefer a real saved override record if one matches (via the
                // resilient centroid/area matcher, not raw exact-match, so it
                // survives incidental node-id churn). Otherwise return a
                // synthetic, unpersisted stub — this area is still selectable
                // and editable even though nothing's been saved for it yet.
                const existing = matchClosedShape(nodeIds, fpRef.current.lineNodes, fpRef.current.closedShapes ?? [])
                if (existing) return existing
                return { id: `unconfigured::${[...nodeIds].sort().join(',')}`, nodeIds, label: undefined } as ClosedShape
            }
        }
        return null
    }, [])

    // ── Mouse handlers ────────────────────────────────────────────────────────
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
                            const startNodes = new Map<string, { x: number, z: number }>()
                            for (const n of nodes) startNodes.set(n.id, { x: n.x, z: n.z })
                            shapeResizeRef.current = { shapeId: selShape.id, handle: h.id, startNodes, bbox: { minX, maxX, minZ, maxZ } }
                            return
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
                    setSelectedId(lightHit.id);
                    if (lightDragRef) {
                        (lightDragRef as any).current = {
                            id: lightHit.id,
                            roomId: lightHit.roomId,
                            wall: lightHit.wall,
                            segmentNodeIds: lightHit.segmentNodeIds,
                            isFree: lightHit.type !== 'wall_sconce'
                        };
                    }
                    isMouseDownRef.current = true;
                    return;
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
                setSelectedId(op.id);
                dragRoomRef.current = null;
                isMouseDownRef.current = true;
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
                setSelectedId(hitFurnitureFirst.id)
                furnitureDragRef.current = { id: hitFurnitureFirst.id, ox: wx - hitFurnitureFirst.x, oz: wz - hitFurnitureFirst.z }
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
                setSelectedId(hitStairsFirst.id)
                furnitureDragRef.current = { id: hitStairsFirst.id, ox: wx - hitStairsFirst.x, oz: wz - hitStairsFirst.z }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }

            // 5. Closed Shapes
            const shape = hitClosedShape(wx, wz)
            if (shape) {
                setSelectedId(shape.id)
                const startPositions = new Map<string, { x: number, z: number }>()
                for (const nid of shape.nodeIds) {
                    const n = fpRef.current.lineNodes.find(nd => nd.id === nid)
                    if (n) startPositions.set(nid, { x: n.x, z: n.z })
                }
                shapeDragRef.current = { shapeId: shape.id, ox: wx, oz: wz, startPositions }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }

            // 6. Wall segments (Room Walls & Line Segments)
            const wallHit = hitRoomWall(wx, wz)
            if (wallHit) {
                setSelectedId(`${wallHit.room.id}::wall::${wallHit.wall}`)
                wallDragRef.current = { roomId: wallHit.room.id, wall: wallHit.wall, startRoom: { ...wallHit.room } }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }

            const segHit = hitLineSegment(wx, wz)
            if (segHit) {
                setSelectedId(segHit.seg.id)
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
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }

            // 7. LOWEST PRIORITY: Room areas (clicked on the floor area)
            const room = hitRoom(wx, wz)
            if (room) {
                setSelectedId(room.id);
                dragRoomRef.current = { id: room.id, ox: wx - room.x, oz: wz - room.z, type: 'room' };
                isMouseDownRef.current = true;
                return
            }
            const hitOutdoorFirst = hitOutdoorObject(wx, wz)
            if (hitOutdoorFirst) {
                setSelectedId(hitOutdoorFirst.id)
                outdoorDragRef.current = { id: hitOutdoorFirst.id, ox: wx - hitOutdoorFirst.x, oz: wz - hitOutdoorFirst.z }
                dragRoomRef.current = null
                isMouseDownRef.current = true
                return
            }
            // 8. FALLBACK (Deselect everything if empty canvas clicked)
            setSelectedId(null);
            dragRoomRef.current = null;
            if (lightDragRef) (lightDragRef as any).current = null;
            if (wallDecorDragRef) wallDecorDragRef.current = null;
            outdoorDragRef.current = null;
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
        // ── Pencil tool ───────────────────────────────────────────────────────
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

            if (lineActiveNodeRef.current) {
                const fromId = lineActiveNodeRef.current

                if (existingNode && existingNode.id !== fromId) {
                    // Connect to existing node — end chain
                    const toId = existingNode.id
                    lineActiveNodeRef.current = null
                    const seg: LineSegment = { id: uid(), nodeIds: [fromId, toId], thickness: 0.15, closed: false }
                    pushHistory()
                    setFp(prev => { const w = { ...prev, lineSegments: [...prev.lineSegments, seg] }; return tryConvertClosedLineShape(w, seg.id) })
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
                // Start new chain
                if (existingNode) {
                    lineActiveNodeRef.current = existingNode.id
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
                    // Openings can't be cut into a railing or an already-open edge —
                    // silently no-op rather than attaching a door/window that would
                    // render nonsensically per the railing feature's design.
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
                    wall: 'north', // placeholder — actual direction computed from segment angle
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
                pushHistory();
                setFp(prev => ({
                    ...prev,
                    lineNodes: prev.lineNodes.filter(n => n.id !== node.id),
                    lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(node.id)),
                    openings: prev.openings.filter(o => !o.segmentNodeIds?.includes(node.id)),
                }))
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
        if (isOpeningTool) {
            const room = hitRoom(wx, wz)
            if (room) {
                const wallDir = getWallHit(room, wx, wz, 0.5)
                if (!wallDir) return
                const isH = wallDir === 'north' || wallDir === 'south'
                const wallLen = isH ? room.width : room.depth
                const rawPos = isH ? wx - room.x : wz - room.z
                const opW = tool === 'opening-archway' ? 1.1 : 1.5
                const clampedPos = Math.max(opW / 2, Math.min(wallLen - opW / 2, rawPos))
                const op: EditorOpening = {
                    id: uid(),
                    roomId: room.id,
                    wall: wallDir,
                    type: 'opening',
                    variant: tool,
                    position: parseFloat(clampedPos.toFixed(2)),
                    width: opW,
                    height:
                        tool === 'opening-archway'
                            ? Math.max(2.1, fp.roomHeight - 0.45)
                            : fp.roomHeight,
                    sillHeight: 0,
                    swingDirection: 'inward',
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
                const opW = tool === 'opening-archway' ? 1.1 : 1.5
                const rawPos = t * segLen
                const clampedPos = Math.max(opW / 2, Math.min(segLen - opW / 2, rawPos))
                const clampedT = clampedPos / segLen
                const op: EditorOpening = {
                    id: uid(),
                    roomId: seg.id,
                    wall: 'north',
                    type: 'opening',
                    variant: tool,
                    position: parseFloat(clampedPos.toFixed(2)),
                    width: opW,
                    height:
                        tool === 'opening-archway'
                            ? Math.max(2.1, fp.roomHeight - 0.45)
                            : fp.roomHeight,
                    sillHeight: 0,
                    swingDirection: 'inward',
                    segmentNodeIds: [fromId, toId],
                    segmentT: clampedT,
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
                            : 'floor_lamp'
            const defaults = LIGHT_FIXTURE_DEFAULTS[lightType]

            if (lightType === 'wall_sconce') {
                // Wall-anchored — identical pattern to isWallDecorTool
                const room = hitRoom(wx, wz)
                if (room) {
                    const wallDir = getWallHit(room, wx, wz, 0.5)
                    if (!wallDir) return
                    const isH = wallDir === 'north' || wallDir === 'south'
                    const wallLen = isH ? room.width : room.depth
                    const rawPos = isH ? wx - room.x : wz - room.z
                    const clampedPos = Math.max(0.2, Math.min(wallLen - 0.2, rawPos))
                    const newLight: PlacedLight = {
                        id: uid(), type: lightType, roomId: room.id, wall: wallDir,
                        position: parseFloat(clampedPos.toFixed(2)),
                        heightOffset: defaults.heightOffset,
                        color: defaults.color, intensity: defaults.intensity,
                        castShadow: true, scale: 1,
                        facingInward: true, // Target 1: Added inward orientation default
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
                    const newLight: PlacedLight = {
                        id: uid(), type: lightType, roomId: seg.id,
                        position: parseFloat(clampedPos.toFixed(2)),
                        heightOffset: defaults.heightOffset,
                        color: defaults.color, intensity: defaults.intensity,
                        castShadow: true, scale: 1,
                        segmentNodeIds: [fromId, toId], segmentT: clampedT,
                        facingInward: true, // Target 2: Added inward orientation default
                    }
                    pushHistory()
                    setFp(prev => ({ ...prev, lights: [...(prev.lights ?? []), newLight] }))
                    setSelectedId(newLight.id)
                    return
                }
                return
            }

            // Ceiling / floor types — free placement, click anywhere inside a room or a closed shape interior
            const room = hitRoom(wx, wz)
            const shape = !room && typeof hitClosedShape === 'function' ? hitClosedShape(wx, wz) : null

            if (room || shape) {
                const heightOffset = lightType === 'ceiling_pendant' || lightType === 'ceiling_recessed'
                    ? Math.max(0.3, fp.roomHeight - 0.3)  // near ceiling, room-height-relative
                    : 0  // floor lamp sits at floor level
                const newLight: PlacedLight = {
                    id: uid(), type: lightType,
                    x: snapM(wx), z: snapM(wz),
                    heightOffset,
                    color: defaults.color, intensity: defaults.intensity,
                    castShadow: true, scale: 1,
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


    }, [evWorld, tool, hitRoom, hitLineNode, hitLineSegment, hitClosedShape, hitOpening, hitRoomWall, selectedId, pushHistory, selectedFurnitureType])

    // Module-level — was previously rebuilt as a fresh object literal on every
    // single mousemove event just to do one lookup. Static data belongs
    // outside the render/callback path; this is now allocated once per module
    // load instead of ~60-120 times per second while the mouse is moving.
    const DOOR_WINDOW_CURSOR = 'cell'
    const TOOL_CURSORS: Record<EditorTool, string> = {
        select: 'default',
        pan: 'grab',
        room: 'crosshair',
        pencil: 'crosshair',
        line: 'crosshair',
        bend: 'crosshair',
        'door-swing-single': DOOR_WINDOW_CURSOR,
        'door-swing-double': DOOR_WINDOW_CURSOR,
        'door-sliding': DOOR_WINDOW_CURSOR,
        'door-pocket': DOOR_WINDOW_CURSOR,
        'door-folding': DOOR_WINDOW_CURSOR,
        'door-garage': DOOR_WINDOW_CURSOR,
        'window-fixed': DOOR_WINDOW_CURSOR,
        'window-sliding': DOOR_WINDOW_CURSOR,
        'window-casement': DOOR_WINDOW_CURSOR,
        'window-bay': DOOR_WINDOW_CURSOR,
        'window-skylight': DOOR_WINDOW_CURSOR,
        'opening-archway': DOOR_WINDOW_CURSOR,
        'opening-passage': DOOR_WINDOW_CURSOR,
        'stairs-straight': 'crosshair',
        'stairs-l': 'crosshair',
        'stairs-u': 'crosshair',
        'stairs-spiral': 'crosshair',
        'stairs-ramp': 'crosshair',
        elevator: 'crosshair',
        delete: 'not-allowed',
        annotate: 'crosshair',
        furniture: 'copy',
        'wall-decor-led': DOOR_WINDOW_CURSOR,
        'wall-decor-pvc': DOOR_WINDOW_CURSOR,
        'wall-decor-painting': DOOR_WINDOW_CURSOR,
        'light-ceiling-pendant': 'default',
        'light-ceiling-recessed': 'default',
        'light-floor-lamp': 'default',
        'light-wall-sconce': 'default',
        'outdoor-crosswalk': 'crosshair',
        'outdoor-dustbin': 'crosshair',
        'outdoor-bench': 'crosshair',
        'outdoor-mailbox': 'crosshair',
        led_tv: 'default', // FIX — was "defaultt" (typo, invalid CSS cursor value)
    }

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const { wx, wz, cx, cy } = evWorld(e)

        // ── Cursor — direct DOM update to avoid re-render ──────────────────
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
            // FIX — was rebuilding a ~30-entry object literal here every call.
            // Now a single hoisted lookup.
            newCursor = TOOL_CURSORS[tool] ?? 'default'
        }
        if (canvasDivRef.current && canvasDivRef.current.style.cursor !== newCursor) {
            canvasDivRef.current.style.cursor = newCursor
        }

        // ── Actual movement handling ────────────────────────────────────────
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

        if (shapeResizeRef.current) {
            const { handle, startNodes, bbox } = shapeResizeRef.current
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
            return
        }

        if (wallDragRef.current) {
            const { roomId, wall, startRoom } = wallDragRef.current
            let newX = startRoom.x, newZ = startRoom.z, newW = startRoom.width, newD = startRoom.depth
            if (wall === 'east') newW = Math.max(MIN_ROOM, snapM(wx) - startRoom.x)
            if (wall === 'west') { newX = Math.min(snapM(wx), startRoom.x + startRoom.width - MIN_ROOM); newW = startRoom.x + startRoom.width - newX }
            if (wall === 'south') newD = Math.max(MIN_ROOM, snapM(wz) - startRoom.z)
            if (wall === 'north') { newZ = Math.min(snapM(wz), startRoom.z + startRoom.depth - MIN_ROOM); newD = startRoom.z + startRoom.depth - newZ }
            setFp(prev => ({ ...prev, rooms: prev.rooms.map(r => r.id === roomId ? { ...r, x: newX, z: newZ, width: newW, depth: newD } : r) }))
            return
        }

        if (lightDragRef?.current) {
            const drag = lightDragRef.current
            if (drag.isFree) {
                setFp(prev => ({
                    ...prev,
                    lights: (prev.lights ?? []).map(l =>
                        l.id === drag.id
                            ? { ...l, x: snapM(wx), z: snapM(wz) }
                            : l
                    )
                }))
                return
            }
        }

        if (resizeHandleRef.current) {
            const { handle, room } = resizeHandleRef.current
            let newX = room.x, newZ = room.z, newW = room.width, newD = room.depth
            if (handle.includes('e')) newW = Math.max(MIN_ROOM, snapM(wx) - room.x)
            if (handle.includes('w')) { newX = Math.min(snapM(wx), room.x + room.width - MIN_ROOM); newW = room.x + room.width - newX }
            if (handle.includes('s')) newD = Math.max(MIN_ROOM, snapM(wz) - room.z)
            if (handle.includes('n')) { newZ = Math.min(snapM(wz), room.z + room.depth - MIN_ROOM); newD = room.z + room.depth - newZ }
            setFp(prev => ({ ...prev, rooms: prev.rooms.map(r => r.id === room.id ? { ...r, x: newX, z: newZ, width: newW, depth: newD } : r) }))
            return
        }

        if (tool === 'pencil' && isPencilDrawing.current) {
            setPencilPoints(prev => {
                const last = prev[prev.length - 1]
                const sx = snapM(wx), sz = snapM(wz)
                if (last && (Math.abs(sx - last.x) > 0.01 || Math.abs(sz - last.z) > 0.01)) return [...prev, { x: sx, z: sz }]
                return prev
            })
            return
        }
        if (outdoorDragRef.current) {
            const od = outdoorDragRef.current
            setFp(prev => ({
                ...prev,
                outdoorObjects: (prev.outdoorObjects ?? []).map(o => o.id === od.id ? { ...o, x: snapM(wx - od.ox), z: snapM(wz - od.oz) } : o)
            }))
            return
        }
        if (midPan) {
            setPan({ x: midPan.px + cx - midPan.sx, y: midPan.py + cy - midPan.sy })
            return
        }

        if (furnitureDragRef.current) {
            const fd = furnitureDragRef.current
            setFp(prev => ({
                ...prev,
                furniture: (prev.furniture ?? []).map(f => f.id === fd.id ? { ...f, x: snapFurniture(wx - fd.ox), z: snapFurniture(wz - fd.oz) } : f),
                stairs: (prev.stairs ?? []).map(s => s.id === fd.id ? { ...s, x: snapFurniture(wx - fd.ox), z: snapFurniture(wz - fd.oz) } : s),
            }))
            return
        }

        if (wallDecorDragRef.current) {
            const wd = wallDecorDragRef.current
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
            return
        }

        if (dragRoomRef.current) {
            const dr = dragRoomRef.current
            const nx = snapM(wx - dr.ox)
            const nz = snapM(wz - dr.oz)
            if (dr.type === 'node') {
                setFp(prev => ({ ...prev, lineNodes: prev.lineNodes.map(n => n.id === dr.id ? { ...n, x: nx, z: nz } : n) }))
            } else {
                setFp(prev => ({ ...prev, rooms: prev.rooms.map(r => r.id === dr.id ? { ...r, x: nx, z: nz } : r) }))
            }
            return
        }

        if (segDragRef.current) {
            const sd = segDragRef.current
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
            return
        }

        // ── Whole closed-shape drag ──────────────────────────────────────────
        if (shapeDragRef.current) {
            const sd = shapeDragRef.current
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
            return
        }

        if (tool === 'line' || tool === 'bend') setPreview({ x: snapM(wx), z: snapM(wz) })
        if (isDrawingRef.current && drawStartRef.current) {
            const ds = drawStartRef.current
            const newRect = { x: ds.x, z: ds.z, w: snapM(wx) - ds.x, d: snapM(wz) - ds.z }
            drawRectRef.current = newRect
            setDrawRect(newRect)
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
        setHoverTooltip(prev => {
            if (!newHoverId) return prev === null ? prev : null
            const next = { text: labelForHover(newHoverId, fpRef.current), x: e.clientX, y: e.clientY }
            if (prev && prev.text === next.text && Math.abs(prev.x - next.x) < 2 && Math.abs(prev.y - next.y) < 2) {
                return prev
            }
            return next
        })

        if (lightDragRef.current) {
            const ld = lightDragRef.current
            if (ld.isFree) {
                setFp(prev => ({
                    ...prev,
                    lights: (prev.lights ?? []).map(l => l.id === ld.id ? { ...l, x: snapM(wx), z: snapM(wz) } : l)
                }))
            } else if (ld.wall && ld.roomId) {
                const room = fpRef.current.rooms.find(r => r.id === ld.roomId)
                if (room) {
                    const isH = ld.wall === 'north' || ld.wall === 'south'
                    const wallLen = isH ? room.width : room.depth
                    const rawPos = isH ? wx - room.x : wz - room.z
                    setFp(prev => ({
                        ...prev,
                        lights: (prev.lights ?? []).map(l => {
                            if (l.id !== ld.id) return l
                            const clamped = Math.max(0.2, Math.min(wallLen - 0.2, rawPos))
                            return { ...l, position: parseFloat(clamped.toFixed(2)) }
                        })
                    }))
                }
            } else if (ld.segmentNodeIds) {
                const a = fpRef.current.lineNodes.find(n => n.id === ld.segmentNodeIds![0])
                const b = fpRef.current.lineNodes.find(n => n.id === ld.segmentNodeIds![1])
                if (a && b) {
                    const dx = b.x - a.x, dz = b.z - a.z
                    const segLen = Math.hypot(dx, dz)
                    const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wz - a.z) * dz) / (segLen * segLen)))
                    setFp(prev => ({
                        ...prev,
                        lights: (prev.lights ?? []).map(l => l.id === ld.id ? { ...l, segmentT: t, position: t * segLen } : l)
                    }))
                }
            }
            return
        }

    }, [evWorld, midPan, tool, hitRoom, hitLineNode, hitLineSegment, hitClosedShape, hitOpening, hitRoomWall, hitWallDecor, scheduleRedraw])

    const handleMouseUp = useCallback(() => {
        isMouseDownRef.current = false

        // 1. ADD lightDragRef.current to the boolean check so dragging a light pushes to undo history!
        const hadDrag = Boolean(
            dragRoomRef.current ||
            segDragRef.current ||
            resizeHandleRef.current ||
            shapeDragRef.current ||
            wallDragRef.current ||
            lightDragRef.current // ← Added here
        )

        shapeResizeRef.current = null
        furnitureDragRef.current = null
        setMidPan(null)
        dragRoomRef.current = null
        spacePanRef.current = null
        panToolRef.current = null
        segDragRef.current = null
        shapeDragRef.current = null
        wallDecorDragRef.current = null
        resizeHandleRef.current = null
        wallDragRef.current = null   // ← Cleared so cursor doesn't stick
        outdoorDragRef.current = null
        // 2. CLEAR lightDragRef.current here so dragging stops immediately on release
        if (lightDragRef) (lightDragRef as any).current = null // ← Added here

        if (hadDrag) pushHistory()

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
            // Use currentRect if dragged, else fall back to the start point with zero size (won't pass MIN_ROOM check)
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
        if (!selectedId) return
        const currentFp = fpRef.current

        // Room
        const room = currentFp.rooms.find(r => r.id === selectedId)
        if (room) {
            const result = duplicateRoom(currentFp, sceneConfig, room.id, room.width + 0.5, 0)
            if (!result) return
            setFp(result.fp)
            setSceneConfig(result.sceneConfig)
            setSelectedId(result.newRoomId)
            pushHistory()
            return
        }

        // Furniture
        const furniture = (currentFp.furniture ?? []).find(f => f.id === selectedId)
        if (furniture) {
            const result = duplicateFurniture(currentFp, furniture.id)
            if (!result) return
            setFp(result.fp)
            setSelectedId(result.newId)
            pushHistory()
            return
        }

        // Stairs / elevator
        const stairs = (currentFp.stairs ?? []).find(s => s.id === selectedId)
        if (stairs) {
            const result = duplicateStairs(currentFp, stairs.id)
            if (!result) return
            setFp(result.fp)
            setSelectedId(result.newId)
            pushHistory()
            return
        }

        // Outdoor object
        const outdoorObj = (currentFp.outdoorObjects ?? []).find(o => o.id === selectedId)
        if (outdoorObj) {
            const result = duplicateOutdoorObject(currentFp, outdoorObj.id)
            if (!result) return
            setFp(result.fp)
            setSelectedId(result.newId)
            pushHistory()
            return
        }

        // Wall decor
        const wallDecor = (currentFp.wallDecor ?? []).find(d => d.id === selectedId)
        if (wallDecor) {
            const result = duplicateWallDecor(currentFp, wallDecor.id)
            if (!result) return
            setFp(result.fp)
            setSelectedId(result.newId)
            pushHistory()
            return
        }

        // Opening (door / window / archway)
        const opening = currentFp.openings.find(o => o.id === selectedId)
        if (opening) {
            const result = duplicateOpening(currentFp, opening.id)
            if (!result) return
            setFp(result.fp)
            setSelectedId(result.newId)
            pushHistory()
            return
        }
        const shapeId = selectedId
        const result = duplicateClosedShape(currentFp, sceneConfig, shapeId, 1.0, 0)
        if (result) {
            setFp(result.fp)
            setSceneConfig(result.sceneConfig)
            setSelectedId(result.newRoomId)
            pushHistory()
        }
    }, [selectedId, sceneConfig, pushHistory])

    const handleMirrorSelected = useCallback((axis: MirrorAxis) => {
        if (!selectedId) return
        const room = fpRef.current.rooms.find(r => r.id === selectedId)
        if (!room) return // mirror is currently rect-room only — see PropsPanel patch, button only shown for room selection
        setFp(prev => mirrorRoom(prev, room.id, axis))
        pushHistory()
    }, [selectedId, pushHistory])

    // Native wheel handler
    useEffect(() => {
        const el = canvasDivRef.current
        if (!el) return
        const handler = (e: WheelEvent) => {
            if ((e.target as HTMLElement).closest('[data-panel="right-sidebar"]')) return
            e.preventDefault(); e.stopPropagation()
            const factor = e.deltaY < 0 ? 1.12 : 0.9
            const newZoom = Math.max(0.2, Math.min(5, zoomRef.current * factor))
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

    const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), [])

    return (
        <div
            ref={editorRef}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: THEME.bg, fontFamily: 'system-ui, sans-serif', color: THEME.text, overflow: 'hidden', maxHeight: '100vh', maxWidth: '100vw' }}
        >
            {/* ── Top bar ────────────────────────────────────────────────────── */}
            <WorkspaceNav
                fp={fp}
                isFullscreen={isFullscreen}
                sceneConfig={sceneConfig}
                setFp={setFp}
                setSelectedId={setSelectedId}
                setZoom={setZoom}
                toggleFullscreen={toggleFullscreen}
                zoom={zoom}
                isSaved={isSaved}
                isSaving={isSaving}
                key={1}
                onClose={onClose}
                onSave={onSave}
                projectId={projectId}
            />
            {/* ── Body ─────────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* ── Left tool panel ────────────────────────────────── */}
                <div
                    style={{
                        width: 68, flexShrink: 0,
                        background: THEME.bgPanel,
                        borderRight: `1px solid ${THEME.border}`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', padding: '10px 0', gap: 4,
                        overflowY: 'auto',
                    }}
                >
                    <Toolbar
                        tool={tool}
                        setTool={setTool}
                        registerAnchor={(groupId, el) => { groupAnchorsRef.current[groupId] = el }}
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
                                width: 260,
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
                            <div style={{ padding: '6px 8px' }}>
                                <ScrollableList maxHeight={300}>
                                    {FURNITURE_CATEGORIES.map(cat => {
                                        const isOpen = openFurnitureCats.has(cat.id)
                                        return (
                                            <div key={cat.id}>
                                                <button
                                                    onClick={() => setOpenFurnitureCats(prev => {
                                                        const next = new Set(prev)
                                                        next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id)
                                                        return next
                                                    })}
                                                    style={{
                                                        width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                                                        padding: '8px 4px', background: 'transparent', border: 'none',
                                                        cursor: 'pointer', textAlign: 'left',
                                                    }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={THEME.textMuted} strokeWidth="2.5"
                                                        style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 120ms', flexShrink: 0 }}>
                                                        <polyline points="9 18 15 12 9 6" />
                                                    </svg>
                                                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: THEME.text }}>{cat.label}</span>
                                                    <span style={{ fontSize: 11, color: THEME.textFaint }}>{cat.items.length}</span>
                                                </button>
                                                {isOpen && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 22 }}>
                                                        {cat.items.map(id => {
                                                            const catalogEntry = FURNITURE_CATALOG.find(c => c.type === id)
                                                            const isNew = catalogEntry ? isFurnitureNew(catalogEntry) : false
                                                            return (
                                                                <button
                                                                    key={id}
                                                                    onClick={() => setSelectedFurnitureType(id)}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                                        padding: '7px 8px', borderRadius: 6, border: 'none',
                                                                        background: selectedFurnitureType === id ? 'rgba(99,102,241,0.1)' : 'transparent',
                                                                        color: selectedFurnitureType === id ? THEME.accent : THEME.text,
                                                                        fontSize: 12, fontWeight: selectedFurnitureType === id ? 600 : 400,
                                                                        cursor: 'pointer', textAlign: 'left', width: '100%',
                                                                    }}
                                                                >
                                                                    <span style={{ flex: 1 }}>{FURNITURE_LABELS[id]}</span>
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
                                </ScrollableList>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>

                {/* 2D canvas */}
                <div ref={canvasDivRef} style={{ cursor: canvasCursor, flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', alignSelf: 'stretch', background: THEME.bgCanvas }}>
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

                    {/* Shortcut legend */}
                    <div style={{ position: 'absolute', top: 12, right: 12, background: THEME.bgPanel, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 10, color: THEME.textMuted, lineHeight: 1.9, boxShadow: THEME.shadow }}>
                        {[['V', 'Select'], ['R', 'Room'], ['L', 'Line Wall'], ['B', 'Bend Wall'], ['D', 'Door'], ['N', 'Window'], ['⌫', 'Delete'], ['⌘Z', 'Undo'], ['ESC', 'Cancel'], ['Scroll', 'Zoom'], ['Mid drag', 'Pan'], ['Space+drag', 'Pan']].map(([k, l]) => (
                            <div key={k}><kbd style={{ background: '#F0F0EE', border: `1px solid ${THEME.borderStrong}`, borderRadius: 3, padding: '0 3px', fontFamily: 'monospace', marginRight: 4, color: THEME.text }}>{k}</kbd>{l}</div>
                        ))}
                    </div>

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
                <div style={{ width: rightPanelOpen ? '46%' : 30, flexShrink: 0, display: 'flex', transition: 'width 200ms ease', overflow: 'hidden' }}>

                    <button
                        ref={chevronRef}
                        onClick={() => setRightPanelOpen(o => !o)}
                        style={{
                            width: 30, flexShrink: 0, border: 'none', borderLeft: `1px solid ${THEME.border}`,
                            background: THEME.bgPanel, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title={rightPanelOpen ? 'Collapse panel' : 'Expand panel'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={THEME.textMuted} strokeWidth="2" style={{ transform: rightPanelOpen ? 'none' : 'rotate(180deg)' }}>
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    {rightPanelOpen && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: THEME.bgPanel, minWidth: 0 }}>
                            {/* 3D viewport */}
                            <div style={{ flex: 1, position: 'relative', minHeight: 0, background: '#EFEFEC' }}>
                                <div style={{ position: 'absolute', top: 10, left: 12, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: THEME.textMuted }}>3D PREVIEW</span>
                                    <button
                                        onClick={() => setWalkMode(w => !w)}
                                        disabled={interactiveMode}
                                        style={{
                                            height: 26, padding: '0 10px', borderRadius: 6,
                                            border: walkMode ? '1px solid rgba(16,185,129,0.5)' : `1px solid ${THEME.borderStrong}`,
                                            background: walkMode ? 'rgba(16,185,129,0.12)' : THEME.bgPanel,
                                            color: walkMode ? '#059669' : THEME.textMuted,
                                            fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 4, transition: 'all 150ms',
                                            boxShadow: THEME.shadow,
                                        }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        {walkMode ? 'Exit Walk' : 'Walk Mode'}
                                    </button>
                                    <button
                                        onClick={handleToggleInteractive}
                                        style={{
                                            height: 26, padding: '0 10px', borderRadius: 6,
                                            border: interactiveMode ? '1px solid rgba(99,102,241,0.5)' : `1px solid ${THEME.borderStrong}`,
                                            background: interactiveMode ? 'rgba(99,102,241,0.12)' : THEME.bgPanel,
                                            color: interactiveMode ? THEME.accent : THEME.textMuted,
                                            fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 4, transition: 'all 150ms',
                                            boxShadow: THEME.shadow,
                                        }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                        </svg>
                                        {interactiveMode ? 'Interactive: On' : 'Interactive: Off'}
                                    </button>
                                    {
                                        scene3DRef && onSave !== undefined &&
                                        <CameraViewPicker
                                            fp={fp}
                                            setFp={setFp}
                                            sceneConfig={sceneConfig}
                                            pushHistory={pushHistory}
                                            scene3DRef={scene3DRef}
                                            onSave={onSave}
                                        />
                                    }
                                </div>

                                {/* {walkMode && (
                                    <div style={{
                                        position: 'absolute', top: 44, left: 12, zIndex: 5,
                                        background: THEME.bgPanel, border: '1px solid rgba(16,185,129,0.3)',
                                        borderRadius: 8, padding: '8px 12px', fontSize: 10,
                                        color: '#059669', lineHeight: 1.8, boxShadow: THEME.shadowLg,
                                    }}>
                                        <div style={{ fontWeight: 700, marginBottom: 2 }}> WALK MODE</div>
                                        <div>Click canvas to lock cursor</div>
                                        <div><kbd style={{ background: '#F0F0EE', border: `1px solid ${THEME.borderStrong}`, borderRadius: 3, padding: '0 3px', fontFamily: 'monospace' }}>W A S D</kbd> Move</div>
                                        <div><kbd style={{ background: '#F0F0EE', border: `1px solid ${THEME.borderStrong}`, borderRadius: 3, padding: '0 3px', fontFamily: 'monospace' }}>Mouse</kbd> Look around</div>
                                        <div><kbd style={{ background: '#F0F0EE', border: `1px solid ${THEME.borderStrong}`, borderRadius: 3, padding: '0 3px', fontFamily: 'monospace' }}>ESC</kbd> Unlock cursor</div>
                                    </div>
                                )} */}

                                {/* <SceneErrorBoundary fallback={null} > */}
                                {/* <Suspense fallback={null} > */}
                                <ResilientCanvas
                                    shadows
                                    gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true }}
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
                                        fp={fp}
                                        sceneConfig={sceneConfig}
                                        walkMode={walkMode}
                                        interactiveMode={interactiveMode}
                                        selectedId={selectedId}
                                        onSelect={handleSceneSelect}
                                        onToggleDoorOpen={(openingId) =>
                                            setFp(prev => ({
                                                ...prev,
                                                openings: prev.openings.map(o => o.id === openingId ? { ...o, isOpen: !o.isOpen } : o)
                                            }))
                                        }
                                    />
                                    {/* <CameraOrientationReporter gizmoApiRef={gizmoApiRef} /> */}
                                </ResilientCanvas>

                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* <Dock
                items={[
                    {
                        id: 'properties', label: 'Properties', onClick: () => setRightTab('properties'), icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                            </svg>
                        )
                    },
                    {
                        id: 'scene', label: 'Scene', onClick: () => setRightTab('scene'), icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16v16H4zM4 12h16M12 4v16" />
                            </svg>
                        )
                    }
                ]}
                activeId={rightTab}
                expanded={sheetOpen}
                onExpandedChange={setSheetOpen}

            > */}
            {/* <div style={{ display: 'flex', gap: 2, padding: 10, borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
                    {(['properties', 'scene'] as const).map(t => (
                        <button key={t} onClick={() => setRightTab(t)} style={{
                            height: 26, padding: '0 10px', borderRadius: 5, border: 'none', flex: 1,
                            background: rightTab === t ? THEME.accent : 'transparent',
                            color: rightTab === t ? 'white' : THEME.textMuted,
                            fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
                        }}>
                            {t === 'properties' ? 'PROPERTIES' : "SCENE"}
                        </button>
                    ))}
                </div> */}
            {/* </Dock> */}
            <FloatingDock
                activeId={sheetOpen ? rightTab : null}
                items={[
                    {
                        id: 'properties',
                        title: 'Properties',
                        icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                            </svg>
                        ),
                        onClick: () => {
                            if (sheetOpen && rightTab === 'properties') {
                                setSheetOpen(false)
                            } else {
                                setRightTab('properties')
                                setSheetOpen(true)
                            }
                        },
                    },
                    {
                        id: 'scene',
                        title: 'Scene',
                        icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16v16H4zM4 12h16M12 4v16" />
                            </svg>
                        ),
                        onClick: () => {
                            if (sheetOpen && rightTab === 'scene') {
                                setSheetOpen(false)
                            } else {
                                setRightTab('scene')
                                setSheetOpen(true)
                            }
                        },
                    },
                ]}
            />

            {sheetOpen && rightTab === 'properties' && (
                <div
                    data-panel="right-sidebar"
                    style={{
                        position: 'absolute',
                        top: '50%',
                        right: 12,
                        transform: 'translateY(-50%)',
                        height: '80vh',
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
                            <SceneGraphPanel fp={fp} selectedId={selectedId} onSelect={setSelectedId} />
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
                                        const isFurniture = (prev.furniture ?? []).some(f => f.id === selectedId)
                                        const isStairs = (prev.stairs ?? []).some(st => st.id === selectedId)
                                        const isAnn = (prev.annotations ?? []).some(a => a.id === selectedId)
                                        const isWallDecor = (prev.wallDecor ?? []).some(d => d.id === selectedId)
                                        if (isWallDecor) return { ...prev, wallDecor: (prev.wallDecor ?? []).filter(d => d.id !== selectedId) }

                                        if (isRoom) return { ...prev, rooms: prev.rooms.filter(r => r.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                                        if (isNode) return { ...prev, lineNodes: prev.lineNodes.filter(n => n.id !== selectedId), lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(selectedId)) }
                                        if (isSeg) return { ...prev, lineSegments: prev.lineSegments.filter(s => s.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                                        if (isShape) return { ...prev, closedShapes: (prev.closedShapes ?? []).filter(sh => sh.id !== selectedId) }
                                        if (isFurniture) return { ...prev, furniture: (prev.furniture ?? []).filter(f => f.id !== selectedId) }
                                        if (isStairs) return { ...prev, stairs: (prev.stairs ?? []).filter(st => st.id !== selectedId) }
                                        if (isAnn) return { ...prev, annotations: (prev.annotations ?? []).filter(a => a.id !== selectedId) }
                                        return { ...prev, openings: prev.openings.filter(o => o.id !== selectedId) }
                                    })
                                    setSelectedId(null)
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

            {sheetOpen && rightTab === 'scene' && (


                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        right: 12,
                        transform: 'translateY(-50%)',
                        height: '80vh',
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
                        <MaterialsPanel fp={fp} config={sceneConfig} onChange={setSceneConfig} onChangeFp={setFp} />

                    </div>
                </div>

            )}
        </div>
    )
}


