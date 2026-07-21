'use client'

import { useEffect, useState } from 'react'

export type DockItem = {
    id: string
    label: string
    icon: React.ReactNode
    onClick: () => void
}

export function Dock({
    items,
    activeId,
    expanded,
    onExpandedChange,
    anchorRef,
    children,
}: {
    items: DockItem[]
    activeId: string | null
    expanded: boolean
    onExpandedChange: (v: boolean) => void
    anchorRef?: React.RefObject<HTMLElement>
    children?: React.ReactNode
}) {
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

    useEffect(() => {
        if (!anchorRef) return
        const measure = () => {
            if (anchorRef.current) setAnchorRect(anchorRef.current.getBoundingClientRect())
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [anchorRef, expanded])

    const usingFallback = !anchorRef || !anchorRect
    const railTop = anchorRect ? anchorRect.top + anchorRect.height / 2 : undefined
    const railRight = anchorRect ? window.innerWidth - anchorRect.left + 10 : undefined

    const outerStyle: React.CSSProperties = usingFallback
        ? {
            position: 'fixed', right: 14, top: '50%', transform: 'translateY(-50%)',
            zIndex: 80, display: 'flex', alignItems: 'stretch', gap: 8,
        }
        : {
            position: 'fixed', right: railRight, top: railTop, transform: 'translateY(-50%)',
            zIndex: 80, display: 'flex', alignItems: 'stretch', gap: 8,
        }

    return (
        <div style={outerStyle}>
            <div
                style={{
                    width: 320,
                    height: '80vh',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--fp-bg, #FFFFFF)',
                    border: '1px solid var(--fp-border, rgba(15,15,15,0.08))',
                    borderRadius: 14,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    transformOrigin: 'right center',
                    transform: expanded ? 'scale(1) translateX(0)' : 'scale(0.92) translateX(8px)',
                    opacity: expanded ? 1 : 0,
                    pointerEvents: expanded ? 'auto' : 'none',
                    transition: 'transform 220ms cubic-bezier(0.34,1.56,0.64,1), opacity 160ms ease',
                }}
            >
                {children}
            </div>

            <div style={{
                display: 'flex', flexDirection: 'column', gap: 6,
                background: 'var(--fp-bg, #FFFFFF)',
                border: '1px solid var(--fp-border, rgba(15,15,15,0.08))',
                borderRadius: 14, padding: 6, alignSelf: 'flex-start',
                boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
            }}>
                {items.map(item => {
                    const isActive = expanded && activeId === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => { if (isActive) onExpandedChange(false); else { item.onClick(); onExpandedChange(true) } }}
                            title={item.label}
                            style={{
                                width: 40, height: 40, borderRadius: 10, cursor: 'pointer',
                                border: isActive ? '1px solid var(--fp-accent-border, rgba(99,102,241,0.4))' : '1px solid transparent',
                                background: isActive ? 'var(--fp-accent-bg, rgba(99,102,241,0.1))' : 'transparent',
                                color: isActive ? 'var(--fp-accent, #6366F1)' : 'var(--fp-text-muted, rgba(26,26,26,0.55))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 150ms cubic-bezier(0.34,1.56,0.64,1)',
                                transform: isActive ? 'scale(1.06)' : 'scale(1)',
                            }}
                        >
                            {item.icon}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}