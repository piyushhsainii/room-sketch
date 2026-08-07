import { useState } from 'react'

const DOCK = {
    bg: '#18181B',
    border: 'rgba(255,255,255,0.08)',
    text: '#E4E4E7',
    textMuted: '#A1A1AA',
    textFaint: '#71717A',
    activeBg: 'rgba(165,168,255,0.18)',
    activeText: '#C7C9FF',
    divider: 'rgba(255,255,255,0.1)',
    shadow: '0 10px 30px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25)',
}

function DockButton({ active, disabled, onClick, icon, label }: {
    active?: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            style={{
                height: 30, padding: '0 10px', borderRadius: 999, border: 'none',
                background: active ? DOCK.activeBg : 'transparent',
                color: active ? DOCK.activeText : disabled ? DOCK.textFaint : DOCK.textMuted,
                fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                transition: 'background 120ms, color 120ms',
            }}
            onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
        >
            {icon}
            {label}
        </button>
    )
}

function DockDivider() {
    return <div style={{ width: 1, height: 18, background: DOCK.divider, flexShrink: 0 }} />
}

// ── Toggle row used inside the Display hover panel ──────────────────────
function ToggleRow({ icon, label, checked, onChange }: {
    icon: React.ReactNode; label: string; checked: boolean; onChange: () => void
}) {
    return (
        <div
            onClick={onChange}
            style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 6, fontSize: 12.5, color: DOCK.text, cursor: 'pointer',
                transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
            <span style={{ color: DOCK.textMuted, display: 'flex' }}>{icon}</span>
            <span style={{ flex: 1 }}>{label}</span>
            {/* Small pill switch, matches the dark dock aesthetic instead of
                a native checkbox */}
            <div style={{
                width: 30, height: 17, borderRadius: 999, flexShrink: 0,
                background: checked ? DOCK.activeText : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 150ms',
            }}>
                <div style={{
                    position: 'absolute', top: 2, left: checked ? 15 : 2,
                    width: 13, height: 13, borderRadius: '50%', background: checked ? '#18181B' : DOCK.textFaint,
                    transition: 'left 150ms',
                }} />
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────
// FloatingDock — Walk Mode, Interactive toggle, Display menu (hover-opened,
// scale-up transition — now hosts Grid / Furniture / Labels / Floor plan
// annotations), Camera Views, Preview toggle.
// ─────────────────────────────────────────────────────────────────────────

export function FloatingMenu({
    walkMode,
    onToggleWalkMode,
    interactiveMode,
    onToggleInteractive,
    showFurniture,
    onToggleShowFurniture,
    showLabels,
    onToggleShowLabels,
    previewOpen,
    onTogglePreview,
    cameraViewPickerSlot,
}: {
    walkMode: boolean
    onToggleWalkMode: () => void
    interactiveMode: boolean
    onToggleInteractive: () => void
    showFurniture: boolean
    onToggleShowFurniture: () => void
    showLabels: boolean
    onToggleShowLabels: () => void
    previewOpen: boolean
    onTogglePreview: () => void
    cameraViewPickerSlot: React.ReactNode
}) {
    const [displayOpen, setDisplayOpen] = useState(false)

    return (
        <div
            style={{
                display: 'flex', alignItems: 'center', gap: 2,
                background: DOCK.bg, border: `1px solid ${DOCK.border}`, borderRadius: 999,
                padding: '5px 6px', boxShadow: DOCK.shadow,
            }}
        >
            <DockButton
                active={walkMode}
                disabled={interactiveMode}
                onClick={onToggleWalkMode}
                label={walkMode ? 'Exit Walk' : 'Walk Mode'}
                icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                }
            />

            <DockButton
                active={interactiveMode}
                onClick={onToggleInteractive}
                label={interactiveMode ? 'Interactive: On' : 'Interactive: Off'}
                icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                }
            />

            <DockDivider />

            {/* ── Display — hover to open, scale-up entrance transition ── */}
            <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setDisplayOpen(true)}
                onMouseLeave={() => setDisplayOpen(false)}
            >
                <DockButton
                    active={displayOpen}
                    onClick={() => setDisplayOpen(o => !o)}
                    label="Display"
                    icon={
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                        </svg>
                    }
                />
                {/* Invisible bridge so the mouse can travel from the button
                    down to the panel without a mouseleave gap closing it */}
                {displayOpen && <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 10 }} />}
                <div
                    style={{
                        position: 'absolute', top: 40, right: 0,
                        minWidth: 210, background: DOCK.bg, border: `1px solid ${DOCK.border}`,
                        borderRadius: 10, padding: 6, boxShadow: DOCK.shadow,
                        transformOrigin: 'top right',
                        transform: displayOpen ? 'scale(1)' : 'scale(0.92)',
                        opacity: displayOpen ? 1 : 0,
                        pointerEvents: displayOpen ? 'auto' : 'none',
                        transition: 'transform 140ms cubic-bezier(0.16,1,0.3,1), opacity 120ms ease-out',
                    }}
                >
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        borderRadius: 6, fontSize: 12.5, color: DOCK.text,
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DOCK.textMuted} strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                        </svg>
                        <span style={{ flex: 1 }}>Grid</span>
                    </div>

                    <div style={{ height: 1, background: DOCK.divider, margin: '4px 2px' }} />

                    <ToggleRow
                        label="Furniture"
                        checked={showFurniture}
                        onChange={onToggleShowFurniture}
                        icon={
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3" />
                                <path d="M3 9a2 2 0 0 0-2 2v4h22v-4a2 2 0 0 0-2-2" />
                                <path d="M3 15v3M21 15v3" />
                            </svg>
                        }
                    />
                    <ToggleRow
                        label="Labels"
                        checked={showLabels}
                        onChange={onToggleShowLabels}
                        icon={
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.82Z" />
                                <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
                            </svg>
                        }
                    />

                    <div style={{ height: 1, background: DOCK.divider, margin: '4px 2px' }} />

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        borderRadius: 6, fontSize: 12.5, color: DOCK.text, cursor: 'pointer',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DOCK.textMuted} strokeWidth="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        <span style={{ flex: 1 }}>Floor plan annotations</span>
                        <span style={{ color: DOCK.textFaint }}>›</span>
                    </div>
                </div>
            </div>

            <DockDivider />

            {cameraViewPickerSlot}

            <DockDivider />

            <DockButton
                active={previewOpen}
                onClick={onTogglePreview}
                label="Preview"
                icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                }
            />
        </div>
    )
}