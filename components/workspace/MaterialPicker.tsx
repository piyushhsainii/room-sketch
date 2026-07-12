// components/workspace/MaterialPicker.tsx
//
// Shared premium asset-browser-style material picker — used by both
// MaterialsPanel.tsx (the dedicated Materials dock tab) and
// SceneConfigPanel.tsx (the Scene/Rooms tab's inline material pickers), so
// there's exactly one visual language for "pick a material" across the app
// instead of two divergent implementations.
'use client'

import React, { useRef, useState } from 'react'

export const MP_THEME = {
    bg: '#FAFAFB',
    card: '#FFFFFF',
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',
    text: '#0F172A',
    textMuted: '#6B7280',
    textFaint: '#9CA3AF',
    accent: '#4F46E5',
    accentBg: 'rgba(79,70,229,0.08)',
    accentGlow: '0 0 0 3px rgba(79,70,229,0.18)',
    hoverBg: '#F3F4F6',
    shadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
    shadowMd: '0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)',
}
const T = MP_THEME

export function labelize(key: string) {
    return key
        .split(/[-_]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
}

export type MaterialItem = { key: string; label: string; color: string; preview?: string }

/**
 * Normalizes either a Record<string, {color, preview?}> (WALL_MAT_DEFS /
 * FLOOR_MAT_DEFS shape) or an array of {id, label, color, preview?}
 * (FLOOR_MATERIALS / WALL_COLORS shape) into one common MaterialItem[]
 * shape, so both call sites can feed this the same picker component
 * regardless of which underlying data source they use.
 */
export function toMaterialItems(
    source:
        | Record<string, { color: string; preview?: string }>
        | { id: string; label?: string; color: string; preview?: string }[]
): MaterialItem[] {
    if (Array.isArray(source)) {
        return source.map(s => ({ key: s.id, label: s.label ?? labelize(s.id), color: s.color, preview: s.preview }))
    }
    return Object.entries(source).map(([key, def]) => ({ key, label: labelize(key), color: def.color, preview: def.preview }))
}

// ── Horizontal wheel-scroll row ──────────────────────────────────────────
// FIX: previously this had no overflow containment, so within a narrow Dock
// panel the row's content forced the PARENT wider instead of scrolling,
// which is what hard-clipped the last card against the panel edge with no
// visual cue it was scrollable. `minWidth: 0` on every flex ancestor down
// to this row is required for `overflow-x: auto` to actually engage instead
// of the flex item refusing to shrink below its content size. A right-edge
// fade mask now also signals "there's more, keep scrolling" instead of a
// hard clip.
export function HScrollRow({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)
    const [showFade, setShowFade] = useState(true)

    const updateFade = () => {
        const el = ref.current
        if (!el) return
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
        setShowFade(el.scrollWidth > el.clientWidth && !atEnd)
    }

    const onWheel = (e: React.WheelEvent) => {
        const el = ref.current
        if (!el) return
        if (el.scrollWidth <= el.clientWidth) return
        e.preventDefault()
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        el.scrollBy({ left: delta, behavior: 'auto' })
        requestAnimationFrame(updateFade)
    }

    return (
        <div style={{ position: 'relative', minWidth: 0 }}>
            <div
                ref={ref}
                onWheel={onWheel}
                onScroll={updateFade}
                className="fp-hscroll"
                style={{
                    display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'hidden',
                    scrollSnapType: 'x proximity', scrollBehavior: 'smooth',
                    paddingBottom: 2, marginBottom: -2, minWidth: 0,
                }}
            >
                <style>{`.fp-hscroll::-webkit-scrollbar{display:none}.fp-hscroll{scrollbar-width:none;-ms-overflow-style:none}`}</style>
                {children}
            </div>
            {showFade && (
                <div
                    aria-hidden
                    style={{
                        position: 'absolute', top: 0, right: 0, bottom: 2, width: 28,
                        background: `linear-gradient(to right, transparent, ${T.card})`,
                        pointerEvents: 'none',
                    }}
                />
            )}
        </div>
    )
}

// ── Material card: 56x56 preview, label below, selected checkmark+glow, hover lift ──
export function MaterialCard({
    item, selected, onSelect,
}: {
    item: MaterialItem
    selected: boolean
    onSelect: () => void
}) {
    const [hover, setHover] = useState(false)
    const hasImagePreview = item.preview?.startsWith('/')

    return (
        <button
            onClick={onSelect}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title={item.label}
            style={{
                flexShrink: 0, scrollSnapAlign: 'start',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                width: 64, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
            }}
        >
            <div style={{
                position: 'relative', width: 56, height: 56, borderRadius: 10,
                backgroundColor: hasImagePreview ? '#EEE' : item.color,
                backgroundImage: hasImagePreview ? `url(${item.preview})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
                border: selected ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                boxShadow: selected ? T.accentGlow : hover ? T.shadowMd : T.shadow,
                transform: hover && !selected ? 'translateY(-2px)' : selected ? 'scale(1.03)' : 'none',
                transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
            }}>
                {selected && (
                    <div style={{
                        position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: '50%',
                        background: T.accent, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)', border: '2px solid white',
                    }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                )}
            </div>
            <span style={{
                fontSize: 11, fontWeight: selected ? 600 : 500, color: selected ? T.accent : T.textMuted,
                textAlign: 'center', lineHeight: 1.2, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {item.label}
            </span>
        </button>
    )
}

// ── Category section: icon + uppercase title, horizontal scroll row of cards ──
export function MaterialCategory({
    icon, title, items, currentVal, onSelect,
}: {
    icon: string
    title: string
    items: MaterialItem[]
    currentVal: string
    onSelect: (key: string) => void
}) {
    return (
        <div style={{ marginBottom: 18, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 13 }}>{icon}</span>
                <span style={{
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: T.accent,
                }}>{title}</span>
                <div style={{ flex: 1, height: 1, background: T.border, marginLeft: 4 }} />
            </div>
            <HScrollRow>
                {items.map(item => (
                    <MaterialCard
                        key={item.key}
                        item={item}
                        selected={currentVal === item.key}
                        onSelect={() => onSelect(item.key)}
                    />
                ))}
            </HScrollRow>
        </div>
    )
}

// ── Collapsible card wrapper (rooms / areas) ────────────────────────────────
export function CollapsibleCard({
    title, subtitle, defaultOpen = false, children,
}: {
    title: string
    subtitle?: string
    defaultOpen?: boolean
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
            marginBottom: 10, overflow: 'hidden', boxShadow: T.shadow, minWidth: 0,
        }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.6"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 200ms ease-in-out', flexShrink: 0 }}
                >
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
                    {subtitle && <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>{subtitle}</div>}
                </div>
            </button>
            <div style={{
                maxHeight: open ? 900 : 0, opacity: open ? 1 : 0,
                transition: 'max-height 200ms ease-in-out, opacity 200ms ease-in-out',
                overflow: 'hidden',
            }}>
                <div style={{ padding: '4px 14px 16px', minWidth: 0 }}>{children}</div>
            </div>
        </div>
    )
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: T.textFaint, padding: '18px 2px 10px', borderBottom: `1px solid ${T.border}`, marginBottom: 14,
        }}>
            {children}
        </div>
    )
}