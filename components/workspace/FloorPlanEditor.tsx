'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EditorRoom = {
    id: string
    x: number
    z: number
    width: number
    depth: number
    label: string
}

export type EditorOpening = {
    id: string
    roomId: string
    wall: 'north' | 'south' | 'east' | 'west'
    type: 'door' | 'window'
    position: number
    width: number
    height: number
    sillHeight: number
    swingDirection: 'inward' | 'outward'
    // For line-segment openings: store world-space position along the segment
    segmentNodeIds?: string[]   // [fromNodeId, toNodeId] of the sub-segment
    segmentT?: number           // 0..1 along that sub-segment
}



export type ClosedShape = { id: string; nodeIds: string[]; label: string; color: string }

export type Annotation = { id: string; x: number; z: number; text: string; fontSize: number }

export type FloorPlanState = {
    rooms: EditorRoom[]; openings: EditorOpening[]; roomHeight: number
    lineNodes: LineNode[]; lineSegments: LineSegment[]; closedShapes: ClosedShape[]
    annotations: Annotation[]
}

const DEFAULT_FP: FloorPlanState = {
    rooms: [], openings: [], roomHeight: 2.7,
    lineNodes: [], lineSegments: [], closedShapes: [],
    annotations: [],
}

export type LineNode = {
    id: string
    x: number
    z: number
}

export type LineSegment = {
    id: string
    nodeIds: string[]
    thickness: number
    closed: boolean
}

type EditorTool = 'select' | 'pan' | 'room' | 'door' | 'window' | 'delete' | 'pencil' | 'line' | 'bend' | 'annotate'
const GRID_M = 0.5
const PX_PER_M = 40
const MIN_ROOM = 1.0

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }
function snapM(v: number) { return Math.round(v / GRID_M) * GRID_M }
function toWorld(canvasPx: number, panPx: number, zoom: number) { return (canvasPx - panPx) / (PX_PER_M * zoom) }
function toCanvas(worldM: number, panPx: number, zoom: number) { return worldM * PX_PER_M * zoom + panPx }

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

// Get the world position of a line-segment opening
function getSegmentOpeningWorldPos(op: EditorOpening, nodes: LineNode[]): { wx: number; wz: number; angle: number } | null {
    if (!op.segmentNodeIds || op.segmentT === undefined) return null
    const a = nodes.find(n => n.id === op.segmentNodeIds![0])
    const b = nodes.find(n => n.id === op.segmentNodeIds![1])
    if (!a || !b) return null
    const t = op.segmentT
    const wx = a.x + (b.x - a.x) * t
    const wz = a.z + (b.z - a.z) * t
    const angle = Math.atan2(b.z - a.z, b.x - a.x)
    return { wx, wz, angle }
}

/** Dynamically finds all closed polygons from lineSegments + lineNodes.
 *  Returns arrays of node IDs for each detected cycle.
 *  This is called at render time so edits to nodes/segments are always reflected. */
function deriveClosedPolygons(lineNodes: LineNode[], lineSegments: LineSegment[]): string[][] {
    // Build adjacency list from all segments
    const adj = new Map<string, Set<string>>()
    for (const seg of lineSegments) {
        for (let i = 0; i < seg.nodeIds.length - 1; i++) {
            const a = seg.nodeIds[i]!, b = seg.nodeIds[i + 1]!
            if (!adj.has(a)) adj.set(a, new Set())
            if (!adj.has(b)) adj.set(b, new Set())
            adj.get(a)!.add(b)
            adj.get(b)!.add(a)
        }
    }

    // Only consider nodes with 2+ connections (part of a potential cycle)
    const candidates = new Set(
        [...adj.entries()]
            .filter(([, neighbors]) => neighbors.size >= 2)
            .map(([id]) => id)
    )

    const foundCycles: string[][] = []
    const usedSets: Array<Set<string>> = []

    for (const startId of candidates) {
        // DFS to find shortest cycle starting from this node
        function dfs(path: string[]): string[] | null {
            const current = path[path.length - 1]!
            for (const next of adj.get(current) ?? []) {
                if (next === startId && path.length >= 3) {
                    return [...path] // found cycle back to start
                }
                if (path.includes(next)) continue
                if (!candidates.has(next)) continue
                const result = dfs([...path, next])
                if (result) return result
            }
            return null
        }

        const cycle = dfs([startId])
        if (!cycle || cycle.length < 3) continue

        // Check this isn't a duplicate of an already-found cycle
        const cycleSet = new Set(cycle)
        const isDuplicate = usedSets.some(existing =>
            existing.size === cycleSet.size &&
            [...existing].every(id => cycleSet.has(id))
        )
        if (isDuplicate) continue

        usedSets.push(cycleSet)
        foundCycles.push(cycle)
    }

    return foundCycles
}
// ── 2D Canvas draw ────────────────────────────────────────────────────────────

function draw2D(
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
    for (const ann of fp.annotations ?? []) {
        const ax = toCanvas(ann.x, pan.x, zoom)
        const az = toCanvas(ann.z, pan.y, zoom)
        ctx.save()
        const fs = Math.max(10, (ann.fontSize ?? 13) * zoom)
        ctx.font = `600 ${fs}px system-ui`
        const tw = ctx.measureText(ann.text).width
        // Badge background
        ctx.fillStyle = 'rgba(99,102,241,0.18)'
        ctx.beginPath()
        ctx.roundRect(ax - tw / 2 - 6, az - fs / 2 - 4, tw + 12, fs + 8, 4)
        ctx.fill()
        ctx.strokeStyle = 'rgba(99,102,241,0.4)'
        ctx.lineWidth = 1
        ctx.stroke()
        // Text
        ctx.fillStyle = 'rgba(200,205,255,0.95)'
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

// ── Line segment 3D renderer — WITH FLOORS ────────────────────────────────────

function LineWalls3D({ fp }: { fp: FloorPlanState }) {
    const H = fp.roomHeight
    const T = 0.15

    return (
        <>
            {(fp.lineSegments ?? []).map(seg => {
                const nodes = seg.nodeIds
                    .map(nid => fp.lineNodes.find(n => n.id === nid))
                    .filter(Boolean) as LineNode[]
                if (nodes.length < 2) return null

                const panels: React.ReactNode[] = []

                for (let i = 0; i < nodes.length - 1; i++) {
                    const a = nodes[i]!, b = nodes[i + 1]!
                    const dx = b.x - a.x, dz = b.z - a.z
                    const len = Math.hypot(dx, dz)
                    if (len < 0.05) continue

                    const mcx = (a.x + b.x) / 2
                    const mcz = (a.z + b.z) / 2
                    const angle = Math.atan2(dz, dx)

                    const segOpenings = fp.openings.filter(op =>
                        op.roomId === seg.id &&
                        op.segmentNodeIds?.[0] === a.id &&
                        op.segmentNodeIds?.[1] === b.id
                    )

                    if (segOpenings.length === 0) {
                        panels.push(
                            <mesh key={`${seg.id}_${i}`} position={[mcx, H / 2, mcz]} rotation={[0, -angle, 0]} castShadow receiveShadow>
                                <boxGeometry args={[len, H, T]} />
                                <meshStandardMaterial color="#8B7B6B" roughness={0.85} />
                            </mesh>
                        )
                    } else {
                        const sorted = [...segOpenings].sort((a, b) => (a.segmentT ?? 0) - (b.segmentT ?? 0))
                        let cursor = 0

                        for (let si = 0; si <= sorted.length; si++) {
                            const op = sorted[si]
                            const opPos = op ? (op.segmentT ?? 0) * len : len
                            const segEnd = op ? opPos - op.width / 2 : len
                            const segLen = segEnd - cursor

                            if (segLen > 0.02) {
                                const segMid = cursor + segLen / 2
                                const wx = a.x + (dx / len) * segMid
                                const wz = a.z + (dz / len) * segMid
                                panels.push(
                                    <mesh key={`${seg.id}_${i}_l${si}`} position={[wx, H / 2, wz]} rotation={[0, -angle, 0]} castShadow receiveShadow>
                                        <boxGeometry args={[segLen, H, T]} />
                                        <meshStandardMaterial color="#8B7B6B" roughness={0.85} />
                                    </mesh>
                                )
                            }

                            if (op) {
                                const opPos2 = (op.segmentT ?? 0) * len
                                const headerH = H - op.height
                                if (headerH > 0.02) {
                                    const hx = a.x + (dx / len) * opPos2
                                    const hz = a.z + (dz / len) * opPos2
                                    panels.push(
                                        <mesh key={`${seg.id}_${i}_h${si}`} position={[hx, op.height + headerH / 2, hz]} rotation={[0, -angle, 0]} castShadow receiveShadow>
                                            <boxGeometry args={[op.width, headerH, T]} />
                                            <meshStandardMaterial color="#8B7B6B" roughness={0.85} />
                                        </mesh>
                                    )
                                }
                                if (op.type === 'window' && op.sillHeight > 0.02) {
                                    const sx = a.x + (dx / len) * opPos2
                                    const sz = a.z + (dz / len) * opPos2
                                    panels.push(
                                        <mesh key={`${seg.id}_${i}_s${si}`} position={[sx, op.sillHeight / 2, sz]} rotation={[0, -angle, 0]} castShadow receiveShadow>
                                            <boxGeometry args={[op.width, op.sillHeight, T]} />
                                            <meshStandardMaterial color="#8B7B6B" roughness={0.85} />
                                        </mesh>
                                    )
                                }
                                if (op.type === 'door') {
                                    const perpX = -dz / len
                                    const perpZ = dx / len
                                    const hingeDx = a.x + (dx / len) * (opPos2 - op.width / 2)
                                    const hingeDz = a.z + (dz / len) * (opPos2 - op.width / 2)
                                    const leafCx = hingeDx + (dx / len) * (op.width / 2) + perpX * (op.width / 2)
                                    const leafCz = hingeDz + (dz / len) * (op.width / 2) + perpZ * (op.width / 2)
                                    panels.push(
                                        <mesh key={`${seg.id}_${i}_door${si}`} position={[leafCx, op.height / 2, leafCz]} rotation={[0, -angle + Math.PI / 2, 0]} castShadow>
                                            <boxGeometry args={[op.width, op.height, 0.04]} />
                                            <meshStandardMaterial color="#C8A878" roughness={0.55} metalness={0.05} />
                                        </mesh>
                                    )
                                }
                                cursor = opPos + op.width / 2
                            }
                        }
                    }
                }

                return <group key={seg.id}>{panels}</group>
            })}

            {/* Floor — one plane per closed shape, keyed by shape id */}
            {deriveClosedPolygons(fp.lineNodes, fp.lineSegments).map((nodeIds, idx) => {
                const nodes = nodeIds
                    .map(nid => fp.lineNodes.find(n => n.id === nid))
                    .filter(Boolean) as LineNode[]
                if (nodes.length < 3) return null

                // THREE.Shape lives in XY plane.
                // After rotation=[-PI/2, 0, 0]: shape-X → world-X, shape-Y → world-Z
                // So we pass (node.x, -node.z) to get correct world position after rotation.
                const shape = new THREE.Shape()
                shape.moveTo(nodes[0]!.x, -nodes[0]!.z)
                for (let i = 1; i < nodes.length; i++) {
                    shape.lineTo(nodes[i]!.x, -nodes[i]!.z)
                }
                shape.closePath()

                const geometry = new THREE.ShapeGeometry(shape)

                return (
                    <mesh
                        key={`floor_derived_${idx}`}
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, 0.002, 0]}
                        receiveShadow
                    >
                        <primitive object={geometry} attach="geometry" />
                        <meshStandardMaterial color="#D4C4A0" roughness={0.82} side={THREE.DoubleSide} />
                    </mesh>
                )
            })}
            {/* Column joints at nodes */}
            {(fp.lineNodes ?? []).map(node => (
                <mesh key={node.id} position={[node.x, H / 2, node.z]}>
                    <cylinderGeometry args={[T / 2, T / 2, H, 8]} />
                    <meshStandardMaterial color="#6B5B4E" roughness={0.8} />
                </mesh>
            ))}
        </>
    )
}

// ── 3D Preview ────────────────────────────────────────────────────────────────

function Room3D({ room, openings, roomHeight }: { room: EditorRoom; openings: EditorOpening[]; roomHeight: number }) {
    const cx = room.x + room.width / 2
    const cz = room.z + room.depth / 2
    const W = room.width, D = room.depth, H = roomHeight, T = 0.15

    const walls = [
        { name: 'north' as const, axis: 'x' as const },
        { name: 'south' as const, axis: 'x' as const },
        { name: 'west' as const, axis: 'z' as const },
        { name: 'east' as const, axis: 'z' as const },
    ]

    function wallWorldPos(name: 'north' | 'south' | 'east' | 'west'): [number, number, number] {
        if (name === 'north') return [cx, H / 2, room.z + T / 2]
        if (name === 'south') return [cx, H / 2, room.z + D - T / 2]
        if (name === 'west') return [room.x + T / 2, H / 2, cz]
        return [room.x + W - T / 2, H / 2, cz]
    }

    function wallSize(axis: 'x' | 'z'): [number, number, number] {
        return axis === 'x' ? [W, H, T] : [T, H, D]
    }

    return (
        <group>
            <mesh position={[cx, 0.002, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[W - T * 2, D - T * 2]} />
                <meshStandardMaterial color="#D4C4A0" roughness={0.82} metalness={0} />
            </mesh>

            {walls.map(wall => {
                const wallOpenings = openings.filter(o => o.wall === wall.name && !o.segmentNodeIds)
                const wallLen = wall.axis === 'x' ? W : D
                const wPos = wallWorldPos(wall.name)

                if (wallOpenings.length === 0) {
                    return (
                        <mesh key={wall.name} position={wPos} castShadow receiveShadow>
                            <boxGeometry args={wallSize(wall.axis)} />
                            <meshStandardMaterial color="#8B7B6B" roughness={0.85} />
                        </mesh>
                    )
                }

                const panels: React.ReactNode[] = []
                const sorted = [...wallOpenings].sort((a, b) => a.position - b.position)
                let cursor = 0

                for (let i = 0; i <= sorted.length; i++) {
                    const op = sorted[i]
                    const segEnd = op ? op.position - op.width / 2 : wallLen
                    const segLen = segEnd - cursor

                    if (segLen > 0.02) {
                        const segMid = cursor + segLen / 2
                        const pos: [number, number, number] = wall.axis === 'x'
                            ? [room.x + segMid, H / 2, wPos[2]]
                            : [wPos[0], H / 2, room.z + segMid]
                        const size: [number, number, number] = wall.axis === 'x' ? [segLen, H, T] : [T, H, segLen]
                        panels.push(<mesh key={`l${i}`} position={pos} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color="#8B7B6B" roughness={0.85} /></mesh>)
                    }

                    if (op) {
                        const headerH = H - op.height
                        if (headerH > 0.02) {
                            const opMid = op.position
                            const hPos: [number, number, number] = wall.axis === 'x' ? [room.x + opMid, op.height + headerH / 2, wPos[2]] : [wPos[0], op.height + headerH / 2, room.z + opMid]
                            const hSize: [number, number, number] = wall.axis === 'x' ? [op.width, headerH, T] : [T, headerH, op.width]
                            panels.push(<mesh key={`h${i}`} position={hPos} castShadow receiveShadow><boxGeometry args={hSize} /><meshStandardMaterial color="#8B7B6B" roughness={0.85} /></mesh>)
                        }

                        if (op.type === 'window' && op.sillHeight > 0.02) {
                            const opMid = op.position
                            const sPos: [number, number, number] = wall.axis === 'x' ? [room.x + opMid, op.sillHeight / 2, wPos[2]] : [wPos[0], op.sillHeight / 2, room.z + opMid]
                            const sSize: [number, number, number] = wall.axis === 'x' ? [op.width, op.sillHeight, T] : [T, op.sillHeight, op.width]
                            panels.push(<mesh key={`s${i}`} position={sPos} castShadow receiveShadow><boxGeometry args={sSize} /><meshStandardMaterial color="#8B7B6B" roughness={0.85} /></mesh>)
                        }

                        if (op.type === 'window') {
                            const opMid = op.position
                            const gPos: [number, number, number] = wall.axis === 'x' ? [room.x + opMid, op.sillHeight + op.height / 2, wPos[2]] : [wPos[0], op.sillHeight + op.height / 2, room.z + opMid]
                            const gSize: [number, number, number] = wall.axis === 'x' ? [op.width, op.height, 0.025] : [0.025, op.height, op.width]
                            panels.push(<mesh key={`g${i}`} position={gPos}><boxGeometry args={gSize} /><meshStandardMaterial color="#93C5FD" transparent opacity={0.35} roughness={0.05} metalness={0.15} side={THREE.DoubleSide} /></mesh>)
                        }

                        if (op.type === 'door') {
                            const inward = op.swingDirection !== 'outward'
                            const swingSign = inward ? 1 : -1
                            const opMid = op.position
                            const hingeOffset = -op.width / 2
                            const leafAngle = Math.PI / 2 * swingSign
                            const doorPos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid + hingeOffset + (op.width / 2) * Math.cos(leafAngle), op.height / 2, wPos[2] + (op.width / 2) * Math.sin(leafAngle) * swingSign]
                                : [wPos[0] + (op.width / 2) * Math.sin(leafAngle) * swingSign, op.height / 2, room.z + opMid + hingeOffset + (op.width / 2) * Math.cos(leafAngle)]
                            const doorRot: [number, number, number] = wall.axis === 'x' ? [0, leafAngle, 0] : [0, leafAngle + Math.PI / 2, 0]
                            panels.push(<mesh key={`door${i}`} position={doorPos} rotation={doorRot} castShadow><boxGeometry args={[op.width, op.height, 0.04]} /><meshStandardMaterial color="#C8A878" roughness={0.55} metalness={0.05} /></mesh>)
                        }

                        cursor = op.position + op.width / 2
                    }
                }
                return <group key={wall.name}>{panels}</group>
            })}
        </group>
    )
}

function Scene3D({ fp }: { fp: FloorPlanState }) {
    return (
        <>
            <ambientLight intensity={2.0} color="#FFF8F0" />
            <directionalLight position={[10, 15, 10]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-5, 8, -5]} intensity={0.8} color="#C8D4E8" />
            {fp.rooms.map(room => (
                <Room3D key={room.id} room={room} openings={fp.openings.filter(o => o.roomId === room.id)} roomHeight={fp.roomHeight} />
            ))}
            <LineWalls3D fp={fp} />
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
            <gridHelper args={[50, 50, '#1C1A17', '#1C1A17']} position={[0, -0.01, 0]} />
        </>
    )
}

// ── Properties panel ──────────────────────────────────────────────────────────

function PropsPanel({ fp, selectedId, onChange, onDelete }: {
    fp: FloorPlanState
    selectedId: string | null
    onChange: (fp: FloorPlanState) => void
    onDelete: () => void
}) {
    const room = fp.rooms.find(r => r.id === selectedId)
    const opening = fp.openings.find(o => o.id === selectedId)
    const node = fp.lineNodes.find(n => n.id === selectedId)
    const seg = fp.lineSegments.find(s => s.id === selectedId)

    if (!room && !opening && !node && !seg) return (
        <div style={{ padding: 16, fontSize: 11, color: 'rgba(100,116,139,0.5)', textAlign: 'center' }}>
            Select a room, wall, node or opening to edit properties
        </div>
    )

    const patchRoom = (patch: Partial<EditorRoom>) =>
        onChange({ ...fp, rooms: fp.rooms.map(r => r.id === room?.id ? { ...r, ...patch } : r) })

    const patchOpening = (patch: Partial<EditorOpening>) =>
        onChange({ ...fp, openings: fp.openings.map(o => o.id === opening?.id ? { ...o, ...patch } : o) })

    const patchNode = (patch: Partial<LineNode>) =>
        onChange({ ...fp, lineNodes: fp.lineNodes.map(n => n.id === node?.id ? { ...n, ...patch } : n) })

    return (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.7)' }}>
                {room ? 'ROOM' : opening ? opening.type.toUpperCase() : node ? 'WALL NODE' : 'WALL SEGMENT'}
            </div>

            {room && <>
                <PropField label="Label"><input value={room.label} onChange={e => patchRoom({ label: e.target.value })} style={inputStyle} /></PropField>
                <PropField label="Width (m)"><NumInput value={room.width} min={1} max={30} step={0.5} onChange={v => patchRoom({ width: v })} /></PropField>
                <PropField label="Depth (m)"><NumInput value={room.depth} min={1} max={30} step={0.5} onChange={v => patchRoom({ depth: v })} /></PropField>
                <PropField label="X pos (m)"><NumInput value={room.x} min={-50} max={50} step={0.5} onChange={v => patchRoom({ x: v })} /></PropField>
                <PropField label="Z pos (m)"><NumInput value={room.z} min={-50} max={50} step={0.5} onChange={v => patchRoom({ z: v })} /></PropField>
            </>}

            {node && <>
                <PropField label="X pos (m)"><NumInput value={node.x} min={-50} max={50} step={0.5} onChange={v => patchNode({ x: snapM(v) })} /></PropField>
                <PropField label="Z pos (m)"><NumInput value={node.z} min={-50} max={50} step={0.5} onChange={v => patchNode({ z: snapM(v) })} /></PropField>
            </>}

            {seg && <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.6)' }}>
                Wall segment with {seg.nodeIds.length} nodes. Select individual nodes to reposition.
            </div>}

            {opening && <>
                <PropField label="Width (m)"><NumInput value={opening.width} min={0.5} max={4} step={0.1} onChange={v => patchOpening({ width: v })} /></PropField>
                {opening.type === 'window' && <>
                    <PropField label="Height (m)"><NumInput value={opening.height} min={0.3} max={2.5} step={0.1} onChange={v => patchOpening({ height: v })} /></PropField>
                    <PropField label="Sill (m)"><NumInput value={opening.sillHeight} min={0} max={2} step={0.1} onChange={v => patchOpening({ sillHeight: v })} /></PropField>
                </>}
                <PropField label="Position (m)"><NumInput value={opening.position} min={0.3} max={20} step={0.1} onChange={v => patchOpening({ position: v })} /></PropField>
                {opening.type === 'door' && (
                    <PropField label="Swing">
                        <button
                            onClick={() => patchOpening({ swingDirection: opening.swingDirection === 'inward' ? 'outward' : 'inward' })}
                            style={{ height: 26, padding: '0 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: 'rgba(165,168,255,0.9)', fontSize: 11, fontWeight: 600 }}
                        >
                            {opening.swingDirection === 'inward' ? '← Inward' : '→ Outward'}
                        </button>
                    </PropField>
                )}
            </>}

            <button onClick={onDelete} style={{ marginTop: 4, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: 'rgba(248,113,113,0.8)', fontSize: 11, cursor: 'pointer' }}>
                Delete {room ? 'room' : opening ? 'opening' : node ? 'node' : 'segment'}
            </button>
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
    return (
        <input type="number" min={min} max={max} step={step} value={value.toFixed(2)}
            onChange={e => onChange(Math.max(min, Math.min(max, parseFloat(e.target.value) || min)))}
            style={{ ...inputStyle, width: 72 }} />
    )
}

const inputStyle: React.CSSProperties = {
    height: 26, borderRadius: 5, width: '100%',
    border: '1px solid rgba(148,163,184,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(226,232,240,0.9)', fontSize: 12,
    padding: '0 8px', outline: 'none',
}

// ── Toolbar — BIGGER icons ────────────────────────────────────────────────────

// Icon components for clarity and size
const ToolIcons: Record<string, React.ReactNode> = {
    select: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l14 9-7 1-4 7z" />
        </svg>
    ),
    pan: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3" />
            <path d="M3 12h18M12 3v18" />
        </svg>
    ),
    room: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="1" />
        </svg>
    ),
    pencil: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    line: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="20" x2="20" y2="4" />
            <circle cx="4" cy="20" r="2" fill="currentColor" />
            <circle cx="20" cy="4" r="2" fill="currentColor" />
        </svg>
    ),
    bend: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 20 Q12 4 20 20" />
            <circle cx="4" cy="20" r="2" fill="currentColor" />
            <circle cx="20" cy="20" r="2" fill="currentColor" />
            <circle cx="12" cy="8" r="2" fill="currentColor" />
        </svg>
    ),
    door: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="13" height="18" rx="1" />
            <path d="M16 7h4" />
            <path d="M3 21h18" />
            <path d="M3 3h18" />
            <path d="M8 12 Q8 8 12 8" strokeDasharray="2 1" />
        </svg>
    ),
    window: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="1" />
            <line x1="12" y1="6" x2="12" y2="18" />
            <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
    ),
    delete: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    ),
    annotate: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,

}

const TOOLS: { id: EditorTool; label: string; key: string }[] = [
    { id: 'select', label: 'Select / Move', key: 'V' },
    { id: 'pan', label: 'Pan Canvas', key: 'H' },
    { id: 'room', label: 'Draw Room', key: 'R' },
    { id: 'pencil', label: 'Freeform', key: 'P' },
    { id: 'line', label: 'Line Wall', key: 'L' },
    { id: 'bend', label: 'Bend Wall', key: 'B' },
    { id: 'door', label: 'Place Door', key: 'D' },
    { id: 'window', label: 'Place Window', key: 'N' },
    { id: 'delete', label: 'Delete', key: '⌫' },
    { id: 'annotate', label: 'Add Label', key: 'A' },
]

// ── Main export ───────────────────────────────────────────────────────────────

type Props = {
    onSave?: (fp: FloorPlanState) => void
    onClose?: () => void
    initialState?: FloorPlanState
}

export default function FloorPlanEditor({ onSave, onClose, initialState }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [fp, setFp] = useState<FloorPlanState>(initialState ?? DEFAULT_FP)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const editorRef = useRef<HTMLDivElement>(null)
    const drawStartRef = useRef<{ x: number; z: number } | null>(null)
    const drawRectRef = useRef<{ x: number; z: number; w: number; d: number } | null>(null)
    const isDrawingRef = useRef(false)
    const [tool, setTool] = useState<EditorTool>('room')
    const [pencilPoints, setPencilPoints] = useState<{ x: number, z: number }[]>([])
    const isPencilDrawing = useRef(false)
    const [preview, setPreview] = useState<{ x: number; z: number } | null>(null)
    const lineActiveNodeRef = useRef<string | null>(null)
    const spaceHeldRef = useRef(false)
    const spacePanRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const panToolRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const dragRoomRef = useRef<{ id: string; ox: number; oz: number; type: 'room' | 'node' } | null>(null)
    const segDragRef = useRef<{ segId: string; ox: number; oz: number; nodeIds?: string[] } | null>(null)
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
    const [editingAnnotation, setEditingAnnotation] = useState<{ id: string; text: string; x: number; y: number } | null>(null)
    const annotationInputRef = useRef<HTMLInputElement>(null)
    const resizeHandleRef = useRef<{ handle: string; room: EditorRoom; startWx: number; startWz: number } | null>(null)
    fpRef.current = fp
    const pushHistory = useCallback(() => {
        const current = fpRef.current
        // Truncate redo stack
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
        historyRef.current.push(JSON.parse(JSON.stringify(current)))
        historyIndexRef.current = historyRef.current.length - 1
    }, [])
    // ── Redraw ────────────────────────────────────────────────────────────────
    const redraw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
        draw2D(ctx, fpRef.current, tool, selectedId, hoveredId, drawRect, pencilPoints, zoom, pan, preview, lineActiveNodeRef.current)
    }, [tool, selectedId, hoveredId, drawRect, pencilPoints, zoom, pan, preview])

    useEffect(() => { redraw() }, [redraw, fp, pencilPoints, preview])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ro = new ResizeObserver(() => redraw())
        ro.observe(canvas)
        return () => ro.disconnect()
    }, [redraw])

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            const key = e.key.toLowerCase()
            if (key === 'v') setTool('select')
            if (key === 'h') setTool('pan')
            if (key === 'r') setTool('room')
            if (key === 'd') setTool('door')
            if (key === 'n') setTool('window')
            if (key === 'l') setTool('line')
            if (key === 'b') setTool('bend')
            if (key === 'a') setTool('annotate')
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
                    const isOpening = prev.openings.some(o => o.id === selectedId)
                    const isNode = prev.lineNodes.some(n => n.id === selectedId)
                    const isSeg = prev.lineSegments.some(s => s.id === selectedId)
                    const isShape = prev.closedShapes.some(s => s.id === selectedId)

                    if (isRoom) return { ...prev, rooms: prev.rooms.filter(r => r.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                    if (isOpening) return { ...prev, openings: prev.openings.filter(o => o.id !== selectedId) }
                    if (isNode) return { ...prev, lineNodes: prev.lineNodes.filter(n => n.id !== selectedId), lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(selectedId!)), closedShapes: prev.closedShapes.filter(s => !s.nodeIds.includes(selectedId!)) }
                    if (isSeg) return { ...prev, lineSegments: prev.lineSegments.filter(s => s.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                    if (isShape) return { ...prev, closedShapes: prev.closedShapes.filter(s => s.id !== selectedId) }
                    return prev
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
                // Redo
                if (historyIndexRef.current < historyRef.current.length - 1) {
                    historyIndexRef.current++
                    const snapshot = historyRef.current[historyIndexRef.current]!
                    setFp(JSON.parse(JSON.stringify(snapshot)))
                }
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

    const hitClosedShape = useCallback((wx: number, wz: number) => {
        for (const shape of fpRef.current.closedShapes ?? []) {
            const nodes = shape.nodeIds.map(nid => fpRef.current.lineNodes.find(n => n.id === nid)).filter(Boolean) as LineNode[]
            if (nodes.length < 3) continue
            let inside = false
            for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
                const xi = nodes[i]!.x, zi = nodes[i]!.z, xj = nodes[j]!.x, zj = nodes[j]!.z
                if ((zi > wz) !== (zj > wz) && wx < ((xj - xi) * (wz - zi)) / (zj - zi) + xi) inside = !inside
            }
            if (inside) return shape
        }
        return null
    }, [])


    function tryConvertClosedLineShape(fp: FloorPlanState, newSegId: string): FloorPlanState {
        const adj = new Map<string, string[]>()
        for (const seg of fp.lineSegments) {
            for (let i = 0; i < seg.nodeIds.length - 1; i++) {
                const a = seg.nodeIds[i]!, b = seg.nodeIds[i + 1]!
                if (!adj.has(a)) adj.set(a, [])
                if (!adj.has(b)) adj.set(b, [])
                adj.get(a)!.push(b)
                adj.get(b)!.push(a)
            }
        }

        const newSeg = fp.lineSegments.find(s => s.id === newSegId)
        if (!newSeg || newSeg.nodeIds.length < 2) return fp

        const startId = newSeg.nodeIds[0]!
        const endId = newSeg.nodeIds[newSeg.nodeIds.length - 1]!

        function findPath(from: string, to: string, visited: Set<string>): string[] | null {
            if (from === to) return [from]
            visited.add(from)
            for (const next of adj.get(from) ?? []) {
                if (visited.has(next)) continue
                if (from === endId && next === startId) continue
                if (from === startId && next === endId) continue
                const path = findPath(next, to, visited)
                if (path) return [from, ...path]
            }
            return null
        }

        const path = findPath(endId, startId, new Set())
        if (!path || path.length < 3) return fp

        // Deduplicate — old code put startId at index 0 AND at end of path, causing 4-node triangles
        const cycleNodeIds = [...new Set([startId, ...path])]
        if (cycleNodeIds.length < 3) return fp

        const cycleNodes = cycleNodeIds
            .map(id => fp.lineNodes.find(n => n.id === id))
            .filter(Boolean) as LineNode[]
        if (cycleNodes.length < 3) return fp

        // Only deduplicate against existing closedShapes, never create a room
        const cycleSet = new Set(cycleNodeIds)
        const alreadyExists = (fp.closedShapes ?? []).some(s =>
            s.nodeIds.length === cycleNodeIds.length &&
            s.nodeIds.every(id => cycleSet.has(id))
        )
        if (alreadyExists) return fp

        return {
            ...fp,
            closedShapes: [
                ...(fp.closedShapes ?? []),
                { id: uid(), nodeIds: cycleNodeIds, label: `Area ${(fp.closedShapes ?? []).length + 1}`, color: '#8B7B6B' }
            ],
        }
    }

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

        // ── Resize handle check ───────────────────────────────────────────────
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
        }

        // ── Select tool ───────────────────────────────────────────────────────
        if (tool === 'select') {
            // Priority: node → opening → room → segment → closed shape
            const node = hitLineNode(wx, wz)
            if (node) { setSelectedId(node.id); dragRoomRef.current = { id: node.id, ox: wx - node.x, oz: wz - node.z, type: 'node' }; return }

            // Hit-test openings on rooms
            for (const room of [...fpRef.current.rooms].reverse()) {
                for (const op of fpRef.current.openings.filter(o => o.roomId === room.id && !o.segmentNodeIds)) {
                    const isH = op.wall === 'north' || op.wall === 'south'
                    const wallLen = isH ? room.width : room.depth
                    const opStart = op.position - op.width / 2
                    const opEnd = op.position + op.width / 2
                    const T = 0.15
                    let x1: number, z1: number, x2: number, z2: number
                    if (op.wall === 'north') { x1 = room.x + opStart; z1 = room.z - T; x2 = room.x + opEnd; z2 = room.z + T }
                    else if (op.wall === 'south') { x1 = room.x + opStart; z1 = room.z + room.depth - T; x2 = room.x + opEnd; z2 = room.z + room.depth + T }
                    else if (op.wall === 'west') { x1 = room.x - T; z1 = room.z + opStart; x2 = room.x + T; z2 = room.z + opEnd }
                    else { x1 = room.x + room.width - T; z1 = room.z + opStart; x2 = room.x + room.width + T; z2 = room.z + opEnd }
                    if (wx >= x1 && wx <= x2 && wz >= z1 && wz <= z2) {
                        setSelectedId(op.id); dragRoomRef.current = null; return
                    }
                }
            }

            // Hit-test openings on line segments
            for (const op of fpRef.current.openings.filter(o => o.segmentNodeIds)) {
                const pos = getSegmentOpeningWorldPos(op, fpRef.current.lineNodes)
                if (!pos) continue
                const dist = Math.hypot(wx - pos.wx, wz - pos.wz)
                if (dist < op.width) { setSelectedId(op.id); dragRoomRef.current = null; return }
            }

            const room = hitRoom(wx, wz)
            if (room) { setSelectedId(room.id); dragRoomRef.current = { id: room.id, ox: wx - room.x, oz: wz - room.z, type: 'room' }; return }
            const segHit = hitLineSegment(wx, wz)
            if (segHit) {
                setSelectedId(segHit.seg.id)
                // Find ALL nodes connected to this segment's graph via BFS
                const allNodes = fpRef.current.lineNodes
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
                // BFS from any node in the hit segment
                const visited = new Set<string>()
                const queue = [segHit.seg.nodeIds[0]!]
                while (queue.length) {
                    const cur = queue.shift()!
                    if (visited.has(cur)) continue
                    visited.add(cur)
                    for (const nb of adj.get(cur) ?? []) {
                        if (!visited.has(nb)) queue.push(nb)
                    }
                }
                segDragRef.current = { segId: segHit.seg.id, ox: wx, oz: wz, nodeIds: [...visited] }
                dragRoomRef.current = null; return
            }
            const shape = hitClosedShape(wx, wz)
            if (shape) { setSelectedId(shape.id); dragRoomRef.current = null; return }
            setSelectedId(null); dragRoomRef.current = null; return
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

        // ── Door / Window tool ────────────────────────────────────────────────
        if (tool === 'door' || tool === 'window') {
            // Try room first
            const room = hitRoom(wx, wz)
            if (room) {
                const wallDir = getWallHit(room, wx, wz, 0.5)
                if (!wallDir) return
                const isH = wallDir === 'north' || wallDir === 'south'
                const wallLen = isH ? room.width : room.depth
                const rawPos = isH ? wx - room.x : wz - room.z
                const opW = tool === 'door' ? 0.9 : 1.2
                const clampedPos = Math.max(opW / 2, Math.min(wallLen - opW / 2, rawPos))
                const op: EditorOpening = {
                    id: uid(), roomId: room.id, wall: wallDir, type: tool,
                    position: parseFloat(clampedPos.toFixed(2)), width: opW,
                    height: tool === 'door' ? 2.1 : 1.2,
                    sillHeight: tool === 'window' ? 0.9 : 0,
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
                const opW = tool === 'door' ? 0.9 : 1.2
                const rawPos = t * segLen
                const clampedPos = Math.max(opW / 2, Math.min(segLen - opW / 2, rawPos))
                const clampedT = clampedPos / segLen

                const op: EditorOpening = {
                    id: uid(),
                    roomId: seg.id,
                    wall: 'north', // placeholder — actual direction computed from segment angle
                    type: tool,
                    position: parseFloat(clampedPos.toFixed(2)),
                    width: opW,
                    height: tool === 'door' ? 2.1 : 1.2,
                    sillHeight: tool === 'window' ? 0.9 : 0,
                    swingDirection: 'inward',
                    segmentNodeIds: [fromId, toId],
                    segmentT: clampedT,
                }
                setFp(prev => ({ ...prev, openings: [...prev.openings, op] }))
                setSelectedId(op.id)
                return
            }
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
    }, [evWorld, tool, hitRoom, hitLineNode, hitLineSegment, hitClosedShape, selectedId, pushHistory])

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const { wx, wz, cx, cy } = evWorld(e)

        // Cursor
        if (spaceHeldRef.current || tool === 'pan') {
            setCanvasCursor(spacePanRef.current || panToolRef.current ? 'grabbing' : 'grab')
        } else if (resizeHandleRef.current) {
            const map: Record<string, string> = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize', n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize' }
            setCanvasCursor(map[resizeHandleRef.current.handle] ?? 'move')
        } else if (dragRoomRef.current) {
            setCanvasCursor('grabbing')
        } else {
            const toolCursors: Record<EditorTool, string> = { select: 'default', pan: 'grab', room: 'crosshair', pencil: 'crosshair', line: 'crosshair', bend: 'crosshair', door: 'cell', window: 'cell', delete: 'not-allowed', annotate: "Add Comment" }
            setCanvasCursor(toolCursors[tool] ?? 'default')
        }

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

        if (midPan) {
            setPan({ x: midPan.px + cx - midPan.sx, y: midPan.py + cy - midPan.sy })
            return
        }
        if (!isMouseDownRef.current) {
            dragRoomRef.current = null
            segDragRef.current = null
        }
        if (dragRoomRef.current) {
            const dr = dragRoomRef.current
            const nx = snapM(wx - dr.ox), nz = snapM(wz - dr.oz)
            if (dr.type === 'node') {
                setFp(prev => ({ ...prev, lineNodes: prev.lineNodes.map(n => n.id === dr.id ? { ...n, x: nx, z: nz } : n) }))
            } else {
                setFp(prev => ({ ...prev, rooms: prev.rooms.map(r => r.id === dr.id ? { ...r, x: nx, z: nz } : r) }))
            }
            return
        }
        if (segDragRef.current) {
            const sd = segDragRef.current
            const ddx = snapM(wx - sd.ox), ddz = snapM(wz - sd.oz)
            if (ddx !== 0 || ddz !== 0) {
                // Use pre-computed nodeIds (whole shape) if available, else fall back to single segment
                const nodeSet = sd.nodeIds
                    ? new Set(sd.nodeIds)
                    : new Set(fpRef.current.lineSegments.find(s => s.id === sd.segId)?.nodeIds ?? [])
                setFp(prev => ({ ...prev, lineNodes: prev.lineNodes.map(n => nodeSet.has(n.id) ? { ...n, x: n.x + ddx, z: n.z + ddz } : n) }))
                segDragRef.current = { ...sd, ox: wx, oz: wz }
            }
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
        // Hover
        const node = hitLineNode(wx, wz)
        if (node) { setHoveredId(node.id); return }
        const segHit = hitLineSegment(wx, wz)
        if (segHit) {
            setSelectedId(segHit.seg.id)
            // Find ALL nodes connected to this segment's graph via BFS
            const allNodes = fpRef.current.lineNodes
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
            // BFS from any node in the hit segment
            const visited = new Set<string>()
            const queue = [segHit.seg.nodeIds[0]!]
            while (queue.length) {
                const cur = queue.shift()!
                if (visited.has(cur)) continue
                visited.add(cur)
                for (const nb of adj.get(cur) ?? []) {
                    if (!visited.has(nb)) queue.push(nb)
                }
            }
            segDragRef.current = { segId: segHit.seg.id, ox: wx, oz: wz, nodeIds: [...visited] }
            dragRoomRef.current = null; return
        }
        const room = hitRoom(wx, wz)
        setHoveredId(room?.id ?? null)
    }, [evWorld, midPan, tool, hitRoom, hitLineNode, hitLineSegment])

    const handleMouseUp = useCallback(() => {
        isMouseDownRef.current = false
        setMidPan(null); spacePanRef.current = null; panToolRef.current = null; segDragRef.current = null; dragRoomRef.current = null
        if (dragRoomRef.current || segDragRef.current || resizeHandleRef.current) {
            pushHistory()
        }
        setMidPan(null)
        dragRoomRef.current = null
        spacePanRef.current = null
        panToolRef.current = null
        segDragRef.current = null
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

    // Native wheel handler
    useEffect(() => {
        const el = canvasDivRef.current
        if (!el) return
        const handler = (e: WheelEvent) => {
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
        const handler = (e: WheelEvent) => { e.preventDefault(); e.stopPropagation() }
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

    const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), [])

    return (
        <div
            ref={editorRef}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: '#0F0E0C', fontFamily: 'system-ui, sans-serif', color: 'rgba(226,232,240,0.9)', overflow: 'hidden', maxHeight: '100vh', maxWidth: '100vw' }}
        >
            {/* ── Top bar ────────────────────────────────────────────────────── */}
            <div style={{ height: 48, flexShrink: 0, background: 'rgba(12,11,9,0.98)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(165,168,255,0.9)', letterSpacing: '0.06em' }}>FLOOR PLAN EDITOR</span>
                <div style={{ flex: 1 }} />
                <label style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)' }}>Ceiling height</label>
                <input type="number" min={2} max={6} step={0.1} value={fp.roomHeight}
                    onChange={e => setFp(p => ({ ...p, roomHeight: parseFloat(e.target.value) || 2.7 }))}
                    style={{ width: 56, height: 28, borderRadius: 6, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(255,255,255,0.05)', color: 'rgba(226,232,240,0.9)', fontSize: 12, textAlign: 'center', outline: 'none' }} />
                <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.5)' }}>m</span>
                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.6)' }}>{Math.round(zoom * 100)}%</span>
                <Btn onClick={() => setZoom(1)}>Reset zoom</Btn>
                <Btn onClick={() => { setFp(DEFAULT_FP); setSelectedId(null) }}>Clear</Btn>
                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
                <button onClick={() => void toggleFullscreen()} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.15)', background: 'transparent', color: 'rgba(148,163,184,0.7)', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {isFullscreen
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" /></svg>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>}
                    {isFullscreen ? 'Exit' : 'Fullscreen'}
                </button>
                {onClose && <Btn onClick={onClose} danger>✕ Close</Btn>}
                {onSave && (
                    <button onClick={() => onSave(fp)} style={{ height: 30, padding: '0 16px', borderRadius: 7, border: 'none', background: 'rgba(99,102,241,0.85)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        Save Floor Plan
                    </button>
                )}
            </div>

            {/* ── Body ─────────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, maxHeight: 'calc(100vh - 48px)' }}>

                {/* ── Left tool panel — BIGGER ────────────────────────────────── */}
                <div style={{
                    width: 68, flexShrink: 0,
                    background: 'rgba(10,9,7,0.98)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', padding: '10px 0', gap: 4,
                    overflowY: 'auto',
                }}>
                    {TOOLS.map(t => {
                        const isActive = tool === t.id
                        return (
                            <button
                                key={t.id}
                                title={`${t.label} (${t.key})`}
                                onClick={() => { setTool(t.id); setDrawStart(null); setDrawRect(null) }}
                                style={{
                                    width: 52, height: 52,
                                    borderRadius: 10,
                                    border: isActive
                                        ? '1.5px solid rgba(99,102,241,0.7)'
                                        : '1.5px solid transparent',
                                    background: isActive
                                        ? 'rgba(99,102,241,0.22)'
                                        : 'transparent',
                                    color: 'white',
                                    opacity: isActive ? 1 : 0.5,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 3,
                                    transition: 'all 130ms',
                                    flexShrink: 0,
                                }}
                            >
                                {ToolIcons[t.id]}
                                <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: '0.04em', opacity: 0.7 }}>
                                    {t.key}
                                </span>
                            </button>
                        )
                    })}
                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 9, color: 'rgba(100,116,139,0.4)', textAlign: 'center', lineHeight: 1.7, paddingBottom: 4 }}>
                        <div>{fp.rooms.length}R</div>
                        <div>{fp.lineSegments.length}W</div>
                        <div>{fp.openings.length}O</div>
                    </div>
                </div>

                {/* 2D canvas */}
                <div ref={canvasDivRef} style={{ cursor: canvasCursor, flex: 1, minWidth: '55%', position: 'relative', overflow: 'hidden' }}>
                    <canvas
                        ref={canvasRef}
                        style={{
                            width: '100%', height: '100%', display: 'block', maxHeight
                                : "800px"
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => { isMouseDownRef.current = false; setMidPan(null); dragRoomRef.current = null }}
                        onContextMenu={handleContextMenu}
                    />

                    {/* Tool hint */}
                    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,9,7,0.82)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: 'rgba(100,116,139,0.8)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                        {tool === 'select' && 'Click to select · Drag room/node · Click segment to drag whole wall'}
                        {tool === 'pan' && 'Click and drag to pan the canvas'}                        {tool === 'room' && (drawStart ? 'Drag to set room size · Release to place' : 'Click and drag to draw a room')}
                        {tool === 'line' && (lineActiveNodeRef.current ? 'Click to continue wall · Click existing node to close' : 'Click to start a wall segment')}
                        {tool === 'bend' && (lineActiveNodeRef.current ? 'Click to place curved wall point · Click existing node to close' : 'Click to start a curved wall')}
                        {tool === 'door' && 'Click on a room wall or line wall to place a door'}
                        {tool === 'window' && 'Click on a room wall or line wall to place a window'}
                        {tool === 'delete' && 'Click on a room, wall or node to delete it'}
                        {tool === 'pencil' && 'Draw freehand — release to create room from bounding box'}
                        {tool === 'annotate' && 'Click anywhere to add a label · Click existing label to edit · Delete tool removes labels'}
                    </div>

                    {/* Shortcut legend */}
                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(10,9,7,0.75)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', fontSize: 10, color: 'rgba(100,116,139,0.7)', lineHeight: 1.9 }}>
                        {[['V', 'Select'], ['R', 'Room'], ['L', 'Line Wall'], ['B', 'Bend Wall'], ['D', 'Door'], ['N', 'Window'], ['⌫', 'Delete'], ['⌘Z', 'Undo'], ['ESC', 'Cancel'], ['Scroll', 'Zoom'], ['Mid drag', 'Pan'], ['Space+drag', 'Pan']].map(([k, l]) => (
                            <div key={k}><kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '0 3px', fontFamily: 'monospace', marginRight: 4 }}>{k}</kbd>{l}</div>
                        ))}
                        {editingAnnotation && (() => {
                            return (
                                <div style={{ position: 'fixed', left: editingAnnotation.x - 80, top: editingAnnotation.y - 40, zIndex: 300, background: 'rgba(15,14,12,0.97)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(99,102,241,0.7)', letterSpacing: '0.08em' }}>LABEL</div>
                                    <input
                                        ref={annotationInputRef}
                                        autoFocus
                                        defaultValue={editingAnnotation.text || ''}
                                        placeholder="Enter label..."
                                        style={{ width: 160, height: 28, borderRadius: 5, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: 'rgba(226,232,240,0.9)', fontSize: 13, padding: '0 8px', outline: 'none' }}
                                        onKeyDown={e2 => {
                                            if (e2.key === 'Enter' || e2.key === 'Escape') {
                                                const val = annotationInputRef.current?.value?.trim()
                                                if (val) {
                                                    setFp(prev => ({ ...prev, annotations: (prev.annotations ?? []).map(a => a.id === editingAnnotation!.id ? { ...a, text: val } : a) }))
                                                } else {
                                                    // Remove if empty
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
                                    <div style={{ fontSize: 10, color: 'rgba(100,116,139,0.6)' }}>Enter to confirm · Esc to cancel</div>
                                </div>
                            )
                        })()}
                    </div>
                </div>

                <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

                {/* Right: 3D preview + properties */}
                <div style={{ width: '42%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 5, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.5)' }}>
                            3D PREVIEW
                        </div>
                        <Canvas
                            shadows
                            camera={{ position: [8, 10, 12], fov: 50, near: 0.1, far: 500 }}
                            style={{ width: '100%', height: '100%', background: '#0F0E0C' }}
                            onWheel={e => e.stopPropagation()}
                        >
                            <Scene3D fp={fp} />
                        </Canvas>
                    </div>

                    <div style={{ height: 240, flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,9,7,0.95)', overflowY: 'auto' }}>
                        <PropsPanel
                            fp={fp}
                            selectedId={selectedId}
                            onChange={setFp}
                            onDelete={() => {
                                if (!selectedId) return
                                setFp(prev => {
                                    const isRoom = prev.rooms.some(r => r.id === selectedId)
                                    const isNode = prev.lineNodes.some(n => n.id === selectedId)
                                    const isSeg = prev.lineSegments.some(s => s.id === selectedId)

                                    if (isRoom) return { ...prev, rooms: prev.rooms.filter(r => r.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                                    if (isNode) return { ...prev, lineNodes: prev.lineNodes.filter(n => n.id !== selectedId), lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(selectedId)) }
                                    if (isSeg) return { ...prev, lineSegments: prev.lineSegments.filter(s => s.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                                    return { ...prev, openings: prev.openings.filter(o => o.id !== selectedId) }
                                })
                                setSelectedId(null)
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function Btn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
    return (
        <button onClick={onClick} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(148,163,184,0.15)'}`, background: 'transparent', color: danger ? 'rgba(248,113,113,0.8)' : 'rgba(148,163,184,0.7)', fontSize: 11, cursor: 'pointer' }}>
            {children}
        </button>
    )
}