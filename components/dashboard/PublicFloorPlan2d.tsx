// components/workspace/PublicFloorPlan2D.tsx
import { useEffect, useRef, useState } from 'react'
import { FloorPlanState } from '../workspace/Tools/constants'
import { draw2D } from '../workspace/2dDraw'

export function PublicFloorPlan2D({ fp }: { fp: FloorPlanState }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 40, y: 40 })
    const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const factor = e.deltaY < 0 ? 1.1 : 0.9
        setZoom(z => Math.max(0.2, Math.min(5, z * factor)))
    }
    const handleMouseDown = (e: React.MouseEvent) => {
        dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }
    }
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragRef.current) return
        const d = dragRef.current
        setPan({ x: d.px + e.clientX - d.sx, y: d.py + e.clientY - d.sy })
    }
    const handleMouseUp = () => { dragRef.current = null }

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resizeAndDraw = () => {
            canvas.width = container.offsetWidth
            canvas.height = container.offsetHeight

            // Auto-fit: compute bounds of everything in fp, center + scale to fill canvas
            const allX = [
                ...fp.rooms.flatMap(r => [r.x, r.x + r.width]),
                ...fp.lineNodes.map(n => n.x),
            ]
            const allZ = [
                ...fp.rooms.flatMap(r => [r.z, r.z + r.depth]),
                ...fp.lineNodes.map(n => n.z),
            ]
            if (allX.length === 0) return

            const minX = Math.min(...allX), maxX = Math.max(...allX)
            const minZ = Math.min(...allZ), maxZ = Math.max(...allZ)
            const spanX = maxX - minX || 1
            const spanZ = maxZ - minZ || 1
            const padding = 40
            const scaleX = (canvas.width - padding * 2) / spanX
            const scaleZ = (canvas.height - padding * 2) / spanZ
            const zoom = Math.min(scaleX, scaleZ) / 50 // 50 = PX_PER_M in your constants — import it instead of hardcoding if possible
            const pan = {
                x: padding - minX * 50 * zoom,
                y: padding - minZ * 50 * zoom,
            }

            draw2D(
                ctx, fp,
                'select',      // tool — inert, no draw-in-progress behavior
                null,          // selectedId — nothing selected
                null,          // hoveredId — no hover in a static render
                null,          // drawRect — no in-progress room draw
                [],            // pencilPoints — no in-progress pencil stroke
                zoom, pan,
                null,          // preview — no live line/bend rubber-band
                null,          // activeLineNodeId
            )
        }

        resizeAndDraw()
        const ro = new ResizeObserver(resizeAndDraw)
        ro.observe(container)
        return () => ro.disconnect()
    }, [fp])

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#FAFAF8' }}>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onMouseMove={handleMouseMove}
                style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    )
}