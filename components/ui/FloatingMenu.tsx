import { useState } from 'react'
import { THEME } from '../workspace/FloorPlanEditor'

// ─────────────────────────────────────────────────────────────────────────
// Small shared building blocks for the dock — kept local since nothing else
// needs a pill-shaped icon+label toggle button yet.
// ─────────────────────────────────────────────────────────────────────────

function DockButton({
    active, disabled, onClick, icon, label,
}: {
    active?: boolean
    disabled?: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            style={{
                height: 30, padding: '0 10px', borderRadius: 999, border: 'none',
                background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: active ? THEME.accent : disabled ? THEME.textFaint : THEME.textMuted,
                fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                transition: 'background 120ms, color 120ms',
            }}
        >
            {icon}
            {label}
        </button>
    )
}

function DockDivider() {
    return <div style={{ width: 1, height: 18, background: THEME.border, flexShrink: 0 }} />
}

// ─────────────────────────────────────────────────────────────────────────
// FloatingDock — bottom-center floating pill over the 3D viewport, replacing
// the old absolutely-positioned top-left button row. Everything that lived
// there before (Walk Mode, Interactive toggle, Camera Views) moves in here,
// plus a new Preview toggle and a Display menu (left empty per current
// scope — Grid/annotations to be filled in later).
// ─────────────────────────────────────────────────────────────────────────

export function FloatingMenu({
    walkMode,
    onToggleWalkMode,
    interactiveMode,
    onToggleInteractive,
    previewOpen,
    onTogglePreview,
    cameraViewPickerSlot,
}: {
    walkMode: boolean
    onToggleWalkMode: () => void
    interactiveMode: boolean
    onToggleInteractive: () => void
    previewOpen: boolean
    onTogglePreview: () => void
    /** Pass <CameraViewPicker embedded .../> here — see CameraViewPicker's
     *  `embedded` prop for why it can't just be dropped in as-is. */
    cameraViewPickerSlot: React.ReactNode
}) {
    const [displayOpen, setDisplayOpen] = useState(false)

    return (
        <div
            style={{
                display: 'flex', alignItems: 'center', gap: 2,
                background: THEME.bgPanel, border: `1px solid ${THEME.border}`, borderRadius: 999,
                padding: '5px 6px', boxShadow: THEME.shadowLg,
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

            <div style={{ position: 'relative' }}>
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
                {displayOpen && (
                    <div
                        style={{
                            position: 'absolute', top: 40, right: 0,
                            minWidth: 200, background: THEME.bgPanel, border: `1px solid ${THEME.border}`,
                            borderRadius: 10, padding: 8, boxShadow: THEME.shadowLg,
                        }}
                    >
                        {/* Intentionally empty — Grid toggle / Floor plan annotations land
                            here later, per current scope ("leave it blank for now"). */}
                        <div style={{ fontSize: 11, color: THEME.textFaint, padding: '6px 8px' }}>
                            Coming soon
                        </div>
                    </div>
                )}
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