import { useRef, useState, useMemo, useEffect } from 'react'
import { SceneConfig, THEME } from '../workspace/FloorPlanEditor'
import { FloorPlanState } from '../workspace/lib/constants'
import { Scene3DHandle } from '../workspace/3DScene'
import { CameraView, getBuiltInViews } from '../workspace/lib/camera'
import { uid } from '@/lib/helpers'

// ---------------------------------------------------------------------------
// Persistence — reuses the same onSave(fp, sceneConfig) the editor's manual
// Save button already calls, so saved views land in the same DB column
// (floorplan_editor_state) that the loader actually reads back on mount.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Naming popover — replaces window.prompt()
// ---------------------------------------------------------------------------

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
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                    fontSize: 12, padding: '6px 8px', borderRadius: 6,
                    border: `1px solid ${THEME.border}`, outline: 'none'
                }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                    onClick={onCancel}
                    style={{ fontSize: 12, padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: THEME.textMuted }}
                >
                    Cancel
                </button>
                <button
                    onClick={submit}
                    disabled={!name.trim()}
                    style={{
                        fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none',
                        background: name.trim() ? THEME.accent : THEME.border,
                        color: '#fff', cursor: name.trim() ? 'pointer' : 'default'
                    }}
                >
                    Save
                </button>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main view-picker control
// ---------------------------------------------------------------------------

export function CameraViewPickerV2({
    fp,
    setFp,
    sceneConfig,
    pushHistory,
    onSave,
    scene3DRef,
    embedded = false,
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
     *  lives at the bottom of the viewport. */
    embedded?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [naming, setNaming] = useState(false)
    const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const builtInViews = useMemo(() => getBuiltInViews(fp), [fp.rooms, fp.lineNodes])
    const allViews = [...builtInViews, ...(fp.savedViews ?? [])]

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
        <div style={embedded ? { position: 'relative' } : { position: 'absolute', top: 10, right: 10, zIndex: 5 }}>
            <button
                onClick={() => { setOpen(o => !o); setNaming(false); setErrorMsg(null) }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: embedded ? '0 10px' : '6px 10px',
                    height: embedded ? 30 : undefined,
                    borderRadius: embedded ? 999 : 8,
                    border: embedded ? 'none' : `1px solid ${THEME.border}`,
                    background: embedded ? (open ? 'rgba(99,102,241,0.12)' : 'transparent') : THEME.bgPanel,
                    color: embedded ? (open ? THEME.accent : THEME.textMuted) : undefined,
                    cursor: 'pointer', fontSize: embedded ? 11 : 13, fontWeight: embedded ? 600 : undefined,
                }}
            >
                📷 Views
                {savingState === 'saving' && <span style={{ fontSize: 10, color: THEME.textMuted }}>saving…</span>}
            </button>

            {open && (
                <div style={embedded ? {
                    position: 'absolute', top: 40, right: 0,
                    background: THEME.bgPanel, border: `1px solid ${THEME.border}`, borderRadius: 8, minWidth: 190,
                    boxShadow: THEME.shadowLg,
                } : {
                    position: 'absolute', top: 32, right: 0, background: THEME.bgPanel,
                    border: `1px solid ${THEME.border}`, borderRadius: 8, minWidth: 190,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                }}>
                    <div style={{ padding: 6 }}>
                        {errorMsg && (
                            <div style={{
                                fontSize: 11, color: '#c0392b', background: '#fdecea',
                                borderRadius: 6, padding: '6px 8px', marginBottom: 6
                            }}>
                                {errorMsg}
                            </div>
                        )}
                        {builtInViews.map(v => (
                            <button
                                key={v.id}
                                onClick={() => { scene3DRef.current?.flyTo(v); setOpen(false) }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer' }}
                            >
                                {v.label}
                            </button>
                        ))}

                        {(fp.savedViews ?? []).length > 0 && (
                            <>
                                <div style={{ height: 1, background: THEME.border, margin: '4px 0' }} />
                                {fp.savedViews!.map(v => (
                                    <div key={v.id} style={{ display: 'flex', alignItems: 'center' }}>
                                        <button
                                            onClick={() => { scene3DRef.current?.flyTo(v); setOpen(false) }}
                                            style={{ flex: 1, textAlign: 'left', padding: '6px 8px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer' }}
                                        >
                                            {v.label}
                                        </button>
                                        <button
                                            onClick={() => deleteView(v.id)}
                                            title="Delete view"
                                            style={{ padding: '4px 8px', fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', color: THEME.textMuted }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}

                        <div style={{ height: 1, background: THEME.border, margin: '4px 0' }} />

                        {naming ? (
                            <SaveViewPopover
                                onConfirm={commitSave}
                                onCancel={() => setNaming(false)}
                            />
                        ) : (
                            <button
                                onClick={() => { setNaming(true); setErrorMsg(null) }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12, color: THEME.accent, border: 'none', background: 'transparent', cursor: 'pointer' }}
                            >
                                + Save current view
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}