import React, { useEffect, useMemo, useState } from 'react'
import { ClosedShape, FloorPlanState, LineSegment } from './lib/constants'

export type QuickAction = 'move' | 'bend' | 'duplicate' | 'delete' | 'properties' | 'cutout'

const ACTIONS_BY_ENTITY: Record<
    'room' | 'wall' | 'segment' | 'furniture' | 'stairs' | 'outdoor' | 'wallDecor' | 'opening' | 'shape' | 'node' | 'light',
    QuickAction[]
> = {
    room: ['properties', 'move', 'duplicate', 'delete'],
    wall: ['properties', 'delete'],
    segment: ['properties', 'move', 'bend', 'duplicate', 'delete'],
    furniture: ['properties', 'move', 'duplicate', 'delete'],
    stairs: ['properties', 'move', 'duplicate', 'delete'],
    outdoor: ['properties', 'move', 'duplicate', 'delete'],
    wallDecor: ['properties', 'duplicate', 'delete'],
    opening: ['properties', 'move', 'duplicate', 'delete'],
    shape: ['properties', 'move', 'duplicate', 'cutout', 'delete'],
    node: ['properties', 'delete'],
    light: ['properties', 'move', 'duplicate', 'delete'],
}

const ICONS: Record<QuickAction, React.ReactNode> = {
    move: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M2 12h20M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3" />
        </svg>
    ),
    bend: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20c0-8 4-8 8-12s4-4 8-4" />
        </svg>
    ),
    duplicate: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
    ),
    delete: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
        </svg>
    ),
    cutout: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 3" />
        </svg>
    ),
    properties: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13M20 18h0" />
            <circle cx="16" cy="6" r="2" />
            <circle cx="9" cy="12" r="2" />
            <circle cx="16" cy="18" r="2" />
        </svg>
    ),
}

type SelectionKind = keyof typeof ACTIONS_BY_ENTITY | 'light'

export function classifySelection(fp: FloorPlanState, selectedId: string | null): SelectionKind | null {
    if (!selectedId) return null
    if (selectedId.includes('::wall::')) return 'wall'
    if (fp.rooms.some(r => r.id === selectedId)) return 'room'
    if (fp.lineSegments.some(s => s.id === selectedId)) return 'segment'
    if ((fp.furniture ?? []).some(f => f.id === selectedId)) return 'furniture'
    if ((fp.stairs ?? []).some(s => s.id === selectedId)) return 'stairs'
    if ((fp.outdoorObjects ?? []).some(o => o.id === selectedId)) return 'outdoor'
    if ((fp.wallDecor ?? []).some(d => d.id === selectedId)) return 'wallDecor'
    if ((fp.lights ?? []).some(l => l.id === selectedId)) return 'light'
    if (fp.openings.some(o => o.id === selectedId)) return 'opening'
    if (fp.lineNodes.some(n => n.id === selectedId)) return 'node'
    if ((fp.closedShapes ?? []).some(s => s.id === selectedId)) return 'shape'
    return null
}

export function getSelectionAnchorWorld(
    fp: FloorPlanState,
    selectedId: string | null,
    kind: SelectionKind | null,
): { x: number; z: number } | null {
    if (!selectedId || !kind) return null

    switch (kind) {
        case 'room': {
            const r = fp.rooms.find(r => r.id === selectedId)!
            return { x: r.x + r.width / 2, z: r.z }
        }
        case 'wall': {
            const [roomId, wall] = selectedId.split('::wall::')
            const r = fp.rooms.find(r => r.id === roomId)
            if (!r) return null
            const isH = wall === 'north' || wall === 'south'
            return isH
                ? { x: r.x + r.width / 2, z: wall === 'north' ? r.z : r.z + r.depth }
                : { x: wall === 'west' ? r.x : r.x + r.width, z: r.z + r.depth / 2 }
        }
        case 'segment': {
            const seg = fp.lineSegments.find(s => s.id === selectedId)!
            const nodes = seg.nodeIds.map(id => fp.lineNodes.find(n => n.id === id)).filter(Boolean) as { x: number; z: number }[]
            if (nodes.length === 0) return null
            const mid = nodes[Math.floor((nodes.length - 1) / 2)]!
            const next = nodes[Math.min(Math.floor((nodes.length - 1) / 2) + 1, nodes.length - 1)]!
            return { x: (mid.x + next.x) / 2, z: (mid.z + next.z) / 2 }
        }
        case 'furniture': {
            const f = (fp.furniture ?? []).find(f => f.id === selectedId)!
            return { x: f.x, z: f.z }
        }
        case 'stairs': {
            const s = (fp.stairs ?? []).find(s => s.id === selectedId)!
            return { x: s.x + s.width / 2, z: s.z }
        }
        case 'outdoor': {
            const o = (fp.outdoorObjects ?? []).find(o => o.id === selectedId)!
            return { x: o.x, z: o.z }
        }
        case 'node': {
            const n = fp.lineNodes.find(n => n.id === selectedId)!
            return { x: n.x, z: n.z }
        }
        case 'wallDecor':
        case 'opening': {
            const entity = kind === 'opening'
                ? fp.openings.find(o => o.id === selectedId)
                : (fp.wallDecor ?? []).find(d => d.id === selectedId)
            if (!entity) return null

            if (entity.segmentNodeIds) {
                const a = fp.lineNodes.find(n => n.id === entity.segmentNodeIds![0])
                const b = fp.lineNodes.find(n => n.id === entity.segmentNodeIds![1])
                if (!a || !b) return null
                const t = entity.segmentT ?? 0
                return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
            }
            if (entity.wall && entity.roomId) {
                const room = fp.rooms.find(r => r.id === entity.roomId)
                if (!room) return null
                const isH = entity.wall === 'north' || entity.wall === 'south'
                return isH
                    ? { x: room.x + entity.position, z: entity.wall === 'north' ? room.z : room.z + room.depth }
                    : { x: entity.wall === 'west' ? room.x : room.x + room.width, z: room.z + entity.position }
            }
            return null
        }
        case 'light': {
            const light = (fp.lights ?? []).find(l => l.id === selectedId)
            if (!light) return null
            if (light.x !== undefined && light.z !== undefined) {
                return { x: light.x, z: light.z }
            }
            if (light.segmentNodeIds) {
                const a = fp.lineNodes.find(n => n.id === light.segmentNodeIds![0])
                const b = fp.lineNodes.find(n => n.id === light.segmentNodeIds![1])
                if (!a || !b) return null
                const t = light.segmentT ?? 0
                return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
            }
            if (light.wall && light.roomId) {
                const room = fp.rooms.find(r => r.id === light.roomId)
                if (!room) return null
                const isH = light.wall === 'north' || light.wall === 'south'
                return isH
                    ? { x: room.x + (light.position ?? 0), z: light.wall === 'north' ? room.z : room.z + room.depth }
                    : { x: light.wall === 'west' ? room.x : room.x + room.width, z: room.z + (light.position ?? 0) }
            }
            return null
        }
        case 'shape': {
            const shape = (fp.closedShapes ?? []).find(s => s.id === selectedId)
            if (!shape) return null
            const nodes = shape.nodeIds.map(id => fp.lineNodes.find(n => n.id === id)).filter(Boolean) as { x: number; z: number }[]
            if (nodes.length === 0) return null
            const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
            const cz = nodes.reduce((s, n) => s + n.z, 0) / nodes.length
            return { x: cx, z: cz }
        }
    }
}

export function canBendSegment(fp: FloorPlanState, segId: string): boolean {
    const seg = fp.lineSegments.find(s => s.id === segId)
    return !!seg && seg.nodeIds.length === 2
}

export function bendSegment(fp: FloorPlanState, segId: string, uid: () => string): FloorPlanState {
    const seg = fp.lineSegments.find(s => s.id === segId)
    if (!seg || seg.nodeIds.length !== 2) return fp
    const [aId, bId] = seg.nodeIds
    const a = fp.lineNodes.find(n => n.id === aId)
    const b = fp.lineNodes.find(n => n.id === bId)
    if (!a || !b) return fp

    const midNode = { id: uid(), x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }
    return {
        ...fp,
        lineNodes: [...fp.lineNodes, midNode],
        lineSegments: fp.lineSegments.map(s =>
            s.id === segId ? { ...s, nodeIds: [aId, midNode.id, bId] } : s
        ),
    }
}

/* ------------------------------------------------------------------ */
/* The menu itself                                                     */
/* ------------------------------------------------------------------ */

const PILL = {
    bg: 'rgba(28,28,32,0.95)',
    iconIdle: 'rgba(255,255,255,0.75)',
    iconHover: '#FFFFFF',
    divider: 'rgba(255,255,255,0.14)',
    shadow: '0 8px 24px rgba(0,0,0,0.28)',
}

export function QuickActionMenu({
    fp,
    selectedId,
    screenX,
    screenY,
    visible,
    onDuplicate,
    onDelete,
    onBend,
    onOpenProperties,
    onMove,
    onArmCutoutDraw,
    moveArmed = false,
    cutoutArmed = false,
}: {
    fp: FloorPlanState
    selectedId: string | null
    screenX: number
    screenY: number
    visible: boolean
    onDuplicate: () => void
    onDelete: () => void
    onBend: (segId: string) => void
    onOpenProperties: () => void
    onMove: () => void
    onArmCutoutDraw: () => void
    moveArmed?: boolean
    cutoutArmed?: boolean
}) {
    const kind = useMemo(() => classifySelection(fp, selectedId), [fp, selectedId])
    const actions = kind ? ACTIONS_BY_ENTITY[kind] : []
    const shouldShow = visible && !!selectedId && !!kind && actions.length > 0

    // Keep mounted through the exit transition instead of snapping away.
    const [shouldRender, setShouldRender] = useState(shouldShow)
    // Tracks the animate-in/out phase separately from mount, so we can
    // start at scale(0.9)/opacity 0 and transition to 1 on the next frame.
    const [entered, setEntered] = useState(false)

    useEffect(() => {
        if (shouldShow) {
            setShouldRender(true)
            const raf = requestAnimationFrame(() => setEntered(true))
            return () => cancelAnimationFrame(raf)
        } else {
            setEntered(false)
            const t = setTimeout(() => setShouldRender(false), 120)
            return () => clearTimeout(t)
        }
    }, [shouldShow])

    if (!shouldRender) return null

    const bendDisabled = kind === 'segment' && !canBendSegment(fp, selectedId!)


    const handle = (action: QuickAction) => (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        switch (action) {
            case 'duplicate': onDuplicate(); break
            case 'delete': onDelete(); break
            case 'bend': if (kind === 'segment' && !bendDisabled) onBend(selectedId!); break
            case 'properties': onOpenProperties(); break
            case 'move': onMove(); break
            case 'cutout': onArmCutoutDraw(); break
        }
    }

    return (
        <div
            onMouseDown={e => { e.stopPropagation(); e.preventDefault() }}
            style={{
                position: 'fixed',
                left: screenX,
                top: screenY,
                transform: `translate(-50%, calc(-100% - 14px)) scale(${entered ? 1 : 0.9})`,
                transformOrigin: 'center bottom', // pops from the anchor point (selected object)
                opacity: entered ? 1 : 0,
                transition: 'transform 120ms ease-out, opacity 120ms ease-out',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: 6,
                borderRadius: 999,
                background: PILL.bg,
                boxShadow: PILL.shadow,
                backdropFilter: 'blur(6px)',
                zIndex: 50,
                pointerEvents: entered ? 'auto' : 'none',
            }}
        >
            {actions.map((action, i) => {
                const isBend = action === 'bend'
                const disabled = isBend && bendDisabled
                const pressed = (action === 'move' && moveArmed) || (action === 'cutout' && cutoutArmed)
                return (
                    <React.Fragment key={action}>
                        {i > 0 && <div style={{ width: 1, height: 16, background: PILL.divider, margin: '0 2px' }} />}
                        <button
                            onClick={handle(action)}
                            disabled={disabled}
                            title={
                                action === 'duplicate' ? 'Duplicate (Ctrl/Cmd+D)'
                                    : action === 'delete' ? 'Delete'
                                        : action === 'bend' ? (disabled ? 'Already bent — drag its middle node' : 'Add a bend point')
                                            : action === 'properties' ? 'Open properties'
                                                : action === 'move' ? (pressed ? 'Click on the canvas to place — click Move again to cancel' : 'Move (click destination)')
                                                    : action === 'cutout' ? (pressed ? 'Drawing cutout — click canvas points, close the loop to finish' : 'Draw a floor cutout')
                                                        : 'Move'
                            }
                            style={{
                                width: 30, height: 30, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: 'none',
                                background: pressed ? 'rgba(255,255,255,0.22)' : 'transparent',
                                color: disabled ? 'rgba(255,255,255,0.3)' : (pressed ? PILL.iconHover : PILL.iconIdle),
                                cursor: disabled ? 'default' : 'pointer',
                                transition: 'background 120ms ease, color 120ms ease',
                            }}
                            onMouseEnter={e => { if (!disabled && !pressed) { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = PILL.iconHover } }}
                            onMouseLeave={e => { if (!pressed) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = disabled ? 'rgba(255,255,255,0.3)' : PILL.iconIdle } }}
                        >
                            {ICONS[action]}
                        </button>
                    </React.Fragment>
                )
            })}
        </div>
    )
}