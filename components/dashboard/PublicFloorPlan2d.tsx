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
    const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)

    // Fit baseline — computed once per fp/resize, NOT per interaction.
    // Stored in a ref (not state) since it's an input to drawing, not
    // something that itself needs to trigger a re-render.
    const fitRef = useRef({ zoom: 1, pan: { x: 40, y: 40 } })

    // ── Precomputed lookup structures, built once per `fp` change ──────────
    // Read-only viewer never mutates fp, so these can be plain useMemo
    // (unlike the live editor's scheduleRedraw, which has to worry about
    // recomputing mid-drag) — but the SHAPES/GROUPING must match draw2D's
    // actual consumption exactly, or entities silently vanish with no error.

    const nodesById = useMemo(
        () => new Map<string, LineNode>((fp.lineNodes ?? []).map(n => [n.id, n])),
        [fp.lineNodes]
    )

    const roomsById = useMemo(
        () => new Map(fp.rooms.map(r => [r.id, r])),
        [fp.rooms]
    )

    // shapesIndex is keyed by the SORTED, COMMA-JOINED nodeIds string —
    // this matches exactly how draw2D looks it up (`[...nodeIds].sort().join(',')`),
    // NOT by shape.id. Getting this key format wrong means every shape
    // lookup silently misses and labels fall back to "Area" with no error.
    const shapesIndex = useMemo(() => {
        const map = new Map<string, NonNullable<FloorPlanState['closedShapes']>[number]>()
        for (const shape of fp.closedShapes ?? []) {
            map.set([...shape.nodeIds].sort().join(','), shape)
        }
        return map
    }, [fp.closedShapes])

    // closedPolygons: draw2D just needs an array of node-id loops to render.
    // Using fp.closedShapes' own nodeIds directly (rather than re-deriving
    // via graph-cycle detection) guarantees every polygon drawn has a real
    // shapesIndex match — correct for a static published plan, where we're
    // only ever rendering shapes that already exist, not detecting new ones
    // from raw line-segment topology.
    const closedPolygons = useMemo(
        () => (fp.closedShapes ?? []).map(s => s.nodeIds),
        [fp.closedShapes]
    )

    // openingsByRoom: room-wall openings only (no segmentNodeIds), grouped
    // by roomId — mirrors the exact filter the old inline call used
    // (`o.roomId === room.id && !o.segmentNodeIds`).
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

    // openingsBySegment: line-wall openings, grouped by which segment's
    // node-pair they sit on. An opening's segmentNodeIds is a single node
    // pair; a segment can have multiple consecutive node pairs along its
    // polyline, so match against EVERY consecutive pair in each segment,
    // not just the first two nodes.
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

        // Read-only: selection/hover/drag/marquee state is permanently
        // null/empty here, regardless of any interaction on this canvas.
        // Only pan/zoom (camera) is user-driven — nothing in this call can
        // ever cause draw2D to render a selected/hovered/edited state.
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

    // Pan/zoom are camera controls, not editing — no entity can be
    // selected, moved, or modified through this canvas. No click handler
    // exists that performs hit-testing against fp's entities.
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const factor = e.deltaY < 0 ? 1.1 : 0.9
        setUserZoom(z => Math.max(0.2, Math.min(5, z * factor)))
    }
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

            fitRef.current = {
                zoom: fitZoom,
                pan: {
                    x: padding - minX * PX_PER_M * fitZoom,
                    y: padding - minZ * PX_PER_M * fitZoom,
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
                onWheel={handleWheel}
                onMouseMove={handleMouseMove}
                style={{ width: '100%', height: '100%', display: 'block', cursor: dragRef.current ? 'grabbing' : 'grab' }} />
        </div>
    )
}