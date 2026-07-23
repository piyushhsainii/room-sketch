// components/workspace/QuickActionMenu.tsx
//
// Floating pill toolbar anchored to the current 2D selection. Mirrors the
// existing `editingAnnotation` popup pattern (client-pixel x/y, positioned
// div rendered on top of the canvas) rather than inventing a new overlay
// mechanism.
//
// WHAT THIS DOES NOT DO: it does not reimplement move, duplicate, delete,
// or bend. It calls your existing `handleDuplicateSelected` and `onDelete`
// exactly as-is. The one genuinely new piece of logic is "insert a bend
// point into a straight 2-node line segment," built from the same
// node-splicing your `tool === 'bend'` path already does — not a new
// curve/spline system.

import React, { useMemo } from 'react'
import { FloorPlanState, LineSegment } from './lib/constants'

/* ------------------------------------------------------------------ */
/* Entity → action lookup (Plan step 4)                                */
/* ------------------------------------------------------------------ */

export type QuickAction = 'move' | 'bend' | 'duplicate' | 'delete' | 'properties'

// "move" is intentionally omitted everywhere below — drag-to-move already
// works via click-drag on the canvas (handleMouseDown sets up the relevant
// dragRef the instant you click-and-hold an entity), so a redundant
// "enter move mode" button doesn't add anything a precise nudge wouldn't
// already get you via arrow keys if that exists elsewhere. If you want it
// back for some entity type, add 'move' to that type's array below and
// wire an onMove handler — the menu itself doesn't care.
const ACTIONS_BY_ENTITY: Record<
    'room' | 'wall' | 'segment' | 'furniture' | 'stairs' | 'outdoor' | 'wallDecor' | 'opening' | 'shape' | 'node',
    QuickAction[]
> = {
    room: ['properties', 'duplicate', 'delete'],
    wall: ['properties', 'delete'],               // single room-wall (north/south/east/west) — no duplicate, no bend
    segment: ['properties', 'bend', 'duplicate', 'delete'], // line-wall segment — the case in your screenshot
    furniture: ['properties', 'duplicate', 'delete'],
    stairs: ['properties', 'duplicate', 'delete'],
    outdoor: ['properties', 'duplicate', 'delete'],
    wallDecor: ['properties', 'duplicate', 'delete'],
    opening: ['properties', 'duplicate', 'delete'],
    shape: ['properties', 'duplicate', 'delete'],
    node: ['properties', 'delete'],
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
    properties: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13M20 18h0" />
            <circle cx="16" cy="6" r="2" />
            <circle cx="9" cy="12" r="2" />
            <circle cx="16" cy="18" r="2" />
        </svg>
    ),
}

/* ------------------------------------------------------------------ */
/* Anchor computation (Plan step 2)                                    */
/* ------------------------------------------------------------------ */

type SelectionKind = keyof typeof ACTIONS_BY_ENTITY

export function classifySelection(fp: FloorPlanState, selectedId: string | null): SelectionKind | null {
    if (!selectedId) return null
    if (selectedId.includes('::wall::')) return 'wall'
    if (fp.rooms.some(r => r.id === selectedId)) return 'room'
    if (fp.lineSegments.some(s => s.id === selectedId)) return 'segment'
    if ((fp.furniture ?? []).some(f => f.id === selectedId)) return 'furniture'
    if ((fp.stairs ?? []).some(s => s.id === selectedId)) return 'stairs'
    if ((fp.outdoorObjects ?? []).some(o => o.id === selectedId)) return 'outdoor'
    if ((fp.wallDecor ?? []).some(d => d.id === selectedId)) return 'wallDecor'
    if (fp.openings.some(o => o.id === selectedId)) return 'opening'
    if (fp.lineNodes.some(n => n.id === selectedId)) return 'node'
    if ((fp.closedShapes ?? []).some(s => s.id === selectedId)) return 'shape'
    return null
}

/**
 * World-space anchor point (in meters) for the current selection, or null
 * if there's nothing to anchor to. Caller converts this to screen pixels
 * with `toCanvas` + the canvas's bounding rect, same as the annotation
 * popup already does.
 */
export function getSelectionAnchorWorld(
    fp: FloorPlanState,
    selectedId: string | null,
    kind: SelectionKind | null,
): { x: number; z: number } | null {
    if (!selectedId || !kind) return null

    switch (kind) {
        case 'room': {
            const r = fp.rooms.find(r => r.id === selectedId)!
            return { x: r.x + r.width / 2, z: r.z } // anchor just above the top edge
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
            // Midpoint of the middle edge for odd-length chains, or the
            // single edge's midpoint for a plain 2-node segment — matches
            // the screenshot's anchor-at-midpoint behavior.
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
            // Both are wall-anchored with a roomId + position/segmentT — approximate
            // via whichever room/segment they belong to, falling back to null
            // (menu just won't render) rather than guessing wrong. Wire this up
            // properly once I can see how these compute their own world position
            // for rendering (there's presumably a shared helper already, since
            // LineWalls3D positions door/window/decor meshes along the wall).
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

/* ------------------------------------------------------------------ */
/* Bend action — splice a midpoint node into a straight segment         */
/* ------------------------------------------------------------------ */

/** Only offered for a plain 2-node segment (a single straight edge) — a
 *  segment that's already been bent has intermediate nodes you can drag
 *  directly, so there's nothing more for this action to do there. */
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
/* The menu itself (Plan steps 3, 6, 8)                                 */
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
}: {
    fp: FloorPlanState
    selectedId: string | null
    /** Already-computed screen (client) pixel coordinates — pass the same
     *  x/y you'd pass into the annotation popup (toCanvas + rect.left/top). */
    screenX: number
    screenY: number
    /** False while a drag is actively engaged on the selection, or while
     *  nothing is selected — parent controls this so the menu has a single
     *  source of truth, per plan step 3/7. */
    visible: boolean
    onDuplicate: () => void
    onDelete: () => void
    onBend: (segId: string) => void
    /** Switches the side panel to the Properties tab. Doesn't need to touch
     *  selectedId — that's already set from whatever selected the entity in
     *  the first place. */
    onOpenProperties: () => void
}) {
    const kind = useMemo(() => classifySelection(fp, selectedId), [fp, selectedId])
    const actions = kind ? ACTIONS_BY_ENTITY[kind] : []

    if (!visible || !selectedId || !kind || actions.length === 0) return null

    const bendDisabled = kind === 'segment' && !canBendSegment(fp, selectedId)

    const handle = (action: QuickAction) => (e: React.MouseEvent) => {
        // Plan step 6 — stop this from also registering as a canvas
        // click, which would otherwise deselect or start a drag.
        e.stopPropagation()
        e.preventDefault()
        switch (action) {
            case 'duplicate': onDuplicate(); break
            case 'delete': onDelete(); break
            case 'bend': if (kind === 'segment' && !bendDisabled) onBend(selectedId); break
            case 'properties': onOpenProperties(); break
        }
    }

    return (
        <div
            // Also swallow mousedown so the canvas's own onMouseDown (which
            // does hit-testing and can deselect on an empty-canvas click)
            // never sees this as a canvas-level event.
            onMouseDown={e => { e.stopPropagation(); e.preventDefault() }}
            style={{
                position: 'fixed',
                left: screenX,
                top: screenY,
                transform: 'translate(-50%, calc(-100% - 14px))', // sits above the anchor point
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: 6,
                borderRadius: 999,
                background: PILL.bg,
                boxShadow: PILL.shadow,
                backdropFilter: 'blur(6px)',
                zIndex: 50,
                pointerEvents: 'auto',
            }}
        >
            {actions.map((action, i) => {
                const isBend = action === 'bend'
                const disabled = isBend && bendDisabled
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
                                                : 'Move'
                            }
                            style={{
                                width: 30, height: 30, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: 'none', background: 'transparent',
                                color: disabled ? 'rgba(255,255,255,0.3)' : PILL.iconIdle,
                                cursor: disabled ? 'default' : 'pointer',
                                transition: 'background 120ms ease, color 120ms ease',
                            }}
                            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = PILL.iconHover } }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = disabled ? 'rgba(255,255,255,0.3)' : PILL.iconIdle }}
                        >
                            {ICONS[action]}
                        </button>
                    </React.Fragment>
                )
            })}
        </div>
    )
}