'use client'

// Lightweight Sheet primitive — no external UI kit dependency (magic-ui / shadcn
// sheet weren't available in this project), built to match FloorPlanEditor's
// existing inline-style convention so it drops in cleanly.

import { useEffect } from 'react'

export function Sheet({
    open,
    onOpenChange,
    side = 'right',
    width = 380,
    title,
    children,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    side?: 'right' | 'left'
    width?: number
    title?: React.ReactNode
    children: React.ReactNode
}) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
        if (open) window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [open, onOpenChange])

    return (
        <>
            {/* Overlay */}
            <div
                onClick={() => onOpenChange(false)}
                style={{
                    position: 'fixed', inset: 0, zIndex: 400,
                    background: 'rgba(15,15,15,0.28)',
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? 'auto' : 'none',
                    transition: 'opacity 180ms ease',
                }}
            />
            {/* Panel */}
            <div
                role="dialog"
                aria-hidden={!open}
                style={{
                    position: 'fixed', top: 0, bottom: 0,
                    [side]: 0,
                    width,
                    maxWidth: '92vw',
                    zIndex: 401,
                    background: 'var(--fp-bg, #FFFFFF)',
                    borderLeft: side === 'right' ? '1px solid var(--fp-border, rgba(15,15,15,0.08))' : undefined,
                    borderRight: side === 'left' ? '1px solid var(--fp-border, rgba(15,15,15,0.08))' : undefined,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    display: 'flex', flexDirection: 'column',
                    transform: `translateX(${open ? 0 : side === 'right' ? '100%' : '-100%'})`,
                    transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                {title && (
                    <div style={{
                        height: 46, flexShrink: 0, display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '0 14px',
                        borderBottom: '1px solid var(--fp-border, rgba(15,15,15,0.08))',
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fp-text, #1A1A1A)' }}>{title}</span>
                        <button
                            onClick={() => onOpenChange(false)}
                            style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'var(--fp-bg-hover, rgba(0,0,0,0.05))', color: 'var(--fp-text-muted, rgba(26,26,26,0.55))', fontSize: 14, cursor: 'pointer' }}
                        >×</button>
                    </div>
                )}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {children}
                </div>
            </div>
        </>
    )
}