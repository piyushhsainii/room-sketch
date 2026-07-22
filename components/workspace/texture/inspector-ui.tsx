// inspector-ui.tsx
// Shared design tokens + primitive components for the Property Inspector.
// Pure presentation layer — no business logic lives here.

import React from 'react'

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export const SPACE = {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
} as const

// Warm, off-white / navy palette (matches landing-page inspiration),
// with a muted purple accent kept close to the existing brand indigo
// so selection/focus states still read as "the same product."
export const COLOR = {
    bg: '#FBFAF7',           // panel background — warm off-white
    bgCard: '#FFFFFF',       // card / input surface
    bgSubtle: '#F5F3EE',     // cream section background
    border: '#E8E4DA',       // hairline border
    borderStrong: '#DAD5C8',
    text: '#211F2B',         // deep navy-black
    textMuted: '#75726A',    // warm neutral gray
    textFaint: '#A29E92',
    accent: '#6B63C9',       // muted purple accent
    accentSoft: 'rgba(107,99,201,0.10)',
    accentSoftHover: 'rgba(107,99,201,0.16)',
    accentBorder: 'rgba(107,99,201,0.35)',
    danger: '#C4593F',
    dangerSoft: 'rgba(196,89,63,0.08)',
    dangerBorder: 'rgba(196,89,63,0.30)',
} as const

export const EASE = 'cubic-bezier(.2,.8,.2,1)'
export const RADIUS = { sm: 6, md: 8, lg: 10 }

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */

/** A grouped settings card, e.g. "ROOM" / "APPEARANCE". */
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div
            style={{
                background: COLOR.bgSubtle,
                border: `1px solid ${COLOR.border}`,
                borderRadius: RADIUS.lg,
                padding: SPACE.md,
                display: 'flex',
                flexDirection: 'column',
                gap: SPACE.sm,
                ...style,
            }}
        >
            {children}
        </div>
    )
}

/** Small uppercase eyebrow label used above a card or section. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: COLOR.textMuted,
            }}
        >
            {children}
        </div>
    )
}

/** A labeled row: fixed-width label + right-aligned control, consistent across the panel. */
export function PropField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.xs, minHeight: 32 }}>
            <span style={{ width: 84, fontSize: 12.5, fontWeight: 500, color: COLOR.textMuted, flexShrink: 0 }}>
                {label}
            </span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: SPACE.xxs }}>
                {children}
            </div>
        </div>
    )
}

export function Divider({ inset = 0 }: { inset?: number }) {
    return <div style={{ height: 1, background: COLOR.border, margin: `${SPACE.xs}px ${inset}px` }} />
}

/* ------------------------------------------------------------------ */
/* Controls                                                             */
/* ------------------------------------------------------------------ */

const baseInputStyle: React.CSSProperties = {
    height: 34,
    borderRadius: RADIUS.sm,
    width: '100%',
    border: `1px solid ${COLOR.borderStrong}`,
    background: COLOR.bgCard,
    color: COLOR.text,
    fontSize: 13,
    padding: '0 10px',
    outline: 'none',
    transition: `border-color 150ms ${EASE}, box-shadow 150ms ${EASE}`,
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} style={{ ...baseInputStyle, ...props.style }} onFocus={focusRing} onBlur={blurRing} />
}

export function NumInput({
    value, min, max, step, onChange,
}: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
    return (
        <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value.toFixed(2)}
            onChange={e => onChange(Math.max(min, Math.min(max, parseFloat(e.target.value) || min)))}
            style={{ ...baseInputStyle, width: 84, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
            onFocus={focusRing}
            onBlur={blurRing}
        />
    )
}

function focusRing(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = COLOR.accent
    e.currentTarget.style.boxShadow = `0 0 0 3px ${COLOR.accentSoft}`
}
function blurRing(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = COLOR.borderStrong
    e.currentTarget.style.boxShadow = 'none'
}

/** Segmented control — replaces the old row of plain buttons (e.g. Solid / Railing / Open). */
export function SegmentedControl<T extends string>({
    options, value, onChange,
}: { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
    return (
        <div
            style={{
                display: 'flex',
                gap: 2,
                padding: 2,
                background: COLOR.bgCard,
                border: `1px solid ${COLOR.border}`,
                borderRadius: RADIUS.sm,
                width: '100%',
            }}
        >
            {options.map(opt => {
                const active = opt.value === value
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        style={{
                            flex: 1,
                            height: 26,
                            borderRadius: 5,
                            cursor: 'pointer',
                            border: 'none',
                            background: active ? COLOR.bgSubtle : 'transparent',
                            boxShadow: active ? `0 1px 2px rgba(33,31,43,0.06)` : 'none',
                            color: active ? COLOR.text : COLOR.textMuted,
                            fontSize: 11.5,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            transition: `all 150ms ${EASE}`,
                        }}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}

type ButtonVariant = 'secondary' | 'ghost' | 'danger'

export function Button({
    children, onClick, title, variant = 'secondary', style, flex,
}: {
    children: React.ReactNode
    onClick: () => void
    title?: string
    variant?: ButtonVariant
    style?: React.CSSProperties
    flex?: boolean
}) {
    const variants: Record<ButtonVariant, React.CSSProperties> = {
        secondary: { border: `1px solid ${COLOR.accentBorder}`, background: COLOR.accentSoft, color: COLOR.accent },
        ghost: { border: `1px solid ${COLOR.border}`, background: 'transparent', color: COLOR.textMuted },
        danger: { border: `1px solid ${COLOR.dangerBorder}`, background: 'transparent', color: COLOR.danger },
    }
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                flex: flex ? 1 : undefined,
                height: 34,
                padding: '0 14px',
                borderRadius: RADIUS.sm,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: `background 150ms ${EASE}, transform 100ms ${EASE}`,
                ...variants[variant],
                ...style,
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
            {children}
        </button>
    )
}

export function IconButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: RADIUS.sm, border: `1px solid ${COLOR.accentBorder}`,
                background: COLOR.accentSoft, color: COLOR.accent,
                fontSize: 13, cursor: 'pointer', flexShrink: 0,
                transition: `background 150ms ${EASE}`,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = COLOR.accentSoftHover)}
            onMouseLeave={e => (e.currentTarget.style.background = COLOR.accentSoft)}
        >
            {children}
        </button>
    )
}

export function ColorSwatchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.xs }}>
            <input
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    width: 34, height: 34, borderRadius: RADIUS.sm,
                    border: `1px solid ${COLOR.borderStrong}`, padding: 2, cursor: 'pointer', background: COLOR.bgCard,
                }}
            />
            <span style={{ fontSize: 11.5, color: COLOR.textFaint, fontVariantNumeric: 'tabular-nums' }}>
                {value.toUpperCase()}
            </span>
        </div>
    )
}

export function EmptyState({ label }: { label: string }) {
    return (
        <div
            style={{
                padding: `${SPACE.xxl}px ${SPACE.md}px`,
                fontSize: 12.5,
                color: COLOR.textFaint,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: SPACE.xs,
            }}
        >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLOR.textFaint} strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M9 9h6v6H9z" />
            </svg>
            {label}
        </div>
    )
}

export function RangeRow({
    value, onChange, format, min = 0, max = 100, step = 1,
}: { value: number; onChange: (v: number) => void; format: (v: number) => string; min?: number; max?: number; step?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.xs, flex: 1 }}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: COLOR.accent }}
            />
            <span style={{ fontSize: 11.5, color: COLOR.textFaint, width: 36, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {format(value)}
            </span>
        </div>
    )
}