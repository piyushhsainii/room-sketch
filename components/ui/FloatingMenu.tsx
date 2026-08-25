import { useState } from 'react'

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    accentSoft: "rgba(99,102,241,0.14)",
    accentText: "#4C4FBF",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
}

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 7px ${CLAY.darkShadow}, inset -3px -3px 7px ${CLAY.lightShadow}`
        : `-3px -3px 7px ${CLAY.lightShadow}, 3px 3px 8px ${CLAY.darkShadow}`

function DockButton({ active, disabled, onClick, icon, label }: {
    active?: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
    const [hovered, setHovered] = useState(false)
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                height: 32, padding: '0 12px', borderRadius: 999, border: 'none',
                background: active ? CLAY.accentSoft : (hovered && !disabled) ? CLAY.surfaceChip : 'transparent',
                color: active ? CLAY.accentText : disabled ? CLAY.textPlaceholder : CLAY.textPrimary,
                fontSize: 11.5, fontWeight: active ? 500 : 400, fontFamily: CLAY.font,
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                boxShadow: active ? clayRaised(true) : (hovered && !disabled) ? clayRaised(true) : 'none',
                transition: 'background 160ms ease, box-shadow 160ms ease, color 160ms ease',
            }}
        >
            {icon}
            {label}
        </button>
    )
}

function DockDivider() {
    return <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />
}

// ── Toggle row used inside the Display hover panel ──────────────────────
function ToggleRow({ icon, label, checked, onChange }: {
    icon: React.ReactNode; label: string; checked: boolean; onChange: () => void
}) {
    const [hovered, setHovered] = useState(false)
    return (
        <div
            onClick={onChange}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px',
                borderRadius: 12, fontSize: 12.5, color: CLAY.textPrimary, cursor: 'pointer',
                fontFamily: CLAY.font,
                background: hovered ? CLAY.surfaceChip : 'transparent',
                boxShadow: hovered ? clayRaised(true) : 'none',
                transition: 'background 160ms ease, box-shadow 160ms ease',
            }}
        >
            <span style={{ color: CLAY.textMuted, display: 'flex' }}>{icon}</span>
            <span style={{ flex: 1 }}>{label}</span>
            {/* Small pill switch, matching the clay aesthetic instead of a
                native checkbox */}
            <div style={{
                width: 32, height: 18, borderRadius: 999, flexShrink: 0,
                background: checked ? CLAY.accentSoft : CLAY.surface,
                boxShadow: `inset 2px 2px 5px ${CLAY.darkShadow}, inset -2px -2px 5px ${CLAY.lightShadow}`,
                position: 'relative', transition: 'background 150ms',
            }}>
                <div style={{
                    position: 'absolute', top: 2, left: checked ? 16 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: checked ? CLAY.accentText : CLAY.textPlaceholder,
                    boxShadow: '-2px -2px 4px rgba(255,255,255,0.7), 2px 2px 5px rgba(0,0,0,0.18)',
                    transition: 'left 150ms, background 150ms',
                }} />
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────
// FloatingMenu — Walk Mode, Interactive toggle, Display menu (hover-opened,
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
    const [gridHovered, setGridHovered] = useState(false)
    const [annotationsHovered, setAnnotationsHovered] = useState(false)

    return (
        <div
            style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: CLAY.surface, border: 'none', borderRadius: 999,
                padding: '6px 8px',
                boxShadow: `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`,
                fontFamily: CLAY.font,
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
                {displayOpen && <div style={{ position: 'absolute', top: 32, left: 0, right: 0, height: 10 }} />}
                <div
                    style={{
                        position: 'absolute', top: 42, right: 0,
                        minWidth: 220, background: CLAY.surface, border: 'none',
                        borderRadius: 18, padding: 8,
                        boxShadow: `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`,
                        transformOrigin: 'top right',
                        transform: displayOpen ? 'scale(1)' : 'scale(0.92)',
                        opacity: displayOpen ? 1 : 0,
                        pointerEvents: displayOpen ? 'auto' : 'none',
                        transition: 'transform 140ms cubic-bezier(0.16,1,0.3,1), opacity 120ms ease-out',
                        fontFamily: CLAY.font,
                    }}
                >
                    <div
                        onMouseEnter={() => setGridHovered(true)}
                        onMouseLeave={() => setGridHovered(false)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px',
                            borderRadius: 12, fontSize: 12.5, color: CLAY.textPrimary, cursor: 'pointer',
                            background: gridHovered ? CLAY.surfaceChip : 'transparent',
                            boxShadow: gridHovered ? clayRaised(true) : 'none',
                            transition: 'background 160ms ease, box-shadow 160ms ease',
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={CLAY.textMuted} strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                        </svg>
                        <span style={{ flex: 1 }}>Grid</span>
                    </div>

                    <div style={{ height: 1, boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`, margin: '6px 4px' }} />

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

                    <div style={{ height: 1, boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`, margin: '6px 4px' }} />

                    <div
                        onMouseEnter={() => setAnnotationsHovered(true)}
                        onMouseLeave={() => setAnnotationsHovered(false)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px',
                            borderRadius: 12, fontSize: 12.5, color: CLAY.textPrimary, cursor: 'pointer',
                            background: annotationsHovered ? CLAY.surfaceChip : 'transparent',
                            boxShadow: annotationsHovered ? clayRaised(true) : 'none',
                            transition: 'background 160ms ease, box-shadow 160ms ease',
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={CLAY.textMuted} strokeWidth="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        <span style={{ flex: 1 }}>Floor plan annotations</span>
                        <span style={{ color: CLAY.textPlaceholder }}>›</span>
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