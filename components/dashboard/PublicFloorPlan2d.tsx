// components/workspace/PublicFloorPlan2D.tsx
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { FloorPlanState, LineNode } from '../workspace/lib/constants'
import { draw2D } from '../workspace/2dDraw'

// TODO: import the real constant instead of hardcoding — flagged in the
// original file too. Check lib/constants.ts for PX_PER_M or similar.
const PX_PER_M = 50

export function PublicFloorPlan2D({ fp }: { fp: FloorPlanState }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // User-driven pan/zoom, applied ON TOP of the computed fit baseline —
    // NOT the fit baseline itself. zoom is a multiplier (1 = fit exactly),
    // pan is an additional pixel offset.
    const [userZoom, setUserZoom] = useState(1)
    const [userPan, setUserPan] = useState({ x: 0, y: 0 })
    // Refs mirror the state above so the wheel handler (attached natively,
    // see below) always reads the latest values synchronously — no stale
    // closures, no relying on nested functional setState updaters.
    const userZoomRef = useRef(userZoom)
    const userPanRef = useRef(userPan)
    useEffect(() => { userZoomRef.current = userZoom }, [userZoom])
    useEffect(() => { userPanRef.current = userPan }, [userPan])
    const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)

    // Fit baseline — computed once per fp/resize, NOT per interaction.
    // Stored in a ref (not state) since it's an input to drawing, not
    // something that itself needs to trigger a re-render.
    const fitRef = useRef({ zoom: 1, pan: { x: 40, y: 40 } })

    // ── Precomputed lookup structures, built once per `fp` change ──────────
    const nodesById = useMemo(
        () => new Map<string, LineNode>((fp.lineNodes ?? []).map(n => [n.id, n])),
        [fp.lineNodes]
    )

    const roomsById = useMemo(
        () => new Map(fp.rooms.map(r => [r.id, r])),
        [fp.rooms]
    )

    const shapesIndex = useMemo(() => {
        const map = new Map<string, NonNullable<FloorPlanState['closedShapes']>[number]>()
        for (const shape of fp.closedShapes ?? []) {
            map.set([...shape.nodeIds].sort().join(','), shape)
        }
        return map
    }, [fp.closedShapes])

    const closedPolygons = useMemo(
        () => (fp.closedShapes ?? []).map(s => s.nodeIds),
        [fp.closedShapes]
    )

    const openingsByRoom = useMemo(() => {
        const map = new Map<string, FloorPlanState['openings']>()
        for (const op of fp.openings ?? []) {
            if (op.segmentNodeIds || !op.roomId) continue
            const list = map.get(op.roomId) ?? []
            list.push(op)
            map.set(op.roomId, list)
        }
        return map
    }, [fp.openings])

    const openingsBySegment = useMemo(() => {
        const map = new Map<string, FloorPlanState['openings']>()
        const lineOpenings = (fp.openings ?? []).filter(op => op.segmentNodeIds)

        for (const seg of fp.lineSegments ?? []) {
            const matches: FloorPlanState['openings'] = []
            for (let i = 0; i < seg.nodeIds.length - 1; i++) {
                const a = seg.nodeIds[i]
                const b = seg.nodeIds[i + 1]
                for (const op of lineOpenings) {
                    const [oa, ob] = op.segmentNodeIds!
                    const isMatch = (oa === a && ob === b) || (oa === b && ob === a)
                    if (isMatch) matches.push(op)
                }
            }
            if (matches.length) map.set(seg.id, matches)
        }
        return map
    }, [fp.openings, fp.lineSegments])

    const redraw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const fit = fitRef.current
        const effectiveZoom = fit.zoom * userZoom
        const effectivePan = {
            x: fit.pan.x + userPan.x,
            y: fit.pan.y + userPan.y,
        }

        draw2D(
            ctx,
            fp,
            'select',            // tool — inert, no click handler maps to it
            null,                 // selectedId
            [],                   // selectedIds
            null,                 // hoveredId
            null,                 // drawRect
            [],                   // pencilPoints
            effectiveZoom,
            effectivePan,
            null,                 // preview
            null,                 // activeLineNodeId
            new Set<string>(),    // overlappingIds
            closedPolygons,
            openingsByRoom,
            openingsBySegment,
            shapesIndex,
            null,                 // marqueeRect
            nodesById,
            roomsById,
        )
    }, [fp, userZoom, userPan, closedPolygons, openingsByRoom, openingsBySegment, shapesIndex, nodesById, roomsById])

    // ── Zoom toward the cursor, native wheel listener ───────────────────────
    // IMPORTANT: this is intentionally a native addEventListener with
    // { passive: false }, NOT React's onWheel. React attaches onWheel as a
    // passive listener, which means e.preventDefault() silently no-ops —
    // the browser's native scroll/zoom then fights with the pan/zoom math
    // below and produces exactly the "drifting off-center" symptom. Fix:
    // attach natively so preventDefault actually takes effect.
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const handler = (e: WheelEvent) => {
            e.preventDefault()
            e.stopPropagation()

            const rect = canvas.getBoundingClientRect()
            const cursorX = e.clientX - rect.left
            const cursorY = e.clientY - rect.top

            const fit = fitRef.current
            const factor = e.deltaY < 0 ? 1.12 : 0.9
            const newZoom = Math.max(0.2, Math.min(5, userZoomRef.current * factor))

            const oldEffectiveZoom = fit.zoom * userZoomRef.current
            const newEffectiveZoom = fit.zoom * newZoom
            const oldEffectivePan = {
                x: fit.pan.x + userPanRef.current.x,
                y: fit.pan.y + userPanRef.current.y,
            }

            // World point currently under the cursor, at the OLD zoom/pan.
            const worldX = (cursorX - oldEffectivePan.x) / (PX_PER_M * oldEffectiveZoom)
            const worldZ = (cursorY - oldEffectivePan.y) / (PX_PER_M * oldEffectiveZoom)

            // Solve pan so that same world point stays under the cursor at
            // the NEW zoom level.
            const newEffectivePan = {
                x: cursorX - worldX * PX_PER_M * newEffectiveZoom,
                y: cursorY - worldZ * PX_PER_M * newEffectiveZoom,
            }
            const newUserPan = {
                x: newEffectivePan.x - fit.pan.x,
                y: newEffectivePan.y - fit.pan.y,
            }

            userZoomRef.current = newZoom
            userPanRef.current = newUserPan
            setUserZoom(newZoom)
            setUserPan(newUserPan)
        }

        canvas.addEventListener('wheel', handler, { passive: false })
        return () => canvas.removeEventListener('wheel', handler)
    }, [])

    // Pan/zoom are camera controls, not editing — no entity can be
    // selected, moved, or modified through this canvas. No click handler
    // exists that performs hit-testing against fp's entities.
    const handleMouseDown = (e: React.MouseEvent) => {
        dragRef.current = { sx: e.clientX, sy: e.clientY, px: userPan.x, py: userPan.y }
    }
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragRef.current) return
        const d = dragRef.current
        setUserPan({ x: d.px + e.clientX - d.sx, y: d.py + e.clientY - d.sy })
    }
    const handleMouseUp = () => { dragRef.current = null }

    // Recompute fit baseline + resize canvas — on mount, on fp change,
    // and on container resize. Does NOT depend on userZoom/userPan, so
    // interacting with the view never resets the fit.
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const computeFitAndResize = () => {
            canvas.width = container.offsetWidth
            canvas.height = container.offsetHeight

            const allX = [
                ...fp.rooms.flatMap(r => [r.x, r.x + r.width]),
                ...fp.lineNodes.map(n => n.x),
            ]
            const allZ = [
                ...fp.rooms.flatMap(r => [r.z, r.z + r.depth]),
                ...fp.lineNodes.map(n => n.z),
            ]
            if (allX.length === 0) {
                redraw()
                return
            }

            const minX = Math.min(...allX), maxX = Math.max(...allX)
            const minZ = Math.min(...allZ), maxZ = Math.max(...allZ)
            const spanX = maxX - minX || 1
            const spanZ = maxZ - minZ || 1
            const padding = 40
            const scaleX = (canvas.width - padding * 2) / spanX
            const scaleZ = (canvas.height - padding * 2) / spanZ
            const fitZoom = Math.min(scaleX, scaleZ) / PX_PER_M

            // Actual rendered size of the content at fitZoom, in px.
            const contentWidth = spanX * PX_PER_M * fitZoom
            const contentHeight = spanZ * PX_PER_M * fitZoom

            // Center whatever space is left over on the non-binding axis,
            // instead of anchoring everything to the top-left + padding.
            const offsetX = (canvas.width - contentWidth) / 2
            const offsetY = (canvas.height - contentHeight) / 2

            fitRef.current = {
                zoom: fitZoom,
                pan: {
                    x: offsetX - minX * PX_PER_M * fitZoom,
                    y: offsetY - minZ * PX_PER_M * fitZoom,
                },
            }

            redraw()
        }

        computeFitAndResize()
        const ro = new ResizeObserver(computeFitAndResize)
        ro.observe(container)
        return () => ro.disconnect()
    }, [fp, redraw])

    // Redraw whenever the user actually pans/zooms.
    useEffect(() => {
        redraw()
    }, [redraw])

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#FAFAF8' }}>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
                style={{
                    width: '100%', height: '100%', display: 'block',
                    cursor: dragRef.current ? 'grabbing' : 'grab',
                    touchAction: 'none', overscrollBehavior: 'contain',
                }} />
        </div>
    )
}