'use client'

import { ReactNode } from "react"
import { COLOR } from "./texture/inspector-ui"

// Shared visual shell for every hover-opened side panel (furniture list,
// presets, and GroupButton's own variant grid). Pulls colors from COLOR
// (PropsPanel's token set) instead of THEME, so all flyouts now visually
// match PropsPanel rather than the older indigo/cool-gray THEME palette.
//
// This does NOT own open/close timing — pair it with useHoverFlyout.
// It only renders the box: position, background, border, shadow,
// enter/exit transform+opacity, and an optional header row.

export function FlyoutPanel({
    anchorRect,
    open,
    width = 280,
    title,
    flyoutTriggerProps,
    children,
}: {
    anchorRect: DOMRect
    open: boolean
    width?: number
    title?: string
    flyoutTriggerProps: { id: string; onMouseEnter: () => void; onMouseLeave: () => void }
    children: ReactNode
}) {
    return (
        <div
            {...flyoutTriggerProps}
            style={{
                position: 'fixed',
                top: anchorRect.top,
                left: anchorRect.right + 10,
                width,
                background: COLOR.bgCard,
                border: `1px solid ${COLOR.border}`,
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                transformOrigin: 'top left',
                transform: `translateX(${open ? '0' : '-6px'}) scale(${open ? 1 : 0.94})`,
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
                transition: 'opacity 130ms ease, transform 130ms cubic-bezier(0.34,1.56,0.64,1)',
                zIndex: 9999,
            }}
        >
            {title && (
                <div
                    style={{
                        padding: '10px 12px',
                        borderBottom: `1px solid ${COLOR.border}`,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: COLOR.textMuted,
                        textTransform: 'uppercase',
                        background: COLOR.bgSubtle,
                    }}
                >
                    {title}
                </div>
            )}
            <div style={{ padding: 8 }}>{children}</div>
        </div>
    )
}