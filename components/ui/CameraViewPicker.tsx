import { useRef, useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { SceneConfig } from '../workspace/lib/scene-config'
import { FloorPlanState } from '../workspace/lib/constants'
import { Scene3DHandle } from '../workspace/3DScene'
import { CameraView, getBuiltInViews } from '../workspace/lib/camera'
import { uid } from '@/lib/helpers'

import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { editorMenuTheme, menuButton } from './editor-menu-theme'
const CLAY = editorMenuTheme


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
                }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                    onClick={onCancel}
                    style={{ fontSize: 12, padding: '5px 10px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: CLAY.textMuted, fontFamily: CLAY.font }}
                >
                    Cancel
                </button>
                <button
                    onClick={submit}
                    disabled={!name.trim()}
                    style={{
                        fontSize: 12, padding: '5px 12px', borderRadius: 12, border: 'none',
                        background: name.trim() ? CLAY.surfaceChip : CLAY.surface,
                        color: name.trim() ? CLAY.accentText : CLAY.textPlaceholder,
                        fontWeight: 500, fontFamily: CLAY.font,
                        cursor: name.trim() ? 'pointer' : 'default'
                    }}
                >
                    Save
                </button>
            </div>
        </div>
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
                aria-expanded={open}
                aria-label="Views"
                className={cn(menuButton, "px-2.5 sm:px-3", open ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100")}
            >
                <Camera size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Views</span>
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
                            background: CLAY.surface, border: `1px solid ${CLAY.border}`, borderRadius: 16, minWidth: 200, boxShadow: CLAY.shadow,
                            maxHeight: Math.min(PANEL_EST_HEIGHT, (openDown ? spaceBelow : spaceAbove) - GAP - 8),
                            overflowY: 'auto',
                            zIndex: 9999,
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
                                        display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', minHeight: 40, fontSize: 14,
                                        border: 'none', background: 'transparent', cursor: 'pointer',
                                        color: CLAY.textPrimary, borderRadius: 10, fontFamily: CLAY.font,
                                        transition: 'background 160ms ease, box-shadow 160ms ease',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = CLAY.surfaceChip }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                                >
                                    {v.label}
                                </button>
                            ))}

                            {(fp.savedViews ?? []).length > 0 && (
                                <>
                                    <div style={{ height: 1, background: CLAY.border, margin: '6px 2px' }} />
                                    {fp.savedViews!.map(v => (
                                        <div key={v.id} style={{ display: 'flex', alignItems: 'center' }}>
                                            <button
                                                onClick={() => { scene3DRef.current?.flyTo(v); setOpen(false) }}
                                                style={{
                                                    flex: 1, textAlign: 'left', padding: '6px 12px', minHeight: 40, fontSize: 14,
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
                                                    color: CLAY.textPlaceholder, borderRadius: 12, fontFamily: CLAY.font,
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

                            <div style={{ height: 1, background: CLAY.border, margin: '6px 2px' }} />

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
                                        display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', minHeight: 40, fontSize: 14,
                                        fontWeight: 500, color: CLAY.accentText, border: 'none',
                                        background: saveRowHovered ? CLAY.surfaceChip : 'transparent',
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
