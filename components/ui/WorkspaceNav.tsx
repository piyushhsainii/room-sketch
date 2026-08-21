import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { THEME } from '../workspace/FloorPlanEditor';
import { DEFAULT_FP, FloorPlanState } from '../workspace/lib/constants';
import { ShareDialog } from './ExportShareable';
import { useRouter } from 'next/navigation';
import { ExportPlanDialog } from '../workspace/export/ExportPlanDialog';
import { exportDXF } from '../workspace/lib/export/exportDxf';
import { exportGLTF, exportOBJ } from '../workspace/lib/export/exportgltfobj';
import { exportSVG } from '../workspace/lib/export/exportsvg';
import FloorSwitcher from './FloorSwitcherUI';
import { Floor } from '../workspace/lib/floor-data';
import { ExportMenuCard, ExportMenuSection, FormatIcon } from './MenuCard';
import { Scene3DHandle } from '../workspace/3DScene';


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
    sceneRootRef?: React.RefObject<any>
    lastSavedSnapshot?: { fp: FloorPlanState; sceneConfig: any } | null

    floors: Floor[]
    activeFloorId: string
    viewMode: 'single' | 'stacked' | 'stacked-full'
    showUnderlay: boolean
    onSelectFloor: (floorId: string) => void
    onAddFloor: (direction: "above" | "below") => void
    onToggleFloorVisible: (floorId: string) => void
    onRenameFloor: (floorId: string, newLabel: string) => void
    onDeleteFloor: (floorId: string) => void
    onReorderFloors: (newFloors: Floor[]) => void
    onSetViewMode: (mode: "single" | "stacked" | "stacked-full") => void
    onSetShowUnderlay: (value: boolean) => void

    // NEW — for 3D snapshot export
    scene3DRef: React.RefObject<Scene3DHandle | null>
}



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

type ModelExportFormat = 'gltf' | 'obj' | 'dxf' | 'svg'

const MODEL_EXPORT_FORMATS: { format: ModelExportFormat; label: string; sub: string }[] = [
    { format: 'gltf', label: 'glTF (.glb)', sub: '3D model' },
    { format: 'obj', label: 'OBJ', sub: '3D model' },
    { format: 'dxf', label: 'DXF', sub: '2D CAD' },
    { format: 'svg', label: 'SVG', sub: '2D vector' },
]

// Cheap structural-equality check for the dirty flag. fp/sceneConfig are
// plain JSON-able state in this app (see FloorPlanState usage elsewhere),
// so JSON.stringify is sufficient and avoids pulling in a deep-equal dep
// for what's a periodic, non-hot-path comparison.
function snapshotsEqual(a: { fp: FloorPlanState; sceneConfig: any } | null | undefined, fp: FloorPlanState, sceneConfig: any) {
    if (!a) return false
    try {
        return JSON.stringify(a.fp) === JSON.stringify(fp) && JSON.stringify(a.sceneConfig) === JSON.stringify(sceneConfig)
    } catch {
        return false
    }
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
    sceneRootRef,
    lastSavedSnapshot,
    floors,
    activeFloorId,
    viewMode,
    onSelectFloor,
    onAddFloor,
    onToggleFloorVisible,
    onRenameFloor,
    onSetViewMode,
    scene3DRef,
    onSetShowUnderlay,
    showUnderlay,
    onDeleteFloor,
    onReorderFloors
}: WorkspaceNavProps) => {

    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const [exportPlanOpen, setExportPlanOpen] = useState(false)
    const [saveMenuOpen, setSaveMenuOpen] = useState(false)
    const saveMenuRef = useRef<HTMLDivElement>(null)
    const [saveMenuAnchorRect, setSaveMenuAnchorRect] = useState<DOMRect | null>(null)
    const router = useRouter()

    const [pendingAction, setPendingAction] = useState<'save' | 'exit' | 'export' | 'modelExport' | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)

    // ── Unified Export menu (was two separate buttons: "Export Plan" and
    // "Export Models"). One trigger now, one dropdown, sectioned by output
    // type — Image/PDF entries open the existing ExportPlanDialog, and
    // 3D/2D model formats run the direct exporters, same as before.
    const [exportMenuOpen, setExportMenuOpen] = useState(false)
    const exportMenuRef = useRef<HTMLDivElement>(null)
    const exportMenuPortalRef = useRef<HTMLDivElement>(null)
    const [exportMenuAnchorRect, setExportMenuAnchorRect] = useState<DOMRect | null>(null)
    const [modelExportBusy, setModelExportBusy] = useState<string | null>(null)
    const [modelExportError, setModelExportError] = useState<string | null>(null)

    const saveMenuPortalRef = useRef<HTMLDivElement>(null)

    const switchFloorForExport = useCallback((floorId: string): Promise<void> => {
        onSelectFloor(floorId)
        return new Promise<void>(resolve => {
            let remaining = 3
            const step = () => {
                remaining -= 1
                if (remaining <= 0) resolve()
                else requestAnimationFrame(step)
            }
            requestAnimationFrame(step)
        })
    }, [onSelectFloor])

    const setViewModeForExport = useCallback((mode: 'single' | 'stacked' | 'stacked-full'): Promise<void> => {
        onSetViewMode(mode)
        return new Promise<void>(resolve => {
            let remaining = 3
            const step = () => { remaining -= 1; if (remaining <= 0) resolve(); else requestAnimationFrame(step) }
            requestAnimationFrame(step)
        })
    }, [onSetViewMode])

    const setShowUnderlayForExport = useCallback((value: boolean): Promise<void> => {
        onSetShowUnderlay(value)
        return new Promise<void>(resolve => {
            let remaining = 2
            const step = () => { remaining -= 1; if (remaining <= 0) resolve(); else requestAnimationFrame(step) }
            requestAnimationFrame(step)
        })
    }, [onSetShowUnderlay])

    const isDirty = lastSavedSnapshot === undefined
        ? true
        : !snapshotsEqual(lastSavedSnapshot, fp, sceneConfig)

    useEffect(() => { ensureMenuAnimationStyle() }, [])

    useEffect(() => {
        if (!saveMenuOpen) return
        function handleClick(e: MouseEvent) {
            const target = e.target as Node
            const insideAnchor = saveMenuRef.current?.contains(target)
            const insidePortal = saveMenuPortalRef.current?.contains(target)
            if (!insideAnchor && !insidePortal) setSaveMenuOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [saveMenuOpen])

    useEffect(() => {
        if (!exportMenuOpen) return
        function handleClick(e: MouseEvent) {
            const target = e.target as Node
            const insideAnchor = exportMenuRef.current?.contains(target)
            const insidePortal = exportMenuPortalRef.current?.contains(target)
            if (!insideAnchor && !insidePortal) setExportMenuOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [exportMenuOpen])

    const runSave = async () => {

        await Promise.resolve(onSave?.(fp, sceneConfig))
    }

    // NEW — every save entry point now short-circuits when nothing changed.
    // "Save & Exit" still exits immediately (no point blocking navigation),
    // and "Save & Export" still opens the export dialog immediately — only
    // the actual network/onSave call is skipped.
    const handleSave = async () => {
        setSaveMenuOpen(false)
        if (!isDirty) return
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
        if (!isDirty) {
            onClose?.()
            return
        }
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

    // NEW — single entry point for opening the unified Export menu. Saves
    // first only if there are unsaved changes (same dirty-check as above),
    // then opens the dropdown either way.
    const handleOpenExportMenu = async () => {
        setExportMenuAnchorRect(exportMenuRef.current?.getBoundingClientRect() ?? null)
        if (!isDirty) {
            setExportMenuOpen(true)
            return
        }
        setPendingAction('export')
        setSaveError(null)
        try {
            await runSave()
            setExportMenuOpen(true)
        } catch (err) {
            console.error('[WorkspaceNav] save before export failed:', err)
            setSaveError('Save failed — export not opened. Try again.')
        } finally {
            setPendingAction(null)
        }
    }

    const handlePickModelFormat = async (format: ModelExportFormat) => {
        setExportMenuOpen(false)
        setModelExportError(null)
        try {
            if (format === 'gltf') {
                if (!sceneRootRef?.current) throw new Error('3D scene not ready yet')
                setModelExportBusy('Exporting glTF…')
                await exportGLTF(sceneRootRef.current, 'floor-plan.glb', (stage, pct) =>
                    setModelExportBusy(`${stage} (${pct}%)`))
            } else if (format === 'obj') {
                if (!sceneRootRef?.current) throw new Error('3D scene not ready yet')
                setModelExportBusy('Exporting OBJ…')
                exportOBJ(sceneRootRef.current, 'floor-plan.obj', (stage, pct) =>
                    setModelExportBusy(`${stage} (${pct}%)`))
            } else if (format === 'dxf') {
                setModelExportBusy('Exporting DXF…')
                exportDXF(fp, 'floor-plan.dxf')
            } else if (format === 'svg') {
                setModelExportBusy('Exporting SVG…')
                exportSVG(fp, 'floor-plan.svg')
            }
        } catch (err) {
            console.error('[WorkspaceNav] model export failed:', err)
            setModelExportError(`Export failed: ${(err as Error).message}`)
        } finally {
            setModelExportBusy(null)
        }
    }

    const handleOpenExportPlanDialog = () => {
        setExportMenuOpen(false)
        setExportPlanOpen(true)
    }

    const isBusy = isSaving || pendingAction !== null

    const saveButtonLabel =
        pendingAction === 'save' || isSaving ? 'Saving…'
            : pendingAction === 'exit' ? 'Saving…'
                : pendingAction === 'export' ? 'Saving…'
                    : isSaved && !isDirty ? '✓ Saved'
                        : 'Save Floor Plan'

    return (
        <div style={{ height: 52, flexShrink: 0, background: THEME.bgPanel, borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, boxShadow: THEME.shadow }}>
            <FloorSwitcher
                floors={floors}
                activeFloorId={activeFloorId}
                viewMode={viewMode}
                onSelectFloor={onSelectFloor}
                onAddFloor={onAddFloor}
                onToggleFloorVisible={onToggleFloorVisible}
                onRenameFloor={onRenameFloor}
                onDeleteFloor={onDeleteFloor}
                onReorderFloors={onReorderFloors}
                onSetViewMode={onSetViewMode}
            />
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
            {/* CHANGED — single "Export" trigger replaces the old separate
                "Export Plan" and "Export Models" buttons. The dropdown below
                sections both sets of options under one menu instead of asking
                the user to guess which button has the format they want. */}
            {projectId && (
                <div ref={exportMenuRef} style={{ position: 'relative', display: 'inline-flex' }}>
                    <button
                        onClick={handleOpenExportMenu}
                        disabled={isBusy || modelExportBusy !== null}
                        style={{
                            height: 30, padding: '0 12px', borderRadius: 7,
                            border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA',
                            color: THEME.textMuted, fontSize: 11,
                            cursor: (isBusy || modelExportBusy !== null) ? 'not-allowed' : 'pointer',
                            opacity: (isBusy || modelExportBusy !== null) ? 0.6 : 1,
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}
                    >
                        {(pendingAction === 'export' || modelExportBusy) && <Spinner dark />}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 15V3M12 15l-4-4M12 15l4-4" />
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        </svg>
                        {pendingAction === 'export' ? 'Saving…' : modelExportBusy ? modelExportBusy : 'Export'}
                    </button>
                </div>
            )}
            {exportMenuOpen && exportMenuAnchorRect && typeof document !== 'undefined' && createPortal(
                <div
                    ref={exportMenuPortalRef}
                    style={{
                        position: 'fixed',
                        top: exportMenuAnchorRect.bottom + 8,
                        left: exportMenuAnchorRect.right - 260,
                        width: 260,
                        background: '#FFFFFF', borderRadius: 12,
                        border: `1px solid ${THEME.border}`,
                        boxShadow: THEME.shadowLg,
                        overflow: 'hidden', zIndex: 5000,
                        animation: 'wsnavMenuIn 140ms ease-out',
                    }}
                >
                    <ExportMenuSection label="Plan document">
                        <ExportMenuCard
                            icon={
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M8 12h8M8 16h5M8 8h3" />
                                </svg>
                            }
                            label="Export Plan…"
                            sub="SVG, PNG, PDF · pick floors, format & layers"
                            onClick={handleOpenExportPlanDialog}
                            delay={0}
                            highlight
                        />
                    </ExportMenuSection>

                    <div style={{ height: 1, background: THEME.border, margin: '2px 0' }} />

                    <ExportMenuSection label="3D / 2D model files">
                        {MODEL_EXPORT_FORMATS.map((opt, i) => (
                            <ExportMenuCard
                                key={opt.format}
                                icon={<FormatIcon format={opt.format} />}
                                label={opt.label}
                                sub={opt.sub}
                                onClick={() => handlePickModelFormat(opt.format)}
                                delay={60 + i * 40}
                            />
                        ))}
                    </ExportMenuSection>
                </div>,
                document.body
            )}
            {onSave && (
                <div ref={saveMenuRef} style={{ position: 'relative', display: 'inline-flex' }}>
                    <button
                        onClick={handleSave}
                        disabled={isBusy || (!isDirty && isSaved)}
                        title={!isDirty && isSaved ? 'No changes to save' : undefined}
                        style={{
                            height: 32,
                            padding: '0 14px', borderRadius: '8px 0 0 8px', border: 'none',
                            background: isBusy ? '#C9BBA0' : (isSaved && !isDirty) ? '#10B981' : (THEME as any).beige ?? '#D8C7A1',
                            color: '#3A2E1F', fontSize: 12, fontWeight: 700,
                            cursor: (isBusy || (!isDirty && isSaved)) ? 'not-allowed' : 'pointer',
                            opacity: (!isDirty && isSaved) ? 0.85 : 1,
                            transition: 'background 200ms',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                        {isBusy && <Spinner dark />}
                        {saveButtonLabel}
                    </button>
                    <button
                        onClick={() => {
                            setSaveMenuAnchorRect(saveMenuRef.current?.getBoundingClientRect() ?? null)
                            setSaveMenuOpen(o => !o)
                        }}
                        disabled={isBusy}
                        aria-label="More save options"
                        style={{
                            height: 32, width: 26, borderRadius: '0 8px 8px 0', border: 'none',
                            borderLeft: '1px solid rgba(58,46,31,0.25)',
                            background: isBusy ? '#C9BBA0' : (isSaved && !isDirty) ? '#10B981' : (THEME as any).beige ?? '#D8C7A1',
                            color: '#3A2E1F', cursor: isBusy ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>
                </div>
            )}
            {saveMenuOpen && saveMenuAnchorRect && typeof document !== 'undefined' && createPortal(
                <div
                    ref={saveMenuPortalRef}
                    style={{
                        position: 'fixed',
                        top: saveMenuAnchorRect.bottom + 6,
                        left: saveMenuAnchorRect.right - 190,
                        minWidth: 190,
                        background: '#FFFFFF', borderRadius: 8,
                        border: `1px solid ${THEME.borderStrong}`,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                        overflow: 'hidden', zIndex: 5000,
                        animation: 'wsnavMenuIn 140ms ease-out',
                    }}
                >
                    <MenuItem label="Save" sub={!isDirty ? 'No changes' : undefined} onClick={handleSave} disabled={isBusy || !isDirty} delay={0} />
                    <MenuItem label="Save & Exit" onClick={handleSaveAndExit} disabled={isBusy} delay={40} />
                    <MenuItem label="Export…" onClick={handleOpenExportMenu} disabled={isBusy} delay={80} />
                </div>,
                document.body
            )}
            {shareDialogOpen && projectId && (
                <ShareDialog projectId={projectId} onClose={() => setShareDialogOpen(false)} />
            )}
            {exportPlanOpen && projectId && (
                <ExportPlanDialog
                    fp={fp}
                    sceneConfig={sceneConfig}
                    projectId={projectId}
                    floors={floors}
                    activeFloorId={activeFloorId}
                    onClose={() => setExportPlanOpen(false)}
                    onOpenShare={() => { setExportPlanOpen(false); setShareDialogOpen(true) }}
                    scene3DRef={scene3DRef}
                    onSwitchFloorForExport={switchFloorForExport}
                    viewMode={viewMode}
                    showUnderlay={showUnderlay}
                    onSetViewModeForExport={setViewModeForExport}
                    onSetShowUnderlayForExport={setShowUnderlayForExport}
                />
            )}
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
            {saveError && (
                <div style={{
                    position: 'fixed', top: 62, right: 16, zIndex: 9999,
                    background: '#DC2626', color: '#fff', fontSize: 11.5,
                    padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                }}>
                    {saveError}
                    <button onClick={() => setSaveError(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }} aria-label="Dismiss">✕</button>
                </div>
            )}
            {modelExportError && (
                <div style={{
                    position: 'fixed', top: 62, right: 16, zIndex: 9999,
                    background: '#DC2626', color: '#fff', fontSize: 11.5,
                    padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                }}>
                    {modelExportError}
                    <button onClick={() => setModelExportError(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }} aria-label="Dismiss">✕</button>
                </div>
            )}
        </div>
    )
}

function Spinner({ light, dark }: { light?: boolean; dark?: boolean }) {
    const stroke = dark ? THEME.textMuted : '#fff'
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="9" fill="none" stroke={dark ? 'rgba(100,116,139,0.25)' : (light ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.3)')} strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
}

function MenuSectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ padding: '8px 14px 4px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: THEME.textFaint }}>
            {children}
        </div>
    )
}

function MenuItem({ label, sub, onClick, disabled, delay }: { label: string; sub?: string; onClick: () => void; disabled?: boolean; delay: number }) {
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
                animationDelay: `${delay}ms`,
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#F3F4F6' }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
            <div style={{ fontWeight: 600 }}>{label}</div>
            {sub && <div style={{ fontSize: 10.5, color: THEME.textMuted, marginTop: 1 }}>{sub}</div>}
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