import { THEME } from "../workspace/FloorPlanEditor";

export function ExportMenuSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: '10px 8px 6px' }}>
            <div style={{
                padding: '0 6px 6px', fontSize: 9.5, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase', color: THEME.textFaint,
            }}>
                {label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {children}
            </div>
        </div>
    )
}

export function ExportMenuCard({
    icon, label, sub, onClick, disabled, delay, highlight,
}: {
    icon: React.ReactNode
    label: string
    sub?: string
    onClick: () => void
    disabled?: boolean
    delay: number
    highlight?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', textAlign: 'left',
                padding: '9px 8px', borderRadius: 8, border: 'none',
                background: highlight ? 'rgba(99,102,241,0.06)' : 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                animation: 'wsnavMenuItemIn 160ms ease-out both',
                animationDelay: `${delay}ms`,
                transition: 'background 100ms',
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = highlight ? 'rgba(99,102,241,0.11)' : '#F3F4F6' }}
            onMouseLeave={e => { e.currentTarget.style.background = highlight ? 'rgba(99,102,241,0.06)' : 'transparent' }}
        >
            <div style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 7,
                background: highlight ? THEME.accent : 'rgba(15,15,15,0.05)',
                color: highlight ? '#FFF' : THEME.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {icon}
            </div>
            <div style={{ paddingTop: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: highlight ? THEME.accent : '#111827' }}>{label}</div>
                {sub && <div style={{ fontSize: 10.5, color: THEME.textMuted, marginTop: 1, lineHeight: 1.3 }}>{sub}</div>}
            </div>
        </button>
    )
}

export function FormatIcon({ format }: { format: 'gltf' | 'obj' | 'dxf' | 'svg' }) {
    const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    if (format === 'gltf' || format === 'obj') {
        // 3D model — cube icon
        return (
            <svg {...common}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
            </svg>
        )
    }
    if (format === 'dxf') {
        // 2D CAD — compass/drafting icon
        return (
            <svg {...common}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            </svg>
        )
    }
    // svg — vector shape icon
    return (
        <svg {...common}>
            <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
            <path d="M8 8h8v8H8z" />
        </svg>
    )
}