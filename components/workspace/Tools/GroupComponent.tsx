'use client'

import { useState, useRef, useEffect, useId } from "react"
import { createPortal } from "react-dom"
import { EditorTool, ToolGroup } from "../lib/constants"
import { useHoverFlyout } from "../hooks/useHoverFlyout"
import { FlyoutPanel } from "../FlyoutPanel"

// ── Hook: track a ref's bounding rect, recompute on open ────────────────────

function useAnchorRect(active: boolean) {
    const ref = useRef<HTMLDivElement>(null)
    const [rect, setRect] = useState<DOMRect | null>(null)

    useEffect(() => {
        if (active && ref.current) {
            setRect(ref.current.getBoundingClientRect())
        }
    }, [active])

    return { ref, rect }
}

// ── Tooltip (portal) ──────────────────────────────────────────────────────

function Tooltip({ label, shortcut, children }: { label: string; shortcut?: string; children: React.ReactNode }) {
    const [visible, setVisible] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const id = useId()
    const { ref, rect } = useAnchorRect(visible)

    const show = () => { timeoutRef.current = setTimeout(() => setVisible(true), 300) }
    const hide = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setVisible(false) }

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={show} onMouseLeave={hide} onMouseDown={hide} aria-describedby={id}>
            {children}
            {rect && typeof document !== 'undefined' && createPortal(
                <div
                    id={id}
                    role="tooltip"
                    style={{
                        position: 'fixed',
                        top: rect.top + rect.height / 2 - 60,
                        left: rect.right + 10,
                        transform: `translateY(-50%) translateX(${visible ? '0px' : '-4px'}) scale(${visible ? 1 : 0.92})`,
                        opacity: visible ? 1 : 0,
                        pointerEvents: 'none',
                        transition: 'opacity 140ms ease, transform 140ms cubic-bezier(0.34,1.56,0.64,1)',
                        background: 'rgba(15,23,42,0.96)',
                        border: '1px solid rgba(148,163,184,0.18)',
                        borderRadius: 7,
                        padding: '5px 9px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'rgba(241,245,249,0.95)',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <span>{label}</span>
                    {shortcut && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(99,102,241,0.25)', color: 'rgba(199,210,254,0.95)' }}>
                            {shortcut}
                        </span>
                    )}
                </div>,
                document.body
            )}
        </div>
    )
}

// ── GroupButton (flyout via portal) ──────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────
// CHANGES vs. the version you pasted:
//
// 1. Open/close-timer + outside-click logic extracted to `useHoverFlyout`
//    (identical behavior, just shared now instead of living only here).
// 2. NEW: `group.renderFlyout` escape hatch. If present, it's used instead
//    of the default 3-column icon grid — this is what lets furniture and
//    presets render their own content through the SAME hover mechanism as
//    every other tool group, instead of FloorPlanEditor.tsx maintaining
//    separate `furnitureAnchorRect`/`presetsAnchorRect` state + a
//    `tool === 'furniture'` effect.
// 3. Flyout now opens whenever `hasVariants || group.renderFlyout` is true
//    (previously gated on `hasVariants` alone, which is why furniture/
//    presets — single-leaf groups — never got a flyout via this component).
// 4. Visual shell swapped to `FlyoutPanel` (COLOR/SPACE tokens), so this
//    now matches PropsPanel's palette instead of the old inline THEME
//    styling. The trigger button itself (48px icon square) is UNCHANGED —
//    only flagging this in case you want the button restyled too; wasn't
//    asked for, so left as-is.
//
// REQUIRED type addition (wherever `ToolGroup` is defined, likely
// `lib/tool-constants.ts` or `lib/constants.ts`):
//
//   export type ToolGroup = {
//     id: string
//     label: string
//     leaves: { id: EditorTool; label: string; icon: ReactNode; key?: string }[]
//     renderFlyout?: (ctx: { onSelect: (tool: EditorTool) => void; close: () => void }) => ReactNode
//     flyoutWidth?: number   // optional, defaults to 200 (grid) / 280 (custom)
//   }
// ─────────────────────────────────────────────────────



export function GroupButton({
    group,
    activeTool,
    lastUsed,
    onSelect,
    registerAnchor,
}: {
    group: ToolGroup
    activeTool: EditorTool
    lastUsed: Record<string, EditorTool>
    onSelect: (tool: EditorTool) => void
    registerAnchor?: (groupId: string, el: HTMLDivElement | null) => void
}) {
    const [hover, setHover] = useState(false)
    const [pressed, setPressed] = useState(false)

    const hasVariants = group.leaves.length > 1
    const hasFlyout = hasVariants || !!group.renderFlyout

    const { open, anchorRect, setOpen, anchorProps, flyoutTriggerProps } =
        useHoverFlyout({ id: group.id, enabled: hasFlyout })

    const setAnchorNode = (el: HTMLDivElement | null) => {
        anchorProps.ref.current = el
        registerAnchor?.(group.id, el)
    }

    const currentLeaf = hasVariants
        ? group.leaves.find(l => l.id === lastUsed[group.id]) ?? group.leaves[0]
        : group.leaves[0]
    const isActive = group.leaves.some(l => l.id === activeTool)

    const closeFlyout = () => setOpen(false)

    return (
        <div
            style={{ position: 'relative' }}
            onMouseEnter={anchorProps.onMouseEnter}
            onMouseLeave={() => { setHover(false); setPressed(false); anchorProps.onMouseLeave() }}
            ref={setAnchorNode}
        >
            <Tooltip label={currentLeaf.label} shortcut={currentLeaf.key}>
                <button
                    className="tool-btn"
                    onMouseEnter={() => setHover(true)}
                    onMouseDown={() => setPressed(true)}
                    onMouseUp={() => setPressed(false)}
                    onClick={() => onSelect(currentLeaf.id)}
                    style={{
                        width: 48, height: 48, borderRadius: 10,
                        border: isActive ? '1.5px solid rgba(99,102,241,0.7)' : hover ? '1.5px solid rgba(15,15,15,0.14)' : '1.5px solid transparent',
                        background: isActive ? 'rgba(99,102,241,0.14)' : hover ? 'rgba(15,15,15,0.05)' : 'transparent',
                        color: isActive ? '#6366F1' : '#1A1A1A',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                        position: 'relative',
                        opacity: isActive ? 1 : hover ? 0.95 : 0.65,
                        transform: pressed ? 'scale(0.92)' : hover ? 'scale(1.06)' : 'scale(1)',
                        boxShadow: isActive
                            ? '0 0 0 1px rgba(99,102,241,0.15), 0 4px 12px rgba(99,102,241,0.18)'
                            : hover ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        transition: 'transform 150ms cubic-bezier(0.34,1.56,0.64,1), background 130ms, border-color 130ms, box-shadow 180ms, opacity 130ms',
                        flexShrink: 0,
                    }}
                >
                    {isActive && (
                        <span style={{
                            position: 'absolute', inset: -3, borderRadius: 12,
                            border: '1.5px solid rgba(99,102,241,0.5)',
                            animation: 'toolPulse 1.6s ease-out infinite',
                            pointerEvents: 'none',
                        }} />
                    )}
                    {currentLeaf.icon}
                    <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: '0.04em', opacity: 0.7, color: 'inherit' }}>
                        {currentLeaf.key ?? ''}
                    </span>
                    {hasFlyout && (
                        <span style={{
                            position: 'absolute', bottom: 2, right: 2,
                            width: 0, height: 0,
                            borderLeft: '3px solid transparent',
                            borderBottom: '3px solid rgba(148,163,184,0.6)',
                        }} />
                    )}
                </button>
            </Tooltip>

            {hasFlyout && anchorRect && typeof document !== 'undefined' && createPortal(
                <FlyoutPanel
                    anchorRect={anchorRect}
                    open={open}
                    width={group.flyoutWidth ?? (group.renderFlyout ? 280 : 200)}
                    title={group.renderFlyout ? undefined : group.label}
                    flyoutTriggerProps={flyoutTriggerProps}
                >
                    {group.renderFlyout ? (
                        group.renderFlyout({ onSelect, close: closeFlyout })
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                            {group.leaves.map(leaf => {
                                const selected = leaf.id === currentLeaf.id
                                return (
                                    <button
                                        key={leaf.id}
                                        title={leaf.label}
                                        onClick={() => { onSelect(leaf.id); closeFlyout() }}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                            padding: '8px 4px', borderRadius: 8,
                                            border: selected ? '1px solid rgba(99,102,241,0.6)' : '1px solid transparent',
                                            background: selected ? 'rgba(99,102,241,0.1)' : 'transparent',
                                            color: '#1A1A1A', cursor: 'pointer', transition: 'background 120ms, transform 120ms',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                    >
                                        {leaf.icon}
                                        <span style={{ fontSize: 8, fontWeight: 500, textAlign: 'center', lineHeight: 1.15, opacity: 0.75, color: 'inherit' }}>
                                            {leaf.label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </FlyoutPanel>,
                document.body
            )}
        </div>
    )
}