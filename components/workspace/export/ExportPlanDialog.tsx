// components/workspace/export/ExportPlanDialog.tsx
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { THEME } from '../FloorPlanEditor'
import { FloorPlanState } from '../lib/constants'
import { Floor } from '../lib/floor-data'
import { CameraView, getBuiltInViews } from '../lib/camera'
import { Scene3DHandle } from '../3DScene'
import { PrintableFloorPlan2D, PRINT_SCALES, PrintScale, pickAutoScale } from './PrintableFloorPlan2D'

interface Props {
    fp: FloorPlanState
    sceneConfig: any
    projectId: string
    floors: Floor[]
    activeFloorId: string
    onClose: () => void
    onOpenShare: () => void
    scene3DRef: React.RefObject<Scene3DHandle | null>
    onSwitchFloorForExport: (floorId: string) => Promise<void>
}

type ExportFormat = 'svg' | 'png' | 'pdf'

const FORMATS: { value: ExportFormat; label: string; sub: string }[] = [
    { value: 'svg', label: 'SVG', sub: 'Vector, editable' },
    { value: 'png', label: 'PNG', sub: 'Raster image' },
    { value: 'pdf', label: 'PDF', sub: 'Printable document' },
]

const PNG_DPI_MULTIPLIER = 3
const RENDER_TIMEOUT_MS = 4000

const viewKey = (floorId: string, viewId: string) => `${floorId}:${viewId}`
const safeName = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

type CapturedSnap = { floorId: string; floorLabel: string; viewId: string; viewLabel: string; blob: Blob; url: string }

export function ExportPlanDialog({
    fp, projectId, floors, activeFloorId, onClose, onOpenShare,
    scene3DRef, onSwitchFloorForExport,
}: Props) {
    const [format, setFormat] = useState<ExportFormat>('svg')
    const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter'>('A4')
    const [scaleMode, setScaleMode] = useState<'auto' | PrintScale>('auto')
    const [showFurniture, setShowFurniture] = useState(true)
    const [showLabels, setShowLabels] = useState(true)
    const [selectedFloorIds, setSelectedFloorIds] = useState<Set<string>>(new Set([activeFloorId]))
    const [busy, setBusy] = useState(false)
    const [busyKey, setBusyKey] = useState<string | null>(null) // which specific button/row is busy, for per-row spinners
    const [busyLabel, setBusyLabel] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [tab, setTab] = useState<'2d' | '3d'>('2d')

    // ── 3D snapshot state ──
    // Views are opt-OUT (default all included) — set holds EXCLUDED
    // "floorId:viewId" keys, so newly-added saved views show up already
    // checked without needing to backfill defaults.
    const [excludedViewKeys, setExcludedViewKeys] = useState<Set<string>>(new Set())
    // Per-(floor,view) captured snapshots, keyed by viewKey — persists across
    // re-renders so already-captured thumbnails stay visible while others
    // are still capturing, and survive switching the 2D/3D tab back and forth.
    const [captured, setCaptured] = useState<Map<string, CapturedSnap>>(new Map())
    const [previewSnap, setPreviewSnap] = useState<CapturedSnap | null>(null)
    const [captureProgress, setCaptureProgress] = useState<{ done: number; total: number } | null>(null)

    const selectedFloors = floors
        .filter(f => selectedFloorIds.has(f.id))
        .map(f => ({ floor: f, state: f.id === activeFloorId ? fp : f.state }))

    const floorsWithViews = selectedFloors.map(({ floor, state }) => ({
        floor,
        state,
        views: [...getBuiltInViews(state), ...(state.savedViews ?? [])] as CameraView[],
    }))

    const toggleFloor = (id: string) => {
        setSelectedFloorIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }
    const selectAllFloors = () => setSelectedFloorIds(new Set(floors.map(f => f.id)))
    const selectCurrentOnly = () => setSelectedFloorIds(new Set([activeFloorId]))

    const toggleView = (floorId: string, viewId: string) => {
        setExcludedViewKeys(prev => {
            const key = viewKey(floorId, viewId)
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }
    const isViewIncluded = (floorId: string, viewId: string) => !excludedViewKeys.has(viewKey(floorId, viewId))

    const resolveScale = (state: FloorPlanState) =>
        scaleMode === 'auto' ? pickAutoScale(state, paperSize) : scaleMode

    // ═══════════════════════════════════════════════════════════════════
    // 2D render path (unchanged from prior fixes — render race, mirrored
    // text, openings symbols all live in PrintableFloorPlan2D itself)
    // ═══════════════════════════════════════════════════════════════════

    const waitForImages = async (svgEl: SVGSVGElement) => {
        const images = Array.from(svgEl.querySelectorAll('image'))
        await Promise.all(
            images.map(imgEl => {
                const href = imgEl.getAttribute('href') || imgEl.getAttribute('xlink:href')
                if (!href) return Promise.resolve()
                return new Promise<void>(resolve => {
                    const probe = new Image()
                    probe.onload = () => resolve()
                    probe.onerror = () => resolve()
                    probe.src = href
                    if (probe.complete) resolve()
                })
            })
        )
    }

    const renderOffscreenSvg = (state: FloorPlanState, floorLabel: string): Promise<SVGSVGElement | null> => {
        return new Promise((resolve, reject) => {
            const container = document.createElement('div')
            container.style.position = 'fixed'
            container.style.left = '-99999px'
            document.body.appendChild(container)
            const root = createRoot(container)
            const cleanup = () => { root.unmount(); document.body.removeChild(container) }

            try {
                flushSync(() => {
                    root.render(
                        <PrintableFloorPlan2D
                            fp={state}
                            scale={resolveScale(state)}
                            paperSize={paperSize}
                            floorLabel={floorLabel}
                            showFurniture={showFurniture}
                            showLabels={showLabels}
                        />
                    )
                })
            } catch (err) {
                cleanup(); reject(err); return
            }

            const startedAt = performance.now()
            const poll = () => {
                const svgEl = container.querySelector('svg') as SVGSVGElement | null
                if (svgEl) {
                    waitForImages(svgEl)
                        .then(() => { const clone = svgEl.cloneNode(true) as SVGSVGElement; cleanup(); resolve(clone) })
                        .catch(err => { cleanup(); reject(err) })
                    return
                }
                if (performance.now() - startedAt > RENDER_TIMEOUT_MS) { cleanup(); resolve(null); return }
                requestAnimationFrame(poll)
            }
            requestAnimationFrame(poll)
        })
    }

    const svgToBlob = (svgEl: SVGSVGElement) => {
        const serializer = new XMLSerializer()
        return new Blob([serializer.serializeToString(svgEl)], { type: 'image/svg+xml' })
    }

    const rasterize = (svgEl: SVGSVGElement): Promise<HTMLCanvasElement> => {
        return new Promise((resolve, reject) => {
            const widthMm = parseFloat(svgEl.getAttribute('width') || '297')
            const heightMm = parseFloat(svgEl.getAttribute('height') || '210')
            const pxPerMm = 3.7795275591 * PNG_DPI_MULTIPLIER
            const widthPx = Math.round(widthMm * pxPerMm)
            const heightPx = Math.round(heightMm * pxPerMm)
            const blob = svgToBlob(svgEl)
            const url = URL.createObjectURL(blob)
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = widthPx; canvas.height = heightPx
                const ctx = canvas.getContext('2d')!
                ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, widthPx, heightPx)
                ctx.drawImage(img, 0, 0, widthPx, heightPx)
                URL.revokeObjectURL(url); resolve(canvas)
            }
            img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
            img.src = url
        })
    }

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = filename; a.click()
        URL.revokeObjectURL(url)
    }

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

    const handleExport2D = async () => {
        if (selectedFloors.length === 0) { setError('Select at least one floor.'); return }
        setBusy(true); setBusyKey('export2d'); setError(null)
        try {
            if (format === 'svg') {
                for (let i = 0; i < selectedFloors.length; i++) {
                    const { floor, state } = selectedFloors[i]!
                    setBusyLabel(`Rendering ${floor.label} (${i + 1}/${selectedFloors.length})…`)
                    const svgEl = await renderOffscreenSvg(state, floor.label)
                    if (!svgEl) throw new Error(`Could not render ${floor.label}`)
                    downloadBlob(svgToBlob(svgEl), `floor-plan-${projectId}-${safeName(floor.label)}.svg`)
                    if (i < selectedFloors.length - 1) await wait(150)
                }
            } else if (format === 'png') {
                for (let i = 0; i < selectedFloors.length; i++) {
                    const { floor, state } = selectedFloors[i]!
                    setBusyLabel(`Rendering ${floor.label} (${i + 1}/${selectedFloors.length})…`)
                    const svgEl = await renderOffscreenSvg(state, floor.label)
                    if (!svgEl) throw new Error(`Could not render ${floor.label}`)
                    const canvas = await rasterize(svgEl)
                    await new Promise<void>(resolve => {
                        canvas.toBlob(b => { if (b) downloadBlob(b, `floor-plan-${projectId}-${safeName(floor.label)}.png`); resolve() }, 'image/png')
                    })
                    if (i < selectedFloors.length - 1) await wait(150)
                }
            } else if (format === 'pdf') {
                const { jsPDF } = await import('jspdf')
                let doc: any = null
                for (let i = 0; i < selectedFloors.length; i++) {
                    const { floor, state } = selectedFloors[i]!
                    setBusyLabel(`Rendering ${floor.label} (${i + 1}/${selectedFloors.length})…`)
                    const svgEl = await renderOffscreenSvg(state, floor.label)
                    if (!svgEl) throw new Error(`Could not render ${floor.label}`)
                    const canvas = await rasterize(svgEl)
                    const widthMm = parseFloat(svgEl.getAttribute('width') || '297')
                    const heightMm = parseFloat(svgEl.getAttribute('height') || '210')
                    const orientation = widthMm >= heightMm ? 'landscape' : 'portrait'
                    const imgData = canvas.toDataURL('image/jpeg', 0.95)
                    if (!doc) doc = new jsPDF({ orientation, unit: 'mm', format: [widthMm, heightMm] })
                    else doc.addPage([widthMm, heightMm], orientation)
                    doc.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm)
                    doc.setFontSize(7); doc.setTextColor(120)
                    doc.text(floor.label, 4, heightMm - 3)
                }
                doc.save(`floor-plan-${projectId}.pdf`)
            }
        } catch (err) {
            console.error('[ExportPlanDialog] 2D export failed:', err)
            setError('Export failed. Try again.')
        } finally {
            setBusy(false); setBusyKey(null); setBusyLabel('')
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3D snapshot path
    // ═══════════════════════════════════════════════════════════════════

    const waitFrames = (n: number) =>
        new Promise<void>(resolve => {
            let remaining = n
            const step = () => { remaining -= 1; if (remaining <= 0) resolve(); else requestAnimationFrame(step) }
            requestAnimationFrame(step)
        })

    // Captures ONE (floor, view) pair. Handles the floor-switch itself if
    // needed. Stores the result into `captured` (revoking any previous
    // blob URL for that same key first) and sets it as the live preview.
    const captureOne = async (floor: Floor, view: CameraView) => {
        const key = viewKey(floor.id, view.id)
        setBusyKey(key)
        setBusy(true)
        setError(null)
        const originalFloorId = activeFloorId
        try {
            if (floor.id !== activeFloorId) {
                setBusyLabel(`Switching to ${floor.label}…`)
                await onSwitchFloorForExport(floor.id)
                await waitFrames(2)
            }
            setBusyLabel(`Capturing ${floor.label} — ${view.label}…`)
            scene3DRef.current?.flyTo(view)
            await waitFrames(2)
            const blob = await scene3DRef.current?.captureSnapshot(view)
            if (blob) {
                const url = URL.createObjectURL(blob)
                const snap: CapturedSnap = { floorId: floor.id, floorLabel: floor.label, viewId: view.id, viewLabel: view.label, blob, url }
                setCaptured(prev => {
                    const next = new Map(prev)
                    const old = next.get(key)
                    if (old) URL.revokeObjectURL(old.url)
                    next.set(key, snap)
                    return next
                })
                setPreviewSnap(snap)
            } else {
                setError(`Could not capture ${floor.label} — ${view.label}.`)
            }
        } finally {
            if (originalFloorId !== activeFloorId) {
                await onSwitchFloorForExport(originalFloorId)
            }
            setBusy(false); setBusyKey(null); setBusyLabel('')
        }
    }

    const captureAllIncluded = async () => {
        const jobs = floorsWithViews.flatMap(({ floor, views }) =>
            views.filter(v => isViewIncluded(floor.id, v.id)).map(v => ({ floor, view: v }))
        )
        if (jobs.length === 0) { setError('No views selected to capture.'); return }

        setBusy(true); setBusyKey('captureAll'); setError(null)
        setCaptureProgress({ done: 0, total: jobs.length })
        const originalFloorId = activeFloorId

        try {
            let lastFloorId: string | null = null
            for (let i = 0; i < jobs.length; i++) {
                const { floor, view } = jobs[i]!
                if (floor.id !== lastFloorId) {
                    if (floor.id !== activeFloorId || lastFloorId !== null) {
                        setBusyLabel(`Switching to ${floor.label}…`)
                        await onSwitchFloorForExport(floor.id)
                        await waitFrames(2)
                    }
                    lastFloorId = floor.id
                }
                setBusyLabel(`Capturing ${floor.label} — ${view.label}… (${i + 1}/${jobs.length})`)
                scene3DRef.current?.flyTo(view)
                await waitFrames(2)
                const blob = await scene3DRef.current?.captureSnapshot(view)
                if (blob) {
                    const key = viewKey(floor.id, view.id)
                    const url = URL.createObjectURL(blob)
                    const snap: CapturedSnap = { floorId: floor.id, floorLabel: floor.label, viewId: view.id, viewLabel: view.label, blob, url }
                    setCaptured(prev => {
                        const next = new Map(prev)
                        const old = next.get(key)
                        if (old) URL.revokeObjectURL(old.url)
                        next.set(key, snap)
                        return next
                    })
                    setPreviewSnap(snap)
                }
                setCaptureProgress({ done: i + 1, total: jobs.length })
            }
        } finally {
            if (originalFloorId !== activeFloorId) {
                await onSwitchFloorForExport(originalFloorId)
            }
            setBusy(false); setBusyKey(null); setBusyLabel(''); setCaptureProgress(null)
        }
    }

    const downloadOneSnapshot = (snap: CapturedSnap) => {
        downloadBlob(snap.blob, `floor-plan-${projectId}-${safeName(snap.floorLabel)}-${safeName(snap.viewLabel)}.jpg`)
    }

    const downloadAllAsZip = async () => {
        setBusy(true); setBusyKey('zip'); setError(null)
        try {
            const { default: JSZip } = await import('jszip')
            const zip = new JSZip()
            const manifest: any[] = []

            // Use whatever's already been captured; capture any missing
            // included views first so "download all" always reflects the
            // current checkbox selection even if the user hasn't hit
            // individual capture buttons for everything yet.
            const jobs = floorsWithViews.flatMap(({ floor, views }) =>
                views.filter(v => isViewIncluded(floor.id, v.id)).map(v => ({ floor, view: v }))
            )
            const missing = jobs.filter(({ floor, view }) => !captured.has(viewKey(floor.id, view.id)))
            if (missing.length > 0) {
                await captureAllIncluded() // fills in `captured` for everything included
            }

            for (const { floor, view } of jobs) {
                const snap = captured.get(viewKey(floor.id, view.id))
                if (!snap) continue
                const filename = `3d/${safeName(snap.floorLabel)}-${safeName(snap.viewLabel)}.jpg`
                zip.file(filename, snap.blob)
                manifest.push({
                    type: '3d-snapshot', floor: snap.floorLabel, view: snap.viewLabel, file: filename,
                    capturedAt: new Date().toISOString(),
                })
            }

            for (const { floor, state } of selectedFloors) {
                setBusyLabel(`Rendering ${floor.label} (2D)…`)
                const svgEl = await renderOffscreenSvg(state, floor.label)
                if (svgEl) {
                    const filename = `2d/${safeName(floor.label)}.svg`
                    zip.file(filename, svgToBlob(svgEl))
                    manifest.push({ type: '2d-plan', floor: floor.label, file: filename })
                }
            }

            zip.file('manifest.json', JSON.stringify(manifest, null, 2))
            setBusyLabel('Packaging zip…')
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            downloadBlob(zipBlob, `floor-plan-${projectId}-export.zip`)
        } catch (err) {
            console.error('[ExportPlanDialog] zip export failed:', err)
            setError('Export failed. Try again.')
        } finally {
            setBusy(false); setBusyKey(null); setBusyLabel('')
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 100 }} onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#FFF', borderRadius: 12, padding: 0, width: 860, maxWidth: '95vw',
                    maxHeight: '90vh', boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
            >
                {/* ── Header ── */}
                <div style={{ padding: '18px 22px 0', flexShrink: 0 }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: THEME.text }}>Export Plan</h3>
                    <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${THEME.border}` }}>
                        <TabButton label="2D Plans" active={tab === '2d'} onClick={() => setTab('2d')} />
                        <TabButton label="3D Snapshots" active={tab === '3d'} onClick={() => setTab('3d')} />
                    </div>
                </div>

                {/* ── Body — two columns on the 3D tab (config left, preview
                      right), single column on 2D ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', gap: 20 }}>
                    {/* ── Shared floor picker — used by both tabs ── */}
                    <div style={{ width: tab === '3d' ? 320 : '100%', flexShrink: 0 }}>
                        {floors.length > 1 && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                                    <label style={{ fontSize: 11, color: THEME.textMuted, flex: 1 }}>Floors</label>
                                    <button onClick={selectAllFloors} style={{ fontSize: 10, color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>All</button>
                                    <button onClick={selectCurrentOnly} style={{ fontSize: 10, color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Current only</button>
                                </div>
                                <div style={{ border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 4, marginBottom: 14, maxHeight: 110, overflowY: 'auto' }}>
                                    {[...floors].sort((a, b) => b.order - a.order).map(floor => (
                                        <label key={floor.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: THEME.text }}>
                                            <input type="checkbox" checked={selectedFloorIds.has(floor.id)} onChange={() => toggleFloor(floor.id)} style={{ accentColor: THEME.accent }} />
                                            <span style={{ flex: 1 }}>{floor.label}</span>
                                            {floor.id === activeFloorId && <span style={{ fontSize: 9.5, color: THEME.textFaint }}>current</span>}
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}

                        {tab === '2d' ? (
                            <>
                                <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 6 }}>Format</label>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                                    {FORMATS.map(f => (
                                        <button key={f.value} onClick={() => setFormat(f.value)}
                                            style={{
                                                flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                                                border: `1.5px solid ${format === f.value ? THEME.accent : THEME.borderStrong}`,
                                                background: format === f.value ? 'rgba(99,102,241,0.08)' : 'transparent', textAlign: 'left',
                                            }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: format === f.value ? THEME.accent : THEME.text }}>{f.label}</div>
                                            <div style={{ fontSize: 9.5, color: THEME.textFaint, marginTop: 1 }}>{f.sub}</div>
                                        </button>
                                    ))}
                                </div>

                                <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 4 }}>Paper size</label>
                                <select value={paperSize} onChange={e => setPaperSize(e.target.value as any)}
                                    style={{ width: '100%', height: 32, borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, marginBottom: 12, fontSize: 12 }}>
                                    <option value="A4">A4</option><option value="A3">A3</option><option value="Letter">Letter</option>
                                </select>

                                <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 4 }}>Scale</label>
                                <select value={scaleMode} onChange={e => setScaleMode(e.target.value === 'auto' ? 'auto' : Number(e.target.value) as PrintScale)}
                                    style={{ width: '100%', height: 32, borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, marginBottom: 8, fontSize: 12 }}>
                                    <option value="auto">Auto (fit to page)</option>
                                    {PRINT_SCALES.map(s => <option key={s} value={s}>1:{s}</option>)}
                                </select>
                                <div style={{ fontSize: 11, color: THEME.textFaint, marginBottom: 16 }}>
                                    {scaleMode === 'auto' ? 'Auto scale is computed per-floor' : `Scale: 1:${resolveScale(fp)}`}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 4 }}>
                                    <ToggleRow label="Show furniture & decor" checked={showFurniture} onChange={() => setShowFurniture(v => !v)} />
                                    <ToggleRow label="Show labels" checked={showLabels} onChange={() => setShowLabels(v => !v)} />
                                </div>

                                {error && <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 10 }}>{error}</div>}

                                <button onClick={handleExport2D} disabled={busy}
                                    style={{
                                        width: '100%', height: 34, borderRadius: 8, border: 'none',
                                        background: busy ? '#A5A9FF' : THEME.accent, color: '#FFF', fontSize: 12.5, fontWeight: 700,
                                        cursor: busy ? 'not-allowed' : 'pointer', marginBottom: 8,
                                    }}>
                                    {busy && busyKey === 'export2d' ? (busyLabel || 'Exporting…') : `Download ${format.toUpperCase()}${selectedFloors.length > 1 ? ` (${selectedFloors.length} floors)` : ''}`}
                                </button>
                            </>
                        ) : (
                            <>
                                <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 6 }}>Views to capture</label>
                                <div style={{ border: `1px solid ${THEME.border}`, borderRadius: 8, marginBottom: 12, maxHeight: 340, overflowY: 'auto' }}>
                                    {floorsWithViews.length === 0 && (
                                        <div style={{ fontSize: 11, color: THEME.textFaint, padding: 10 }}>Select at least one floor above.</div>
                                    )}
                                    {floorsWithViews.map(({ floor, views }) => (
                                        <div key={floor.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                                            <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.textMuted, padding: '8px 10px 4px', background: '#FAFAFA' }}>
                                                {floor.label}
                                            </div>
                                            {views.map(v => {
                                                const key = viewKey(floor.id, v.id)
                                                const snap = captured.get(key)
                                                const isCapturingThis = busy && busyKey === key
                                                return (
                                                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px' }}>
                                                        <input type="checkbox" checked={isViewIncluded(floor.id, v.id)} onChange={() => toggleView(floor.id, v.id)} style={{ accentColor: THEME.accent, flexShrink: 0 }} />
                                                        <span style={{ flex: 1, fontSize: 12, color: THEME.text, cursor: 'pointer' }} onClick={() => snap && setPreviewSnap(snap)}>
                                                            {v.label}
                                                        </span>
                                                        {!v.isPreset && <span style={{ fontSize: 9, color: THEME.textFaint, marginRight: 2 }}>saved</span>}
                                                        {snap && <span title="Captured" style={{ fontSize: 11, color: '#10B981', marginRight: 2 }}>●</span>}
                                                        <button
                                                            onClick={() => captureOne(floor, v)}
                                                            disabled={busy}
                                                            style={{
                                                                fontSize: 10, padding: '3px 8px', borderRadius: 6,
                                                                border: `1px solid ${THEME.borderStrong}`, background: snap ? '#FFF' : 'rgba(99,102,241,0.08)',
                                                                color: THEME.accent, cursor: busy ? 'not-allowed' : 'pointer', flexShrink: 0,
                                                            }}>
                                                            {isCapturingThis ? '…' : snap ? 'Recapture' : 'Capture'}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                            {views.length === 0 && (
                                                <div style={{ fontSize: 11, color: THEME.textFaint, padding: '6px 10px' }}>No views available for this floor yet.</div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {error && <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 10 }}>{error}</div>}

                                <button onClick={captureAllIncluded} disabled={busy}
                                    style={{
                                        width: '100%', height: 32, borderRadius: 8, border: `1px solid ${THEME.borderStrong}`,
                                        background: 'transparent', color: THEME.text, fontSize: 12, fontWeight: 600,
                                        cursor: busy ? 'not-allowed' : 'pointer', marginBottom: 6,
                                    }}>
                                    {busy && busyKey === 'captureAll'
                                        ? (captureProgress ? `Capturing… (${captureProgress.done}/${captureProgress.total})` : busyLabel)
                                        : 'Capture All Checked Views'}
                                </button>
                                <button onClick={downloadAllAsZip} disabled={busy}
                                    style={{
                                        width: '100%', height: 34, borderRadius: 8, border: 'none',
                                        background: busy ? '#A5A9FF' : THEME.accent, color: '#FFF', fontSize: 12.5, fontWeight: 700,
                                        cursor: busy ? 'not-allowed' : 'pointer', marginBottom: 8,
                                    }}>
                                    {busy && busyKey === 'zip' ? (busyLabel || 'Packaging…') : 'Download All as ZIP (3D + 2D)'}
                                </button>
                            </>
                        )}

                        <button onClick={onOpenShare} style={{ width: '100%', height: 34, borderRadius: 8, border: `1px solid ${THEME.borderStrong}`, background: 'transparent', color: THEME.textMuted, fontSize: 12.5, cursor: 'pointer', marginBottom: 8 }}>
                            Get shareable link instead
                        </button>
                        <button onClick={onClose} style={{ width: '100%', height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: THEME.textFaint, fontSize: 11.5, cursor: 'pointer' }}>
                            Cancel
                        </button>
                    </div>

                    {/* ── Right column — live preview, 3D tab only ── */}
                    {tab === '3d' && (
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 6 }}>Preview</label>
                            <div style={{
                                flex: 1, border: `1px solid ${THEME.border}`, borderRadius: 8, overflow: 'hidden',
                                display: 'flex', flexDirection: 'column', minHeight: 300, background: '#111',
                            }}>
                                {previewSnap ? (
                                    <>
                                        <img src={previewSnap.url} alt={`${previewSnap.floorLabel} — ${previewSnap.viewLabel}`}
                                            style={{ flex: 1, width: '100%', objectFit: 'contain', display: 'block' }} />
                                        <div style={{ padding: '8px 10px', background: '#FFF', borderTop: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>
                                                {previewSnap.floorLabel} — {previewSnap.viewLabel}
                                            </span>
                                            <button onClick={() => downloadOneSnapshot(previewSnap)}
                                                style={{ fontSize: 11, color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                                Download
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 12, textAlign: 'center', padding: 20 }}>
                                        {busy
                                            ? (busyLabel || 'Capturing…')
                                            : 'Capture a view to preview it here.'}
                                    </div>
                                )}
                            </div>

                            {captureProgress && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ height: 4, background: THEME.border, borderRadius: 2, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', background: THEME.accent, transition: 'width 150ms ease',
                                            width: `${(captureProgress.done / Math.max(captureProgress.total, 1)) * 100}%`,
                                        }} />
                                    </div>
                                    <div style={{ fontSize: 10.5, color: THEME.textFaint, marginTop: 4, textAlign: 'right' }}>
                                        {captureProgress.done}/{captureProgress.total} captured
                                    </div>
                                </div>
                            )}

                            {/* Thumbnail strip of everything captured so far this session */}
                            {captured.size > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 6 }}>
                                        Captured ({captured.size})
                                    </label>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {Array.from(captured.values()).map(snap => (
                                            <button
                                                key={viewKey(snap.floorId, snap.viewId)}
                                                onClick={() => setPreviewSnap(snap)}
                                                title={`${snap.floorLabel} — ${snap.viewLabel}`}
                                                style={{
                                                    width: 56, height: 56, borderRadius: 6, overflow: 'hidden', padding: 0,
                                                    border: previewSnap === snap ? `2px solid ${THEME.accent}` : `1px solid ${THEME.border}`,
                                                    cursor: 'pointer', background: '#111',
                                                }}>
                                                <img src={snap.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '8px 4px', marginRight: 20, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: active ? THEME.accent : THEME.textMuted,
                borderBottom: active ? `2px solid ${THEME.accent}` : '2px solid transparent',
                marginBottom: -1,
            }}
        >
            {label}
        </button>
    )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
        <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 6, cursor: 'pointer' }}>
            <span style={{ flex: 1, fontSize: 12, color: THEME.text }}>{label}</span>
            <div style={{ width: 30, height: 17, borderRadius: 999, flexShrink: 0, background: checked ? THEME.accent : 'rgba(0,0,0,0.12)', position: 'relative', transition: 'background 150ms' }}>
                <div style={{ position: 'absolute', top: 2, left: checked ? 15 : 2, width: 13, height: 13, borderRadius: '50%', background: '#FFF', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 150ms' }} />
            </div>
        </div>
    )
}