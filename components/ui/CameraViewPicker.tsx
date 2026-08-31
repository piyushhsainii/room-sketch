import { useRef, useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { SceneConfig, THEME } from '../workspace/FloorPlanEditor'
import { FloorPlanState } from '../workspace/lib/constants'
import { Scene3DHandle } from '../workspace/3DScene'
import { CameraView, getBuiltInViews } from '../workspace/lib/camera'
import { uid } from '@/lib/helpers'

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
    surface: '#EAEAEA',
    surfaceChip: '#F5F5F5',
    canvas: '#E5E5E5',
    textPrimary: '#1A1A1A',
    textMuted: '#5A5A5A',
    textPlaceholder: '#999999',
    lightShadow: 'rgba(255,255,255,0.75)',
    darkShadow: 'rgba(0,0,0,0.14)',
    accentText: '#4C4FBF',
    accentSoft: 'rgba(99,102,241,0.14)',
    dangerText: '#B3503F',
    dangerSoft: 'rgba(179,80,63,0.14)',
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
}

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 7px ${CLAY.darkShadow}, inset -3px -3px 7px ${CLAY.lightShadow}`
        : `-3px -3px 7px ${CLAY.lightShadow}, 3px 3px 8px ${CLAY.darkShadow}`

const clayInset = () => `inset 2px 2px 5px ${CLAY.darkShadow}, inset -2px -2px 5px ${CLAY.lightShadow}`

function SaveViewPopover({
    onConfirm,
    onCancel
}: {
    onConfirm: (name: string) => void
    onCancel: () => void
}) {
    const [name, setName] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { inputRef.current?.focus() }, [])

    const submit = () => {
        const trimmed = name.trim()
        if (!trimmed) return
        onConfirm(trimmed)
    }

    return (
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
                ref={inputRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') submit()
                    if (e.key === 'Escape') onCancel()
                }}
                placeholder="Name this view…"
                style={{
                    fontSize: 12, padding: '8px 10px', borderRadius: 10,
                    border: 'none', outline: 'none', background: CLAY.surface,
                    color: CLAY.textPrimary, fontFamily: CLAY.font,
                    boxShadow: clayInset(),
                }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                    onClick={onCancel}
                    style={{ fontSize: 12, padding: '5px 10px', borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer', color: CLAY.textMuted, fontFamily: CLAY.font }}
                >
                    Cancel
                </button>
                <button
                    onClick={submit}
                    disabled={!name.trim()}
                    style={{
                        fontSize: 12, padding: '5px 12px', borderRadius: 999, border: 'none',
                        background: name.trim() ? CLAY.surfaceChip : CLAY.surface,
                        color: name.trim() ? CLAY.accentText : CLAY.textPlaceholder,
                        fontWeight: 500, fontFamily: CLAY.font,
                        boxShadow: name.trim() ? clayRaised(false) : 'none',
                        cursor: name.trim() ? 'pointer' : 'default'
                    }}
                >
                    Save
                </button>
            </div>
        </div>
    )
}

function CameraIconSvg() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    )
}

export function CameraViewPickerV2({
    fp,
    setFp,
    sceneConfig,
    pushHistory,
    onSave,
    scene3DRef,
    embedded = true,
}: {
    fp: FloorPlanState
    setFp: (updater: (prev: FloorPlanState) => FloorPlanState) => void
    sceneConfig: SceneConfig
    pushHistory: () => void
    onSave: (fp: FloorPlanState, cfg: SceneConfig) => void
    scene3DRef: React.RefObject<Scene3DHandle | null>
    /** True when rendered inside FloatingDock — drops the old self-positioning
     *  (top:10/right:10) in favor of sitting inline in the dock's flex row,
     *  and opens the dropdown upward instead of downward since the dock now
     *  lives at the bottom of the viewport.
     *
     *  Defaults to true: every current call site renders this inside the
     *  dock. The old top:10/right:10 standalone branch only makes sense
     *  when there's no positioned ancestor wrapping it — if a caller
     *  forgets to pass `embedded` explicitly, falling back to that branch
     *  anchors the dropdown to the viewport instead of the dock (it jumps
     *  to the top-right corner of the page, overlapping browser chrome).
     *  Pass `embedded={false}` explicitly for the rare standalone case. */
    embedded?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [naming, setNaming] = useState(false)
    const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [triggerHovered, setTriggerHovered] = useState(false)
    const [saveRowHovered, setSaveRowHovered] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

    const builtInViews = useMemo(() => getBuiltInViews(fp), [fp.rooms, fp.lineNodes])
    const allViews = [...builtInViews, ...(fp.savedViews ?? [])]

    useEffect(() => {
        if (!open) return
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                panelRef.current && !panelRef.current.contains(target)
            ) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    const commitSave = async (name: string) => {
        const current = scene3DRef.current?.getCurrentView()
        if (!current) { setNaming(false); return }

        const newView: CameraView = { id: uid(), label: name, ...current }
        let nextFp: FloorPlanState | null = null

        pushHistory()
        setFp(prev => {
            nextFp = { ...prev, savedViews: [...(prev.savedViews ?? []), newView] }
            return nextFp
        })

        setSavingState('saving')
        setErrorMsg(null)
        try {
            await onSave(nextFp!, sceneConfig)
            setSavingState('idle')
            setNaming(false)
            // panel stays open so the user can immediately add/remove another
        } catch {
            // rollback so the UI never shows a view that isn't actually saved
            setFp(prev => ({ ...prev, savedViews: (prev.savedViews ?? []).filter(v => v.id !== newView.id) }))
            setSavingState('error')
            setErrorMsg('Could not save this view — try again.')
        }
    }

    const deleteView = async (id: string) => {
        let removed: CameraView | undefined
        let nextFp: FloorPlanState | null = null

        pushHistory()
        setFp(prev => {
            removed = (prev.savedViews ?? []).find(v => v.id === id)
            nextFp = { ...prev, savedViews: (prev.savedViews ?? []).filter(v => v.id !== id) }
            return nextFp
        })

        setSavingState('saving')
        setErrorMsg(null)
        try {
            await onSave(nextFp!, sceneConfig)
            setSavingState('idle')
        } catch {
            // rollback the delete
            if (removed) {
                const restored = removed
                setFp(prev => ({ ...prev, savedViews: [...(prev.savedViews ?? []), restored] }))
            }
            setSavingState('error')
            setErrorMsg('Could not delete this view — try again.')
        }
    }

    return (
        <div style={embedded ? { position: 'relative', fontFamily: CLAY.font } : { position: 'absolute', top: 10, right: 10, zIndex: 5, fontFamily: CLAY.font }}>
            <button
                ref={triggerRef}
                onClick={() => {
                    // Measure the trigger's real on-screen position every time
                    // it opens, then render the panel via a portal positioned
                    // with fixed coordinates, opening whichever direction
                    // (up or down) actually has room. Assuming a fixed
                    // "always opens upward" direction broke as soon as this
                    // dock was placed at the top of the viewport instead of
                    // the bottom — the panel shot up past the visible screen
                    // into the browser chrome regardless of the offset value.
                    setAnchorRect(triggerRef.current?.getBoundingClientRect() ?? null)
                    setOpen(o => !o); setNaming(false); setErrorMsg(null)
                }}
                onMouseEnter={() => setTriggerHovered(true)}
                onMouseLeave={() => setTriggerHovered(false)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: embedded ? '0 12px' : '8px 12px',
                    height: embedded ? 32 : undefined,
                    borderRadius: 999,
                    border: 'none',
                    background: open ? CLAY.accentSoft : (triggerHovered ? CLAY.surfaceChip : (embedded ? 'transparent' : CLAY.surface)),
                    color: open ? CLAY.accentText : CLAY.textPrimary,
                    boxShadow: open ? clayRaised(true) : (triggerHovered ? clayRaised(true) : (embedded ? 'none' : clayRaised(false))),
                    cursor: 'pointer', fontSize: embedded ? 11.5 : 13, fontWeight: open ? 500 : 400,
                    fontFamily: CLAY.font,
                    transition: 'box-shadow 160ms ease, background 160ms ease, color 160ms ease',
                }}
            >
                <CameraIconSvg />
                Views
                {savingState === 'saving' && <span style={{ fontSize: 10, color: CLAY.textMuted }}>saving…</span>}
            </button>

            {open && anchorRect && typeof document !== 'undefined' && (() => {
                const PANEL_EST_HEIGHT = 260
                const GAP = 6
                const spaceBelow = window.innerHeight - anchorRect.bottom
                const spaceAbove = anchorRect.top
                // Prefer opening downward (normal dropdown behavior) unless
                // there isn't room and there IS room above — mirrors
                // ShareDialog's same up/down decision.
                const openDown = spaceBelow >= PANEL_EST_HEIGHT + GAP || spaceBelow >= spaceAbove

                return createPortal(
                    <div
                        ref={panelRef}
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            ...(openDown
                                ? { top: anchorRect.bottom + GAP }
                                : { bottom: window.innerHeight - anchorRect.top + GAP }),
                            left: Math.max(8, Math.min(anchorRect.right - 200, window.innerWidth - 208)),
                            background: CLAY.surface, border: 'none', borderRadius: 18, minWidth: 200,
                            maxHeight: Math.min(PANEL_EST_HEIGHT, (openDown ? spaceBelow : spaceAbove) - GAP - 8),
                            overflowY: 'auto',
                            zIndex: 9999,
                            boxShadow: `-5px -5px 10px ${CLAY.lightShadow}, 5px 5px 12px ${CLAY.darkShadow}`,
                            fontFamily: CLAY.font,
                        }}
                    >
                        <div style={{ padding: 8 }}>
                            {errorMsg && (
                                <div style={{
                                    fontSize: 11, color: CLAY.dangerText, background: CLAY.dangerSoft,
                                    borderRadius: 10, padding: '7px 10px', marginBottom: 6
                                }}>
                                    {errorMsg}
                                </div>
                            )}
                            {builtInViews.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => { scene3DRef.current?.flyTo(v); setOpen(false) }}
                                    style={{
                                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12,
                                        border: 'none', background: 'transparent', cursor: 'pointer',
                                        color: CLAY.textPrimary, borderRadius: 10, fontFamily: CLAY.font,
                                        transition: 'background 160ms ease, box-shadow 160ms ease',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = CLAY.surfaceChip; e.currentTarget.style.boxShadow = clayRaised(true) }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}
                                >
                                    {v.label}
                                </button>
                            ))}

                            {(fp.savedViews ?? []).length > 0 && (
                                <>
                                    <div style={{ height: 1, boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`, margin: '6px 2px' }} />
                                    {fp.savedViews!.map(v => (
                                        <div key={v.id} style={{ display: 'flex', alignItems: 'center' }}>
                                            <button
                                                onClick={() => { scene3DRef.current?.flyTo(v); setOpen(false) }}
                                                style={{
                                                    flex: 1, textAlign: 'left', padding: '8px 10px', fontSize: 12,
                                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                                    color: CLAY.textPrimary, borderRadius: 10, fontFamily: CLAY.font,
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = CLAY.surfaceChip }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                                            >
                                                {v.label}
                                            </button>
                                            <button
                                                onClick={() => deleteView(v.id)}
                                                title="Delete view"
                                                style={{
                                                    padding: '5px 10px', fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer',
                                                    color: CLAY.textPlaceholder, borderRadius: 999, fontFamily: CLAY.font,
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.color = CLAY.dangerText }}
                                                onMouseLeave={e => { e.currentTarget.style.color = CLAY.textPlaceholder }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </>
                            )}

                            <div style={{ height: 1, boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`, margin: '6px 2px' }} />

                            {naming ? (
                                <SaveViewPopover
                                    onConfirm={commitSave}
                                    onCancel={() => setNaming(false)}
                                />
                            ) : (
                                <button
                                    onClick={() => { setNaming(true); setErrorMsg(null) }}
                                    onMouseEnter={() => setSaveRowHovered(true)}
                                    onMouseLeave={() => setSaveRowHovered(false)}
                                    style={{
                                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12,
                                        fontWeight: 500, color: CLAY.accentText, border: 'none',
                                        background: saveRowHovered ? CLAY.surfaceChip : 'transparent',
                                        boxShadow: saveRowHovered ? clayRaised(true) : 'none',
                                        cursor: 'pointer', borderRadius: 10, fontFamily: CLAY.font,
                                        transition: 'background 160ms ease, box-shadow 160ms ease',
                                    }}
                                >
                                    + Save current view
                                </button>
                            )}
                        </div>
                    </div>,
                    document.body
                )
            })()}
        </div>
    )
}