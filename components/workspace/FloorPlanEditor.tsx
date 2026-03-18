'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EditorRoom = {
    id: string
    x: number       // world metres, top-left
    z: number
    width: number   // metres
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
    swingDirection: 'inward' | 'outward'   // ← add this
}

export type ClosedShape = {
    id: string
    nodeIds: string[]   // ordered polygon nodes
    label: string
    color: string
}

export type FloorPlanState = {
    rooms: EditorRoom[]
    openings: EditorOpening[]
    roomHeight: number
    lineNodes: LineNode[]
    lineSegments: LineSegment[]
    closedShapes: ClosedShape[]   // ← add
}

const DEFAULT_FP: FloorPlanState = {
    rooms: [], openings: [], roomHeight: 2.7,
    lineNodes: [], lineSegments: [], closedShapes: [],
}
export type LineNode = {
    id: string
    x: number
    z: number
}

export type LineSegment = {
    id: string
    nodeIds: string[]   // ordered list of node IDs [start, ...mid, end]
    thickness: number
    closed: boolean     // if true, last node connects back to first
}
type EditorTool = 'select' | 'room' | 'door' | 'window' | 'delete' | 'pencil' | 'line' | 'bend'

const GRID_M = 0.5    // snap to 0.5m grid
const PX_PER_M = 40     // pixels per metre at zoom=1
const MIN_ROOM = 1.0    // minimum room size in metres

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }

function snapM(v: number) {
    return Math.round(v / GRID_M) * GRID_M
}

function toWorld(canvasPx: number, panPx: number, zoom: number) {
    return (canvasPx - panPx) / (PX_PER_M * zoom)
}

function toCanvas(worldM: number, panPx: number, zoom: number) {
    return worldM * PX_PER_M * zoom + panPx
}

function roomContainsPoint(room: EditorRoom, wx: number, wz: number) {
    return wx >= room.x && wx <= room.x + room.width &&
        wz >= room.z && wz <= room.z + room.depth
}

function getWallHit(
    room: EditorRoom,
    wx: number,
    wz: number,
    thresholdM: number,
): 'north' | 'south' | 'east' | 'west' | null {
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

// ── 2D Canvas draw ────────────────────────────────────────────────────────────

function draw2D(
    ctx: CanvasRenderingContext2D,
    fp: FloorPlanState,
    tool: EditorTool,
    selectedId: string | null,
    hoveredId: string | null,
    drawRect: { x: number; z: number; w: number; d: number } | null,
    pencilPoints: { x: number, z: number }[],   // ← add
    zoom: number,
    pan: { x: number; y: number },
    preview: { x: number; z: number } | null,           // ← add
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

    // ── Rooms ─────────────────────────────────────────────────────────────────
    for (const room of fp.rooms) {
        const rx = cx(room.x), rz = cy(room.z)
        const rw = room.width * scale, rd = room.depth * scale
        const isSel = selectedId === room.id
        const isHov = hoveredId === room.id

        // Floor fill
        ctx.save()
        ctx.fillStyle = isSel
            ? 'rgba(99,102,241,0.12)'
            : isHov
                ? 'rgba(99,102,241,0.07)'
                : 'rgba(30,27,24,0.6)'
        ctx.fillRect(rx, rz, rw, rd)
        ctx.restore()

        // Walls (thick border)
        const wallT = 0.15 * scale
        ctx.save()
        ctx.fillStyle = isSel ? 'rgba(99,102,241,0.9)' : isHov ? 'rgba(100,116,139,0.9)' : 'rgba(71,85,105,0.9)'

        // North wall
        ctx.fillRect(rx, rz, rw, wallT)
        // South wall
        ctx.fillRect(rx, rz + rd - wallT, rw, wallT)
        // West wall
        ctx.fillRect(rx, rz, wallT, rd)
        // East wall
        ctx.fillRect(rx + rw - wallT, rz, wallT, rd)
        ctx.restore()

        // Room label
        ctx.save()
        ctx.fillStyle = 'rgba(148,163,184,0.8)'
        ctx.font = `${Math.max(10, 12 * zoom)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(room.label, rx + rw / 2, rz + rd / 2 - 8)
        // Dimensions
        ctx.font = `${Math.max(9, 10 * zoom)}px system-ui`
        ctx.fillStyle = 'rgba(100,116,139,0.7)'
        ctx.fillText(`${room.width.toFixed(1)}m × ${room.depth.toFixed(1)}m`, rx + rw / 2, rz + rd / 2 + 10)
        ctx.restore()

        // ── Openings ────────────────────────────────────────────────────────────
        for (const op of fp.openings.filter(o => o.roomId === room.id)) {
            const isHorizontal = op.wall === 'north' || op.wall === 'south'
            const wallLen = isHorizontal ? room.width : room.depth
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

            // Clear the gap
            ctx.clearRect(gx1, gy1, gx2 - gx1, gy2 - gy1)

            if (op.type === 'door') {
                // Door arc
                ctx.save()
                ctx.strokeStyle = '#818CF8'
                ctx.lineWidth = 1.5
                const doorPx = op.width * scale
                if (isHorizontal) {
                    ctx.beginPath()
                    ctx.arc(gx1, (gy1 + gy2) / 2, doorPx, 0, Math.PI / 2)
                    ctx.stroke()
                    ctx.beginPath()
                    ctx.moveTo(gx1, (gy1 + gy2) / 2)
                    ctx.lineTo(gx1 + doorPx, (gy1 + gy2) / 2)
                    ctx.stroke()
                } else {
                    ctx.beginPath()
                    ctx.arc((gx1 + gx2) / 2, gy1, doorPx, 0, Math.PI / 2)
                    ctx.stroke()
                    ctx.beginPath()
                    ctx.moveTo((gx1 + gx2) / 2, gy1)
                    ctx.lineTo((gx1 + gx2) / 2, gy1 + doorPx)
                    ctx.stroke()
                }
                ctx.restore()
            } else {
                // Window: light blue fill
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
                // Edge midpoints
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
        // Size label
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(165,168,255,0.9)'
        ctx.font = `${11 * zoom}px system-ui`
        ctx.textAlign = 'center'
        ctx.fillText(
            `${Math.abs(drawRect.w).toFixed(1)}m × ${Math.abs(drawRect.d).toFixed(1)}m`,
            rx + rw / 2, rz + rd / 2
        )
        ctx.restore()
    }
    // ── Pencil stroke preview ─────────────────────────────────────────────────
    if (pencilPoints.length > 1) {
        ctx.save()

        // Draw the freeform stroke
        ctx.strokeStyle = 'rgba(99,102,241,0.7)'
        ctx.lineWidth = 2
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(cx(pencilPoints[0]!.x), cy(pencilPoints[0]!.z))
        for (let i = 1; i < pencilPoints.length; i++) {
            ctx.lineTo(cx(pencilPoints[i]!.x), cy(pencilPoints[i]!.z))
        }
        ctx.stroke()

        // Show bounding box preview so user can see the room that will be created
        const xs = pencilPoints.map(p => p.x)
        const zs = pencilPoints.map(p => p.z)
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

            // Size label
            ctx.setLineDash([])
            ctx.fillStyle = 'rgba(165,168,255,0.75)'
            ctx.font = `${Math.max(9, 11 * zoom)}px system-ui`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(
                `${bw.toFixed(1)}m × ${bd.toFixed(1)}m`,
                brx + brw / 2,
                brz + brd / 2
            )
        }

        ctx.restore()
    }
    // ── Line segments ──────────────────────────────────────────────────────────
    for (const seg of fp.lineNodes.length > 0 ? (fp as any).lineSegments ?? [] : []) {
        const nodes = (seg.nodeIds as string[]).map((nid: string) =>
            fp.lineNodes.find((n: LineNode) => n.id === nid)
        ).filter(Boolean) as LineNode[]
        if (nodes.length < 2) continue

        ctx.save()
        ctx.strokeStyle = selectedId && seg.nodeIds.includes(selectedId)
            ? 'rgba(99,102,241,0.9)'
            : 'rgba(148,163,184,0.75)'
        ctx.lineWidth = Math.max(2, seg.thickness * scale)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(cx(nodes[0]!.x), cy(nodes[0]!.z))
        for (let i = 1; i < nodes.length; i++) {
            ctx.lineTo(cx(nodes[i]!.x), cy(nodes[i]!.z))
        }
        if (seg.closed) ctx.closePath()
        ctx.stroke()
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i]!
            const b = nodes[i + 1]!
            const lenM = Math.hypot(b.x - a.x, b.z - a.z).toFixed(2)
            const midX = cx((a.x + b.x) / 2)
            const midZ = cy((a.z + b.z) / 2)
            const angle = Math.atan2(cy(b.z) - cy(a.z), cx(b.x) - cx(a.x))

            ctx.save()
            ctx.translate(midX, midZ)
            // Keep text readable — flip if upside down
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
    }
    // ── Closed shapes (filled polygons) ──────────────────────────────────────
    for (const shape of fp.closedShapes ?? []) {
        const nodes = shape.nodeIds
            .map(nid => fp.lineNodes.find(n => n.id === nid))
            .filter(Boolean) as LineNode[]
        if (nodes.length < 3) continue

        const isSel = selectedId === shape.id
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(cx(nodes[0]!.x), cy(nodes[0]!.z))
        for (let i = 1; i < nodes.length; i++) ctx.lineTo(cx(nodes[i]!.x), cy(nodes[i]!.z))
        ctx.closePath()
        ctx.fillStyle = isSel ? 'rgba(99,102,241,0.15)' : 'rgba(139,123,107,0.12)'
        ctx.fill()
        ctx.strokeStyle = isSel ? 'rgba(99,102,241,0.8)' : 'rgba(139,123,107,0.5)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.stroke()

        // Centroid label
        const cx_ = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
        const cz_ = nodes.reduce((s, n) => s + n.z, 0) / nodes.length
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(165,168,255,0.7)'
        ctx.font = `${Math.max(9, 11 * zoom)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(shape.label, cx(cx_), cy(cz_))
        ctx.restore()
    }
    // ── Line nodes ─────────────────────────────────────────────────────────────
    for (const node of fp.lineNodes ?? []) {
        const isActive = activeLineNodeId === node.id
        const isSel = selectedId === node.id
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx(node.x), cy(node.z), isSel || isActive ? 7 : 5, 0, Math.PI * 2)
        ctx.fillStyle = isActive ? 'rgba(99,102,241,0.9)' : isSel ? 'rgba(165,168,255,0.9)' : 'rgba(100,116,139,0.7)'
        ctx.strokeStyle = 'rgba(226,232,240,0.4)'
        ctx.lineWidth = 1.5
        ctx.fill()
        ctx.stroke()
        ctx.restore()
    }
    // In draw2D, add after line nodes section:
    // ── Live measurement rubber band ──────────────────────────────────────────
    if ((tool === 'line' || tool === 'bend') && activeLineNodeId && preview) {
        const fromNode = fp.lineNodes.find(n => n.id === activeLineNodeId)
        if (fromNode) {
            const fx = cx(fromNode.x), fz = cy(fromNode.z)
            const tx = cx(preview.x), tz = cy(preview.z)
            const lenM = Math.hypot(preview.x - fromNode.x, preview.z - fromNode.z)

            // Dashed line
            ctx.save()
            ctx.strokeStyle = 'rgba(99,102,241,0.7)'
            ctx.lineWidth = 2
            ctx.setLineDash([6, 4])
            ctx.beginPath(); ctx.moveTo(fx, fz); ctx.lineTo(tx, tz); ctx.stroke()
            ctx.setLineDash([])

            // Length badge
            if (lenM > 0.05) {
                const midX = (fx + tx) / 2, midZ = (fz + tz) / 2
                const angle = Math.atan2(tz - fz, tx - fx)
                const display = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle

                const label = `${lenM.toFixed(2)}m`
                ctx.font = `bold ${Math.max(10, 11 * zoom)}px system-ui`
                const tw = ctx.measureText(label).width

                ctx.translate(midX, midZ)
                ctx.rotate(display)

                // Badge background
                ctx.fillStyle = 'rgba(99,102,241,0.85)'
                ctx.beginPath()
                ctx.roundRect(-(tw / 2) - 6, -22, tw + 12, 18, 4)
                ctx.fill()

                // Text
                ctx.fillStyle = 'white'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(label, 0, -13)
            }
            ctx.restore()

            // Snap indicator at cursor
            ctx.save()
            const nearNode = fp.lineNodes.find(n =>
                n.id !== activeLineNodeId &&
                Math.hypot(preview.x - n.x, preview.z - n.z) < 0.4 / zoom
            )
            ctx.beginPath()
            ctx.arc(tx, tz, nearNode ? 9 : 5, 0, Math.PI * 2)
            ctx.fillStyle = nearNode ? 'rgba(34,197,94,0.9)' : 'rgba(99,102,241,0.8)'
            ctx.fill()
            if (nearNode) {
                ctx.strokeStyle = 'rgba(34,197,94,0.4)'
                ctx.lineWidth = 3
                ctx.stroke()
            }
            ctx.restore()
        }
    }
    // ── Line preview (rubber band while drawing) ───────────────────────────────
    if ((tool === 'line' || tool === 'bend') && activeLineNodeId) {
        const fromNode = fp.lineNodes.find(n => n.id === activeLineNodeId)
        if (fromNode && preview) {
            ctx.save()
            ctx.strokeStyle = 'rgba(99,102,241,0.6)'
            ctx.lineWidth = 2
            ctx.setLineDash([5, 4])
            ctx.beginPath()
            ctx.moveTo(cx(fromNode.x), cy(fromNode.z))
            ctx.lineTo(cx(preview.x), cy(preview.z))
            ctx.stroke()
            ctx.restore()
        }
    }
}

// ── Line segment 3D renderer ──────────────────────────────────────────────────

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
                    const a = nodes[i]!
                    const b = nodes[i + 1]!

                    const dx = b.x - a.x
                    const dz = b.z - a.z
                    const len = Math.hypot(dx, dz)
                    if (len < 0.05) continue

                    const cx = (a.x + b.x) / 2
                    const cz = (a.z + b.z) / 2
                    const angle = Math.atan2(dz, dx)

                    panels.push(
                        <mesh
                            key={`${seg.id}_${i}`}
                            position={[cx, H / 2, cz]}
                            rotation={[0, -angle, 0]}
                            castShadow
                            receiveShadow
                        >
                            <boxGeometry args={[len, H, seg.thickness ?? T]} />
                            <meshStandardMaterial color="#8B7B6B" roughness={0.85} />
                        </mesh>
                    )
                }

                // If closed polygon — also render a floor
                if (seg.closed && nodes.length >= 3) {
                    const xs = nodes.map(n => n.x)
                    const zs = nodes.map(n => n.z)
                    const minX = Math.min(...xs), maxX = Math.max(...xs)
                    const minZ = Math.min(...zs), maxZ = Math.max(...zs)
                    const w = maxX - minX, d = maxZ - minZ
                    panels.push(
                        <mesh
                            key={`${seg.id}_floor`}
                            position={[(minX + maxX) / 2, 0.002, (minZ + maxZ) / 2]}
                            rotation={[-Math.PI / 2, 0, 0]}
                            receiveShadow
                        >
                            <planeGeometry args={[w, d]} />
                            <meshStandardMaterial color="#D4C4A0" roughness={0.82} side={THREE.DoubleSide} />
                        </mesh>
                    )
                }

                return <group key={seg.id}>{panels}</group>
            })}
            {(fp.closedShapes ?? []).map(shape => {
                const nodes = shape.nodeIds
                    .map(nid => fp.lineNodes.find(n => n.id === nid))
                    .filter(Boolean) as LineNode[]
                if (nodes.length < 3) return null

                // Compute centroid
                const cx_ = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
                const cz_ = nodes.reduce((s, n) => s + n.z, 0) / nodes.length

                // Bounding box floor approximation
                const xs = nodes.map(n => n.x), zs = nodes.map(n => n.z)
                const minX = Math.min(...xs), maxX = Math.max(...xs)
                const minZ = Math.min(...zs), maxZ = Math.max(...zs)
                const w = maxX - minX, d = maxZ - minZ

                return (
                    <group key={shape.id}>
                        <mesh position={[cx_, 0.003, cz_]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                            <planeGeometry args={[w, d]} />
                            <meshStandardMaterial color="#D4C4A0" roughness={0.82} side={THREE.DoubleSide} />
                        </mesh>
                    </group>
                )
            })}
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

function Room3D({ room, openings, roomHeight }: {
    room: EditorRoom
    openings: EditorOpening[]
    roomHeight: number
}) {
    const cx = room.x + room.width / 2
    const cz = room.z + room.depth / 2
    const W = room.width
    const D = room.depth
    const H = roomHeight
    const T = 0.15

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
            {/* Floor only — no ceiling so camera can see inside */}
            <mesh
                position={[cx, 0.002, cz]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
            >
                <planeGeometry args={[W - T * 2, D - T * 2]} />
                <meshStandardMaterial color="#D4C4A0" roughness={0.82} metalness={0} />
            </mesh>

            {/* Walls with openings */}
            {walls.map(wall => {
                const wallOpenings = openings.filter(o => o.wall === wall.name)
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

                // Slice wall into panels around openings
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
                        const size: [number, number, number] = wall.axis === 'x'
                            ? [segLen, H, T]
                            : [T, H, segLen]
                        panels.push(
                            <mesh key={`l${i}`} position={pos} castShadow receiveShadow>
                                <boxGeometry args={size} />
                                <meshStandardMaterial color="#8B7B6B" roughness={0.85} />
                            </mesh>
                        )
                    }

                    if (op) {
                        // Header above opening
                        const headerH = H - op.height
                        if (headerH > 0.02) {
                            const opMid = op.position
                            const hPos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid, op.height + headerH / 2, wPos[2]]
                                : [wPos[0], op.height + headerH / 2, room.z + opMid]
                            const hSize: [number, number, number] = wall.axis === 'x'
                                ? [op.width, headerH, T]
                                : [T, headerH, op.width]
                            panels.push(
                                <mesh key={`h${i}`} position={hPos} castShadow receiveShadow>
                                    <boxGeometry args={hSize} />
                                    <meshStandardMaterial color="#8B7B6B" roughness={0.85} />
                                </mesh>
                            )
                        }

                        // Window sill
                        if (op.type === 'window' && op.sillHeight > 0.02) {
                            const opMid = op.position
                            const sPos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid, op.sillHeight / 2, wPos[2]]
                                : [wPos[0], op.sillHeight / 2, room.z + opMid]
                            const sSize: [number, number, number] = wall.axis === 'x'
                                ? [op.width, op.sillHeight, T]
                                : [T, op.sillHeight, op.width]
                            panels.push(
                                <mesh key={`s${i}`} position={sPos} castShadow receiveShadow>
                                    <boxGeometry args={sSize} />
                                    <meshStandardMaterial color="#8B7B6B" roughness={0.85} />
                                </mesh>
                            )
                        }

                        // Window glass
                        if (op.type === 'window') {
                            const opMid = op.position
                            const gPos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid, op.sillHeight + op.height / 2, wPos[2]]
                                : [wPos[0], op.sillHeight + op.height / 2, room.z + opMid]
                            const gSize: [number, number, number] = wall.axis === 'x'
                                ? [op.width, op.height, 0.025]
                                : [0.025, op.height, op.width]
                            panels.push(
                                <mesh key={`g${i}`} position={gPos}>
                                    <boxGeometry args={gSize} />
                                    <meshStandardMaterial
                                        color="#93C5FD" transparent opacity={0.35}
                                        roughness={0.05} metalness={0.15} side={THREE.DoubleSide}
                                    />
                                </mesh>
                            )
                        }

                        // Door leaf — swings based on swingDirection
                        if (op.type === 'door') {
                            const inward = op.swingDirection !== 'outward'
                            const swingSign = inward ? 1 : -1
                            const opMid = op.position
                            const hingeOffset = -op.width / 2  // hinge at left edge of opening
                            const leafAngle = Math.PI / 2 * swingSign

                            const doorPos: [number, number, number] = wall.axis === 'x'
                                ? [room.x + opMid + hingeOffset + (op.width / 2) * Math.cos(leafAngle),
                                op.height / 2,
                                wPos[2] + (op.width / 2) * Math.sin(leafAngle) * swingSign]
                                : [wPos[0] + (op.width / 2) * Math.sin(leafAngle) * swingSign,
                                op.height / 2,
                                room.z + opMid + hingeOffset + (op.width / 2) * Math.cos(leafAngle)]

                            const doorRot: [number, number, number] = wall.axis === 'x'
                                ? [0, leafAngle, 0]
                                : [0, leafAngle + Math.PI / 2, 0]

                            panels.push(
                                <mesh key={`door${i}`} position={doorPos} rotation={doorRot} castShadow>
                                    <boxGeometry args={[op.width, op.height, 0.04]} />
                                    <meshStandardMaterial color="#C8A878" roughness={0.55} metalness={0.05} />
                                </mesh>
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

function Scene3D({ fp }: { fp: FloorPlanState }) {
    return (
        <>
            <ambientLight intensity={2.0} color="#FFF8F0" />
            <directionalLight position={[10, 15, 10]} intensity={2.5} castShadow
                shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-5, 8, -5]} intensity={0.8} color="#C8D4E8" />

            {fp.rooms.map(room => (
                <Room3D
                    key={room.id}
                    room={room}
                    openings={fp.openings.filter(o => o.roomId === room.id)}
                    roomHeight={fp.roomHeight}
                />
            ))}
            <LineWalls3D fp={fp} />
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
            <gridHelper args={[50, 50, '#1C1A17', '#1C1A17']} position={[0, -0.01, 0]} />
        </>
    )
}

// ── Properties panel ──────────────────────────────────────────────────────────

function PropsPanel({
    fp, selectedId,
    onChange,
    onDelete,
}: {
    fp: FloorPlanState
    selectedId: string | null
    onChange: (fp: FloorPlanState) => void
    onDelete: () => void
}) {
    const room = fp.rooms.find(r => r.id === selectedId)
    const opening = fp.openings.find(o => o.id === selectedId)

    if (!room && !opening) return (
        <div style={{ padding: 16, fontSize: 11, color: 'rgba(100,116,139,0.5)', textAlign: 'center' }}>
            Select a room or opening to edit its properties
        </div>
    )

    const patchRoom = (patch: Partial<EditorRoom>) =>
        onChange({ ...fp, rooms: fp.rooms.map(r => r.id === room?.id ? { ...r, ...patch } : r) })

    const patchOpening = (patch: Partial<EditorOpening>) =>
        onChange({ ...fp, openings: fp.openings.map(o => o.id === opening?.id ? { ...o, ...patch } : o) })

    return (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.7)' }}>
                {room ? 'ROOM' : opening?.type?.toUpperCase()}
            </div>

            {room && (
                <>
                    <PropField label="Label">
                        <input value={room.label} onChange={e => patchRoom({ label: e.target.value })}
                            style={inputStyle} />
                    </PropField>
                    <PropField label="Width (m)">
                        <NumInput value={room.width} min={1} max={30} step={0.5}
                            onChange={v => patchRoom({ width: v })} />
                    </PropField>
                    <PropField label="Depth (m)">
                        <NumInput value={room.depth} min={1} max={30} step={0.5}
                            onChange={v => patchRoom({ depth: v })} />
                    </PropField>
                    <PropField label="X pos (m)">
                        <NumInput value={room.x} min={-50} max={50} step={0.5}
                            onChange={v => patchRoom({ x: v })} />
                    </PropField>
                    <PropField label="Z pos (m)">
                        <NumInput value={room.z} min={-50} max={50} step={0.5}
                            onChange={v => patchRoom({ z: v })} />
                    </PropField>
                </>
            )}

            {opening && (
                <>
                    <PropField label="Width (m)">
                        <NumInput value={opening.width} min={0.5} max={4} step={0.1}
                            onChange={v => patchOpening({ width: v })} />
                    </PropField>
                    {opening.type === 'window' && (
                        <>
                            <PropField label="Height (m)">
                                <NumInput value={opening.height} min={0.3} max={2.5} step={0.1}
                                    onChange={v => patchOpening({ height: v })} />
                            </PropField>
                            <PropField label="Sill (m)">
                                <NumInput value={opening.sillHeight} min={0} max={2} step={0.1}
                                    onChange={v => patchOpening({ sillHeight: v })} />
                            </PropField>
                        </>
                    )}
                    <PropField label="Position (m)">
                        <NumInput value={opening.position} min={0.3} max={20} step={0.1}
                            onChange={v => patchOpening({ position: v })} />
                    </PropField>
                    {opening.type === 'door' && (
                        <PropField label="Swing">
                            <button
                                onClick={() => patchOpening({
                                    swingDirection: opening.swingDirection === 'inward' ? 'outward' : 'inward'
                                })}
                                style={{
                                    height: 26, padding: '0 10px', borderRadius: 5, cursor: 'pointer',
                                    border: '1px solid rgba(99,102,241,0.4)',
                                    background: 'rgba(99,102,241,0.1)',
                                    color: 'rgba(165,168,255,0.9)', fontSize: 11, fontWeight: 600,
                                }}
                            >
                                {opening.swingDirection === 'inward' ? '← Inward' : '→ Outward'}
                            </button>
                        </PropField>
                    )}
                </>
            )}

            <button onClick={onDelete}
                style={{
                    marginTop: 4, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)',
                    background: 'transparent', color: 'rgba(248,113,113,0.8)', fontSize: 11, cursor: 'pointer'
                }}>
                Delete {room ? 'room' : 'opening'}
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

function NumInput({ value, min, max, step, onChange }: {
    value: number; min: number; max: number; step: number
    onChange: (v: number) => void
}) {
    return (
        <input type="number" min={min} max={max} step={step}
            value={value.toFixed(2)}
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

// ── Toolbar ───────────────────────────────────────────────────────────────────

const TOOLS: { id: EditorTool; label: string; icon: string; key: string }[] = [
    { id: 'select', label: 'Select / Move', icon: '↖', key: 'V' },
    { id: 'room', label: 'Draw Room', icon: '▭', key: 'R' },
    { id: 'pencil', label: 'Freeform', icon: '✏️', key: 'P' },
    { id: 'line', label: 'Line Wall', icon: '╱', key: 'L' },
    { id: 'bend', label: 'Bend Wall', icon: '⌒', key: 'B' },
    { id: 'door', label: 'Place Door', icon: '🚪', key: 'D' },
    { id: 'window', label: 'Place Window', icon: '⬜', key: 'N' },
    { id: 'delete', label: 'Delete', icon: '✕', key: '⌫' },
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
    const isDrawingRef = useRef(false)
    const [tool, setTool] = useState<EditorTool>('room')
    const [pencilPoints, setPencilPoints] = useState<{ x: number, z: number }[]>([])
    const isPencilDrawing = useRef(false)
    const [preview, setPreview] = useState<{ x: number; z: number } | null>(null)
    const lineActiveNodeRef = useRef<string | null>(null)  // node being drawn from
    const lineSegmentRef = useRef<LineSegment | null>(null)
    const spaceHeldRef = useRef(false)
    const spacePanRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const dragRoomRef = useRef<{ id: string; ox: number; oz: number } | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const canvasDivRef = useRef<HTMLDivElement>(null)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 60, y: 60 })
    const [drawStart, setDrawStart] = useState<{ x: number; z: number } | null>(null)
    const [drawRect, setDrawRect] = useState<{ x: number; z: number; w: number; d: number } | null>(null)
    const [dragRoom, setDragRoom] = useState<{ id: string; ox: number; oz: number } | null>(null)
    const [midPan, setMidPan] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null)
    const fpRef = useRef(fp)
    const [canvasCursor, setCanvasCursor] = useState('default')
    const resizeHandleRef = useRef<{
        handle: string
        room: EditorRoom
        startWx: number
        startWz: number
    } | null>(null)
    fpRef.current = fp

    // ── Redraw on state change ────────────────────────────────────────────────
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
    // ── Resize observer ───────────────────────────────────────────────────────
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
            if (key === 'r') setTool('room')
            if (key === 'd') setTool('door')
            if (key === 'n') setTool('window')
            if (key === 'l') setTool('line')
            if (key === 'b') setTool('bend')
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

                    if (isRoom) return {
                        ...prev,
                        rooms: prev.rooms.filter(r => r.id !== selectedId),
                        openings: prev.openings.filter(o => o.roomId !== selectedId),
                    }
                    if (isOpening) return {
                        ...prev,
                        openings: prev.openings.filter(o => o.id !== selectedId),
                    }
                    if (isNode) return {
                        ...prev,
                        lineNodes: prev.lineNodes.filter(n => n.id !== selectedId),
                        lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(selectedId)),
                        closedShapes: prev.closedShapes.filter(s => !s.nodeIds.includes(selectedId)),
                    }
                    if (isSeg) return {
                        ...prev,
                        lineSegments: prev.lineSegments.filter(s => s.id !== selectedId),
                        closedShapes: prev.closedShapes.filter(cs =>
                            !cs.nodeIds.some(nid =>
                                prev.lineSegments.find(s => s.id === selectedId)?.nodeIds.includes(nid)
                            )
                        ),
                    }
                    if (isShape) return {
                        ...prev,
                        closedShapes: prev.closedShapes.filter(s => s.id !== selectedId),
                    }
                    return prev
                })
                setSelectedId(null)
            }
            if (key === 'z' && (e.metaKey || e.ctrlKey)) {
                setFp(prev => {
                    if (prev.rooms.length === 0) return prev
                    const last = prev.rooms[prev.rooms.length - 1]!
                    return {
                        ...prev,
                        rooms: prev.rooms.slice(0, -1),
                        openings: prev.openings.filter(o => o.roomId !== last.id),
                    }
                })
            }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [selectedId])

    // Add toggle function:
    const toggleFullscreen = useCallback(async () => {
        if (!document.fullscreenElement) {
            await editorRef.current?.requestFullscreen()
            setIsFullscreen(true)
        } else {
            await document.exitFullscreen()
            setIsFullscreen(false)
        }
    }, [])

    useEffect(() => {
        const h = () => setIsFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', h)
        return () => document.removeEventListener('fullscreenchange', h)
    }, [])

    // Add this ref alongside other refs:
    const panRef = useRef(pan)
    useEffect(() => { panRef.current = pan }, [pan])

    const zoomRef = useRef(zoom)
    useEffect(() => { zoomRef.current = zoom }, [zoom])

    // Replace evWorld with ref-based version (no stale closure):
    const evWorld = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect()
        return {
            wx: toWorld(e.clientX - rect.left, panRef.current.x, zoomRef.current),
            wz: toWorld(e.clientY - rect.top, panRef.current.y, zoomRef.current),
            cx: e.clientX - rect.left,
            cy: e.clientY - rect.top,
        }
    }, []) // ← no dependencies — always reads latest via refs

    // ── Hit testing ──────────────────────────────────────────────────────────
    const hitRoom = useCallback((wx: number, wz: number) => {
        // Test in reverse order (last drawn = top)
        const rooms = [...fpRef.current.rooms].reverse()
        return rooms.find(r => roomContainsPoint(r, wx, wz)) ?? null
    }, [])
    const hitLineSegment = useCallback((wx: number, wz: number) => {
        const threshold = 0.3 / zoomRef.current
        for (const seg of fpRef.current.lineSegments ?? []) {
            const nodes = seg.nodeIds
                .map(nid => fpRef.current.lineNodes.find(n => n.id === nid))
                .filter(Boolean) as LineNode[]
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i]!, b = nodes[i + 1]!
                // Distance from point to segment
                const dx = b.x - a.x, dz = b.z - a.z
                const len2 = dx * dx + dz * dz
                if (len2 === 0) continue
                const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wz - a.z) * dz) / len2))
                const dist = Math.hypot(wx - (a.x + t * dx), wz - (a.z + t * dz))
                if (dist < threshold) return seg
            }
        }
        return null
    }, [])

    const hitClosedShape = useCallback((wx: number, wz: number) => {
        // Point-in-polygon test for each closed shape
        for (const shape of fpRef.current.closedShapes ?? []) {
            const nodes = shape.nodeIds
                .map(nid => fpRef.current.lineNodes.find(n => n.id === nid))
                .filter(Boolean) as LineNode[]
            if (nodes.length < 3) continue
            // Ray casting
            let inside = false
            for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
                const xi = nodes[i]!.x, zi = nodes[i]!.z
                const xj = nodes[j]!.x, zj = nodes[j]!.z
                if ((zi > wz) !== (zj > wz) && wx < ((xj - xi) * (wz - zi)) / (zj - zi) + xi) {
                    inside = !inside
                }
            }
            if (inside) return shape
        }
        return null
    }, [])

    function getPolygonCentroidAndBounds(nodes: LineNode[]) {
        const xs = nodes.map(n => n.x), zs = nodes.map(n => n.z)
        const minX = Math.min(...xs), maxX = Math.max(...xs)
        const minZ = Math.min(...zs), maxZ = Math.max(...zs)
        return { minX, maxX, minZ, maxZ, w: maxX - minX, d: maxZ - minZ }
    }

    function tryConvertClosedLineShape(
        fp: FloorPlanState,
        newSegId: string,
    ): FloorPlanState {
        // Build adjacency from all segments
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

        // Find nodes with 2+ connections — potential cycle members
        const candidates = fp.lineNodes.filter(n => (adj.get(n.id)?.length ?? 0) >= 2)

        // DFS to find shortest cycle involving the new segment's nodes
        const newSeg = fp.lineSegments.find(s => s.id === newSegId)
        if (!newSeg || newSeg.nodeIds.length < 2) return fp

        const startId = newSeg.nodeIds[0]!
        const endId = newSeg.nodeIds[newSeg.nodeIds.length - 1]!

        // Find path from endId back to startId (excluding the direct new edge)
        function findPath(from: string, to: string, visited: Set<string>): string[] | null {
            if (from === to) return [from]
            visited.add(from)
            for (const next of adj.get(from) ?? []) {
                if (visited.has(next)) continue
                // Don't traverse the newly added segment directly
                const isNewEdge = (from === startId && next === endId) || (from === endId && next === startId)
                if (isNewEdge) continue
                const path = findPath(next, to, visited)
                if (path) return [from, ...path]
            }
            return null
        }

        const path = findPath(endId, startId, new Set([startId]))
        if (!path || path.length < 3) return fp  // no valid cycle

        const cycleNodeIds = [startId, ...path]
        const cycleNodes = cycleNodeIds
            .map(id => fp.lineNodes.find(n => n.id === id))
            .filter(Boolean) as LineNode[]

        if (cycleNodes.length < 3) return fp

        const { minX, minZ, w, d } = getPolygonCentroidAndBounds(cycleNodes)
        if (w < MIN_ROOM || d < MIN_ROOM) return fp

        // Check not already a room covering this area
        const alreadyExists = fp.rooms.some(r =>
            Math.abs(r.x - minX) < 0.1 && Math.abs(r.z - minZ) < 0.1 &&
            Math.abs(r.width - w) < 0.1 && Math.abs(r.depth - d) < 0.1
        )
        if (alreadyExists) return fp

        const newRoom: EditorRoom = {
            id: uid(),
            x: minX, z: minZ,
            width: w, depth: d,
            label: `Area ${fp.rooms.length + 1}`,
        }

        return {
            ...fp,
            rooms: [...fp.rooms, newRoom],
            // Keep line nodes/segments for visual reference but mark the shape
            closedShapes: [
                ...(fp.closedShapes ?? []),
                { id: uid(), nodeIds: cycleNodeIds, label: newRoom.label, color: '#8B7B6B' }
            ],
        }
    }

    // ── Mouse handlers ────────────────────────────────────────────────────────
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const { wx, wz, cx, cy } = evWorld(e)

        // Space+click = pan regardless of tool
        if (spaceHeldRef.current) {
            spacePanRef.current = { sx: cx, sy: cy, px: panRef.current.x, py: panRef.current.y }
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
            return
        }

        if (e.button === 1) {
            setMidPan({ sx: cx, sy: cy, px: panRef.current.x, py: panRef.current.y })
            return
        }
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
                    const ecx = e.clientX - rect.left
                    const ecy = e.clientY - rect.top
                    if (Math.hypot(ecx - hcx, ecy - hcy) < 8) {
                        resizeHandleRef.current = { handle: h.id, room: { ...selRoom }, startWx: wx, startWz: wz }
                        return
                    }
                }
            }
        }
        if (tool === 'select') {
            // 1. Check openings first
            const op = hitLineSegment(wx, wz)
            if (op) { setSelectedId(op.id); dragRoomRef.current = null; return }

            // 2. Check rooms
            const room = hitRoom(wx, wz)
            if (room) {
                setSelectedId(room.id)
                dragRoomRef.current = { id: room.id, ox: wx - room.x, oz: wz - room.z }
                return
            }

            // 3. Check closed shapes (polygon areas)
            const shape = hitClosedShape(wx, wz)
            if (shape) {
                setSelectedId(shape.id)
                dragRoomRef.current = null
                return
            }

            // 4. Check line segments
            const seg = hitLineSegment(wx, wz)
            if (seg) {
                setSelectedId(seg.id)
                dragRoomRef.current = null
                return
            }

            // 5. Check line nodes
            const node = fpRef.current.lineNodes.find(n =>
                Math.hypot(wx - n.x, wz - n.z) < 0.4 / zoomRef.current
            )
            if (node) {
                setSelectedId(node.id)
                dragRoomRef.current = { id: node.id, ox: wx - node.x, oz: wz - node.z }
                return
            }

            setSelectedId(null)
            return
        }

        if (tool === 'room') {
            const snappedX = snapM(wx)
            const snappedZ = snapM(wz)
            drawStartRef.current = { x: snappedX, z: snappedZ }
            isDrawingRef.current = true
            setDrawStart({ x: snappedX, z: snappedZ })
            setDrawRect({ x: snappedX, z: snappedZ, w: 0, d: 0 })
            return
        }



        if (tool === 'pencil') {
            isPencilDrawing.current = true
            setPencilPoints([{ x: snapM(wx), z: snapM(wz) }])
            return
        }

        if (tool === 'line' || tool === 'bend') {
            const snapX = snapM(wx), snapZ = snapM(wz)
            const threshold = 0.5 / zoomRef.current

            // Check if clicking an existing node to connect or end
            const existingNode = fpRef.current.lineNodes.find(n =>
                Math.hypot(snapX - n.x, snapZ - n.z) < threshold
            )

            if (lineActiveNodeRef.current) {
                // We're mid-draw — connect to existing or place new endpoint
                const fromId = lineActiveNodeRef.current
                let toId: string
                if (existingNode) {
                    toId = existingNode.id
                    lineActiveNodeRef.current = null

                    const seg: LineSegment = { id: uid(), nodeIds: [fromId, toId], thickness: 0.15, closed: false }

                    setFp(prev => {
                        const withSeg = { ...prev, lineSegments: [...prev.lineSegments, seg] }
                        return tryConvertClosedLineShape(withSeg, seg.id)
                    })
                    return
                } else {
                    const newNode: LineNode = { id: uid(), x: snapX, z: snapZ }
                    toId = newNode.id
                    lineActiveNodeRef.current = newNode.id

                    if (tool === 'bend') {
                        // Insert midpoint node between fromId and toId
                        const fromNode = fpRef.current.lineNodes.find(n => n.id === fromId)!
                        const midNode: LineNode = {
                            id: uid(),
                            x: (fromNode.x + snapX) / 2,
                            z: (fromNode.z + snapZ) / 2,
                        }
                        const seg: LineSegment = {
                            id: uid(),
                            nodeIds: [fromId, midNode.id, newNode.id],
                            thickness: 0.15,
                            closed: false,
                        }
                        setFp(prev => ({
                            ...prev,
                            lineNodes: [...prev.lineNodes, midNode, newNode],
                            lineSegments: [...prev.lineSegments, seg],
                        }))
                        return
                    } else {
                        const seg: LineSegment = {
                            id: uid(),
                            nodeIds: [fromId, newNode.id],
                            thickness: 0.15,
                            closed: false,
                        }
                        setFp(prev => ({
                            ...prev,
                            lineNodes: [...prev.lineNodes, newNode],
                            lineSegments: [...prev.lineSegments, seg],
                        }))
                        return
                    }
                }

                // Connect to existingNode
                const seg: LineSegment = {
                    id: uid(),
                    nodeIds: [fromId, toId],
                    thickness: 0.15,
                    closed: false,
                }
                setFp(prev => ({ ...prev, lineSegments: [...prev.lineSegments, seg] }))

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
                setFp(prev => ({ ...prev, openings: [...prev.openings, op] }))
                setSelectedId(op.id)
                return
            }

            // Try line segment
            const seg = hitLineSegment(wx, wz)
            if (seg) {
                const nodes = seg.nodeIds
                    .map(nid => fpRef.current.lineNodes.find(n => n.id === nid))
                    .filter(Boolean) as LineNode[]
                if (nodes.length >= 2) {
                    // Find closest sub-segment and compute t along it
                    let bestT = 0, bestSegIdx = 0, bestDist = Infinity
                    for (let i = 0; i < nodes.length - 1; i++) {
                        const a = nodes[i]!, b = nodes[i + 1]!
                        const dx = b.x - a.x, dz = b.z - a.z
                        const len2 = dx * dx + dz * dz
                        if (len2 === 0) continue
                        const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wz - a.z) * dz) / len2))
                        const dist = Math.hypot(wx - (a.x + t * dx), wz - (a.z + t * dz))
                        if (dist < bestDist) { bestDist = dist; bestT = t; bestSegIdx = i }
                    }
                    const a = nodes[bestSegIdx]!, b = nodes[bestSegIdx + 1]!
                    const wallLen = Math.hypot(b.x - a.x, b.z - a.z)
                    const opW = tool === 'door' ? 0.9 : 1.2
                    const rawPos = bestT * wallLen
                    const clampedPos = Math.max(opW / 2, Math.min(wallLen - opW / 2, rawPos))
                    const op: EditorOpening = {
                        id: uid(),
                        roomId: seg.id,  // use seg.id as roomId for line openings
                        wall: 'north',   // direction computed from segment angle
                        type: tool,
                        position: parseFloat(clampedPos.toFixed(2)),
                        width: opW,
                        height: tool === 'door' ? 2.1 : 1.2,
                        sillHeight: tool === 'window' ? 0.9 : 0,
                        swingDirection: 'inward',
                    }
                    setFp(prev => ({ ...prev, openings: [...prev.openings, op] }))
                    setSelectedId(op.id)
                }
                return
            }
        }

        if (tool === 'delete') {
            const op = hitLineSegment(wx, wz)
            if (op) { setFp(prev => ({ ...prev, openings: prev.openings.filter(o => o.id !== op.id) })); return }
            const room = hitRoom(wx, wz)
            if (room) {
                setFp(prev => ({
                    ...prev,
                    rooms: prev.rooms.filter(r => r.id !== room.id),
                    openings: prev.openings.filter(o => o.roomId !== room.id),
                }))
                return
            }
            // Delete line node + connected segments
            const node = fpRef.current.lineNodes.find(n =>
                Math.hypot(wx - n.x, wz - n.z) < 0.4 / zoomRef.current
            )
            if (node) {
                setFp(prev => ({
                    ...prev,
                    lineNodes: prev.lineNodes.filter(n => n.id !== node.id),
                    lineSegments: prev.lineSegments.filter(s => !s.nodeIds.includes(node.id)),
                }))
            }
        }



    }, [evWorld, tool, hitRoom, hitLineSegment])

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const { wx, wz, cx, cy } = evWorld(e)
        // Update cursor
        if (spaceHeldRef.current) {
            setCanvasCursor(spacePanRef.current ? 'grabbing' : 'grab')
        } else if (resizeHandleRef.current) {
            const map: Record<string, string> = {
                nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
                n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
            }
            setCanvasCursor(map[resizeHandleRef.current.handle] ?? 'move')
        } else if (dragRoomRef.current) {
            setCanvasCursor('grabbing')
        } else if (tool === 'select' && selectedId) {
            // Check if hovering a resize handle
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
                const rect = canvasRef.current!.getBoundingClientRect()
                const ecx = e.clientX - rect.left, ecy = e.clientY - rect.top
                const map: Record<string, string> = {
                    nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
                    n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
                }
                for (const h of handles) {
                    const hcx = h.x * scale + panRef.current.x
                    const hcy = h.z * scale + panRef.current.y
                    if (Math.hypot(ecx - hcx, ecy - hcy) < 8) {
                        setCanvasCursor(map[h.id] ?? 'move')
                        // ... rest of move handler
                        return
                    }
                }
            }
            setCanvasCursor('default')
        } else {
            setCanvasCursor(getCanvasCursor(tool, false, false, null, false))
        }
        // Space pan
        if (spacePanRef.current) {
            const sp = spacePanRef.current
            const nx = sp.px + cx - sp.sx, ny = sp.py + cy - sp.sy
            panRef.current = { x: nx, y: ny }
            setPan({ x: nx, y: ny })
            return
        }
        if (resizeHandleRef.current) {
            const { handle, room } = resizeHandleRef.current
            const dx = snapM(wx) - room.x, dz = snapM(wz) - room.z
            let newX = room.x, newZ = room.z, newW = room.width, newD = room.depth

            if (handle.includes('e')) newW = Math.max(MIN_ROOM, snapM(wx) - room.x)
            if (handle.includes('w')) { newX = Math.min(snapM(wx), room.x + room.width - MIN_ROOM); newW = room.x + room.width - newX }
            if (handle.includes('s')) newD = Math.max(MIN_ROOM, snapM(wz) - room.z)
            if (handle.includes('n')) { newZ = Math.min(snapM(wz), room.z + room.depth - MIN_ROOM); newD = room.z + room.depth - newZ }

            setFp(prev => ({
                ...prev,
                rooms: prev.rooms.map(r => r.id === room.id
                    ? { ...r, x: newX, z: newZ, width: newW, depth: newD }
                    : r
                ),
            }))
            return
        }
        if (tool === 'pencil' && isPencilDrawing.current) {
            setPencilPoints(prev => {
                const last = prev[prev.length - 1]
                const sx = snapM(wx), sz = snapM(wz)
                if (last && (Math.abs(sx - last.x) > 0.01 || Math.abs(sz - last.z) > 0.01)) {
                    return [...prev, { x: sx, z: sz }]
                }
                return prev
            })
            return
        }

        if (midPan) {
            setPan({ x: midPan.px + cx - midPan.sx, y: midPan.py + cy - midPan.sy })
            return
        }

        // Use ref — no stale closure, no clone bug
        if (dragRoomRef.current) {
            const dr = dragRoomRef.current
            const nx = snapM(wx - dr.ox), nz = snapM(wz - dr.oz)

            // Check if dragging a room or a line node
            const isNode = fpRef.current.lineNodes.some(n => n.id === dr.id)
            if (isNode) {
                setFp(prev => ({
                    ...prev,
                    lineNodes: prev.lineNodes.map(n =>
                        n.id === dr.id ? { ...n, x: nx, z: nz } : n
                    ),
                }))
            } else {
                setFp(prev => ({
                    ...prev,
                    rooms: prev.rooms.map(r =>
                        r.id === dr.id ? { ...r, x: nx, z: nz } : r
                    ),
                }))
            }
            return
        }
        if (tool === 'line' || tool === 'bend') {
            setPreview({ x: snapM(wx), z: snapM(wz) })
        }
        if (tool === 'room' && isDrawingRef.current && drawStartRef.current) {
            const ds = drawStartRef.current
            setDrawRect({ x: ds.x, z: ds.z, w: snapM(wx) - ds.x, d: snapM(wz) - ds.z })
            return
        }

        const op = hitLineSegment(wx, wz)
        if (op) { setHoveredId(op.id); return }
        const room = hitRoom(wx, wz)
        setHoveredId(room?.id ?? null)
    }, [evWorld, midPan, tool, hitRoom, hitLineSegment])
    // ← dragRoom removed from deps — using ref now

    const handleMouseUp = useCallback(() => {
        setMidPan(null)
        dragRoomRef.current = null  // ← ref, not state
        spacePanRef.current = null
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
                    const newRoom: EditorRoom = {
                        id: uid(), x: minX, z: minZ, width: w, depth: d,
                        label: `Room ${fpRef.current.rooms.length + 1}`,
                    }
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
            drawStartRef.current = null
            setDrawRect(currentRect => {
                if (currentRect) {
                    const w = Math.abs(currentRect.w), d = Math.abs(currentRect.d)
                    if (w >= MIN_ROOM && d >= MIN_ROOM) {
                        const newRoom: EditorRoom = {
                            id: uid(),
                            x: Math.min(ds.x, ds.x + currentRect.w),
                            z: Math.min(ds.z, ds.z + currentRect.d),
                            width: w, depth: d,
                            label: `Room ${fpRef.current.rooms.length + 1}`,
                        }
                        setFp(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }))
                        setSelectedId(newRoom.id)
                    }
                }
                return null
            })
            setDrawStart(null)
        }
    }, [tool, pencilPoints])

    // if (tool === 'room' && isDrawingRef.current && drawStartRef.current) {
    //     isDrawingRef.current = false
    //     const ds = drawStartRef.current
    //     drawStartRef.current = null
    //     const currentRect = drawRect
    //     if (currentRect) {
    //         const w = Math.abs(currentRect.w)
    //         const d = Math.abs(currentRect.d)
    //         if (w >= MIN_ROOM && d >= MIN_ROOM) {
    //             const newRoom: EditorRoom = {
    //                 id: uid(),
    //                 x: Math.min(ds.x, ds.x + currentRect.w),
    //                 z: Math.min(ds.z, ds.z + currentRect.d),
    //                 width: w, depth: d,
    //                 label: `Room ${fpRef.current.rooms.length + 1}`,
    //             }
    //             setFp(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }))
    //             setSelectedId(newRoom.id)
    //         }
    //     }
    //     setDrawStart(null)
    //     setDrawRect(null)
    //     return
    // }

    const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault()
        e.stopPropagation()
        const factor = e.deltaY < 0 ? 1.12 : 0.9
        setZoom(z => Math.max(0.2, Math.min(5, z * factor)))
    }, [])

    const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), [])
    // Replace static cursors object with a computed value:
    function getCanvasCursor(
        tool: EditorTool,
        isDragging: boolean,
        isResizing: boolean,
        resizeHandle: string | null,
        spaceHeld: boolean,
    ): string {
        if (spaceHeld) return isDragging ? 'grabbing' : 'grab'
        if (isResizing && resizeHandle) {
            const map: Record<string, string> = {
                nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
                n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
            }
            return map[resizeHandle] ?? 'move'
        }
        if (isDragging) return 'grabbing'
        const toolCursors: Record<EditorTool, string> = {
            select: 'default', room: 'crosshair', pencil: 'crosshair',
            line: 'crosshair', bend: 'crosshair',
            door: 'cell', window: 'cell', delete: 'not-allowed',
        }
        return toolCursors[tool] ?? 'default'
    }
    const cursors: Record<EditorTool, string> = {
        select: dragRoomRef.current ? 'grabbing' : 'default',
        room: 'crosshair',
        pencil: 'crosshair',
        line: lineActiveNodeRef.current ? 'crosshair' : 'cell',
        bend: lineActiveNodeRef.current ? 'crosshair' : 'cell',
        door: 'cell',
        window: 'cell',
        delete: 'not-allowed',
    }
    // Native wheel — prevents page scroll (React onWheel can't be passive:false)
    useEffect(() => {
        const el = canvasDivRef.current
        if (!el) return
        const handler = (e: WheelEvent) => {
            e.preventDefault()
            e.stopPropagation()
            const factor = e.deltaY < 0 ? 1.12 : 0.9
            const newZoom = Math.max(0.2, Math.min(5, zoomRef.current * factor))
            zoomRef.current = newZoom
            setZoom(newZoom)
        }
        el.addEventListener('wheel', handler, { passive: false })
        return () => el.removeEventListener('wheel', handler)
    }, [])

    // Also block wheel on the whole editor so nothing scrolls through
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
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
        }
    }, [])

    return (
        // Fixed fullscreen — prevents page scroll
        <div
            ref={editorRef}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                background: '#0F0E0C',
                fontFamily: 'system-ui, sans-serif',
                color: 'rgba(226,232,240,0.9)',
                overflow: 'hidden',
                maxHeight: '100vh',   // ← add
                maxWidth: '100vw',    // ← add
            }}
        >

            {/* ── Top bar ─────────────────────────────────────────────────────── */}
            <div style={{
                height: 48, flexShrink: 0,
                background: 'rgba(12,11,9,0.98)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center',
                padding: '0 16px', gap: 12,
            }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(165,168,255,0.9)', letterSpacing: '0.06em' }}>
                    FLOOR PLAN EDITOR
                </span>
                <div style={{ flex: 1 }} />

                <label style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)' }}>Ceiling height</label>
                <input type="number" min={2} max={6} step={0.1} value={fp.roomHeight}
                    onChange={e => setFp(p => ({ ...p, roomHeight: parseFloat(e.target.value) || 2.7 }))}
                    style={{
                        width: 56, height: 28, borderRadius: 6, border: '1px solid rgba(148,163,184,0.2)',
                        background: 'rgba(255,255,255,0.05)', color: 'rgba(226,232,240,0.9)', fontSize: 12,
                        textAlign: 'center', outline: 'none'
                    }} />
                <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.5)' }}>m</span>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.6)' }}>{Math.round(zoom * 100)}%</span>
                <Btn onClick={() => setZoom(1)}>Reset zoom</Btn>
                <Btn onClick={() => { setFp(DEFAULT_FP); setSelectedId(null) }}>Clear</Btn>
                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
                <button
                    onClick={() => void toggleFullscreen()}
                    style={{
                        height: 28, padding: '0 10px', borderRadius: 6,
                        border: '1px solid rgba(148,163,184,0.15)',
                        background: 'transparent',
                        color: 'rgba(148,163,184,0.7)',
                        fontSize: 11, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}
                    title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                    {isFullscreen ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
                        </svg>
                    ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    )}
                    {isFullscreen ? 'Exit' : 'Fullscreen'}
                </button>
                {onClose && <Btn onClick={onClose} danger>✕ Close</Btn>}
                {onSave && (
                    <button onClick={() => onSave(fp)} style={{
                        height: 30, padding: '0 16px', borderRadius: 7, border: 'none',
                        background: 'rgba(99,102,241,0.85)', color: 'white',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                        Save Floor Plan
                    </button>
                )}
            </div>

            {/* ── Body ────────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, maxHeight: 'calc(100vh - 48px)' }}>

                {/* Left tool panel */}
                <div style={{
                    width: 52, flexShrink: 0,
                    background: 'rgba(10,9,7,0.98)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', padding: '10px 0', gap: 3,
                }}>
                    {TOOLS.map(t => (
                        <button key={t.id} title={`${t.label} (${t.key})`}
                            onClick={() => { setTool(t.id); setDrawStart(null); setDrawRect(null) }}
                            style={{
                                width: 38, height: 38, borderRadius: 8, fontSize: 15,
                                border: tool === t.id ? '1px solid rgba(99,102,241,0.55)' : '1px solid transparent',
                                background: tool === t.id ? 'rgba(99,102,241,0.18)' : 'transparent',
                                color: tool === t.id ? 'rgba(165,168,255,0.95)' : 'rgba(100,116,139,0.6)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 130ms',
                            }}>
                            {t.icon}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 9, color: 'rgba(100,116,139,0.4)', textAlign: 'center', lineHeight: 1.6 }}>
                        <div>{fp.rooms.length}R</div>
                        <div>{fp.openings.length}O</div>
                    </div>
                </div>

                {/* 2D canvas */}
                <div ref={canvasDivRef} style={{ cursor: canvasCursor, flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
                    <canvas
                        ref={canvasRef}
                        style={{ width: '100%', height: '100%', display: 'block', cursor: cursors[tool] }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => {
                            setMidPan(null)
                            setDragRoom(null)
                        }}
                        onContextMenu={handleContextMenu}
                    // ← onWheel removed — handled by native listener on canvasDivRef
                    />

                    {/* Tool hint */}
                    <div style={{
                        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(10,9,7,0.82)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 8, padding: '5px 12px', fontSize: 11,
                        color: 'rgba(100,116,139,0.8)', pointerEvents: 'none', whiteSpace: 'nowrap',
                    }}>
                        {tool === 'select' && 'Click to select · Drag to move · DEL to delete'}
                        {tool === 'room' && (drawStart ? 'Drag to set room size · Release to place' : 'Click and drag to draw a room')}
                        {tool === 'door' && 'Click near a wall to place a door'}
                        {tool === 'window' && 'Click near a wall to place a window'}
                        {tool === 'delete' && 'Click on a room or opening to delete it'}
                    </div>

                    {/* Shortcut legend */}
                    <div style={{
                        position: 'absolute', top: 12, right: 12,
                        background: 'rgba(10,9,7,0.75)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 8, padding: '8px 12px', fontSize: 10,
                        color: 'rgba(100,116,139,0.7)', lineHeight: 1.9,
                    }}>
                        {[['V', 'Select'], ['R', 'Room'], ['D', 'Door'], ['N', 'Window'], ['⌫', 'Delete'], ['⌘Z', 'Undo'], ['ESC', 'Cancel'], ['Scroll', 'Zoom'], ['Mid drag', 'Pan']].map(([k, l]) => (
                            <div key={k}><kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '0 3px', fontFamily: 'monospace', marginRight: 4 }}>{k}</kbd>{l}</div>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

                {/* Right: 3D preview + properties */}
                <div style={{ width: '42%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* 3D — takes all remaining space, wheel events are isolated */}
                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        <div style={{
                            position: 'absolute', top: 8, left: 10, zIndex: 5, fontSize: 9,
                            fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.5)'
                        }}>
                            3D PREVIEW
                        </div>
                        <Canvas
                            shadows
                            camera={{ position: [8, 10, 12], fov: 50, near: 0.1, far: 500 }}
                            style={{ width: '100%', height: '100%', background: '#0F0E0C' }}
                            // Prevent Canvas wheel events from bubbling to page
                            onWheel={e => e.stopPropagation()}
                        >
                            <Scene3D fp={fp} />
                        </Canvas>
                    </div>

                    {/* Properties */}
                    <div style={{
                        height: 220, flexShrink: 0,
                        borderTop: '1px solid rgba(255,255,255,0.07)',
                        background: 'rgba(10,9,7,0.95)',
                        overflowY: 'auto',
                    }}>
                        <PropsPanel
                            fp={fp} selectedId={selectedId}
                            onChange={setFp}
                            onDelete={() => {
                                if (!selectedId) return
                                setFp(prev => ({
                                    ...prev,
                                    rooms: prev.rooms.filter(r => r.id !== selectedId),
                                    openings: prev.openings.filter(o => o.id !== selectedId && o.roomId !== selectedId),
                                }))
                                setSelectedId(null)
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Tiny shared button ────────────────────────────────────────────────────────
function Btn({ children, onClick, danger }: {
    children: React.ReactNode; onClick: () => void; danger?: boolean
}) {
    return (
        <button onClick={onClick} style={{
            height: 28, padding: '0 10px', borderRadius: 6,
            border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(148,163,184,0.15)'}`,
            background: 'transparent',
            color: danger ? 'rgba(248,113,113,0.8)' : 'rgba(148,163,184,0.7)',
            fontSize: 11, cursor: 'pointer',
        }}>
            {children}
        </button>
    )
}