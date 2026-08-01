import { getSegmentOpeningWorldPos, toCanvas } from "@/lib/helpers";
import { EditorTool, FloorPlanState, FURNITURE_COLORS, FURNITURE_LABELS, LineNode, MIN_ROOM, PX_PER_M, STAIRS_LABELS, WALL_DECOR_LABELS } from "./lib/constants";
import { LIGHT_FIXTURE_LABELS, LIGHT_PLACEMENT_KIND } from "./lights-constant";
import { OUTDOOR_FLAT_TYPES, OUTDOOR_OBJECT_FOOTPRINTS, OUTDOOR_OBJECT_LABELS } from "./lib/outdoor-constants";
import { FURNITURE_FOOTPRINTS } from "./lib/furniture-constants";

const labelWidthCache = new Map<string, number>()
// Hard cap so a long drawing/dragging session can't leak memory — every
// unique "7.52m" / "7.53m" / ... string minted while dragging would
// otherwise sit in this map forever.
const LABEL_CACHE_MAX = 500

function measureCached(ctx: CanvasRenderingContext2D, text: string, font: string): number {
    const key = font + '|' + text
    let w = labelWidthCache.get(key)
    if (w === undefined) {
        ctx.font = font
        w = ctx.measureText(text).width
        // Once we hit the cap, evict the oldest (least-recently-used) entry.
        // Map preserves insertion order, and re-inserting on hit (below)
        // keeps hot entries fresh, so `.keys().next()` is a true LRU victim.
        if (labelWidthCache.size >= LABEL_CACHE_MAX) {
            const oldestKey = labelWidthCache.keys().next().value
            if (oldestKey !== undefined) labelWidthCache.delete(oldestKey)
        }
        labelWidthCache.set(key, w)
    } else {
        // Refresh recency so frequently-hit labels survive eviction.
        labelWidthCache.delete(key)
        labelWidthCache.set(key, w)
    }
    return w
}

// Quantizes a live-dragged length to 1cm precision before it's turned into
// a label string. This is what keeps the rubber-band / room-draw preview
// smooth: nearby cursor positions during a drag collapse onto the same
// cache key instead of minting a brand-new string (and cache entry) on
// every single mousemove frame. It does NOT delay or throttle the redraw
// itself — the line still tracks the cursor every frame — it just avoids
// re-measuring text and growing the cache for sub-cm jitter the eye can't
// perceive anyway.
function quantizeMeters(m: number, precision = 100): number {
    return Math.round(m * precision) / precision
}

export function draw2D(
    ctx: CanvasRenderingContext2D,
    fp: FloorPlanState,
    tool: EditorTool,
    selectedId: string | null,
    selectedIds: string[],
    hoveredId: string | null,
    drawRect: { x: number; z: number; w: number; d: number } | null,
    pencilPoints: { x: number, z: number }[],
    zoom: number,
    pan: { x: number; y: number },
    preview: { x: number; z: number } | null,
    activeLineNodeId: string | null,
    overlappingIds: Set<string>,
    // ── NEW params — all precomputed + cached by the caller, see scheduleRedraw ──
    closedPolygons: string[][],
    openingsByRoom: Map<string, FloorPlanState['openings']>,
    openingsBySegment: Map<string, FloorPlanState['openings']>,
    shapesIndex: Map<string, NonNullable<FloorPlanState['closedShapes']>[number]>,
    marqueeRect: { x: number; z: number; w: number; d: number } | null,
    nodesById: Map<string, LineNode>,
    roomsById: Map<string, FloorPlanState['rooms'][number]>,
) {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    ctx.clearRect(0, 0, W, H)

    const scale = PX_PER_M * zoom
    // ── Grid ──────────────────────────────────────────────────────────────────
    ctx.save()
    ctx.strokeStyle = 'rgba(99,102,241,0.07)'
    ctx.lineWidth = 1
    const gx = ((pan.x % scale) + scale) % scale
    const gy = ((pan.y % scale) + scale) % scale
    for (let x = gx; x < W; x += scale) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = gy; y < H; y += scale) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    ctx.restore()

    const cx = (m: number) => toCanvas(m, pan.x, zoom)
    const cy = (m: number) => toCanvas(m, pan.y, zoom)

    const wallT = 0.15 * scale

    // ── Rooms ─────────────────────────────────────────────────────────────────
    for (const room of fp.rooms) {
        const rx = cx(room.x), rz = cy(room.z)
        const rw = room.width * scale, rd = room.depth * scale
        const isSel = selectedIds.includes(room.id)
        const isHov = hoveredId === room.id

        ctx.save()
        ctx.fillStyle = isSel ? 'rgba(99,102,241,0.12)' : isHov ? 'rgba(99,102,241,0.07)' : 'rgba(30,27,24,0.6)'
        ctx.fillRect(rx, rz, rw, rd)
        ctx.restore()

        ctx.save()
        ctx.fillStyle = isSel ? 'rgba(99,102,241,0.9)' : isHov ? 'rgba(100,116,139,0.9)' : 'rgba(71,85,105,0.9)'
        ctx.fillRect(rx, rz, rw, wallT)
        ctx.fillRect(rx, rz + rd - wallT, rw, wallT)
        ctx.fillRect(rx, rz, wallT, rd)
        ctx.fillRect(rx + rw - wallT, rz, wallT, rd)
        ctx.restore()

        ctx.save()
        ctx.fillStyle = 'rgba(148,163,184,0.8)'
        ctx.font = `${Math.max(10, 12 * zoom)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(room.label, rx + rw / 2, rz + rd / 2 - 8)
        ctx.font = `${Math.max(9, 10 * zoom)}px system-ui`
        ctx.fillStyle = 'rgba(100,116,139,0.7)'
        ctx.fillText(`${room.width.toFixed(1)}m × ${room.depth.toFixed(1)}m`, rx + rw / 2, rz + rd / 2 + 10)
        ctx.restore()

        // ── Room Openings ────────────────────────────────────────────────────
        // was: fp.openings.filter(o => o.roomId === room.id && !o.segmentNodeIds)
        // now: O(1) map lookup instead of an O(M) scan per room, every frame
        for (const op of openingsByRoom.get(room.id) ?? []) {
            const isHorizontal = op.wall === 'north' || op.wall === 'south'
            const opStart = op.position - op.width / 2
            const opEnd = op.position + op.width / 2

            let gx1: number, gy1: number, gx2: number, gy2: number

            if (op.wall === 'north') {
                gx1 = cx(room.x + opStart); gy1 = cy(room.z)
                gx2 = cx(room.x + opEnd); gy2 = cy(room.z) + wallT
            } else if (op.wall === 'south') {
                gx1 = cx(room.x + opStart); gy1 = cy(room.z + room.depth) - wallT
                gx2 = cx(room.x + opEnd); gy2 = cy(room.z + room.depth)
            } else if (op.wall === 'west') {
                gx1 = cx(room.x); gy1 = cy(room.z + opStart)
                gx2 = cx(room.x) + wallT; gy2 = cy(room.z + opEnd)
            } else {
                gx1 = cx(room.x + room.width) - wallT; gy1 = cy(room.z + opStart)
                gx2 = cx(room.x + room.width); gy2 = cy(room.z + opEnd)
            }

            ctx.clearRect(gx1, gy1, gx2 - gx1, gy2 - gy1)

            const isOpSel = selectedId === op.id
            const isOpHov = hoveredId === op.id

            if (op.type === 'door') {
                const doorPx = op.width * scale
                ctx.save()
                ctx.strokeStyle = isOpSel ? '#4F46E5' : isOpHov ? '#A5A9FF' : '#818CF8'
                ctx.lineWidth = isOpSel ? 2.5 : 1.5
                if (isHorizontal) {
                    ctx.beginPath(); ctx.arc(gx1, (gy1 + gy2) / 2, doorPx, 0, Math.PI / 2); ctx.stroke()
                    ctx.beginPath(); ctx.moveTo(gx1, (gy1 + gy2) / 2); ctx.lineTo(gx1 + doorPx, (gy1 + gy2) / 2); ctx.stroke()
                } else {
                    ctx.beginPath(); ctx.arc((gx1 + gx2) / 2, gy1, doorPx, 0, Math.PI / 2); ctx.stroke()
                    ctx.beginPath(); ctx.moveTo((gx1 + gx2) / 2, gy1); ctx.lineTo((gx1 + gx2) / 2, gy1 + doorPx); ctx.stroke()
                }
                // Selection ring around the whole opening footprint, matching
                // the pattern used for rooms/nodes elsewhere in this file
                if (isOpSel) {
                    ctx.strokeStyle = 'rgba(99,102,241,0.35)'
                    ctx.lineWidth = 2
                    ctx.setLineDash([3, 3])
                    ctx.strokeRect(gx1 - 3, gy1 - 3, (gx2 - gx1) + 6, (gy2 - gy1) + 6)
                    ctx.setLineDash([])
                }
                ctx.restore()
            } else if (op.type === 'opening') {
                if (op.variant === 'opening-archway') {
                    // Archway — draw curved arch outline
                    ctx.save()
                    ctx.strokeStyle = isOpSel ? '#4F46E5' : 'rgba(200,180,140,0.85)'
                    ctx.lineWidth = isOpSel ? 2.4 : 1.8
                    const archMidX = (gx1 + gx2) / 2
                    const archTopPad = (gy2 - gy1) * 0.35
                    ctx.beginPath()
                    ctx.moveTo(gx1, gy2)
                    ctx.lineTo(gx1, gy1 + archTopPad)
                    ctx.quadraticCurveTo(gx1, gy1, archMidX, gy1)
                    ctx.quadraticCurveTo(gx2, gy1, gx2, gy1 + archTopPad)
                    ctx.lineTo(gx2, gy2)
                    ctx.stroke()
                    ctx.restore()
                } else {
                    // Open passage — plain dashed gap
                    ctx.save()
                    ctx.strokeStyle = isOpSel ? '#4F46E5' : 'rgba(180,170,150,0.6)'
                    ctx.lineWidth = isOpSel ? 1.6 : 1
                    ctx.setLineDash([3, 3])
                    ctx.strokeRect(gx1, gy1, gx2 - gx1, gy2 - gy1)
                    ctx.setLineDash([])
                    ctx.restore()
                }
            } else {
                ctx.save()
                ctx.fillStyle = isOpSel ? 'rgba(79,70,229,0.6)' : 'rgba(147,197,253,0.5)'
                ctx.strokeStyle = isOpSel ? '#4F46E5' : '#60A5FA'
                ctx.lineWidth = isOpSel ? 2.2 : 1.5
                ctx.fillRect(gx1, gy1, gx2 - gx1, gy2 - gy1)
                ctx.strokeRect(gx1, gy1, gx2 - gx1, gy2 - gy1)
                ctx.restore()
            }
        }
    }
    // ── Room resize handles ───────────────────────────────────────────────────
    if (selectedId) {
        const selRoom = fp.rooms.find(r => r.id === selectedId)
        if (selRoom) {
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
                ctx.save()
                ctx.beginPath()
                ctx.rect(cx(h.x) - 5, cy(h.z) - 5, 10, 10)
                ctx.fillStyle = 'white'
                ctx.strokeStyle = 'rgba(99,102,241,0.9)'
                ctx.lineWidth = 1.5
                ctx.fill()
                ctx.stroke()
                ctx.restore()
            }
        }
        const selShape = fp.closedShapes?.find(sh => sh.id === selectedId)
        if (selShape) {
            const nodes = selShape.nodeIds.map(id => fp.lineNodes.find(n => n.id === id)).filter(Boolean) as LineNode[]
            if (nodes.length >= 3) {
                const xs = nodes.map(n => n.x), zs = nodes.map(n => n.z)
                const minX = Math.min(...xs), maxX = Math.max(...xs)
                const minZ = Math.min(...zs), maxZ = Math.max(...zs)
                const handles = [
                    { x: maxX, z: maxZ }, { x: maxX, z: minZ },
                    { x: minX, z: maxZ }, { x: minX, z: minZ },
                ]
                for (const h of handles) {
                    ctx.save()
                    ctx.beginPath()
                    ctx.rect(cx(h.x) - 5, cy(h.z) - 5, 10, 10)
                    ctx.fillStyle = 'white'
                    ctx.strokeStyle = 'rgba(99,102,241,0.9)'
                    ctx.lineWidth = 1.5
                    ctx.fill(); ctx.stroke()
                    ctx.restore()
                }
            }
        }
    }
    if (marqueeRect && (Math.abs(marqueeRect.w) > 0.02 || Math.abs(marqueeRect.d) > 0.02)) {
        const rx = cx(Math.min(marqueeRect.x, marqueeRect.x + marqueeRect.w))
        const rz = cy(Math.min(marqueeRect.z, marqueeRect.z + marqueeRect.d))
        const rw = Math.abs(marqueeRect.w) * scale
        const rd = Math.abs(marqueeRect.d) * scale
        ctx.save()
        ctx.fillStyle = 'rgba(99,102,241,0.10)'
        ctx.strokeStyle = 'rgba(99,102,241,0.9)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 3])
        ctx.fillRect(rx, rz, rw, rd)
        ctx.strokeRect(rx, rz, rw, rd)
        ctx.setLineDash([])
        ctx.restore()
    }

    for (const d of fp.wallDecor ?? []) {
        let dx: number, dz: number, angle: number
        if (d.segmentNodeIds) {
            const a = nodesById.get(d.segmentNodeIds![0])
            const b = nodesById.get(d.segmentNodeIds![1])
            if (!a || !b) continue
            const t = d.segmentT ?? 0
            dx = a.x + (b.x - a.x) * t
            dz = a.z + (b.z - a.z) * t
            angle = Math.atan2(b.z - a.z, b.x - a.x)
        } else {
            // was: fp.rooms.find(r => r.id === d.roomId) — O(rooms) scan per
            // decor item per frame. Swapped for the precomputed roomsById map.
            const room = roomsById.get(d.roomId!)
            if (!room || !d.wall) continue
            if (d.wall === 'north') { dx = room.x + d.position; dz = room.z; angle = 0 }
            else if (d.wall === 'south') { dx = room.x + d.position; dz = room.z + room.depth; angle = 0 }
            else if (d.wall === 'west') { dx = room.x; dz = room.z + d.position; angle = Math.PI / 2 }
            else { dx = room.x + room.width; dz = room.z + d.position; angle = Math.PI / 2 }
        }
        const isSel = selectedIds.includes(d.id)
        const isHov = hoveredId === d.id
        const dw = d.width * scale

        // which face this decor mounts on. Drives both the little side
        // indicator tick below and the label offset direction, so items on
        // opposite faces of the same wall/position don't render their labels
        // on top of each other.
        const inward = d.facingInward ?? true
        const faceDir = inward ? 1 : -1

        ctx.save()
        ctx.translate(cx(dx), cy(dz))
        ctx.rotate(angle)
        ctx.fillStyle = isSel ? 'rgba(99,102,241,0.6)' : isHov ? 'rgba(200,180,140,0.7)' : 'rgba(200,180,140,0.5)'
        ctx.strokeStyle = isSel ? 'rgba(165,168,255,0.9)' : 'rgba(160,140,100,0.6)'
        ctx.lineWidth = isSel ? 1.5 : 1
        ctx.fillRect(-dw / 2, -3, dw, 6)
        ctx.strokeRect(-dw / 2, -3, dw, 6)

        // small tick pointing toward the mounted face, so which side an
        // item is on is visible directly in the 2D editor, not just in 3D.
        ctx.beginPath()
        ctx.moveTo(0, 3 * faceDir)
        ctx.lineTo(0, 3 * faceDir + 8 * faceDir)
        ctx.strokeStyle = isSel ? 'rgba(99,102,241,0.9)' : 'rgba(120,100,70,0.7)'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()

        // Label drawn in a SEPARATE, un-rotated-by-wall-angle pass so text is
        // always upright and legible, offset outward on the wall's normal —
        // flipped by `faceDir` so labels for opposite-face items don't
        // stack on top of each other.
        const normalX = Math.sin(angle) * faceDir, normalZ = -Math.cos(angle) * faceDir
        const labelOffset = 14
        const label = WALL_DECOR_LABELS[d.type]
        ctx.save()
        const decorFont = `600 ${Math.max(8, 8 * zoom)}px system-ui`
        ctx.font = decorFont
        const tw = measureCached(ctx, label, decorFont)
        const lx = cx(dx) + normalX * labelOffset
        const ly = cy(dz) + normalZ * labelOffset
        ctx.fillStyle = isSel ? '#000000' : 'rgba(255,255,255,0.9)'
        ctx.beginPath()
        ctx.roundRect(lx - tw / 2 - 4, ly - 8, tw + 8, 16, 4)
        ctx.fill()
        ctx.strokeStyle = isSel ? '#000000' : 'rgba(0,0,0,0.08)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = isSel ? '#FFFFFF' : 'rgba(80,60,40,0.9)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, lx, ly)
        ctx.restore()
    }
    // ── Lights ─────────────────────────────────────────────────────────────
    for (const l of fp.lights ?? []) {
        const isSel = selectedIds.includes(l.id)
        const isHov = hoveredId === l.id
        const label = LIGHT_FIXTURE_LABELS[l.type] ?? l.type
        const kind = LIGHT_PLACEMENT_KIND[l.type]

        // ── path (string_lights) — dashed polyline through pathNodeIds ──
        if (kind === 'path') {
            const nodes = (l.pathNodeIds ?? []).map(id => nodesById.get(id)).filter(Boolean) as LineNode[]

            if (nodes.length < 2) continue
            ctx.save()
            ctx.strokeStyle = isSel ? 'rgba(99,102,241,0.9)' : isHov ? 'rgba(234,179,8,0.8)' : 'rgba(234,179,8,0.6)'
            ctx.lineWidth = isSel ? 2.5 : 1.5
            ctx.setLineDash([4, 4])
            ctx.beginPath()
            ctx.moveTo(cx(nodes[0]!.x), cy(nodes[0]!.z))
            for (let i = 1; i < nodes.length; i++) ctx.lineTo(cx(nodes[i]!.x), cy(nodes[i]!.z))
            ctx.stroke()
            ctx.setLineDash([])
            for (const n of nodes) {
                ctx.beginPath()
                ctx.arc(cx(n.x), cy(n.z), isSel ? 4 : 3, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(234,179,8,0.85)'
                ctx.fill()
            }
            ctx.restore()
            continue
        }

        // ── wall-point / wall-strip — resolve wall-anchored position ──
        if (kind === 'wall-point' || kind === 'wall-strip') {
            let dx: number, dz: number, angle: number
            if (l.segmentNodeIds) {
                const a = nodesById.get(l.segmentNodeIds![0])
                const b = nodesById.get(l.segmentNodeIds![1])
                if (!a || !b) continue
                const t = l.segmentT ?? 0.5
                dx = a.x + (b.x - a.x) * t
                dz = a.z + (b.z - a.z) * t
                angle = Math.atan2(b.z - a.z, b.x - a.x)
            } else if (l.roomId && l.wall) {
                // was: fp.rooms.find(r => r.id === l.roomId) — same fix as decor above
                const room = roomsById.get(l.roomId)
                if (!room) continue
                if (l.wall === 'north') { dx = room.x + (l.position ?? 0); dz = room.z; angle = 0 }
                else if (l.wall === 'south') { dx = room.x + (l.position ?? 0); dz = room.z + room.depth; angle = 0 }
                else if (l.wall === 'west') { dx = room.x; dz = room.z + (l.position ?? 0); angle = Math.PI / 2 }
                else { dx = room.x + room.width; dz = room.z + (l.position ?? 0); angle = Math.PI / 2 }
            } else continue

            const px = cx(dx), pz = cy(dz)

            if (kind === 'wall-strip') {
                // Strip-length item — draw a short bar like wall decor, not a dot
                const widthPx = (l.width ?? 1) * scale
                ctx.save()
                ctx.translate(px, pz)
                ctx.rotate(angle)
                ctx.fillStyle = isSel ? 'rgba(99,102,241,0.7)' : isHov ? 'rgba(255,217,138,0.85)' : 'rgba(255,217,138,0.7)'
                ctx.fillRect(-widthPx / 2, -3, widthPx, 6)
                ctx.restore()
            } else {
                ctx.save()
                ctx.beginPath()
                ctx.arc(px, pz, isSel ? 7 : isHov ? 6 : 5, 0, Math.PI * 2)
                ctx.fillStyle = isSel ? 'rgba(99,102,241,0.65)' : isHov ? 'rgba(165,168,255,0.7)' : l.color
                ctx.strokeStyle = isSel ? '#4F46E5' : isHov ? '#818CF8' : 'rgba(0,0,0,0.25)'
                ctx.lineWidth = isSel || isHov ? 1.5 : 1
                ctx.fill()
                ctx.stroke()
                // Spotlight gets a small direction wedge showing aimRotation
                if (l.type === 'spotlight') {
                    const aim = l.aimRotation ?? 0
                    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
                    ctx.lineWidth = 1.5
                    ctx.beginPath()
                    ctx.moveTo(px, pz)
                    ctx.lineTo(px + Math.sin(aim) * 14, pz - Math.cos(aim) * 14)
                    ctx.stroke()
                }
                ctx.restore()
            }

            const lx = px, ly = pz + (kind === 'wall-strip' ? 14 : 16)
            ctx.save()
            const lightFont = `600 ${Math.max(8, 8 * zoom)}px system-ui`
            ctx.font = lightFont
            const tw = measureCached(ctx, label, lightFont)
            ctx.fillStyle = isSel ? '#4F46E5' : isHov ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.9)'
            ctx.beginPath()
            ctx.roundRect(lx - tw / 2 - 4, ly - 8, tw + 8, 16, 4)
            ctx.fill()
            ctx.strokeStyle = isSel ? '#4F46E5' : isHov ? '#818CF8' : 'rgba(0,0,0,0.08)'
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.fillStyle = isSel ? '#FFFFFF' : isHov ? '#4F46E5' : 'rgba(80,60,40,0.9)'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(label, lx, ly)
            ctx.restore()
            continue
        }

        // ── free-point — ceiling_pendant, ceiling_recessed, floor_lamp,
        // track_lighting, chandelier, outdoor_bollard ──
        const px = cx(l.x ?? 0), pz = cy(l.z ?? 0)
        ctx.save()
        ctx.beginPath()
        ctx.arc(px, pz, isSel ? 8 : isHov ? 7 : 6, 0, Math.PI * 2)
        ctx.fillStyle = isSel ? 'rgba(99,102,241,0.65)' : isHov ? 'rgba(165,168,255,0.7)' : l.color
        ctx.strokeStyle = isSel ? '#4F46E5' : isHov ? '#818CF8' : 'rgba(0,0,0,0.25)'
        ctx.lineWidth = isSel || isHov ? 1.5 : 1
        ctx.fill()
        ctx.stroke()
        if (isSel || isHov) {
            ctx.beginPath()
            ctx.arc(px, pz, 12, 0, Math.PI * 2)
            ctx.strokeStyle = isSel ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.25)'
            ctx.lineWidth = 1.5
            ctx.setLineDash([3, 3])
            ctx.stroke()
            ctx.setLineDash([])
        }
        ctx.restore()

        ctx.save()
        const freeFont = `600 ${Math.max(8, 8 * zoom)}px system-ui`
        ctx.font = freeFont
        const tw = measureCached(ctx, label, freeFont)
        const lx = px, ly = pz + 16
        ctx.fillStyle = isSel ? '#4F46E5' : isHov ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.9)'
        ctx.beginPath()
        ctx.roundRect(lx - tw / 2 - 4, ly - 8, tw + 8, 16, 4)
        ctx.fill()
        ctx.strokeStyle = isSel ? '#4F46E5' : isHov ? '#818CF8' : 'rgba(0,0,0,0.08)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = isSel ? '#FFFFFF' : isHov ? '#4F46E5' : 'rgba(80,60,40,0.85)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, lx, ly)
        ctx.restore()
    }

    if (drawRect && Math.abs(drawRect.w) > 0.1 && Math.abs(drawRect.d) > 0.1) {
        const rx = cx(Math.min(drawRect.x, drawRect.x + drawRect.w))
        const rz = cy(Math.min(drawRect.z, drawRect.z + drawRect.d))
        const rw = Math.abs(drawRect.w) * scale
        const rd = Math.abs(drawRect.d) * scale
        ctx.save()
        ctx.strokeStyle = 'rgba(99,102,241,0.8)'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.fillStyle = 'rgba(99,102,241,0.08)'
        ctx.fillRect(rx, rz, rw, rd)
        ctx.strokeRect(rx, rz, rw, rd)
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(165,168,255,0.9)'
        ctx.font = `${11 * zoom}px system-ui`
        ctx.textAlign = 'center'
        // Quantized to 0.1m so the live label (and its measureCached entry)
        // don't churn on every sub-mm cursor jitter while dragging out a room.
        const wLabel = quantizeMeters(Math.abs(drawRect.w), 10).toFixed(1)
        const dLabel = quantizeMeters(Math.abs(drawRect.d), 10).toFixed(1)
        ctx.fillText(`${wLabel}m × ${dLabel}m`, rx + rw / 2, rz + rd / 2)
        ctx.restore()
    }
    // ── Pencil stroke preview ─────────────────────────────────────────────────
    if (pencilPoints.length > 1) {
        ctx.save()
        ctx.strokeStyle = 'rgba(99,102,241,0.7)'
        ctx.lineWidth = 2
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(cx(pencilPoints[0]!.x), cy(pencilPoints[0]!.z))
        for (let i = 1; i < pencilPoints.length; i++) ctx.lineTo(cx(pencilPoints[i]!.x), cy(pencilPoints[i]!.z))
        ctx.stroke()

        const xs = pencilPoints.map(p => p.x), zs = pencilPoints.map(p => p.z)
        const minX = Math.min(...xs), maxX = Math.max(...xs)
        const minZ = Math.min(...zs), maxZ = Math.max(...zs)
        const bw = maxX - minX, bd = maxZ - minZ

        if (bw >= MIN_ROOM && bd >= MIN_ROOM) {
            const brx = cx(minX), brz = cy(minZ)
            const brw = bw * scale, brd = bd * scale
            ctx.strokeStyle = 'rgba(165,168,255,0.4)'
            ctx.lineWidth = 1.5
            ctx.setLineDash([5, 4])
            ctx.strokeRect(brx, brz, brw, brd)
            ctx.setLineDash([])
            ctx.fillStyle = 'rgba(165,168,255,0.75)'
            ctx.font = `${Math.max(9, 11 * zoom)}px system-ui`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const bwLabel = quantizeMeters(bw, 10).toFixed(1)
            const bdLabel = quantizeMeters(bd, 10).toFixed(1)
            ctx.fillText(`${bwLabel}m × ${bdLabel}m`, brx + brw / 2, brz + brd / 2)
        }
        ctx.restore()
    }
    // ── Line segments ──────────────────────────────────────────────────────────
    for (const seg of fp.lineSegments ?? []) {
        const nodes = seg.nodeIds.map(nid => nodesById.get(nid)).filter(Boolean) as LineNode[]

        if (nodes.length < 2) continue

        const isSel = selectedIds.includes(seg.id)
        const isHov = hoveredId === seg.id
        const wallType = seg.wallType ?? 'solid'

        ctx.save()
        ctx.strokeStyle = isSel
            ? 'rgba(99,102,241,0.95)'
            : isHov
                ? 'rgba(165,168,255,0.85)'
                : wallType === 'railing'
                    ? 'rgba(120,140,160,0.8)'
                    : wallType === 'open'
                        ? 'rgba(180,180,180,0.4)'
                        : 'rgba(148,163,184,0.75)'
        ctx.lineWidth = wallType === 'open'
            ? 1.5
            : Math.max(3, (seg.thickness ?? 0.15) * scale)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        if (wallType === 'railing') ctx.setLineDash([8, 4])
        else if (wallType === 'open') ctx.setLineDash([3, 5])
        else ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(cx(nodes[0]!.x), cy(nodes[0]!.z))
        for (let i = 1; i < nodes.length; i++) ctx.lineTo(cx(nodes[i]!.x), cy(nodes[i]!.z))
        if (seg.closed) ctx.closePath()
        ctx.stroke()
        ctx.setLineDash([])
        // Segment length labels
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i]!, b = nodes[i + 1]!
            const lenM = quantizeMeters(Math.hypot(b.x - a.x, b.z - a.z)).toFixed(2)
            const midX = cx((a.x + b.x) / 2), midZ = cy((a.z + b.z) / 2)
            const angle = Math.atan2(cy(b.z) - cy(a.z), cx(b.x) - cx(a.x))
            ctx.save()
            ctx.translate(midX, midZ)
            const displayAngle = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle
            ctx.rotate(displayAngle)
            ctx.fillStyle = 'rgba(165,168,255,0.85)'
            ctx.font = `${Math.max(9, 10 * zoom)}px system-ui`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillText(`${lenM}m`, 0, -4)
            ctx.restore()
        }
        ctx.restore()
        // Draw openings on line segments
        for (const op of openingsBySegment.get(seg.id) ?? []) {
            const pos = getSegmentOpeningWorldPos(op, fp.lineNodes)
            if (!pos) continue
            const hw = (op.width / 2) * scale
            const nx = Math.sin(pos.angle)
            const nz = -Math.cos(pos.angle)

            const isOpSel = selectedId === op.id
            const isOpHov = hoveredId === op.id

            ctx.save()
            ctx.translate(cx(pos.wx), cy(pos.wz))
            ctx.rotate(pos.angle)

            // Clear gap in wall
            ctx.clearRect(-hw, -wallT / 2, hw * 2, wallT)

            if (op.type === 'door') {
                ctx.strokeStyle = isOpSel ? '#4F46E5' : isOpHov ? '#A5A9FF' : '#818CF8'
                ctx.lineWidth = isOpSel ? 2.5 : 1.5
                ctx.beginPath()
                ctx.arc(-hw, 0, op.width * scale, 0, Math.PI / 2)
                ctx.stroke()
                ctx.beginPath()
                ctx.moveTo(-hw, 0)
                ctx.lineTo(hw, 0)
                ctx.stroke()
                if (isOpSel) {
                    ctx.strokeStyle = 'rgba(99,102,241,0.35)'
                    ctx.lineWidth = 2
                    ctx.setLineDash([3, 3])
                    ctx.strokeRect(-hw - 4, -wallT / 2 - 4, hw * 2 + 8, wallT + 8)
                    ctx.setLineDash([])
                }
            } else if (op.type === 'opening') {
                if (op.variant === 'opening-archway') {
                    // Archway on line segment — curved arch
                    ctx.strokeStyle = isOpSel ? '#4F46E5' : 'rgba(200,180,140,0.85)'
                    ctx.lineWidth = isOpSel ? 2.4 : 1.8
                    const archPad = wallT * 0.8
                    ctx.beginPath()
                    ctx.moveTo(-hw, wallT / 2)
                    ctx.lineTo(-hw, -archPad)
                    ctx.quadraticCurveTo(-hw, -wallT / 2, 0, -wallT / 2)
                    ctx.quadraticCurveTo(hw, -wallT / 2, hw, -archPad)
                    ctx.lineTo(hw, wallT / 2)
                    ctx.stroke()
                } else {
                    // Open passage on line segment — dashed rectangle
                    ctx.strokeStyle = isOpSel ? '#4F46E5' : 'rgba(180,170,150,0.6)'
                    ctx.lineWidth = isOpSel ? 1.6 : 1
                    ctx.setLineDash([3, 3])
                    ctx.strokeRect(-hw, -wallT / 2, hw * 2, wallT)
                    ctx.setLineDash([])
                }
            } else {
                ctx.fillStyle = isOpSel ? 'rgba(79,70,229,0.6)' : 'rgba(147,197,253,0.5)'
                ctx.strokeStyle = isOpSel ? '#4F46E5' : '#60A5FA'
                ctx.lineWidth = isOpSel ? 2.2 : 1.5
                ctx.fillRect(-hw, -wallT / 2, hw * 2, wallT)
                ctx.strokeRect(-hw, -wallT / 2, hw * 2, wallT)
            }
            ctx.restore()
        }
        if (seg.height !== undefined && seg.height !== fp.roomHeight) {
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i]!, b = nodes[i + 1]!
                const midX = cx((a.x + b.x) / 2), midZ = cy((a.z + b.z) / 2)
                ctx.save()
                const heightFont = `600 ${Math.max(8, 9 * zoom)}px system-ui`
                ctx.font = heightFont
                const label = `H: ${seg.height.toFixed(2)}m`
                const tw = measureCached(ctx, label, heightFont)
                ctx.fillStyle = 'rgba(234,179,8,0.9)'
                ctx.beginPath()
                ctx.roundRect(midX - tw / 2 - 4, midZ + 8, tw + 8, 14, 3)
                ctx.fill()
                ctx.fillStyle = '#1E1B18'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(label, midX, midZ + 15)
                ctx.restore()
            }
        }
    }
    // ── Closed shapes ──────────────────────────────────────────────────────────
    for (const nodeIds of closedPolygons) {
        const nodes = nodeIds.map(nid => nodesById.get(nid)).filter(Boolean) as LineNode[]

        if (nodes.length < 3) continue
        // was: fp.closedShapes?.find(s => s.nodeIds.length === nodeIds.length && s.nodeIds.every(id => nodeIds.includes(id)))
        // now: O(1) map lookup via sorted-id key instead of an O(shapes) scan per polygon
        const shapeKey = [...nodeIds].sort().join(',')
        const shapeMatch = shapesIndex.get(shapeKey)
        const isSel = shapeMatch && selectedIds.includes(shapeMatch.id)
        const isHov = shapeMatch && hoveredId === shapeMatch.id
        ctx.save(); ctx.beginPath(); ctx.moveTo(cx(nodes[0]!.x), cy(nodes[0]!.z))
        for (let i = 1; i < nodes.length; i++) ctx.lineTo(cx(nodes[i]!.x), cy(nodes[i]!.z))
        ctx.closePath()
        ctx.fillStyle = isSel ? 'rgba(99,102,241,0.15)' : 'rgba(139,123,107,0.12)'
        ctx.fill()
        ctx.strokeStyle = isSel ? 'rgba(99,102,241,0.85)' : isHov ? 'rgba(165,168,255,0.6)' : 'rgba(139,123,107,0.5)'
        ctx.lineWidth = isSel ? 2 : 1
        ctx.setLineDash(isSel ? [] : [4, 3])
        ctx.stroke()
        const cx_ = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
        const cz_ = nodes.reduce((s, n) => s + n.z, 0) / nodes.length
        ctx.setLineDash([]); ctx.fillStyle = 'rgba(165,168,255,0.7)'; ctx.font = `${Math.max(9, 11 * zoom)}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(shapeMatch?.label || 'Area', cx(cx_), cy(cz_)); ctx.restore()
    }
    // ── Line nodes ─────────────────────────────────────────────────────────────
    for (const node of fp.lineNodes ?? []) {
        const isActive = activeLineNodeId === node.id
        const isSel = selectedIds.includes(node.id)
        const isHov = hoveredId === node.id
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx(node.x), cy(node.z), isSel || isActive ? 8 : isHov ? 7 : 5, 0, Math.PI * 2)
        ctx.fillStyle = isActive
            ? 'rgba(99,102,241,0.95)'
            : isSel
                ? 'rgba(165,168,255,0.95)'
                : isHov
                    ? 'rgba(148,163,184,0.85)'
                    : 'rgba(100,116,139,0.7)'
        ctx.strokeStyle = 'rgba(226,232,240,0.5)'
        ctx.lineWidth = 1.5
        ctx.fill()
        ctx.stroke()

        // Show selection ring on selected node
        if (isSel) {
            ctx.beginPath()
            ctx.arc(cx(node.x), cy(node.z), 12, 0, Math.PI * 2)
            ctx.strokeStyle = 'rgba(99,102,241,0.4)'
            ctx.lineWidth = 2
            ctx.setLineDash([3, 3])
            ctx.stroke()
            ctx.setLineDash([])
        }
        ctx.restore()
    }
    // ── Furniture overlays (2D top-down icons) ────────────────────────────────
    for (const f of fp.furniture ?? []) {
        const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }
        const fw = fp2.w * scale
        const fd = fp2.d * scale
        const fx = toCanvas(f.x, pan.x, zoom)
        const fz = toCanvas(f.z, pan.y, zoom)
        const isSel = selectedIds.includes(f.id)
        const isHov = hoveredId === f.id

        ctx.save()
        ctx.translate(fx, fz)
        ctx.rotate(f.rotation)

        // Drop shadow
        ctx.beginPath()
        ctx.rect(-fw / 2 + 2, -fd / 2 + 2, fw, fd)
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        ctx.fill()

        // Body fill
        ctx.beginPath()
        ctx.rect(-fw / 2, -fd / 2, fw, fd)
        ctx.fillStyle = isSel
            ? 'rgba(99,102,241,0.55)'
            : isHov
                ? (FURNITURE_COLORS[f.type] ?? 'rgba(180,160,130,0.9)').replace('0.88', '1.0')
                : FURNITURE_COLORS[f.type] ?? 'rgba(180,160,130,0.88)'
        ctx.fill()

        // Border
        ctx.strokeStyle = isSel ? 'rgba(165,168,255,0.9)' : 'rgba(255,255,255,0.35)'
        ctx.lineWidth = isSel ? 1.5 : 1
        ctx.stroke()
        if (overlappingIds.has(f.id)) {
            ctx.save()
            ctx.beginPath()
            ctx.rect(-fw / 2, -fd / 2, fw, fd)
            ctx.strokeStyle = 'rgba(239,68,68,0.9)' // red-500
            ctx.lineWidth = 2
            ctx.setLineDash([5, 3])
            ctx.stroke()
            ctx.restore()
        }
        // Direction indicator (small notch on "front" edge)
        ctx.beginPath()
        ctx.moveTo(-fw * 0.2, -fd / 2)
        ctx.lineTo(0, -fd / 2 - 5)
        ctx.lineTo(fw * 0.2, -fd / 2)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fill()

        // Label
        const fs = Math.max(8, Math.min(11, (fw / 4)))
        ctx.font = `600 ${fs}px system-ui`
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(FURNITURE_LABELS[f.type] ?? f.type, 0, 0)

        // Selection rotation handles
        if (isSel) {
            ctx.beginPath()
            ctx.arc(-fw / 2 - 10, -fd / 2 - 10, 5, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(99,102,241,0.9)'
            ctx.fill()
            ctx.beginPath()
            ctx.arc(fw / 2 + 10, -fd / 2 - 10, 5, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(99,102,241,0.9)'
            ctx.fill()
        }

        ctx.restore()
    }
    // ── Stairs / Elevator overlays ─────────────────────────────────────────
    for (const s of fp.stairs ?? []) {
        const sw = s.width * scale, sd = s.depth * scale
        const sx = toCanvas(s.x + s.width / 2, pan.x, zoom)
        const sz = toCanvas(s.z + s.depth / 2, pan.y, zoom)
        const isSel = selectedIds.includes(s.id)
        const isHov = hoveredId === s.id

        ctx.save()
        ctx.translate(sx, sz)
        ctx.rotate(s.rotation)

        ctx.fillStyle = isSel ? 'rgba(99,102,241,0.35)' : isHov ? 'rgba(148,163,184,0.28)' : 'rgba(100,90,75,0.4)'
        ctx.strokeStyle = isSel ? 'rgba(165,168,255,0.9)' : 'rgba(200,190,175,0.6)'
        ctx.lineWidth = isSel ? 1.5 : 1
        ctx.beginPath()
        ctx.rect(-sw / 2, -sd / 2, sw, sd)
        ctx.fill(); ctx.stroke()

        if (s.type === 'elevator') {
            ctx.strokeStyle = 'rgba(200,190,175,0.7)'
            ctx.beginPath(); ctx.moveTo(-sw / 2, 0); ctx.lineTo(sw / 2, 0); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(0, -sd / 2); ctx.lineTo(0, sd / 2); ctx.stroke()
        } else if (s.type === 'stairs-spiral') {
            const r = Math.min(sw, sd) / 2 - 3
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke()
            // radial step lines, matching the reference's clean spoke pattern
            const spokeCount = 12
            for (let i = 0; i < spokeCount; i++) {
                const a = (i / spokeCount) * Math.PI * 2
                ctx.beginPath()
                ctx.moveTo(0, 0)
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
                ctx.stroke()
            }
        } else {
            // Tread lines across the run
            const steps = 8
            for (let i = 1; i < steps; i++) {
                const yy = -sd / 2 + (sd / steps) * i
                ctx.beginPath(); ctx.moveTo(-sw / 2, yy); ctx.lineTo(sw / 2, yy); ctx.stroke()
            }
        }

        ctx.fillStyle = 'rgba(226,232,240,0.75)'
        ctx.font = `600 ${Math.max(8, 9 * zoom)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(STAIRS_LABELS[s.type], 0, sd / 2 + 12)

        ctx.restore()
    }
    // ── Annotations ──────────────────────────────────────────────────────────
    for (const ann of fp.annotations ?? []) {
        if (!ann.text) continue
        const ax = cx(ann.x), az = cy(ann.z)
        const fontSize = Math.max(10, (ann.fontSize ?? 13) * zoom)
        ctx.save()
        const annFont = `600 ${fontSize}px system-ui`
        ctx.font = annFont
        const tw = measureCached(ctx, ann.text, annFont)
        // Background pill
        ctx.fillStyle = 'rgba(99,102,241,0.18)'
        ctx.beginPath()
        ctx.roundRect(ax - tw / 2 - 8, az - fontSize / 2 - 5, tw + 16, fontSize + 10, 6)
        ctx.fill()
        ctx.strokeStyle = 'rgba(99,102,241,0.4)'
        ctx.lineWidth = 1
        ctx.stroke()
        // Text
        ctx.fillStyle = 'rgba(226,232,240,0.9)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(ann.text, ax, az)
        ctx.restore()
    }
    // ── Outdoor Objects ───────────────────────────────────────────────────
    for (const o of fp.outdoorObjects ?? []) {
        const isSel = selectedIds.includes(o.id)
        const isHov = hoveredId === o.id
        const label = OUTDOOR_OBJECT_LABELS[o.type]
        const fp2 = OUTDOOR_OBJECT_FOOTPRINTS[o.type]
        const isFlat = OUTDOOR_FLAT_TYPES.has(o.type)

        ctx.save()
        ctx.translate(cx(o.x), cy(o.z))
        ctx.rotate(o.rotation)

        if (isFlat) {
            // Crosswalk — draw its actual footprint rectangle, not a dot
            const w = fp2.w * (o.scale ?? 1) * PX_PER_M * zoom
            const d = fp2.d * (o.scale ?? 1) * PX_PER_M * zoom
            ctx.fillStyle = isSel ? 'rgba(99,102,241,0.25)' : 'rgba(180,180,180,0.4)'
            ctx.strokeStyle = isSel ? 'rgba(99,102,241,0.8)' : 'rgba(120,120,120,0.6)'
            ctx.lineWidth = isSel ? 1.5 : 1
            ctx.fillRect(-w / 2, -d / 2, w, d)
            ctx.strokeRect(-w / 2, -d / 2, w, d)
        } else {
            ctx.beginPath()
            ctx.arc(0, 0, isSel ? 8 : isHov ? 7 : 6, 0, Math.PI * 2)
            ctx.fillStyle = isSel ? 'rgba(99,102,241,0.65)' : '#8B7355'
            ctx.strokeStyle = isSel ? 'rgba(165,168,255,0.9)' : 'rgba(0,0,0,0.25)'
            ctx.lineWidth = isSel ? 1.5 : 1
            ctx.fill()
            ctx.stroke()
        }
        ctx.restore()

        ctx.save()
        ctx.font = `600 ${Math.max(8, 8 * zoom)}px system-ui`
        ctx.fillStyle = 'rgba(80,60,40,0.85)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, cx(o.x), cy(o.z) + (isFlat ? 0 : 14))
        ctx.restore()
    }

    // ── Live measurement rubber band ──────────────────────────────────────────
    if ((tool === 'line' || tool === 'bend') && activeLineNodeId && preview) {
        const fromNode = nodesById.get(activeLineNodeId)
        if (fromNode) {
            const fx = cx(fromNode.x), fz = cy(fromNode.z)
            const tx = cx(preview.x), tz = cy(preview.z)
            const lenM = Math.hypot(preview.x - fromNode.x, preview.z - fromNode.z)

            ctx.save()
            ctx.strokeStyle = 'rgba(99,102,241,0.7)'
            ctx.lineWidth = 2
            ctx.setLineDash([6, 4])
            ctx.beginPath(); ctx.moveTo(fx, fz); ctx.lineTo(tx, tz); ctx.stroke()
            ctx.setLineDash([])

            if (lenM > 0.05) {
                const midX = (fx + tx) / 2, midZ = (fz + tz) / 2
                const angle = Math.atan2(tz - fz, tx - fx)
                const display = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle
                // Quantized to 1cm — stabilizes the measureCached key so
                // rapid mousemove during drag doesn't mint (and permanently
                // cache) a fresh string on every single frame.
                const label = `${quantizeMeters(lenM).toFixed(2)}m`
                const rubberFont = `bold ${Math.max(10, 11 * zoom)}px system-ui`
                ctx.font = rubberFont
                const tw = measureCached(ctx, label, rubberFont)
                ctx.translate(midX, midZ)
                ctx.rotate(display)
                ctx.fillStyle = 'rgba(99,102,241,0.85)'
                ctx.beginPath()
                ctx.roundRect(-(tw / 2) - 6, -22, tw + 12, 18, 4)
                ctx.fill()
                ctx.fillStyle = 'white'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(label, 0, -13)
            }
            ctx.restore()

            // Snap indicator — iterate the precomputed nodesById map instead
            // of re-scanning fp.lineNodes with .find() every frame, use a
            // squared-distance compare (skip sqrt) and bail out on first hit.
            ctx.save()
            let nearNode: LineNode | undefined
            const snapDistSq = (0.4 / zoom) ** 2
            for (const n of nodesById.values()) {
                if (n.id === activeLineNodeId) continue
                const ddx = preview.x - n.x, ddz = preview.z - n.z
                if (ddx * ddx + ddz * ddz < snapDistSq) { nearNode = n; break }
            }
            ctx.beginPath()
            ctx.arc(tx, tz, nearNode ? 9 : 5, 0, Math.PI * 2)
            ctx.fillStyle = nearNode ? 'rgba(34,197,94,0.9)' : 'rgba(99,102,241,0.8)'
            ctx.fill()
            if (nearNode) { ctx.strokeStyle = 'rgba(34,197,94,0.4)'; ctx.lineWidth = 3; ctx.stroke() }
            ctx.restore()

            // ── Cursor-anchored live tag ──────────────────────────────────
            // Unlike the mid-line label above (which rotates with the line
            // and sits on the segment itself), this tag always stays
            // upright and tracks the cursor tip directly — a small icon
            // chip + live length readout, offset down-right of the cursor
            // so the pointer itself never covers it.
            if (lenM > 0.02) {
                ctx.save()
                const tagOffsetX = 18, tagOffsetY = 18
                const anchorX = tx + tagOffsetX, anchorY = tz + tagOffsetY

                const tagLabel = `${quantizeMeters(lenM).toFixed(2)}m`
                const tagFont = `600 ${Math.max(10, 11 * zoom)}px system-ui`
                ctx.font = tagFont
                const tagTw = measureCached(ctx, tagLabel, tagFont)

                const iconR = 9          // icon chip radius
                const gap = 6            // gap between icon and text pill
                const padX = 8
                const pillH = 22
                const pillW = tagTw + padX * 2
                const totalW = iconR * 2 + gap + pillW

                // Icon chip (dark rounded square, echoes the tool cursor icon)
                ctx.fillStyle = 'rgba(30,27,24,0.92)'
                ctx.beginPath()
                ctx.roundRect(anchorX, anchorY - iconR, iconR * 2, iconR * 2, 5)
                ctx.fill()
                // simple ruler/line glyph inside the chip so it reads as a
                // "measuring" icon rather than a generic dot
                ctx.strokeStyle = 'rgba(255,255,255,0.9)'
                ctx.lineWidth = 1.4
                ctx.beginPath()
                ctx.moveTo(anchorX + 4, anchorY + 3)
                ctx.lineTo(anchorX + iconR * 2 - 4, anchorY - 3)
                ctx.stroke()

                // Text pill
                const pillX = anchorX + iconR * 2 + gap
                ctx.fillStyle = 'rgba(30,27,24,0.92)'
                ctx.beginPath()
                ctx.roundRect(pillX, anchorY - pillH / 2, pillW, pillH, 6)
                ctx.fill()
                ctx.fillStyle = '#FFFFFF'
                ctx.textAlign = 'left'
                ctx.textBaseline = 'middle'
                ctx.fillText(tagLabel, pillX + padX, anchorY)

                void totalW // reserved for future width-aware repositioning (e.g. flip left near canvas edge)
                ctx.restore()
            }
        }
    }
}