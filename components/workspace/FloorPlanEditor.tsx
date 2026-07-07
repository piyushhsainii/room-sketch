'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, } from '@react-three/drei'
import * as THREE from 'three'
import { Toolbar } from './Tools/ToolBar'
import { Annotation, DEFAULT_FP, DEFAULT_SCENE_CONFIG, DoorStyle, EditorOpening, EditorRoom, EditorTool, FLOOR_MATERIALS, FloorMaterial, FloorPlanState, FURNITURE_COLORS, FURNITURE_FOOTPRINTS, FURNITURE_LABELS, FurnitureType, GRID_M, KEY_TO_DEFAULT_TOOL, LineNode, LineSegment, MIN_ROOM, OPENING_VARIANT_LABELS, PlacedFurniture, PlacedStairs, PX_PER_M, STAIRS_FOOTPRINTS, STAIRS_LABELS, StairsType } from './Tools/constants'
import { deriveClosedPolygons } from '@/lib/helpers'
import { FloorMat } from './objects/floormat'
import { WallMat } from './objects/wallmat'
import { LineWalls3D } from './objects/line-walls-3d'
import { SceneConfigPanel } from './SceneConfigPanel'
import { FurnitureMesh } from './furniture/furnitureMesh'
import { StairsMesh } from './furniture/stairsMesh'
import { WalkModeControls } from './WalkModeControls'
import { DoorVariant3D } from './objects/door-variants'
import { Dock } from '../ui/Dock'
import { WindowVariant3D } from './objects/window-variant3d'
import { SceneGraphPanel } from './objects/scene-graph'

export type RoomSceneConfig = {
    roomId: string
    wallColor?: string
    floorMaterial?: FloorMaterial
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
    rooms: RoomSceneConfig[]
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

function uid() { return Math.random().toString(36).slice(2, 9) }
function snapM(v: number) { return Math.round(v / GRID_M) * GRID_M }
function toWorld(canvasPx: number, panPx: number, zoom: number) { return (canvasPx - panPx) / (PX_PER_M * zoom) }
function toCanvas(worldM: number, panPx: number, zoom: number) { return worldM * PX_PER_M * zoom + panPx }

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
function snapFurniture(v: number) { return Math.round(v / 0.1) * 0.1 }

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

function makeWallTexture(color: string, plain: boolean = true): THREE.CanvasTexture {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, size, size)
    if (!plain) {
        for (let n = 0; n < 800; n++) {
            const x = Math.random() * size, y = Math.random() * size
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`
            ctx.beginPath(); ctx.arc(x, y, Math.random() * 4, 0, Math.PI * 2); ctx.fill()
        }
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 1)
    return tex
}

const wallTextureCache = new Map<string, THREE.CanvasTexture>()
function getCachedWallTexture(color: string, plain: boolean = true): THREE.CanvasTexture {
    const key = `${color}_${plain}`
    if (!wallTextureCache.has(key)) {
        wallTextureCache.set(key, makeWallTexture(color, plain))
    }
    return wallTextureCache.get(key)!
}


function Room3D({ room, openings, roomHeight, wallColor = '#FFFFFF', wallRoughness = 0.95, wallTextured = false, floorMat = 'plain', doorStyle = 'natural' }: {
    room: EditorRoom; openings: EditorOpening[]; roomHeight: number
    wallColor?: string; wallRoughness?: number; wallTextured?: boolean; floorMat?: string; doorStyle?: string
}) {
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
                <FloorMat mat={floorMat} />
            </mesh>

            {walls.map(wall => {
                const wallOpenings = openings.filter(o => o.wall === wall.name && !o.segmentNodeIds)
                const wallLen = wall.axis === 'x' ? W : D
                const wPos = wallWorldPos(wall.name)

                if (wallOpenings.length === 0) {
                    return (
                        <mesh key={wall.name} position={wPos} castShadow receiveShadow>
                            <boxGeometry args={wallSize(wall.axis)} />
                            <WallMat color={wallColor} roughness={wallRoughness} textured={wallTextured} />
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
                        panels.push(<mesh key={`l${i}`} position={pos} castShadow receiveShadow><boxGeometry args={size} /><WallMat color={wallColor} roughness={wallRoughness} />
                        </mesh>)
                    }

                    if (op) {
                        // Passage: no header at all. Archway: tinted header. Others: normal header.
                        const isPassage = op.type === 'opening' && op.variant === 'opening-passage'
                        const isArchway = op.type === 'opening' && op.variant === 'opening-archway'
                        const headerH = H - op.height
                        if (headerH > 0.02 && !isPassage) {
                            const opMid = op.position
                            const hPos: [number, number, number] = wall.axis === 'x' ? [room.x + opMid, op.height + headerH / 2, wPos[2]] : [wPos[0], op.height + headerH / 2, room.z + opMid]
                            const hSize: [number, number, number] = wall.axis === 'x' ? [op.width, headerH, T] : [T, headerH, op.width]
                            const archColor = isArchway ? '#A0907E' : wallColor
                            panels.push(<mesh key={`h${i}`} position={hPos} castShadow receiveShadow><boxGeometry args={hSize} /><WallMat color={archColor} roughness={wallRoughness} />
                            </mesh>)
                        }

                        if (op.type === 'window' && op.sillHeight > 0.02) {
                            const opMid = op.position
                            const sPos: [number, number, number] = wall.axis === 'x' ? [room.x + opMid, op.sillHeight / 2, wPos[2]] : [wPos[0], op.sillHeight / 2, room.z + opMid]
                            const sSize: [number, number, number] = wall.axis === 'x' ? [op.width, op.sillHeight, T] : [T, op.sillHeight, op.width]
                            panels.push(<mesh key={`s${i}`} position={sPos} castShadow receiveShadow><boxGeometry args={sSize} /><WallMat color={wallColor} roughness={wallRoughness} />
                            </mesh>)
                        }

                        // if (op.type === 'window') {
                        //     const opMid = op.position
                        //     const gPos: [number, number, number] = wall.axis === 'x' ? [room.x + opMid, op.sillHeight + op.height / 2, wPos[2]] : [wPos[0], op.sillHeight + op.height / 2, room.z + opMid]

                        //     const gSize: [number, number, number] = wall.axis === 'x' ? [op.width, op.height, 0.025] : [0.025, op.height, op.width]

                        //     panels.push(<mesh key={`g${i}`} position={gPos}><boxGeometry args={gSize} /><meshStandardMaterial color="#93C5FD" transparent opacity={0.35} roughness={0.05} metalness={0.15} side={THREE.DoubleSide} /></mesh>)
                        // }

                        if (op.type === 'window') {
                            panels.push(<WindowVariant3D key={`g${i}`} op={op} wallAxis={wall.axis} room={room} wPos={wPos} />)
                        }

                        if (op.type === 'door') {
                            panels.push(
                                <DoorVariant3D
                                    key={`door${i}`}
                                    op={op}
                                    wallAxis={wall.axis}
                                    room={room}
                                    wPos={wPos}
                                    doorStyle={doorStyle}
                                />
                            )
                        }

                        cursor = op.position + op.width / 2
                    }
                }
                return <group key={wall.name}>{panels}</group>
            })}
        </group>
    )
}
function Scene3D({ fp, sceneConfig, walkMode = false }: { fp: FloorPlanState; sceneConfig?: SceneConfig; walkMode?: boolean }) {
    const cfg = sceneConfig ?? DEFAULT_SCENE_CONFIG
    return (
        <>
            <ambientLight intensity={cfg.ambientIntensity} color="#FFF8F0" />
            <directionalLight position={[10, 15, 10]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-5, 8, -5]} intensity={0.8} color="#C8D4E8" />
            {cfg.fogEnabled && <fog attach="fog" args={['#0F0E0C', 20, 60]} />}

            {fp.rooms.map(room => {
                const roomCfg = cfg.rooms.find(r => r.roomId === room.id)
                return (
                    <Room3D
                        key={room.id}
                        room={room}
                        openings={fp.openings.filter(o => o.roomId === room.id)}
                        roomHeight={fp.roomHeight}
                        wallColor={roomCfg?.wallColor ?? '#FFFFFF'}
                        wallRoughness={cfg.wallRoughness}
                        wallTextured={cfg.wallTextured}
                        floorMat={roomCfg?.floorMaterial ?? cfg.globalFloorMaterial ?? 'plain'}
                        doorStyle={cfg.doorStyle ?? 'natural'}
                    />
                )
            })}

            <LineWalls3D
                fp={fp}
                wallRoughness={cfg.wallRoughness}
                floorMaterial={cfg.globalFloorMaterial ?? 'plain'}
                doorStyle={cfg.doorStyle ?? 'natural'}
                closedShapes={fp.closedShapes}
            />

            {/* Furniture — guarded by showFurniture toggle */}
            {cfg.showFurniture !== false && (fp.furniture ?? []).map(f => (
                <FurnitureMesh key={f.id} f={f} />
            ))}

            {/* Stairs / Elevator 3D meshes */}
            {cfg.showFurniture !== false && (fp.stairs ?? []).map(s => (
                <StairsMesh key={s.id} s={s} roomHeight={fp.roomHeight} />
            ))}

            {walkMode ? (
                <WalkModeControls />
            ) : (
                <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
            )}
            <gridHelper args={[50, 50, '#1C1A17', '#1C1A17']} position={[0, -0.01, 0]} />
        </>
    )
}

function PropsPanel({ fp, selectedId, onChange, onDelete }: {
    fp: FloorPlanState
    selectedId: string | null
    onChange: (fp: FloorPlanState) => void
    onDelete: () => void
}) {
    const wallSel = selectedId?.includes('::wall::')
        ? { roomId: selectedId.split('::wall::')[0], wall: selectedId.split('::wall::')[1] as 'north' | 'south' | 'east' | 'west' }
        : null
    const wallRoom = wallSel ? fp.rooms.find(r => r.id === wallSel.roomId) : null

    const shape = fp.closedShapes?.find(s => s.id === selectedId)
    const room = fp.rooms.find(r => r.id === selectedId)
    const opening = fp.openings.find(o => o.id === selectedId)
    const node = fp.lineNodes.find(n => n.id === selectedId)
    const seg = fp.lineSegments.find(s => s.id === selectedId)
    const furniture = (fp.furniture ?? []).find(f => f.id === selectedId)
    const stairs = (fp.stairs ?? []).find(s => s.id === selectedId)

    if (!room && !opening && !node && !seg && !furniture && !stairs && !wallRoom) return (
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
                {room ? 'ROOM' : opening ? opening.type.toUpperCase() : node ? 'WALL NODE' : furniture ? 'FURNITURE' : stairs ? 'STAIRS / ELEVATOR' : 'WALL SEGMENT'}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.7)' }}>
                {wallRoom ? 'WALL' : room ? 'ROOM' : opening ? (OPENING_VARIANT_LABELS[opening.variant ?? opening.type] ?? opening.type).toUpperCase() : node ? 'WALL NODE' : furniture ? 'FURNITURE' : stairs ? 'STAIRS / ELEVATOR' : 'WALL SEGMENT'}
            </div>

            {wallRoom && wallSel && <>
                <PropField label="Room"><span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600 }}>{wallRoom.label}</span></PropField>
                <PropField label="Side"><span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600, textTransform: 'capitalize' }}>{wallSel.wall}</span></PropField>
                <PropField label="Openings">
                    <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.8)' }}>
                        {fp.openings.filter(o => o.roomId === wallRoom.id && o.wall === wallSel.wall).length} on this wall
                    </span>
                </PropField>
                <div style={{ fontSize: 10, color: 'rgba(100,116,139,0.5)' }}>Rooms don't yet store per-wall data (color/material) — this selection is currently informational.</div>
            </>}
            {shape && <>
                <PropField label="Label">
                    <input value={shape.label ?? ''} onChange={e => onChange({
                        ...fp,
                        closedShapes: (fp.closedShapes ?? []).map(s => s.id === shape.id ? { ...s, label: e.target.value } : s)
                    })} style={inputStyle} />
                </PropField>
            </>}
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

            {furniture && <>
                <PropField label="Type">
                    <span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600 }}>
                        {FURNITURE_LABELS[furniture.type] ?? furniture.type}
                    </span>
                </PropField>
                <PropField label="X pos (m)">
                    <NumInput value={furniture.x} min={-50} max={50} step={0.5}
                        onChange={v => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, x: snapFurniture(v) } : f) })} />
                </PropField>
                <PropField label="Z pos (m)">
                    <NumInput value={furniture.z} min={-50} max={50} step={0.5}
                        onChange={v => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, z: snapFurniture(v) } : f) })} />
                </PropField>
                <PropField label="Rotation">
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="range" min={0} max={360} step={15}
                            value={Math.round((furniture.rotation * 180) / Math.PI)}
                            onChange={e => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, rotation: (parseFloat(e.target.value) * Math.PI) / 180 } : f) })}
                            style={{ flex: 1, accentColor: '#6366F1' }} />
                        <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', width: 30, flexShrink: 0 }}>
                            {Math.round((furniture.rotation * 180) / Math.PI)}°
                        </span>
                    </div>
                </PropField>
                <PropField label="Scale">
                    <input type="range" min={50} max={150} step={5}
                        value={Math.round((furniture.scale ?? 1) * 100)}
                        onChange={e => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, scale: parseFloat(e.target.value) / 100 } : f) })}
                        style={{ flex: 1, accentColor: '#6366F1' }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', marginLeft: 4 }}>
                        {Math.round((furniture.scale ?? 1) * 100)}%
                    </span>
                </PropField>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button
                        onClick={() => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, rotation: f.rotation - Math.PI / 2 } : f) })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↺ −90°
                    </button>
                    <button
                        onClick={() => onChange({ ...fp, furniture: (fp.furniture ?? []).map(f => f.id === furniture.id ? { ...f, rotation: f.rotation + Math.PI / 2 } : f) })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↻ +90°
                    </button>
                </div>
            </>}

            {stairs && <>
                <PropField label="Type">
                    <span style={{ fontSize: 11, color: 'rgba(165,168,255,0.9)', fontWeight: 600 }}>
                        {STAIRS_LABELS[stairs.type] ?? stairs.type}
                    </span>
                </PropField>
                <PropField label="X pos (m)">
                    <NumInput value={stairs.x + stairs.width / 2} min={-50} max={50} step={0.5}
                        onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, x: snapM(v) - s.width / 2 } : s) })} />
                </PropField>
                <PropField label="Z pos (m)">
                    <NumInput value={stairs.z + stairs.depth / 2} min={-50} max={50} step={0.5}
                        onChange={v => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, z: snapM(v) - s.depth / 2 } : s) })} />
                </PropField>
                <PropField label="Rotation">
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="range" min={0} max={360} step={15}
                            value={Math.round((stairs.rotation * 180) / Math.PI)}
                            onChange={e => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rotation: (parseFloat(e.target.value) * Math.PI) / 180 } : s) })}
                            style={{ flex: 1, accentColor: '#6366F1' }} />
                        <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', width: 30, flexShrink: 0 }}>
                            {Math.round((stairs.rotation * 180) / Math.PI)}°
                        </span>
                    </div>
                </PropField>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button
                        onClick={() => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rotation: s.rotation - Math.PI / 2 } : s) })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↺ −90°
                    </button>
                    <button
                        onClick={() => onChange({ ...fp, stairs: (fp.stairs ?? []).map(s => s.id === stairs.id ? { ...s, rotation: s.rotation + Math.PI / 2 } : s) })}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'rgba(165,168,255,0.9)', fontSize: 11, cursor: 'pointer' }}>
                        ↻ +90°
                    </button>
                </div>
            </>}

            <button onClick={onDelete} style={{ marginTop: 4, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: 'rgba(248,113,113,0.8)', fontSize: 11, cursor: 'pointer' }}>
                Delete {room ? 'room' : opening ? 'opening' : node ? 'node' : furniture ? 'furniture' : stairs ? 'stairs' : shape ? 'area' : 'segment'}
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
    border: `1px solid ${THEME.borderStrong}`,
    background: '#FAFAFA',
    color: THEME.text, fontSize: 12,
    padding: '0 8px', outline: 'none',
}
// ── Main export ───────────────────────────────────────────────────────────────

type Props = {
    onSave?: (fp: FloorPlanState, sceneConfig: SceneConfig) => void
    onClose?: () => void
    initialState?: FloorPlanState
    initialSceneConfig?: SceneConfig
    isSaving?: boolean
    isSaved?: boolean
}
export default function FloorPlanEditor({ onSave, onClose, initialState, initialSceneConfig, isSaving = false, isSaved = false }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [fp, setFp] = useState<FloorPlanState>(initialState ?? DEFAULT_FP)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [sheetOpen, setSheetOpen] = useState(false)
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
    const [rightTab, setRightTab] = useState<'properties' | 'scene'>('properties')
    const [editingAnnotation, setEditingAnnotation] = useState<{ id: string; text: string; x: number; y: number } | null>(null)
    const annotationInputRef = useRef<HTMLInputElement>(null)
    const [selectedFurnitureType, setSelectedFurnitureType] = useState<FurnitureType>('sofa')
    const furnitureDragRef = useRef<{ id: string; ox: number; oz: number } | null>(null)
    const resizeHandleRef = useRef<{ handle: string; room: EditorRoom; startWx: number; startWz: number } | null>(null)
    fpRef.current = fp
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

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
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

                    if (isRoom) return { ...prev, rooms: prev.rooms.filter(r => r.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                    if (isNode) return { ...prev, lineNodes: prev.lineNodes.filter(n => n.id !== selectedId), lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(selectedId)) }
                    if (isSeg) return { ...prev, lineSegments: prev.lineSegments.filter(s => s.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                    const isFurniture = (prev.furniture ?? []).some(f => f.id === selectedId)
                    if (isFurniture) return { ...prev, furniture: (prev.furniture ?? []).filter(f => f.id !== selectedId) }
                    const isStairs = (prev.stairs ?? []).some(s => s.id === selectedId)
                    if (isStairs) return { ...prev, stairs: (prev.stairs ?? []).filter(s => s.id !== selectedId) }
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
                { id: uid(), nodeIds: cycleNodeIds, label: `Area ${(fp.closedShapes ?? []).length + 1}`, color: '#FFFFFF' }
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
            // Priority: node → furniture → segment → room → closed shape
            // Furniture is intentionally before room so items inside rooms are selectable
            const node = hitLineNode(wx, wz)
            if (node) { setSelectedId(node.id); dragRoomRef.current = { id: node.id, ox: wx - node.x, oz: wz - node.z, type: 'node' }; return }
            const op = hitOpening(wx, wz)
            if (op) { setSelectedId(op.id); dragRoomRef.current = null; return }
            // Furniture check — before room so overlapping furniture wins
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
                return
            }

            // Stairs/elevator check — before room so overlapping stairs wins
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
                return
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
                const startPositions = new Map<string, { x: number, z: number }>()
                for (const nid of visited) {
                    const n = fpRef.current.lineNodes.find(nd => nd.id === nid)
                    if (n) startPositions.set(nid, { x: n.x, z: n.z })
                }
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
                segDragRef.current = { segId: segHit.seg.id, ox: wx, oz: wz, nodeIds: [...visited], startPositions }
                dragRoomRef.current = null; return
            }
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
                return
            }

            // Hit-test furniture
            const hitFurniture = (fpRef.current.furniture ?? []).find(f => {
                const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }
                const dx = wx - f.x, dz = wz - f.z
                const cosR = Math.cos(-f.rotation), sinR = Math.sin(-f.rotation)
                const lx = dx * cosR - dz * sinR
                const lz = dx * sinR + dz * cosR
                return Math.abs(lx) < fp2.w / 2 + 0.1 && Math.abs(lz) < fp2.d / 2 + 0.1
            })
            if (hitFurniture) {
                setSelectedId(hitFurniture.id)
                furnitureDragRef.current = { id: hitFurniture.id, ox: wx - hitFurniture.x, oz: wz - hitFurniture.z }
                dragRoomRef.current = null
                return
            }

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
        const isDoorTool = tool.startsWith('door-')
        const isWindowTool = tool.startsWith('window-')
        const opW = isDoorTool ? (tool === 'door-swing-double' ? 1.6 : 0.9) : 1.2

        if (isDoorTool || isWindowTool) {
            // Try room first
            const wallHit = hitRoomWall(wx, wz)
            if (wallHit) { setSelectedId(`${wallHit.room.id}::wall::${wallHit.wall}`); dragRoomRef.current = null; return }
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

    }, [evWorld, tool, hitRoom, hitLineNode, hitLineSegment, hitClosedShape, hitOpening, hitRoomWall, selectedId, pushHistory, selectedFurnitureType])


    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const { wx, wz, cx, cy } = evWorld(e)

        // Cursor — direct DOM update to avoid re-render
        let newCursor: string
        if (spaceHeldRef.current || tool === 'pan') {
            newCursor = spacePanRef.current || panToolRef.current ? 'grabbing' : 'grab'
        } else if (resizeHandleRef.current) {
            const map: Record<string, string> = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize', n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize' }
            newCursor = map[resizeHandleRef.current.handle] ?? 'move'
        } else if (dragRoomRef.current) {
            newCursor = 'grabbing'
        } else {
            const doorWindowCursor = 'cell'
            const toolCursors: Record<EditorTool, string> = {
                select: 'default',
                pan: 'grab',
                room: 'crosshair',
                pencil: 'crosshair',
                line: 'crosshair',
                bend: 'crosshair',
                'door-swing-single': doorWindowCursor,
                'door-swing-double': doorWindowCursor,
                'door-sliding': doorWindowCursor,
                'door-pocket': doorWindowCursor,
                'door-folding': doorWindowCursor,
                'door-garage': doorWindowCursor,
                'window-fixed': doorWindowCursor,
                'window-sliding': doorWindowCursor,
                'window-casement': doorWindowCursor,
                'window-bay': doorWindowCursor,
                'window-skylight': doorWindowCursor,
                'opening-archway': doorWindowCursor,
                'opening-passage': doorWindowCursor,
                'stairs-straight': 'crosshair',
                'stairs-l': 'crosshair',
                'stairs-u': 'crosshair',
                'stairs-spiral': 'crosshair',
                'stairs-ramp': 'crosshair',
                elevator: 'crosshair',
                delete: 'not-allowed',
                annotate: 'crosshair',
                furniture: 'copy',
            }
            newCursor = toolCursors[tool] ?? 'default'
        }
        if (canvasDivRef.current && canvasDivRef.current.style.cursor !== newCursor) {
            canvasDivRef.current.style.cursor = newCursor
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

        if (furnitureDragRef.current) {
            const fd = furnitureDragRef.current
            setFp(prev => ({
                ...prev,
                furniture: (prev.furniture ?? []).map(f => f.id === fd.id ? { ...f, x: snapFurniture(wx - fd.ox), z: snapFurniture(wz - fd.oz) } : f),
                stairs: (prev.stairs ?? []).map(s => s.id === fd.id ? { ...s, x: snapFurniture(wx - fd.ox), z: snapFurniture(wz - fd.oz) } : s),
            }))
            return
        }

        if (dragRoomRef.current) {
            const dr = dragRoomRef.current
            // Snap the destination, not the offset — prevents jitter
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
            // Compute snapped total delta from drag start
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
        if (tool === 'line' || tool === 'bend') setPreview({ x: snapM(wx), z: snapM(wz) })
        if (isDrawingRef.current && drawStartRef.current) {
            const ds = drawStartRef.current
            const newRect = { x: ds.x, z: ds.z, w: snapM(wx) - ds.x, d: snapM(wz) - ds.z }
            drawRectRef.current = newRect
            setDrawRect(newRect)
            return
        }
        // Hover — use ref to avoid unnecessary state updates
        let newHoverId: string | null = null
        const node = hitLineNode(wx, wz)
        if (node) { newHoverId = node.id }
        else {
            const hoveredOpening = hitOpening(wx, wz)
            if (hoveredOpening) { newHoverId = hoveredOpening.id }
            else {
                const segHit = hitLineSegment(wx, wz)
                if (segHit) { newHoverId = segHit.seg.id }
                else {
                    const hovFurniture = (fpRef.current.furniture ?? []).findLast(f => {
                        const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }
                        const dx = wx - f.x, dz = wz - f.z
                        const cosR = Math.cos(-f.rotation), sinR = Math.sin(-f.rotation)
                        const lx = dx * cosR - dz * sinR
                        const lz = dx * sinR + dz * cosR
                        return Math.abs(lx) < (fp2.w * (f.scale ?? 1)) / 2 + 0.05 && Math.abs(lz) < (fp2.d * (f.scale ?? 1)) / 2 + 0.05
                    })
                    if (hovFurniture) { newHoverId = hovFurniture.id }
                    else {
                        const hovStairs = (fpRef.current.stairs ?? []).findLast(st => {
                            const dx2 = wx - (st.x + st.width / 2), dz2 = wz - (st.z + st.depth / 2)
                            const cosR2 = Math.cos(-st.rotation), sinR2 = Math.sin(-st.rotation)
                            const lx2 = dx2 * cosR2 - dz2 * sinR2, lz2 = dx2 * sinR2 + dz2 * cosR2
                            return Math.abs(lx2) < st.width / 2 + 0.05 && Math.abs(lz2) < st.depth / 2 + 0.05
                        })
                        if (hovStairs) { newHoverId = hovStairs.id }
                        else {
                            const wallHit = hitRoomWall(wx, wz)
                            if (wallHit) { newHoverId = `${wallHit.room.id}::wall::${wallHit.wall}` }
                            else {
                                const room = hitRoom(wx, wz)
                                newHoverId = room?.id ?? null
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
        setHoverTooltip(newHoverId ? { text: labelForHover(newHoverId, fpRef.current), x: e.clientX, y: e.clientY } : null)
    }, [evWorld, midPan, tool, hitRoom, hitLineNode, hitLineSegment, scheduleRedraw])

    const handleMouseUp = useCallback(() => {
        isMouseDownRef.current = false
        furnitureDragRef.current = null
        setMidPan(null); spacePanRef.current = null; panToolRef.current = null; segDragRef.current = null; dragRoomRef.current = null
        shapeDragRef.current = null
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
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: THEME.bg, fontFamily: 'system-ui, sans-serif', color: THEME.text, overflow: 'hidden', maxHeight: '100vh', maxWidth: '100vw' }}
        >
            {/* ── Top bar ────────────────────────────────────────────────────── */}
            <div style={{ height: 52, flexShrink: 0, background: THEME.bgPanel, borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, boxShadow: THEME.shadow }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text, letterSpacing: '0.02em' }}>Ground Floor</span>
                <div style={{ flex: 1 }} />
                <label style={{ fontSize: 11, color: THEME.textMuted }}>Ceiling height</label>
                <input type="number" min={2} max={6} step={0.1} value={fp.roomHeight}
                    onChange={e => setFp(p => ({ ...p, roomHeight: parseFloat(e.target.value) || 2.7 }))}
                    style={{ width: 56, height: 30, borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA', color: THEME.text, fontSize: 12, textAlign: 'center', outline: 'none' }} />
                <span style={{ fontSize: 11, color: THEME.textFaint }}>m</span>
                <div style={{ width: 1, height: 24, background: THEME.border }} />
                <span style={{ fontSize: 11, color: THEME.textMuted }}>{Math.round(zoom * 100)}%</span>
                <Btn onClick={() => setZoom(1)}>Reset zoom</Btn>
                <Btn onClick={() => { setFp(DEFAULT_FP); setSelectedId(null) }}>Clear</Btn>
                <div style={{ width: 1, height: 24, background: THEME.border }} />
                <button onClick={() => void toggleFullscreen()} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA', color: THEME.textMuted, fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {isFullscreen
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" /></svg>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>}
                    {isFullscreen ? 'Exit' : 'Fullscreen'}
                </button>
                {onClose && <Btn onClick={onClose} danger>✕ Close</Btn>}
                {onSave &&
                    <button
                        onClick={() => onSave(fp, sceneConfig)}
                        style={{
                            height: 32,
                            padding: '0 16px', borderRadius: 8, border: 'none',
                            background: isSaving ? '#A5A6F5' : isSaved ? '#10B981' : THEME.accent,
                            color: 'white', fontSize: 12, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'background 200ms',
                            boxShadow: '0 2px 6px rgba(99,102,241,0.25)',
                        }}
                        disabled={isSaving}>
                        {isSaving ? 'Saving…' : isSaved ? '✓ Saved' : 'Save Floor Plan'}
                    </button>}
            </div>

            {/* ── Body ─────────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* ── Left tool panel ────────────────────────────────── */}
                <div style={{
                    width: 68, flexShrink: 0,
                    background: THEME.bgPanel,
                    borderRight: `1px solid ${THEME.border}`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', padding: '10px 0', gap: 4,
                    overflowY: 'auto',
                }}>
                    <Toolbar tool={tool} setTool={setTool} />

                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 9, color: THEME.textFaint, textAlign: 'center', lineHeight: 1.7, paddingBottom: 4 }}>
                        <div>{fp.rooms.length}R</div>
                        <div>{fp.lineSegments.length}W</div>
                        <div>{fp.openings.length}O</div>
                        <div>{(fp.stairs ?? []).length}S</div>
                    </div>
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
                        onMouseLeave={() => { isMouseDownRef.current = false; furnitureDragRef.current = null; setMidPan(null); dragRoomRef.current = null; segDragRef.current = null; setHoverTooltip(null) }}
                        onContextMenu={handleContextMenu}
                    />
                    {tool === 'furniture' && (
                        <div style={{ position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', background: THEME.bgPanel, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 480, justifyContent: 'center', boxShadow: THEME.shadowLg }}>
                            <div style={{ width: '100%', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: THEME.textMuted, textAlign: 'center', marginBottom: 2 }}>SELECT FURNITURE TYPE</div>
                            {([
                                { id: 'sofa', label: 'Sofa' }, { id: 'bed', label: 'Bed' },
                                { id: 'dining_table', label: 'Table' }, { id: 'desk', label: 'Desk' },
                                { id: 'wardrobe', label: 'WRB' }, { id: 'bathtub', label: 'Bath' },
                                { id: 'toilet', label: 'WC' }, { id: 'plant', label: 'Plant' },
                                { id: 'chair', label: 'Chair' }, { id: 'coffee_table', label: 'Coffee T.' },
                            ] as { id: FurnitureType; label: string }[]).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedFurnitureType(item.id)}
                                    style={{
                                        height: 32, padding: '0 10px', borderRadius: 7, cursor: 'pointer',
                                        border: selectedFurnitureType === item.id ? `1.5px solid ${THEME.accent}` : `1px solid ${THEME.borderStrong}`,
                                        background: selectedFurnitureType === item.id ? 'rgba(99,102,241,0.12)' : '#FAFAFA',
                                        color: selectedFurnitureType === item.id ? THEME.accent : THEME.textMuted,
                                        fontSize: 11, fontWeight: selectedFurnitureType === item.id ? 700 : 400,
                                        transition: 'all 120ms',
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tool hint */}
                    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: THEME.bgPanel, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '6px 14px', fontSize: 11, color: THEME.textMuted, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: THEME.shadow }}>
                        {tool === 'select' && 'Click to select · Drag room/node · Click segment to drag whole wall'}
                        {tool === 'pan' && 'Click and drag to pan the canvas'}
                        {tool === 'room' && (drawStart ? 'Drag to set room size · Release to place' : 'Click and drag to draw a room')}
                        {tool === 'line' && (lineActiveNodeRef.current ? 'Click to continue wall · Click existing node to close' : 'Click to start a wall segment')}
                        {tool === 'bend' && (lineActiveNodeRef.current ? 'Click to place curved wall point · Click existing node to close' : 'Click to start a curved wall')}
                        {isDoorTool && 'Click on a room wall or line wall to place a door'}
                        {isWindowTool && 'Click on a room wall or line wall to place a window'}
                        {isOpeningTool && 'Click on a room wall or line wall to place an opening'}
                        {isStairsTool && 'Click and drag to place stairs · Drag to set orientation'}
                        {tool === 'delete' && 'Click on a room, wall or node to delete it'}
                        {tool === 'pencil' && 'Draw freehand — release to create room from bounding box'}
                        {tool === 'annotate' && 'Click anywhere to add a label · Click existing label to edit · Delete tool removes labels'}
                        {tool === 'furniture' && `Placing: ${FURNITURE_LABELS[selectedFurnitureType]} · Click canvas to place · Drag to move · Delete tool removes`}
                    </div>

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
                                </div>
                                {walkMode && (
                                    <div style={{
                                        position: 'absolute', top: 44, left: 12, zIndex: 5,
                                        background: THEME.bgPanel, border: '1px solid rgba(16,185,129,0.3)',
                                        borderRadius: 8, padding: '8px 12px', fontSize: 10,
                                        color: '#059669', lineHeight: 1.8, boxShadow: THEME.shadowLg,
                                    }}>
                                        <div style={{ fontWeight: 700, marginBottom: 2 }}>🚶 WALK MODE</div>
                                        <div>Click canvas to lock cursor</div>
                                        <div><kbd style={{ background: '#F0F0EE', border: `1px solid ${THEME.borderStrong}`, borderRadius: 3, padding: '0 3px', fontFamily: 'monospace' }}>W A S D</kbd> Move</div>
                                        <div><kbd style={{ background: '#F0F0EE', border: `1px solid ${THEME.borderStrong}`, borderRadius: 3, padding: '0 3px', fontFamily: 'monospace' }}>Mouse</kbd> Look around</div>
                                        <div><kbd style={{ background: '#F0F0EE', border: `1px solid ${THEME.borderStrong}`, borderRadius: 3, padding: '0 3px', fontFamily: 'monospace' }}>ESC</kbd> Unlock cursor</div>
                                    </div>
                                )}
                                <Canvas shadows camera={{ position: [8, 10, 12], fov: 50, near: 0.1, far: 500 }} style={{ width: '100%', height: '100%', background: '#EFEFEC' }} onWheel={e => e.stopPropagation()}>
                                    <Scene3D fp={fp} sceneConfig={sceneConfig} walkMode={walkMode} />
                                </Canvas>
                            </div>

                            {/* Docked tabs: Properties | Scene Config */}
                            {/* <div style={{ borderTop: `1px solid ${THEME.border}`, background: THEME.bgPanel, display: 'flex', flexDirection: 'column', height: 340, flexShrink: 0 }}>
                                <div style={{ display: 'flex', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
                                    {(['properties', 'scene'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setRightTab(t)}
                                            style={{
                                                flex: 1, height: 38, border: 'none', background: 'transparent',
                                                borderBottom: rightTab === t ? `2px solid ${THEME.accent}` : '2px solid transparent',
                                                color: rightTab === t ? THEME.accent : THEME.textMuted,
                                                fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', cursor: 'pointer',
                                                transition: 'all 150ms',
                                            }}
                                        >
                                            {t === 'properties' ? 'PROPERTIES' : 'SCENE CONFIG'}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {rightTab === 'properties' && (
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
                                                    const isFurniture = (prev.furniture ?? []).some(f => f.id === selectedId)
                                                    const isStairs = (prev.stairs ?? []).some(st => st.id === selectedId)

                                                    if (isRoom) return { ...prev, rooms: prev.rooms.filter(r => r.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                                                    if (isNode) return { ...prev, lineNodes: prev.lineNodes.filter(n => n.id !== selectedId), lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(selectedId)) }
                                                    if (isSeg) return { ...prev, lineSegments: prev.lineSegments.filter(s => s.id !== selectedId), openings: prev.openings.filter(o => o.roomId !== selectedId) }
                                                    if (isFurniture) return { ...prev, furniture: (prev.furniture ?? []).filter(f => f.id !== selectedId) }
                                                    if (isStairs) return { ...prev, stairs: (prev.stairs ?? []).filter(st => st.id !== selectedId) }
                                                    return { ...prev, openings: prev.openings.filter(o => o.id !== selectedId) }
                                                })
                                                setSelectedId(null)
                                            }}
                                        />
                                    )}
                                    {rightTab === 'scene' && (
                                        <SceneConfigPanel fp={fp} config={sceneConfig} onChange={setSceneConfig} onChangeFp={setFp} embedded />
                                    )}
                                </div>
                            </div> */}
                        </div>
                    )}
                </div>
            </div>
            <Dock
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
                        id: 'scene', label: 'Scene Config', onClick: () => setRightTab('scene'), icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
                            </svg>
                        )
                    },
                ]}
                activeId={rightTab}
                expanded={sheetOpen}
                onExpandedChange={setSheetOpen}
            >
                <div style={{ display: 'flex', gap: 2, padding: 10, borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
                    {(['properties', 'scene'] as const).map(t => (
                        <button key={t} onClick={() => setRightTab(t)} style={{
                            height: 26, padding: '0 10px', borderRadius: 5, border: 'none', flex: 1,
                            background: rightTab === t ? THEME.accent : 'transparent',
                            color: rightTab === t ? 'white' : THEME.textMuted,
                            fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
                        }}>
                            {t === 'properties' ? 'PROPERTIES' : 'SCENE CONFIG'}
                        </button>
                    ))}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {rightTab === 'properties' && (
                        <>
                            <SceneGraphPanel fp={fp} selectedId={selectedId} onSelect={setSelectedId} />
                            <div style={{ height: 1, background: THEME.border, margin: '4px 0' }} />
                            <PropsPanel
                                fp={fp}
                                selectedId={selectedId}
                                onChange={setFp}
                                onDelete={() => { /* ...unchanged... */ }}
                            />
                        </>
                    )}
                    {rightTab === 'scene' && (
                        <SceneConfigPanel fp={fp} config={sceneConfig} onChange={setSceneConfig} onChangeFp={setFp} embedded />
                    )}
                </div>
            </Dock>
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