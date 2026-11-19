import type { FloorPlanState } from './constants'
import { PX_PER_M } from './constants'

export function drawAlignmentGuides(ctx: CanvasRenderingContext2D, fp: FloorPlanState, selectedId: string | null, pan: { x: number; y: number }, zoom: number) {
    const selected = fp.rooms.find(room => room.id === selectedId)
    if (!selected) return
    const scale = PX_PER_M * zoom
    const xs = [selected.x, selected.x + selected.width / 2, selected.x + selected.width]
    const zs = [selected.z, selected.z + selected.depth / 2, selected.z + selected.depth]
    const guidesX = new Set<number>(), guidesZ = new Set<number>()
    for (const room of fp.rooms) {
        if (room.id === selectedId) continue
        for (const x of [room.x, room.x + room.width / 2, room.x + room.width]) {
            if (xs.some(value => Math.abs(value - x) * scale <= 4)) guidesX.add(x)
        }
        for (const z of [room.z, room.z + room.depth / 2, room.z + room.depth]) {
            if (zs.some(value => Math.abs(value - z) * scale <= 4)) guidesZ.add(z)
        }
    }
    ctx.save()
    ctx.strokeStyle = '#0891b2'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 4])
    for (const x of guidesX) {
        const px = pan.x + x * scale
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, ctx.canvas.height); ctx.stroke()
    }
    for (const z of guidesZ) {
        const py = pan.y + z * scale
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(ctx.canvas.width, py); ctx.stroke()
    }
    ctx.restore()
}
