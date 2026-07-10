import { deriveClosedPolygons, getSegmentOpeningWorldPos, toCanvas } from "@/lib/helpers";
import { EditorTool, FloorPlanState, FURNITURE_COLORS, FURNITURE_FOOTPRINTS, FURNITURE_LABELS, LineNode, MIN_ROOM, PX_PER_M, STAIRS_LABELS, WALL_DECOR_LABELS } from "./Tools/constants";

export function draw2D(
    ctx: CanvasRenderingContext2D,
    fp: FloorPlanState,
    tool: EditorTool,
    selectedId: string | null,
    hoveredId: string | null,
    drawRect: { x: number; z: number; w: number; d: number } | null,
    pencilPoints: { x: number, z: number }[],
    zoom: number,
    pan: { x: number; y: number },
    preview: { x: number; z: number } | null,
    activeLineNodeId: string | null,
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
        const isSel = selectedId === room.id
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
        for (const op of fp.openings.filter(o => o.roomId === room.id && !o.segmentNodeIds)) {
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

            if (op.type === 'door') {
                const doorPx = op.width * scale
                ctx.save()
                ctx.strokeStyle = '#818CF8'
                ctx.lineWidth = 1.5
                if (isHorizontal) {
                    ctx.beginPath(); ctx.arc(gx1, (gy1 + gy2) / 2, doorPx, 0, Math.PI / 2); ctx.stroke()
                    ctx.beginPath(); ctx.moveTo(gx1, (gy1 + gy2) / 2); ctx.lineTo(gx1 + doorPx, (gy1 + gy2) / 2); ctx.stroke()
                } else {
                    ctx.beginPath(); ctx.arc((gx1 + gx2) / 2, gy1, doorPx, 0, Math.PI / 2); ctx.stroke()
                    ctx.beginPath(); ctx.moveTo((gx1 + gx2) / 2, gy1); ctx.lineTo((gx1 + gx2) / 2, gy1 + doorPx); ctx.stroke()
                }
                ctx.restore()
            } else if (op.type === 'opening') {
                if (op.variant === 'opening-archway') {
                    // Archway — draw curved arch outline
                    ctx.save()
                    ctx.strokeStyle = 'rgba(200,180,140,0.85)'
                    ctx.lineWidth = 1.8
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
                    ctx.strokeStyle = 'rgba(180,170,150,0.6)'
                    ctx.lineWidth = 1
                    ctx.setLineDash([3, 3])
                    ctx.strokeRect(gx1, gy1, gx2 - gx1, gy2 - gy1)
                    ctx.setLineDash([])
                    ctx.restore()
                }
            } else {
                ctx.save()
                ctx.fillStyle = 'rgba(147,197,253,0.5)'
                ctx.strokeStyle = '#60A5FA'
                ctx.lineWidth = 1.5
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
    for (const d of fp.wallDecor ?? []) {
        let dx: number, dz: number, angle: number
        if (d.segmentNodeIds) {
            const a = fp.lineNodes.find(n => n.id === d.segmentNodeIds![0])
            const b = fp.lineNodes.find(n => n.id === d.segmentNodeIds![1])
            if (!a || !b) continue
            const t = d.segmentT ?? 0
            dx = a.x + (b.x - a.x) * t
            dz = a.z + (b.z - a.z) * t
            angle = Math.atan2(b.z - a.z, b.x - a.x)
        } else {
            const room = fp.rooms.find(r => r.id === d.roomId)
            if (!room || !d.wall) continue
            if (d.wall === 'north') { dx = room.x + d.position; dz = room.z; angle = 0 }
            else if (d.wall === 'south') { dx = room.x + d.position; dz = room.z + room.depth; angle = 0 }
            else if (d.wall === 'west') { dx = room.x; dz = room.z + d.position; angle = Math.PI / 2 }
            else { dx = room.x + room.width; dz = room.z + d.position; angle = Math.PI / 2 }
        }
        const isSel = selectedId === d.id
        const isHov = hoveredId === d.id
        const dw = d.width * scale

        // Flip text right-side-up regardless of wall direction (same fix used for
        // wall-segment length labels elsewhere in draw2D)
        const displayAngle = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle

        ctx.save()
        ctx.translate(cx(dx), cy(dz))
        ctx.rotate(angle)
        ctx.fillStyle = isSel ? 'rgba(99,102,241,0.6)' : isHov ? 'rgba(200,180,140,0.7)' : 'rgba(200,180,140,0.5)'
        ctx.strokeStyle = isSel ? 'rgba(165,168,255,0.9)' : 'rgba(160,140,100,0.6)'
        ctx.lineWidth = isSel ? 1.5 : 1
        ctx.fillRect(-dw / 2, -3, dw, 6)
        ctx.strokeRect(-dw / 2, -3, dw, 6)
        ctx.restore()

        // Label drawn in a SEPARATE, un-rotated-by-wall-angle pass so text is
        // always upright and legible, offset outward from the wall on its
        // normal so overlapping items don't stack directly on top of each other
        const normalX = Math.sin(angle), normalZ = -Math.cos(angle)
        const labelOffset = 14
        const label = WALL_DECOR_LABELS[d.type]
        ctx.save()
        ctx.font = `600 ${Math.max(8, 8 * zoom)}px system-ui`
        const tw = ctx.measureText(label).width
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
        ctx.save()
        ctx.fillStyle = 'rgba(80,60,40,0.85)'
        ctx.font = `600 ${Math.max(8, 8 * zoom)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(
            WALL_DECOR_LABELS[d.type],
            cx(dx) + normalX * labelOffset,
            cy(dz) + normalZ * labelOffset
        )
        ctx.restore()
    }
    // ── Preview rectangle while drawing ───────────────────────────────────────
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
        ctx.fillText(`${Math.abs(drawRect.w).toFixed(1)}m × ${Math.abs(drawRect.d).toFixed(1)}m`, rx + rw / 2, rz + rd / 2)
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
            ctx.fillText(`${bw.toFixed(1)}m × ${bd.toFixed(1)}m`, brx + brw / 2, brz + brd / 2)
        }
        ctx.restore()
    }
    // ── Line segments ──────────────────────────────────────────────────────────
    for (const seg of fp.lineSegments ?? []) {
        const nodes = seg.nodeIds.map(nid => fp.lineNodes.find(n => n.id === nid)).filter(Boolean) as LineNode[]
        if (nodes.length < 2) continue

        const isSel = selectedId === seg.id
        const isHov = hoveredId === seg.id

        ctx.save()
        ctx.strokeStyle = isSel
            ? 'rgba(99,102,241,0.95)'
            : isHov
                ? 'rgba(165,168,255,0.85)'
                : 'rgba(148,163,184,0.75)'
        ctx.lineWidth = Math.max(3, (seg.thickness ?? 0.15) * scale)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(cx(nodes[0]!.x), cy(nodes[0]!.z))
        for (let i = 1; i < nodes.length; i++) ctx.lineTo(cx(nodes[i]!.x), cy(nodes[i]!.z))
        if (seg.closed) ctx.closePath()
        ctx.stroke()

        // Segment length labels
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i]!, b = nodes[i + 1]!
            const lenM = Math.hypot(b.x - a.x, b.z - a.z).toFixed(2)
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
        for (const op of fp.openings.filter(o => o.roomId === seg.id && o.segmentNodeIds)) {
            const pos = getSegmentOpeningWorldPos(op, fp.lineNodes)
            if (!pos) continue
            const hw = (op.width / 2) * scale
            const nx = Math.sin(pos.angle)
            const nz = -Math.cos(pos.angle)

            ctx.save()
            ctx.translate(cx(pos.wx), cy(pos.wz))
            ctx.rotate(pos.angle)

            // Clear gap in wall
            ctx.clearRect(-hw, -wallT / 2, hw * 2, wallT)

            if (op.type === 'door') {
                ctx.strokeStyle = '#818CF8'
                ctx.lineWidth = 1.5
                ctx.beginPath()
                ctx.arc(-hw, 0, op.width * scale, 0, Math.PI / 2)
                ctx.stroke()
                ctx.beginPath()
                ctx.moveTo(-hw, 0)
                ctx.lineTo(hw, 0)
                ctx.stroke()
            } else if (op.type === 'opening') {
                if (op.variant === 'opening-archway') {
                    // Archway on line segment — curved arch
                    ctx.strokeStyle = 'rgba(200,180,140,0.85)'
                    ctx.lineWidth = 1.8
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
                    ctx.strokeStyle = 'rgba(180,170,150,0.6)'
                    ctx.lineWidth = 1
                    ctx.setLineDash([3, 3])
                    ctx.strokeRect(-hw, -wallT / 2, hw * 2, wallT)
                    ctx.setLineDash([])
                }
            } else {
                ctx.fillStyle = 'rgba(147,197,253,0.5)'
                ctx.strokeStyle = '#60A5FA'
                ctx.lineWidth = 1.5
                ctx.fillRect(-hw, -wallT / 2, hw * 2, wallT)
                ctx.strokeRect(-hw, -wallT / 2, hw * 2, wallT)
            }
            ctx.restore()
        }
    }
    // ── Closed shapes ──────────────────────────────────────────────────────────
    for (const nodeIds of deriveClosedPolygons(fp.lineNodes, fp.lineSegments)) {
        const nodes = nodeIds.map(nid => fp.lineNodes.find(n => n.id === nid)).filter(Boolean) as LineNode[]
        if (nodes.length < 3) continue
        const shapeMatch = fp.closedShapes?.find(s => s.nodeIds.length === nodeIds.length && s.nodeIds.every(id => nodeIds.includes(id)))
        const isSel = shapeMatch && selectedId === shapeMatch.id
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
        ctx.save(); ctx.beginPath(); ctx.moveTo(cx(nodes[0]!.x), cy(nodes[0]!.z))
        for (let i = 1; i < nodes.length; i++) ctx.lineTo(cx(nodes[i]!.x), cy(nodes[i]!.z))
        ctx.closePath()
        ctx.fillStyle = 'rgba(139,123,107,0.12)'; ctx.fill()
        ctx.strokeStyle = 'rgba(139,123,107,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.stroke()
        const cx_ = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
        const cz_ = nodes.reduce((s, n) => s + n.z, 0) / nodes.length
        ctx.setLineDash([]); ctx.fillStyle = 'rgba(165,168,255,0.7)'; ctx.font = `${Math.max(9, 11 * zoom)}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('Area', cx(cx_), cy(cz_)); ctx.restore()
    }
    // ── Line nodes ─────────────────────────────────────────────────────────────
    for (const node of fp.lineNodes ?? []) {
        const isActive = activeLineNodeId === node.id
        const isSel = selectedId === node.id
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
        const isSel = selectedId === f.id
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
        const isSel = selectedId === s.id
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
            ctx.beginPath(); ctx.arc(0, 0, Math.min(sw, sd) / 2 - 3, 0, Math.PI * 1.7); ctx.stroke()
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
        ctx.font = `600 ${fontSize}px system-ui`
        const tw = ctx.measureText(ann.text).width
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
    // ── Live measurement rubber band ──────────────────────────────────────────
    if ((tool === 'line' || tool === 'bend') && activeLineNodeId && preview) {
        const fromNode = fp.lineNodes.find(n => n.id === activeLineNodeId)
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
                const label = `${lenM.toFixed(2)}m`
                ctx.font = `bold ${Math.max(10, 11 * zoom)}px system-ui`
                const tw = ctx.measureText(label).width
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

            // Snap indicator
            ctx.save()
            const nearNode = fp.lineNodes.find(n =>
                n.id !== activeLineNodeId && Math.hypot(preview.x - n.x, preview.z - n.z) < 0.4 / zoom
            )
            ctx.beginPath()
            ctx.arc(tx, tz, nearNode ? 9 : 5, 0, Math.PI * 2)
            ctx.fillStyle = nearNode ? 'rgba(34,197,94,0.9)' : 'rgba(99,102,241,0.8)'
            ctx.fill()
            if (nearNode) { ctx.strokeStyle = 'rgba(34,197,94,0.4)'; ctx.lineWidth = 3; ctx.stroke() }
            ctx.restore()
        }
    }
}