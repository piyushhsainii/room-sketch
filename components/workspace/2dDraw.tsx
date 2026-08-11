import { drawStairIcon, getSegmentOpeningWorldPos, toCanvas } from "@/lib/helpers";
import { EditorTool, FloorPlanState, LineNode, MIN_ROOM, PX_PER_M, STAIRS_LABELS, WALL_DECOR_LABELS } from "./lib/constants";
import { LIGHT_FIXTURE_LABELS, LIGHT_PLACEMENT_KIND } from "./lights-constant";
import { OUTDOOR_FLAT_TYPES, OUTDOOR_OBJECT_FOOTPRINTS, OUTDOOR_OBJECT_LABELS } from "./lib/outdoor-constants";
import { FURNITURE_COLORS, FURNITURE_FOOTPRINTS, FURNITURE_LABELS } from "./lib/furniture-constants";

const labelWidthCache = new Map<string, number>()

const LABEL_CACHE_MAX = 500

function measureCached(ctx: CanvasRenderingContext2D, text: string, font: string): number {
    const key = font + '|' + text
    let w = labelWidthCache.get(key)
    if (w === undefined) {
        ctx.font = font
        w = ctx.measureText(text).width

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

function quantizeMeters(m: number, precision = 100): number {
    return Math.round(m * precision) / precision
}

let placedLabelRects: { x: number; y: number; w: number; h: number }[] = []

function rectsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function findClearSpot(w: number, h: number, startX: number, startY: number) {
    // startX/startY here is the CENTER of the label.
    const stepY = h + 4
    const maxAttempts = 12
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Alternate below/above the original spot, moving further out
        // each pass: 0, +1, -1, +2, -2, ...
        const dir = attempt === 0 ? 0 : (attempt % 2 === 1 ? Math.ceil(attempt / 2) : -Math.ceil(attempt / 2))
        const cy = startY + dir * stepY
        const rect = { x: startX - w / 2, y: cy - h / 2, w, h }
        const collides = placedLabelRects.some(r => rectsOverlap(rect, r))
        if (!collides) return { x: startX, y: cy }
    }
    // Give up avoiding — better to overlap slightly than fly off-plan.
    return { x: startX, y: startY }
}

type LabelAnchor = 'center' | 'left'

function drawPlainLabel(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, text: string,
    opts?: { fontSize?: number; weight?: number; color?: string; align?: CanvasTextAlign },
) {
    const fontSize = opts?.fontSize ?? 11
    const weight = opts?.weight ?? 600
    ctx.save()
    ctx.font = `${weight} ${fontSize}px system-ui`
    ctx.textAlign = opts?.align ?? 'center'
    ctx.textBaseline = 'middle'
    // Thin white halo so black text stays readable over dark room fills,
    // wall strokes, and the grid — without needing a solid background box.
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineJoin = 'round'
    ctx.strokeText(text, x, y)
    ctx.fillStyle = opts?.color ?? '#1a1a1a'
    ctx.fillText(text, x, y)
    ctx.restore()
}

interface ChipLabelOpts {
    x: number
    y: number
    text: string
    dotColor?: string
    zoom: number
    selected?: boolean
    hovered?: boolean
    anchor?: LabelAnchor
    // draw a short leader line from the anchor point to the chip, useful
    // when the chip is offset away from the thing it's labeling.
    leaderFrom?: { x: number; y: number }
}

function drawChipLabel(ctx: CanvasRenderingContext2D, opts: ChipLabelOpts) {
    const { x, y, text, dotColor, zoom, selected, hovered, anchor = 'center', leaderFrom } = opts

    const fontSize = Math.max(9.5, 10.5 * Math.min(zoom, 1.3))
    const font = `600 ${fontSize}px system-ui`

    ctx.save()
    ctx.font = font
    const textW = measureCached(ctx, text, font)

    const padX = 8
    const dotR = dotColor ? 3 : 0
    const dotGap = dotColor ? 5 : 0
    const chipH = Math.max(18, fontSize + 8)
    const innerW = dotR * 2 + dotGap + textW
    const chipW = innerW + padX * 2

    // The true anchor point this label is describing — used for the
    // leader line once we know where the label actually ended up.
    const anchorPoint = leaderFrom ?? { x, y }

    // Resolve overlap with any label already placed this frame. For
    // 'center'-anchored labels the intended center is (x, y); for 'left'
    // anchored ones (e.g. the cursor-tag) it's the box's own center.
    const intendedCenterX = anchor === 'left' ? x + chipW / 2 : x
    const resolved = findClearSpot(chipW, chipH, intendedCenterX, y)
    const finalCenterX = resolved.x
    const finalCenterY = resolved.y

    const px = finalCenterX - chipW / 2
    const py = finalCenterY - chipH / 2

    // Always draw a leader line when the label moved away from its
    // anchor (either because the caller offset it, or because collision
    // avoidance nudged it) so it's still clear what the label refers to.
    const moved = Math.abs(finalCenterX - anchorPoint.x) > 1 || Math.abs(finalCenterY - anchorPoint.y) > 1
    if (leaderFrom || moved) {
        ctx.strokeStyle = 'rgba(148,163,184,0.55)'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(anchorPoint.x, anchorPoint.y)
        ctx.lineTo(finalCenterX, finalCenterY)
        ctx.stroke()
        ctx.setLineDash([])
    }

    ctx.shadowColor = 'rgba(0,0,0,0.18)'
    ctx.shadowBlur = 3
    ctx.shadowOffsetY = 1

    ctx.fillStyle = selected ? 'rgba(224,225,255,0.98)' : 'rgba(255,255,255,0.94)'
    ctx.beginPath()
    ctx.roundRect(px, py, chipW, chipH, chipH / 2)
    ctx.fill()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    ctx.strokeStyle = selected ? '#4F46E5' : hovered ? 'rgba(99,102,241,0.6)' : 'rgba(0,0,0,0.15)'
    ctx.lineWidth = selected ? 1.5 : 1
    ctx.beginPath()
    ctx.roundRect(px + 0.5, py + 0.5, chipW - 1, chipH - 1, chipH / 2)
    ctx.stroke()

    let cursorX = px + padX
    const midY = finalCenterY

    if (dotColor) {
        ctx.beginPath()
        ctx.arc(cursorX + dotR, midY, dotR, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
        cursorX += dotR * 2 + dotGap
    }

    ctx.font = font
    ctx.fillStyle = selected ? '#4F46E5' : '#1a1a1a'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, cursorX, midY)

    ctx.restore()

    placedLabelRects.push({ x: px, y: py, w: chipW, h: chipH })

    return { chipW, chipH, px, py }
}

// Category accent colors used for the small status dot in each chip label,
// so at a glance you can tell what kind of element a label refers to
// without reading the text — decor (tan/brass), lights (amber), outdoor
// (slate), dimensions (indigo).
const DOT_DECOR = '#C9A876'
const DOT_LIGHT = '#EAB308'
const DOT_OUTDOOR = '#94A3B8'
const DOT_DIMENSION = '#818CF8'

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
    showFurniture: boolean = true,
    showLabels: boolean = true,
) {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    // ctx.clearRect(0, 0, W, H)
    // Fresh collision registry for this frame's chip labels — see
    // findClearSpot/drawChipLabel above.
    placedLabelRects = []


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

        // Room name + dimensions — plain black text with a white halo
        // (no background chip). Rooms tile the whole plan, so a boxed
        // label per room reads as visual clutter; the halo alone gives
        // enough contrast against both light and dark room fills.
        if (showLabels) {

            drawPlainLabel(ctx, rx + rw / 2, rz + rd / 2 - 9, room.label, {
                fontSize: Math.max(11, 13 * zoom),
                weight: 700,
                color: isSel ? '#4F46E5' : '#1a1a1a',
            })
            drawPlainLabel(ctx, rx + rw / 2, rz + rd / 2 + 10, `${room.width.toFixed(1)}m × ${room.depth.toFixed(1)}m`, {
                fontSize: Math.max(9, 10.5 * zoom),
                weight: 500,
                color: isSel ? 'rgba(79,70,229,0.75)' : 'rgba(30,30,30,0.65)',
            })

        }
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
                const dv = op.variant ?? 'door-swing-single'
                const isDouble = dv === 'door-swing-double' || dv === 'door-swing-double-french' || dv === 'door-swing-double-arched'
                const isPanorama = dv === 'door-sliding-panorama'
                const isSliding = dv === 'door-sliding' || dv === 'door-sliding-double' || dv === 'door-pocket'
                const isFolding = dv === 'door-folding' || dv === 'door-folding-single' || dv === 'door-folding-french'
                const isGarage = dv === 'door-garage'

                ctx.save()
                ctx.strokeStyle = isOpSel ? '#4F46E5' : isOpHov ? '#A5A9FF' : '#818CF8'
                ctx.lineWidth = isOpSel ? 2.5 : 1.5

                const midX = (gx1 + gx2) / 2
                const midY = (gy1 + gy2) / 2
                const halfPx = doorPx / 2

                if (isGarage) {
                    // Garage doors don't swing — a single thick bar across
                    // the opening instead of an arc that implies motion.
                    ctx.lineWidth += 2
                    ctx.beginPath()
                    if (isHorizontal) { ctx.moveTo(gx1, midY); ctx.lineTo(gx2, midY) }
                    else { ctx.moveTo(midX, gy1); ctx.lineTo(midX, gy2) }
                    ctx.stroke()
                } else if (isPanorama) {
                    // Multi-pane slider — opening line + evenly spaced panel dividers,
                    // so it reads as a multi-panel glass slider distinct from the
                    // simpler double-slider symbol. Offset bar marks the operable leaf(s).
                    const panelCount = (op as any).panelCount ?? 2
                    ctx.beginPath()
                    if (isHorizontal) { ctx.moveTo(gx1, midY); ctx.lineTo(gx2, midY) }
                    else { ctx.moveTo(midX, gy1); ctx.lineTo(midX, gy2) }
                    ctx.stroke()

                    ctx.lineWidth = Math.max(1, ctx.lineWidth - 0.5)
                    for (let i = 1; i < panelCount; i++) {
                        const t = i / panelCount
                        ctx.beginPath()
                        if (isHorizontal) {
                            const x = gx1 + doorPx * t
                            ctx.moveTo(x, midY - 4)
                            ctx.lineTo(x, midY + 4)
                        } else {
                            const y = gy1 + doorPx * t
                            ctx.moveTo(midX - 4, y)
                            ctx.lineTo(midX + 4, y)
                        }
                        ctx.stroke()
                    }

                    const slidingIndices: number[] = (op as any).slidingPanels ?? [panelCount - 1]
                    const panelLen = (doorPx / panelCount) * 0.85
                    slidingIndices.forEach(idx => {
                        const start = doorPx * (idx / panelCount)
                        ctx.beginPath()
                        if (isHorizontal) {
                            ctx.moveTo(gx1 + start, midY - 3)
                            ctx.lineTo(gx1 + start + panelLen, midY - 3)
                        } else {
                            ctx.moveTo(midX - 3, gy1 + start)
                            ctx.lineTo(midX - 3, gy1 + start + panelLen)
                        }
                        ctx.stroke()
                    })
                } else if (isSliding) {
                    // Opening line + a short offset bar showing the panel
                    // parked to one side — standard sliding-door symbol.
                    ctx.beginPath()
                    if (isHorizontal) { ctx.moveTo(gx1, midY); ctx.lineTo(gx2, midY) }
                    else { ctx.moveTo(midX, gy1); ctx.lineTo(midX, gy2) }
                    ctx.stroke()
                    const panelLen = doorPx * 0.9
                    ctx.beginPath()
                    if (isHorizontal) { ctx.moveTo(gx1, midY - 3); ctx.lineTo(gx1 + panelLen, midY - 3) }
                    else { ctx.moveTo(midX - 3, gy1); ctx.lineTo(midX - 3, gy1 + panelLen) }
                    ctx.stroke()
                } else if (isFolding) {
                    // Accordion / zig-zag symbol across the opening.
                    const segs = 4
                    ctx.beginPath()
                    if (isHorizontal) {
                        const segW = doorPx / segs
                        ctx.moveTo(gx1, midY)
                        for (let i = 1; i <= segs; i++) {
                            const x = gx1 + segW * i
                            const y = i % 2 === 0 ? midY : midY - segW * 0.35
                            ctx.lineTo(x, y)
                        }
                    } else {
                        const segH = doorPx / segs
                        ctx.moveTo(midX, gy1)
                        for (let i = 1; i <= segs; i++) {
                            const y = gy1 + segH * i
                            const x = i % 2 === 0 ? midX : midX - segH * 0.35
                            ctx.lineTo(x, y)
                        }
                    }
                    ctx.stroke()
                } else if (isDouble) {
                    // Double-swing door: two symmetric quarter-arcs meeting
                    // at the opening's center, each leaf's radius equal to
                    // half the total opening (one leaf's width).
                    if (isHorizontal) {
                        ctx.beginPath(); ctx.arc(gx1, midY, halfPx, 0, Math.PI / 2); ctx.stroke()
                        ctx.beginPath(); ctx.arc(gx2, midY, halfPx, Math.PI / 2, Math.PI); ctx.stroke()
                        ctx.beginPath(); ctx.moveTo(gx1, midY); ctx.lineTo(gx2, midY); ctx.stroke()
                    } else {
                        ctx.beginPath(); ctx.arc(midX, gy1, halfPx, 0, Math.PI / 2); ctx.stroke()
                        ctx.beginPath(); ctx.arc(midX, gy2, halfPx, -Math.PI / 2, 0); ctx.stroke()
                        ctx.beginPath(); ctx.moveTo(midX, gy1); ctx.lineTo(midX, gy2); ctx.stroke()
                    }
                } else {
                    // Single swing / pivot door.
                    if (isHorizontal) {
                        ctx.beginPath(); ctx.arc(gx1, midY, doorPx, 0, Math.PI / 2); ctx.stroke()
                        ctx.beginPath(); ctx.moveTo(gx1, midY); ctx.lineTo(gx1 + doorPx, midY); ctx.stroke()
                    } else {
                        ctx.beginPath(); ctx.arc(midX, gy1, doorPx, 0, Math.PI / 2); ctx.stroke()
                        ctx.beginPath(); ctx.moveTo(midX, gy1); ctx.lineTo(midX, gy1 + doorPx); ctx.stroke()
                    }
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
        if (!showFurniture) continue
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
        const normalX = Math.sin(angle) * faceDir, normalZ = -Math.cos(angle) * faceDir
        const labelOffset = 20
        const label = WALL_DECOR_LABELS[d.type]
        const anchorX = cx(dx), anchorY = cy(dz)
        const lx = anchorX + normalX * labelOffset
        const ly = anchorY + normalZ * labelOffset
        drawChipLabel(ctx, {
            x: lx, y: ly, text: label, dotColor: DOT_DECOR, zoom,
            selected: isSel, hovered: isHov,
            leaderFrom: { x: anchorX + normalX * (6 * faceDir), y: anchorY + normalZ * (6 * faceDir) },
        })
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

            const lx = px, ly = pz + (kind === 'wall-strip' ? 20 : 22)
            if (showLabels) {
                drawChipLabel(ctx, {
                    x: lx, y: ly, text: label, dotColor: DOT_LIGHT, zoom,
                    selected: isSel, hovered: isHov,
                    leaderFrom: { x: px, y: pz + 8 },
                })
            }
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

        const lx = px, ly = pz + 22
        drawChipLabel(ctx, {
            x: lx, y: ly, text: label, dotColor: DOT_LIGHT, zoom,
            selected: isSel, hovered: isHov,
            leaderFrom: { x: px, y: pz + 9 },
        })
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
        // Quantized to 0.1m so the live label (and its measureCached entry)
        // don't churn on every sub-mm cursor jitter while dragging out a room.
        const wLabel = quantizeMeters(Math.abs(drawRect.w), 10).toFixed(1)
        const dLabel = quantizeMeters(Math.abs(drawRect.d), 10).toFixed(1)
        drawChipLabel(ctx, {
            x: rx + rw / 2, y: rz + rd / 2, text: `${wLabel}m × ${dLabel}m`,
            dotColor: DOT_DIMENSION, zoom, selected: true,
        })
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
            const bwLabel = quantizeMeters(bw, 10).toFixed(1)
            const bdLabel = quantizeMeters(bd, 10).toFixed(1)
            drawChipLabel(ctx, {
                x: brx + brw / 2, y: brz + brd / 2, text: `${bwLabel}m × ${bdLabel}m`,
                dotColor: DOT_DIMENSION, zoom,
            })
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
        // Segment length labels — small pill (no dot, tighter padding via
        // font choice) so a wall with many short segments doesn't turn into
        // a wall of oversized badges, while still reading clearly over the
        // wall stroke and grid.
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i]!, b = nodes[i + 1]!
            const lenM = quantizeMeters(Math.hypot(b.x - a.x, b.z - a.z)).toFixed(2)
            const midX = cx((a.x + b.x) / 2), midZ = cy((a.z + b.z) / 2)
            const angle = Math.atan2(cy(b.z) - cy(a.z), cx(b.x) - cx(a.x))
            const displayAngle = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle
            ctx.save()
            ctx.translate(midX, midZ)
            ctx.rotate(displayAngle)
            drawPlainLabel(ctx, 0, -12, `${lenM}m`, { fontSize: Math.max(9, 10 * zoom), weight: 600 })
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
                const dv = op.variant ?? 'door-swing-single'
                const isDouble = dv === 'door-swing-double' || dv === 'door-swing-double-french' || dv === 'door-swing-double-arched'
                const isSliding = dv === 'door-sliding' || dv === 'door-sliding-double' || dv === 'door-pocket'
                const isFolding = dv === 'door-folding' || dv === 'door-folding-single' || dv === 'door-folding-french'
                const isGarage = dv === 'door-garage'

                ctx.strokeStyle = isOpSel ? '#4F46E5' : isOpHov ? '#A5A9FF' : '#818CF8'
                ctx.lineWidth = isOpSel ? 2.5 : 1.5

                if (isGarage) {
                    // Garage doors don't swing — a single thick bar across
                    // the opening reads better than an arc that implies
                    // motion the door doesn't actually have.
                    ctx.lineWidth += 2
                    ctx.beginPath()
                    ctx.moveTo(-hw, 0)
                    ctx.lineTo(hw, 0)
                    ctx.stroke()
                } else if (isSliding) {
                    // Sliding-door symbol: the opening line, plus a short
                    // offset bar showing the panel parked to one side —
                    // matches the standard "sliding door" plan symbol.
                    ctx.beginPath()
                    ctx.moveTo(-hw, 0)
                    ctx.lineTo(hw, 0)
                    ctx.stroke()
                    const panelLen = hw * 0.9
                    ctx.beginPath()
                    ctx.moveTo(-hw, -3)
                    ctx.lineTo(-hw + panelLen, -3)
                    ctx.stroke()
                } else if (isFolding) {
                    // Accordion / zig-zag symbol across the opening,
                    // matching a bifold door's plan symbol.
                    const segs = 4
                    const segW = (hw * 2) / segs
                    ctx.beginPath()
                    ctx.moveTo(-hw, 0)
                    for (let i = 1; i <= segs; i++) {
                        const x = -hw + segW * i
                        const y = i % 2 === 0 ? 0 : -segW * 0.35
                        ctx.lineTo(x, y)
                    }
                    ctx.stroke()
                } else if (isDouble) {
                    // Double-swing door: two symmetric quarter-arcs
                    // meeting at the opening's center — each leaf hinges
                    // at its own jamb and its radius is exactly one leaf's
                    // width (hw, since hw already equals half the total
                    // opening width, i.e. one leaf's width).
                    ctx.beginPath()
                    ctx.arc(-hw, 0, hw, 0, Math.PI / 2)
                    ctx.stroke()
                    ctx.beginPath()
                    ctx.arc(hw, 0, hw, Math.PI / 2, Math.PI)
                    ctx.stroke()
                    ctx.beginPath()
                    ctx.moveTo(-hw, 0)
                    ctx.lineTo(hw, 0)
                    ctx.stroke()
                } else {
                    // Single swing / pivot door: one quarter-arc from the
                    // hinge jamb, radius equal to the full leaf width.
                    ctx.beginPath()
                    ctx.arc(-hw, 0, op.width * scale, 0, Math.PI / 2)
                    ctx.stroke()
                    ctx.beginPath()
                    ctx.moveTo(-hw, 0)
                    ctx.lineTo(hw, 0)
                    ctx.stroke()
                }

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
            void nx; void nz
        }
        if (seg.height !== undefined && seg.height !== fp.roomHeight) {
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i]!, b = nodes[i + 1]!
                const midX = cx((a.x + b.x) / 2), midZ = cy((a.z + b.z) / 2)
                if (showLabels) {
                    drawChipLabel(ctx, {
                        x: midX, y: midZ + 16, text: `H: ${seg.height.toFixed(2)}m`,
                        dotColor: DOT_LIGHT, zoom,
                    })
                }
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
        ctx.setLineDash([])
        const cx_ = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
        const cz_ = nodes.reduce((s, n) => s + n.z, 0) / nodes.length
        drawPlainLabel(ctx, cx(cx_), cy(cz_), shapeMatch?.label || 'Area', {
            fontSize: Math.max(9, 11 * zoom),
            weight: 700,
            color: isSel ? '#4F46E5' : '#1a1a1a',
        })
        ctx.restore()
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
        if (!showFurniture) continue
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

        // Label — kept inline on the piece itself (space allowing) with a
        // text shadow for contrast; falls back visually fine since the
        // furniture body already has a solid fill.
        if (showLabels) {
            const fs = Math.max(8, Math.min(11, (fw / 4)))
            ctx.font = `600 ${fs}px system-ui`
            ctx.shadowColor = 'rgba(0,0,0,0.5)'
            ctx.shadowBlur = 3
            ctx.fillStyle = 'rgba(255,255,255,0.98)'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(FURNITURE_LABELS[f.type] ?? f.type, 0, 0)
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
        }

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

        drawStairIcon(ctx, s.type, sw, sd)

        ctx.restore()
        if (showLabels) {
            drawChipLabel(ctx, {
                x: sx, y: sz + sd / 2 + 16, text: STAIRS_LABELS[s.type],
                dotColor: DOT_OUTDOOR, zoom, selected: isSel, hovered: isHov,
            })
        }
    }
    // ── Annotations ──────────────────────────────────────────────────────────
    for (const ann of fp.annotations ?? []) {
        if (!ann.text || !showLabels) continue
        const ax = cx(ann.x), az = cy(ann.z)
        const isSel = selectedIds.includes(ann.id)
        const isHov = hoveredId === ann.id
        const fontSize = Math.max(11, (ann.fontSize ?? 13) * zoom)
        ctx.save()
        const annFont = `700 ${fontSize}px system-ui`
        ctx.font = annFont
        const tw = measureCached(ctx, ann.text, annFont)
        const padX = 12, padY = 7
        // Annotation chip — light background, black text, indigo border
        // only when selected. User-authored notes still get a background
        // (unlike room/area labels) since they can sit anywhere, but the
        // light/black styling keeps it consistent with the rest of the
        // plan instead of a loud solid-color pill.
        ctx.shadowColor = 'rgba(0,0,0,0.18)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetY = 1
        ctx.fillStyle = isSel ? 'rgba(224,225,255,0.98)' : 'rgba(255,255,255,0.95)'
        ctx.beginPath()
        ctx.roundRect(ax - tw / 2 - padX, az - fontSize / 2 - padY, tw + padX * 2, fontSize + padY * 2, 8)
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
        ctx.strokeStyle = isSel ? '#4F46E5' : isHov ? 'rgba(99,102,241,0.55)' : 'rgba(0,0,0,0.15)'
        ctx.lineWidth = isSel ? 1.5 : 1
        ctx.stroke()
        // Text
        ctx.fillStyle = isSel ? '#4F46E5' : '#1a1a1a'
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
        if (showLabels) {
            drawChipLabel(ctx, {
                x: cx(o.x), y: cy(o.z) + (isFlat ? 0 : 18), text: label,
                dotColor: DOT_OUTDOOR, zoom, selected: isSel, hovered: isHov,
            })
        }
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
                ctx.translate(midX, midZ)
                ctx.rotate(display)
                drawChipLabel(ctx, { x: 0, y: -18, text: label, dotColor: DOT_DIMENSION, zoom, selected: true })
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
            // so the pointer itself never covers it. Uses the same pill
            // renderer with a "ruler" dot so it visually matches every
            // other measurement/dimension label on the plan.
            if (lenM > 0.02) {
                const tagLabel = `${quantizeMeters(lenM).toFixed(2)}m`
                const tagOffsetX = 26, tagOffsetY = 22
                drawChipLabel(ctx, {
                    x: tx + tagOffsetX, y: tz + tagOffsetY, text: tagLabel,
                    dotColor: DOT_DIMENSION, zoom, selected: true,
                    anchor: 'left',
                    leaderFrom: { x: tx, y: tz },
                })
            }
        }
    }
}