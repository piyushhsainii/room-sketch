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
import { ChevronDown, Maximize, Minimize, Share2, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { editorMenuTheme, menuButton, menuRow, menuSurface } from './editor-menu-theme';
import { Scene3DHandle } from '../workspace/3DScene';
import { SaveAuthError, SavePromptError } from '@/lib/workspace/save-auth-error';


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
    onDiscardDraft?: () => void;
    saveAccess?: 'checking' | 'guest' | 'signed-in';
    onSignInToSave?: () => void;
    onSave?: (fp: FloorPlanState, sceneConfig: any) => void | Promise<void>;
    projectId?: string
    sceneRootRef?: React.RefObject<any>
    isDirty?: boolean

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

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = editorMenuTheme

function EditorButton({ onClick, children, disabled, danger, title }: {
    onClick?: () => void
    children: React.ReactNode
    disabled?: boolean
    danger?: boolean
    title?: string
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} title={title}
            className={cn(menuButton, 'border border-neutral-200 bg-white hover:bg-neutral-100', danger ? 'text-red-800' : 'text-neutral-800')}>
            {children}
        </button>
    )
}

/* ConfirmDialog — shared modal for destructive/unsaved-change confirmations
   (Clear floor plan, Close with unsaved changes). Renders via portal so it
   sits above everything else in the topbar, same z-index tier as the other
   portal menus. Backdrop click cancels unless a save/discard is in flight. */
function ConfirmDialog({
    title,
    message,
    confirmLabel,
    secondaryLabel,
    danger,
    busy,
    onConfirm,
    onSecondary,
    onCancel,
}: {
    title: string
    message: string
    confirmLabel: string
    secondaryLabel?: string
    danger?: boolean
    busy?: boolean
    onConfirm: () => void
    onSecondary?: () => void
    onCancel: () => void
}) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseDown={e => { if (e.target === e.currentTarget && !busy) onCancel() }}
        >
            <div className={menuSurface} role="dialog" aria-modal="true" aria-label={title}
                style={{
                    width: 'min(420px, calc(100vw - 32px))', padding: 24, fontFamily: CLAY.font,
                    animation: 'wsnavMenuIn 140ms ease-out',
                }}
            >
                <div style={{ fontSize: 16, fontWeight: 600, color: CLAY.textPrimary, marginBottom: 8 }}>
                    {title}
                </div>
                <div style={{ fontSize: 14, color: CLAY.textMuted, lineHeight: 1.5, marginBottom: 18 }}>
                    {message}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    <EditorButton onClick={onCancel} disabled={busy}>Cancel</EditorButton>
                    {secondaryLabel && onSecondary && (
                        <EditorButton onClick={onSecondary} disabled={busy}>{secondaryLabel}</EditorButton>
                    )}
                    <button type="button" onClick={onConfirm} disabled={busy}
                        className={cn(menuButton, "text-white focus-visible:outline-offset-2", danger ? "bg-red-800 hover:bg-red-900" : "bg-neutral-900 hover:bg-neutral-700")}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
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
    onDiscardDraft,
    saveAccess = 'signed-in',
    onSignInToSave,
    onSave,
    projectId,
    sceneRootRef,
    isDirty = true,
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
    const [saveError, setSaveError] = useState<{ message: string; needsSignIn: boolean } | null>(null)

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

    // ── NEW: Clear / Close confirmation state ──
    const [confirmClearOpen, setConfirmClearOpen] = useState(false)
    const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
    const [closeBusy, setCloseBusy] = useState<'save' | 'discard' | null>(null)

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

    const reportSaveError = (error: unknown) => {
        if (error instanceof SavePromptError) return
        const needsSignIn = error instanceof SaveAuthError
        if (!needsSignIn) console.error('[WorkspaceNav] save failed:', error)
        setSaveError({ message: error instanceof Error ? error.message : 'Save failed. Try again.', needsSignIn })
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
            reportSaveError(err)
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
            reportSaveError(err)
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
            reportSaveError(err)
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

    // NEW — Clear now always requires confirmation (destructive regardless
    // of dirty state). The actual wipe only happens from the dialog.
    const handleClearRequest = () => {
        setConfirmClearOpen(true)
    }

    const handleConfirmClear = () => {
        setFp(DEFAULT_FP)
        setSelectedId(null)
        setConfirmClearOpen(false)
    }

    const closeWorkspace = () => {
        if (onClose) onClose()
        else router.push(saveAccess === 'guest' ? '/' : '/dashboard')
    }

    // NEW — Close only interrupts with a dialog when there are unsaved
    // changes; otherwise it closes immediately like before.
    const handleCloseRequest = () => {
        if (isDirty) {
            setConfirmCloseOpen(true)
        } else {
            closeWorkspace()
        }
    }

    const handleConfirmSaveAndClose = async () => {
        setCloseBusy('save')
        setSaveError(null)
        try {
            await runSave()
            setConfirmCloseOpen(false)
            closeWorkspace()
        } catch (err) {
            reportSaveError(err)
            setConfirmCloseOpen(false)
        } finally {
            setCloseBusy(null)
        }
    }

    const handleDiscardAndClose = () => {
        setCloseBusy('discard')
        onDiscardDraft?.()
        setConfirmCloseOpen(false)
        closeWorkspace()
        setCloseBusy(null)
    }

    const isBusy = isSaving || pendingAction !== null

    const saveButtonLabel =
        pendingAction === 'save' || isSaving ? 'Saving…'
            : pendingAction === 'exit' ? 'Saving…'
                : pendingAction === 'export' ? 'Saving…'
                    : isSaved && !isDirty ? '✓ Saved'
                        : 'Save Floor Plan'

    return (
        <div
            className="ra-workspace-topbar"
            style={{
                height: 60, flexShrink: 0, background: CLAY.canvas,
                borderBottom: `1px solid ${CLAY.border}`,
                display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
                fontFamily: CLAY.font,
            }}
        >

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
            <label style={{ fontSize: 11, color: CLAY.textMuted, fontFamily: CLAY.font }}>Ceiling height</label>
            <input type="number" min={2} max={6} step={0.1} value={fp.roomHeight}
                onChange={e => setFp((p: any) => ({ ...p, roomHeight: parseFloat(e.target.value) || 2.7 }))}
                style={{
                    width: 56, height: 40, borderRadius: 12, border: `1px solid ${CLAY.border}`,
                    background: CLAY.surface, color: CLAY.textPrimary, fontSize: 14, textAlign: 'center',
                }} />
            <span style={{ fontSize: 11, color: CLAY.textPlaceholder }}>m</span>
            <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.08)' }} />
            <span style={{ fontSize: 11, color: CLAY.textMuted }}>{Math.round(zoom * 100)}%</span>
            <EditorButton onClick={() => setZoom(1)}>Reset zoom</EditorButton>
            <EditorButton onClick={handleClearRequest}>Clear</EditorButton>
            <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.08)' }} />
            <EditorButton onClick={() => void toggleFullscreen()}>
                {isFullscreen ? <Minimize size={16} aria-hidden="true" /> : <Maximize size={16} aria-hidden="true" />}
                {isFullscreen ? 'Exit' : 'Fullscreen'}
            </EditorButton>
            {onClose && <EditorButton onClick={handleCloseRequest} danger><X size={16} aria-hidden="true" />Close</EditorButton>}
            {projectId && (
                <EditorButton onClick={() => setShareDialogOpen(true)}>
                    <Share2 size={16} aria-hidden="true" />
                    Share
                </EditorButton>
            )}
            {/* CHANGED — single "Export" trigger replaces the old separate
                "Export Plan" and "Export Models" buttons. The dropdown below
                sections both sets of options under one menu instead of asking
                the user to guess which button has the format they want. */}
            {projectId && (
                <div ref={exportMenuRef} style={{ position: 'relative', display: 'inline-flex' }}>
                    <EditorButton
                        onClick={handleOpenExportMenu}
                        disabled={isBusy || modelExportBusy !== null}
                    >
                        {(pendingAction === 'export' || modelExportBusy) && <Spinner dark />}
                        <Download size={16} aria-hidden="true" />
                        {pendingAction === 'export' ? 'Saving…' : modelExportBusy ? modelExportBusy : 'Export'}
                    </EditorButton>
                </div>
            )}
            {exportMenuOpen && exportMenuAnchorRect && typeof document !== 'undefined' && createPortal(
                <div
                    ref={exportMenuPortalRef}
                    className={menuSurface}
                    style={{
                        position: 'fixed',
                        top: exportMenuAnchorRect.bottom + 8,
                        left: Math.max(8, exportMenuAnchorRect.right - 260),
                        width: 260,
                        overflow: 'hidden', zIndex: 5000,
                        fontFamily: CLAY.font,
                        animation: 'wsnavMenuIn 140ms ease-out',
                    }}
                >
                    <ExportMenuSection label="Plan document">
                        <ExportMenuCard
                            icon={
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

                    <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />

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
            {saveAccess === 'guest' && onSignInToSave && (
                <button type="button" onClick={onSignInToSave}
                    className={cn(menuButton, "bg-neutral-900 text-white hover:bg-neutral-700 focus-visible:outline-white")}>
                    Sign in to save
                </button>
            )}
            {onSave && saveAccess === 'signed-in' && (
                <div ref={saveMenuRef} style={{ position: 'relative', display: 'inline-flex' }}>
                    <button
                        onClick={handleSave}
                        disabled={isBusy || (!isDirty && isSaved)}
                        title={!isDirty && isSaved ? 'No changes to save' : undefined}
                        className={cn(menuButton, "rounded-l-xl rounded-r-none bg-neutral-900 text-white hover:bg-neutral-700 focus-visible:outline-white")}>
                        {isBusy && <Spinner />}
                        {saveButtonLabel}
                    </button>
                    <button
                        onClick={() => {
                            setSaveMenuAnchorRect(saveMenuRef.current?.getBoundingClientRect() ?? null)
                            setSaveMenuOpen(o => !o)
                        }}
                        disabled={isBusy}
                        aria-label="More save options" aria-expanded={saveMenuOpen}
                        className={cn(menuButton, "rounded-l-none rounded-r-xl border-l border-white/25 bg-neutral-900 px-2.5 text-white hover:bg-neutral-700 focus-visible:outline-white")}>
                        <ChevronDown size={16} aria-hidden="true" />
                    </button>
                </div>
            )}
            {saveAccess === 'signed-in' && saveMenuOpen && saveMenuAnchorRect && typeof document !== 'undefined' && createPortal(
                <div
                    ref={saveMenuPortalRef}
                    className={menuSurface}
                    style={{
                        position: 'fixed',
                        top: saveMenuAnchorRect.bottom + 6,
                        left: Math.max(8, saveMenuAnchorRect.right - 190),
                        minWidth: 190,
                        overflow: 'hidden', zIndex: 5000,
                        fontFamily: CLAY.font,
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
            {/* NEW — Clear confirmation */}
            {confirmClearOpen && typeof document !== 'undefined' && createPortal(
                <ConfirmDialog
                    title="Clear floor plan?"
                    message="This wipes everything on the current floor — walls, furniture, lights. This can't be undone."
                    confirmLabel="Clear everything"
                    danger
                    onCancel={() => setConfirmClearOpen(false)}
                    onConfirm={handleConfirmClear}
                />,
                document.body
            )}
            {/* NEW — Close confirmation, only shown when there are unsaved changes */}
            {confirmCloseOpen && typeof document !== 'undefined' && createPortal(
                <ConfirmDialog
                    title="Unsaved changes"
                    message={saveAccess === 'signed-in' ? "You have unsaved changes on this floor plan. Save before closing, or discard them?" : "Sign in to save this draft to your account, or discard your changes."}
                    confirmLabel={saveAccess === 'signed-in' ? (closeBusy === 'save' ? 'Saving…' : 'Save & close') : 'Sign in to save'}
                    secondaryLabel={closeBusy === 'discard' ? 'Closing…' : 'Discard & close'}
                    busy={closeBusy !== null}
                    onCancel={() => setConfirmCloseOpen(false)}
                    onSecondary={handleDiscardAndClose}
                    onConfirm={saveAccess === 'signed-in' ? handleConfirmSaveAndClose : () => {
                        setConfirmCloseOpen(false)
                        onSignInToSave?.()
                    }}
                />,
                document.body
            )}
            {pendingAction === 'export' && (
                <div style={{
                    position: 'fixed', top: 70, right: 16, zIndex: 9999,
                    background: '#2A2A2A', color: '#fff', fontSize: 11.5,
                    padding: '8px 14px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 8,
                    fontFamily: CLAY.font,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
                }}>
                    <Spinner light />
                    Saving before export…
                </div>
            )}
            {saveError && (
                <div role="alert" style={{
                    position: 'fixed', top: 70, right: 16, zIndex: 9999,
                    background: '#B3503F', color: '#fff', fontSize: 11.5,
                    padding: '10px 14px', borderRadius: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
                    maxWidth: 'min(460px, calc(100vw - 32px))',
                    fontFamily: CLAY.font,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
                }}>
                    <span>{saveError.message}</span>
                    {saveError.needsSignIn && (
                        <a href="/login" target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-3 py-1 font-medium text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                            Sign in (new tab)
                        </a>
                    )}
                    <button onClick={() => setSaveError(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }} aria-label="Dismiss">✕</button>
                </div>
            )}
            {modelExportError && (
                <div style={{
                    position: 'fixed', top: 70, right: 16, zIndex: 9999,
                    background: '#B3503F', color: '#fff', fontSize: 11.5,
                    padding: '8px 14px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 10,
                    fontFamily: CLAY.font,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
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
            className={cn(menuRow, "block w-full text-left text-neutral-700 hover:bg-neutral-100 disabled:opacity-50")}
            style={{ animation: "wsnavMenuItemIn 160ms ease-out both", animationDelay: `${delay}ms` }}
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
