import React, { useState, useRef, useEffect } from 'react'
import { THEME } from '../workspace/FloorPlanEditor';
import { DEFAULT_FP, FloorPlanState } from '../workspace/lib/constants';
import { ShareDialog } from './ExportShareable';
import { useRouter } from 'next/navigation';
import { ExportPlanDialog } from '../workspace/export/ExportPlanDialog';

interface WorkspaceNavProps {
    fp: FloorPlanState;
    setFp: React.Dispatch<React.SetStateAction<any>>;
    zoom: number;
    setZoom: (zoom: number) => void;
    setSelectedId: (id: string | null) => void;
    isFullscreen: boolean;
    toggleFullscreen: () => void | Promise<void>;
    sceneConfig: any;
    isSaving?: boolean;
    isSaved?: boolean;
    onClose?: () => void;
    onSave?: (fp: FloorPlanState, sceneConfig: any) => void | Promise<void>;
    projectId?: string
}

// Injected once so the staggered dropdown-item animation is available without
// pulling in a CSS-in-JS lib — safe to call repeatedly, browsers dedupe
// identical <style> text but we still only want one node.
function ensureMenuAnimationStyle() {
    if (document.getElementById('wsnav-menu-anim')) return
    const style = document.createElement('style')
    style.id = 'wsnav-menu-anim'
    style.textContent = `
        @keyframes wsnavMenuItemIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wsnavMenuIn {
            from { opacity: 0; transform: scale(0.97) translateY(-4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
    `
    document.head.appendChild(style)
}

const WorkspaceNav = ({
    fp,
    setFp,
    zoom,
    setZoom,
    setSelectedId,
    isFullscreen,
    toggleFullscreen,
    sceneConfig,
    isSaving = false,
    isSaved = false,
    onClose,
    onSave,
    projectId,
}: WorkspaceNavProps) => {

    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const [exportPlanOpen, setExportPlanOpen] = useState(false)
    const [saveMenuOpen, setSaveMenuOpen] = useState(false)
    const saveMenuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // NEW — per-action loading states, separate from the parent-controlled
    // isSaving/isSaved so "Save & Exit" and "Save & Export" can each show
    // their own progress text instead of a single ambiguous spinner.
    const [pendingAction, setPendingAction] = useState<'save' | 'exit' | 'export' | null>(null)

    // NEW — surfaces a failed save instead of silently doing nothing. Before
    // this, a thrown save error meant "Save & Export" would never reach
    // setExportPlanOpen(true) and nothing visible happened at all.
    const [saveError, setSaveError] = useState<string | null>(null)

    useEffect(() => { ensureMenuAnimationStyle() }, [])

    useEffect(() => {
        if (!saveMenuOpen) return
        function handleClick(e: MouseEvent) {
            if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
                setSaveMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [saveMenuOpen])

    // Normalizes onSave into an awaitable call regardless of whether the
    // parent's implementation is sync or async, so every action below can
    // reliably wait for it to settle before moving on.
    const runSave = async () => {
        await Promise.resolve(onSave?.(fp, sceneConfig))
    }

    const handleSave = async () => {
        setSaveMenuOpen(false)
        setPendingAction('save')
        setSaveError(null)
        try {
            await runSave()
        } catch (err) {
            console.error('[WorkspaceNav] save failed:', err)
            setSaveError('Save failed. Try again.')
        } finally {
            setPendingAction(null)
        }
    }

    const handleSaveAndExit = async () => {
        setSaveMenuOpen(false)
        setPendingAction('exit')
        setSaveError(null)
        try {
            await runSave()
            onClose?.()
        } catch (err) {
            console.error('[WorkspaceNav] save before exit failed:', err)
            setSaveError('Save failed — did not exit. Try again.')
        } finally {
            setPendingAction(null)
        }
    }

    const handleSaveAndExport = async () => {
        setSaveMenuOpen(false)
        setPendingAction('export')
        setSaveError(null)
        try {
            await runSave()
            setExportPlanOpen(true)
        } catch (err) {
            console.error('[WorkspaceNav] save before export failed:', err)
            setSaveError('Save failed — export not opened. Try again.')
        } finally {
            setPendingAction(null)
        }
    }

    const isBusy = isSaving || pendingAction !== null

    const saveButtonLabel =
        pendingAction === 'save' || isSaving ? 'Saving…'
            : pendingAction === 'exit' ? 'Saving…'
                : pendingAction === 'export' ? 'Saving…'
                    : isSaved ? '✓ Saved'
                        : 'Save Floor Plan'

    return (
        <div style={{ height: 52, flexShrink: 0, background: THEME.bgPanel, borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, boxShadow: THEME.shadow }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text, letterSpacing: '0.02em' }}>Ground Floor</span>
            <div style={{ flex: 1 }} />
            <label style={{ fontSize: 11, color: THEME.textMuted }}>Ceiling height</label>
            <input type="number" min={2} max={6} step={0.1} value={fp.roomHeight}
                onChange={e => setFp((p: any) => ({ ...p, roomHeight: parseFloat(e.target.value) || 2.7 }))}
                style={{ width: 56, height: 30, borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA', color: THEME.text, fontSize: 12, textAlign: 'center', outline: 'none' }} />
            <span style={{ fontSize: 11, color: THEME.textFaint }}>m</span>
            <div style={{ width: 1, height: 24, background: THEME.border }} />
            <span style={{ fontSize: 11, color: THEME.textMuted }}>{Math.round(zoom * 100)}%</span>
            <Btn onClick={() => setZoom(1)}>Reset zoom</Btn>
            <Btn onClick={() => { setFp(DEFAULT_FP); setSelectedId(null) }}>Clear</Btn>
            <div style={{ width: 1, height: 24, background: THEME.border }} />
            <button onClick={() => void toggleFullscreen()} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA', color: THEME.textMuted, fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {isFullscreen
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" /></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>}
                {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
            {onClose && <Btn onClick={() => router.push('/dashboard')} danger>✕ Close</Btn>}
            {projectId && (
                <button
                    onClick={() => setShareDialogOpen(true)}
                    style={{
                        height: 30, padding: '0 12px', borderRadius: 7,
                        border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA',
                        color: THEME.textMuted, fontSize: 11, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" /><line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
                    </svg>
                    Share
                </button>
            )}
            {projectId && (
                <button
                    onClick={() => setExportPlanOpen(true)}
                    style={{
                        height: 30, padding: '0 12px', borderRadius: 7,
                        border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA',
                        color: THEME.textMuted, fontSize: 11, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 15V3M12 15l-4-4M12 15l4-4" />
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    </svg>
                    Export Plan
                </button>
            )}
            {onSave && (
                <div ref={saveMenuRef} style={{ position: 'relative', display: 'inline-flex', zIndex: 100 /* NEW — keeps the anchor + its menu above ordinary nav siblings */ }}>
                    <button
                        onClick={handleSave}
                        disabled={isBusy}
                        style={{
                            height: 32,
                            padding: '0 14px', borderRadius: '8px 0 0 8px', border: 'none',
                            background: isBusy ? '#A5A6F5' : isSaved ? '#10B981' : THEME.accent,
                            color: 'white', fontSize: 12, fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer', transition: 'background 200ms',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                        {isBusy && <Spinner />}
                        {saveButtonLabel}
                    </button>
                    <button
                        onClick={() => setSaveMenuOpen(o => !o)}
                        disabled={isBusy}
                        aria-label="More save options"
                        style={{
                            height: 32, width: 26, borderRadius: '0 8px 8px 0', border: 'none',
                            borderLeft: '1px solid rgba(255,255,255,0.25)',
                            background: isBusy ? '#A5A6F5' : isSaved ? '#10B981' : THEME.accent,
                            color: 'white', cursor: isBusy ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>
                    {saveMenuOpen && (
                        // NEW — zIndex raised to 9999 and given its own stacking
                        // context via position:absolute + explicit z-index on this
                        // wrapper (100 above) so it can't end up behind canvas/3D
                        // viewport layers that commonly sit at high z-index values.
                        <div style={{
                            position: 'absolute', top: 38, right: 0, minWidth: 190,
                            background: '#FFFFFF', borderRadius: 8,
                            border: `1px solid ${THEME.borderStrong}`,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                            overflow: 'hidden', zIndex: 9999,
                            animation: 'wsnavMenuIn 140ms ease-out',
                        }}>
                            <MenuItem label="Save" onClick={handleSave} disabled={isBusy} delay={0} />
                            <MenuItem label="Save & Exit" onClick={handleSaveAndExit} disabled={isBusy} delay={40} />
                            <MenuItem label="Save & Export…" onClick={handleSaveAndExport} disabled={isBusy} delay={80} />
                        </div>
                    )}
                </div>
            )}
            {shareDialogOpen && projectId && (
                <ShareDialog projectId={projectId} onClose={() => setShareDialogOpen(false)} />
            )}
            {exportPlanOpen && projectId && (
                <ExportPlanDialog
                    fp={fp}
                    sceneConfig={sceneConfig}
                    projectId={projectId}
                    onClose={() => setExportPlanOpen(false)}
                    onOpenShare={() => { setExportPlanOpen(false); setShareDialogOpen(true) }}
                />
            )}
            {/* NEW — visible confirmation that "Save & Export"/"Save & Exit" is
                doing something, even before the export modal itself paints, so
                a slow save no longer looks like the click did nothing. */}
            {pendingAction === 'export' && (
                <div style={{
                    position: 'fixed', top: 62, right: 16, zIndex: 9999,
                    background: '#111827', color: '#fff', fontSize: 11.5,
                    padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                }}>
                    <Spinner light />
                    Saving before export…
                </div>
            )}
            {/* NEW — surfaces save failures that used to fail silently (no
                modal, no export, no visible error). Auto-dismiss keeps it from
                lingering forever if the user just moves on. */}
            {saveError && (
                <div style={{
                    position: 'fixed', top: 62, right: 16, zIndex: 9999,
                    background: '#DC2626', color: '#fff', fontSize: 11.5,
                    padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                }}>
                    {saveError}
                    <button
                        onClick={() => setSaveError(null)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}
                        aria-label="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    )
}

function Spinner({ light }: { light?: boolean }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="9" fill="none" stroke={light ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.3)'} strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke={light ? '#fff' : '#fff'} strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
}

function MenuItem({ label, onClick, disabled, delay }: { label: string; onClick: () => void; disabled?: boolean; delay: number }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', border: 'none', background: 'transparent',
                fontSize: 12.5, color: '#111827', cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                animation: `wsnavMenuItemIn 160ms ease-out both`,
                animationDelay: `${delay}ms`, // NEW — staggered entrance per item
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#F3F4F6' }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
            {label}
        </button>
    )
}

function Btn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
    return (
        <button onClick={onClick} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(148,163,184,0.15)'}`, background: 'transparent', color: danger ? 'rgba(248,113,113,0.8)' : 'rgba(148,163,184,0.7)', fontSize: 11, cursor: 'pointer' }}>
            {children}
        </button>
    )
}

export default WorkspaceNav