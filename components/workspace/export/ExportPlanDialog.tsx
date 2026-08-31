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

    // NEW — needed to fix the multi-floor capture isolation bug: switching
    // activeFloorId alone does NOT isolate a floor in 'stacked'/
    // 'stacked-full' viewMode (those render every visible floor together
    // regardless of which is active — see context.md §1). 'single' mode
    // also independently shows a faded floor below via showUnderlay. Both
    // must be forced off during capture and restored after, same pattern
    // as the floor-switch restore.
    viewMode: 'single' | 'stacked' | 'stacked-full'
    showUnderlay: boolean
    onSetViewModeForExport: (mode: 'single' | 'stacked' | 'stacked-full') => Promise<void>
    onSetShowUnderlayForExport: (value: boolean) => Promise<void>
}

type ExportFormat = 'svg' | 'png' | 'pdf'

const FORMATS: { value: ExportFormat; label: string; sub: string }[] = [
    { value: 'svg', label: 'SVG', sub: 'Vector, editable' },
    { value: 'png', label: 'PNG', sub: 'Raster image' },
    { value: 'pdf', label: 'PDF', sub: 'Printable document' },
]

const PNG_DPI_MULTIPLIER = 3
const RENDER_TIMEOUT_MS = 4000

// ---- Claymorphism theme tokens (shared across the app) ----
const UI = {
    surface: '#EAEAEA',
    surfaceChip: '#F5F5F5',
    canvas: '#E5E5E5',
    ink: '#1A1A1A',
    inkMuted: '#5A5A5A',
    inkFaint: '#999999',
    lightShadow: 'rgba(255,255,255,0.75)',
    darkShadow: 'rgba(0,0,0,0.14)',
    accentText: '#4C4FBF',
    accentSoft: 'rgba(99,102,241,0.14)',
    successText: '#3F9C63',
    dangerText: '#B3503F',
    panel: '#EAEAEA',
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
}

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 7px ${UI.darkShadow}, inset -3px -3px 7px ${UI.lightShadow}`
        : `-4px -4px 9px ${UI.lightShadow}, 4px 4px 10px ${UI.darkShadow}`

const clayInset = () => `inset 2px 2px 6px ${UI.darkShadow}, inset -2px -2px 6px ${UI.lightShadow}`

const viewKey = (floorId: string, viewId: string) => `${floorId}:${viewId}`
const safeName = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

type CapturedSnap = { floorId: string; floorLabel: string; viewId: string; viewLabel: string; blob: Blob; url: string }

const brandSnapshot = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)

            const barH = Math.max(28, Math.round(img.height * 0.045))
            ctx.fillStyle = 'rgba(0,0,0,0.55)'
            ctx.fillRect(0, img.height - barH, img.width, barH)

            const markSize = barH * 0.42
            const markX = 14
            const markY = img.height - barH / 2 - markSize / 2
            ctx.fillStyle = UI.surface
            const r = markSize * 0.18
            ctx.beginPath()
            if ((ctx as any).roundRect) {
                (ctx as any).roundRect(markX, markY, markSize, markSize, r)
            } else {
                ctx.rect(markX, markY, markSize, markSize)
            }
            ctx.fill()

            ctx.fillStyle = '#FFFFFF'
            ctx.font = `600 ${Math.round(barH * 0.42)}px ${UI.font}`
            ctx.textBaseline = 'middle'
            ctx.fillText('Room Sketch', markX + markSize + 10, img.height - barH / 2 + 1)

            URL.revokeObjectURL(url)
            canvas.toBlob(
                b => (b ? resolve(b) : reject(new Error('branding canvas toBlob failed'))),
                'image/jpeg', 0.9
            )
        }
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
        img.src = url
    })
}

export function ExportPlanDialog({
    fp, projectId, floors, activeFloorId, onClose, onOpenShare,
    scene3DRef, onSwitchFloorForExport,
    viewMode, showUnderlay, onSetViewModeForExport, onSetShowUnderlayForExport,
}: Props) {
    const [format, setFormat] = useState<ExportFormat>('svg')
    const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter'>('A4')
    const [scaleMode, setScaleMode] = useState<'auto' | PrintScale>('auto')
    const [showFurniture, setShowFurniture] = useState(true)
    const [showLabels, setShowLabels] = useState(true)
    const [selectedFloorIds, setSelectedFloorIds] = useState<Set<string>>(new Set([activeFloorId]))
    const [busy, setBusy] = useState(false)
    const [busyKey, setBusyKey] = useState<string | null>(null)
    const [busyLabel, setBusyLabel] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [tab, setTab] = useState<'2d' | '3d'>('2d')

    const [excludedViewKeys, setExcludedViewKeys] = useState<Set<string>>(new Set())
    const [captured, setCaptured] = useState<Map<string, CapturedSnap>>(new Map())
    const [previewSnap, setPreviewSnap] = useState<CapturedSnap | null>(null)
    const [captureProgress, setCaptureProgress] = useState<{ done: number; total: number } | null>(null)
    // UI-only for now — not wired to the actual scene. I don't have
    // SceneConfig's real field names to know if furniture/light visibility
    // is even a toggleable property; flipping these currently has no
    // effect on captured output. Needs SceneConfigPanel.tsx or
    // FloorGeometry.tsx before this can be made real.
    const [captureFurniture, setCaptureFurniture] = useState(true)
    const [captureLights, setCaptureLights] = useState(true)

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

    const waitFrames = (n: number) =>
        new Promise<void>(resolve => {
            let remaining = n
            const step = () => { remaining -= 1; if (remaining <= 0) resolve(); else requestAnimationFrame(step) }
            requestAnimationFrame(step)
        })

    const isolateSceneForCapture = async (): Promise<() => Promise<void>> => {
        const originalViewMode = viewMode
        const originalShowUnderlay = showUnderlay
        const needsViewModeChange = originalViewMode !== 'single'
        const needsUnderlayChange = originalShowUnderlay !== false

        if (needsUnderlayChange) await onSetShowUnderlayForExport(false)
        if (needsViewModeChange) await onSetViewModeForExport('single')
        if (needsViewModeChange || needsUnderlayChange) await waitFrames(2)

        return async () => {
            if (needsViewModeChange) await onSetViewModeForExport(originalViewMode)
            if (needsUnderlayChange) await onSetShowUnderlayForExport(originalShowUnderlay)
        }
    }

    const captureOne = async (floor: Floor, view: CameraView) => {
        const key = viewKey(floor.id, view.id)
        setBusyKey(key)
        setBusy(true)
        setError(null)
        const originalFloorId = activeFloorId
        const restoreScene = await isolateSceneForCapture()
        try {
            if (floor.id !== activeFloorId) {
                setBusyLabel(`Switching to ${floor.label}…`)
                await onSwitchFloorForExport(floor.id)
                await waitFrames(2)
            }
            setBusyLabel(`Capturing ${floor.label} — ${view.label}…`)
            scene3DRef.current?.flyTo(view)
            await waitFrames(2)
            const rawBlob = await scene3DRef.current?.captureSnapshot(view)
            if (rawBlob) {
                const blob = await brandSnapshot(rawBlob).catch(() => rawBlob)
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
            await restoreScene()
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
        const restoreScene = await isolateSceneForCapture()

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
                const rawBlob = await scene3DRef.current?.captureSnapshot(view)
                if (rawBlob) {
                    const blob = await brandSnapshot(rawBlob).catch(() => rawBlob)
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
            await restoreScene()
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

            const jobs = floorsWithViews.flatMap(({ floor, views }) =>
                views.filter(v => isViewIncluded(floor.id, v.id)).map(v => ({ floor, view: v }))
            )
            const missing = jobs.filter(({ floor, view }) => !captured.has(viewKey(floor.id, view.id)))
            if (missing.length > 0) {
                await captureAllIncluded()
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'grid', placeItems: 'center', zIndex: 100, fontFamily: UI.font }} onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: UI.surface, borderRadius: 26, padding: 0, width: 880, maxWidth: '95vw',
                    maxHeight: '90vh', boxShadow: `0 28px 64px rgba(0,0,0,0.28), -8px -8px 16px ${UI.lightShadow}, 8px 8px 18px ${UI.darkShadow}`,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
            >
                <div style={{ padding: '24px 28px 0' }}>
                    <h3 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 500, letterSpacing: 'normal', color: UI.ink }}>
                        Export Plan
                    </h3>
                    <div style={{ display: 'flex', gap: 4, boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)` }}>
                        <TabButton label="2D Plans" active={tab === '2d'} onClick={() => setTab('2d')} />
                        <TabButton label="3D Snapshots" active={tab === '3d'} onClick={() => setTab('3d')} />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', gap: 24 }}>
                    <div style={{ width: tab === '3d' ? 330 : '100%', flexShrink: 0 }}>
                        {floors.length > 1 && (
                            <>
                                <Row>
                                    <Label>Floors</Label>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <LinkButton onClick={selectAllFloors}>All</LinkButton>
                                        <LinkButton onClick={selectCurrentOnly}>Current only</LinkButton>
                                    </div>
                                </Row>
                                <Panel style={{ marginBottom: 20, maxHeight: 116 }}>
                                    {[...floors].sort((a, b) => b.order - a.order).map(floor => (
                                        <CheckRow key={floor.id} checked={selectedFloorIds.has(floor.id)} onChange={() => toggleFloor(floor.id)}>
                                            <span style={{ flex: 1 }}>{floor.label}</span>
                                            {floor.id === activeFloorId && <Tag>current</Tag>}
                                        </CheckRow>
                                    ))}
                                </Panel>
                            </>
                        )}

                        {tab === '2d' ? (
                            <>
                                <Label style={{ marginBottom: 8 }}>Format</Label>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                    {FORMATS.map(f => (
                                        <button key={f.value} onClick={() => setFormat(f.value)}
                                            style={{
                                                flex: 1, padding: '10px 8px', borderRadius: 14, cursor: 'pointer',
                                                border: 'none',
                                                background: format === f.value ? UI.surfaceChip : 'transparent',
                                                boxShadow: format === f.value ? clayInset() : 'none',
                                                textAlign: 'left',
                                                transition: 'box-shadow 160ms ease, background 160ms ease',
                                            }}>
                                            <div style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: 'normal', color: format === f.value ? UI.accentText : UI.ink }}>{f.label}</div>
                                            <div style={{ fontSize: 10.5, color: UI.inkFaint, marginTop: 2 }}>{f.sub}</div>
                                        </button>
                                    ))}
                                </div>

                                <Label style={{ marginBottom: 6 }}>Paper size</Label>
                                <Select value={paperSize} onChange={e => setPaperSize(e.target.value as any)} style={{ marginBottom: 16 }}>
                                    <option value="A4">A4</option><option value="A3">A3</option><option value="Letter">Letter</option>
                                </Select>

                                <Label style={{ marginBottom: 6 }}>Scale</Label>
                                <Select value={scaleMode} onChange={e => setScaleMode(e.target.value === 'auto' ? 'auto' : Number(e.target.value) as PrintScale)} style={{ marginBottom: 8 }}>
                                    <option value="auto">Auto (fit to page)</option>
                                    {PRINT_SCALES.map(s => <option key={s} value={s}>1:{s}</option>)}
                                </Select>
                                <div style={{ fontSize: 11.5, color: UI.inkFaint, marginBottom: 20, lineHeight: 1.5 }}>
                                    {scaleMode === 'auto' ? 'Auto scale is computed per-floor' : `Scale: 1:${resolveScale(fp)}`}
                                </div>

                                <Panel style={{ marginBottom: 20, padding: 6 }}>
                                    <ToggleRow label="Show furniture & decor" checked={showFurniture} onChange={() => setShowFurniture(v => !v)} />
                                    <ToggleRow label="Show labels" checked={showLabels} onChange={() => setShowLabels(v => !v)} />
                                </Panel>

                                {error && <ErrorText>{error}</ErrorText>}

                                <CTAButton onClick={handleExport2D} disabled={busy}>
                                    {busy && busyKey === 'export2d' ? (busyLabel || 'Exporting…') : `Download ${format.toUpperCase()}${selectedFloors.length > 1 ? ` (${selectedFloors.length} floors)` : ''}`}
                                </CTAButton>
                            </>
                        ) : (
                            <>
                                <Label style={{ marginBottom: 8 }}>Scene options</Label>
                                <Panel style={{ marginBottom: 16, padding: 6 }}>
                                    <ToggleRow label="Furniture & decor" checked={captureFurniture} onChange={() => setCaptureFurniture(v => !v)} />
                                    <ToggleRow label="Lights" checked={captureLights} onChange={() => setCaptureLights(v => !v)} />
                                </Panel>

                                <Label style={{ marginBottom: 8 }}>Views to capture</Label>
                                <Panel style={{ marginBottom: 16, maxHeight: 300, padding: 0 }}>
                                    {floorsWithViews.length === 0 && (
                                        <div style={{ fontSize: 12, color: UI.inkFaint, padding: 12 }}>Select at least one floor above.</div>
                                    )}
                                    {floorsWithViews.map(({ floor, views }) => (
                                        <div key={floor.id} style={{ boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)` }}>
                                            <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.01em', textTransform: 'uppercase', color: UI.inkFaint, padding: '10px 12px 6px', background: UI.canvas }}>
                                                {floor.label}
                                            </div>
                                            {views.map(v => {
                                                const key = viewKey(floor.id, v.id)
                                                const snap = captured.get(key)
                                                const isCapturingThis = busy && busyKey === key
                                                return (
                                                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px' }}>
                                                        <input type="checkbox" checked={isViewIncluded(floor.id, v.id)} onChange={() => toggleView(floor.id, v.id)} style={{ accentColor: UI.accentText, flexShrink: 0, width: 15, height: 15 }} />
                                                        <span style={{ flex: 1, fontSize: 12.5, color: UI.ink, cursor: snap ? 'pointer' : 'default', letterSpacing: 'normal' }} onClick={() => snap && setPreviewSnap(snap)}>
                                                            {v.label}
                                                        </span>
                                                        {!v.isPreset && <span style={{ fontSize: 9.5, color: UI.inkFaint }}>saved</span>}
                                                        {snap && <span title="Captured" style={{ fontSize: 12, color: UI.successText }}>●</span>}
                                                        <button
                                                            onClick={() => captureOne(floor, v)}
                                                            disabled={busy}
                                                            style={{
                                                                fontSize: 10.5, padding: '5px 11px', borderRadius: 999, fontWeight: 500, letterSpacing: 'normal',
                                                                border: 'none', background: UI.surfaceChip,
                                                                boxShadow: '-2px -2px 4px rgba(255,255,255,0.7), 2px 2px 5px rgba(0,0,0,0.14)',
                                                                color: UI.ink, cursor: busy ? 'not-allowed' : 'pointer', flexShrink: 0,
                                                            }}>
                                                            {isCapturingThis ? '…' : snap ? 'Recapture' : 'Capture'}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                            {views.length === 0 && (
                                                <div style={{ fontSize: 12, color: UI.inkFaint, padding: '8px 12px' }}>No views available for this floor yet.</div>
                                            )}
                                        </div>
                                    ))}
                                </Panel>

                                {error && <ErrorText>{error}</ErrorText>}

                                <SecondaryButton onClick={captureAllIncluded} disabled={busy}>
                                    {busy && busyKey === 'captureAll'
                                        ? (captureProgress ? `Capturing… (${captureProgress.done}/${captureProgress.total})` : busyLabel)
                                        : 'Capture All Checked Views'}
                                </SecondaryButton>
                                <CTAButton onClick={downloadAllAsZip} disabled={busy}>
                                    {busy && busyKey === 'zip' ? (busyLabel || 'Packaging…') : 'Download All as ZIP (3D + 2D)'}
                                </CTAButton>
                            </>
                        )}

                        <SecondaryButton onClick={onOpenShare} muted style={{ marginTop: 8 }}>
                            Get shareable link instead
                        </SecondaryButton>
                        <button onClick={onClose} style={{ width: '100%', height: 32, borderRadius: 999, border: 'none', background: 'transparent', color: UI.inkFaint, fontSize: 12, letterSpacing: 'normal', cursor: 'pointer', fontFamily: UI.font }}>
                            Cancel
                        </button>
                    </div>

                    {tab === '3d' && (
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <Label style={{ marginBottom: 8 }}>Preview</Label>
                            <div style={{
                                flex: 1, border: 'none', borderRadius: 20, overflow: 'hidden',
                                display: 'flex', flexDirection: 'column', minHeight: 320, background: '#1E1E1E',
                                boxShadow: clayInset(),
                            }}>
                                {previewSnap ? (
                                    <>
                                        <img src={previewSnap.url} alt={`${previewSnap.floorLabel} — ${previewSnap.viewLabel}`}
                                            style={{ flex: 1, width: '100%', objectFit: 'contain', display: 'block' }} />
                                        <div style={{ padding: '10px 14px', background: UI.surface, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6), 0 -1px 0 rgba(0,0,0,0.05)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 500, color: UI.ink, letterSpacing: 'normal' }}>
                                                {previewSnap.floorLabel} — {previewSnap.viewLabel}
                                            </span>
                                            <button onClick={() => downloadOneSnapshot(previewSnap)}
                                                style={{ fontSize: 11.5, color: UI.accentText, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, letterSpacing: 'normal', fontFamily: UI.font }}>
                                                Download
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12.5, textAlign: 'center', padding: 24, letterSpacing: 'normal' }}>
                                        {busy ? (busyLabel || 'Capturing…') : 'Capture a view to preview it here.'}
                                    </div>
                                )}
                            </div>

                            {captureProgress && (
                                <div style={{ marginTop: 10 }}>
                                    <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', boxShadow: clayInset() }}>
                                        <div style={{
                                            height: '100%', background: UI.accentText, transition: 'width 150ms ease', borderRadius: 999,
                                            width: `${(captureProgress.done / Math.max(captureProgress.total, 1)) * 100}%`,
                                        }} />
                                    </div>
                                    <div style={{ fontSize: 11, color: UI.inkFaint, marginTop: 5, textAlign: 'right', letterSpacing: 'normal' }}>
                                        {captureProgress.done}/{captureProgress.total} captured
                                    </div>
                                </div>
                            )}

                            {captured.size > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <Label style={{ marginBottom: 8 }}>Captured ({captured.size})</Label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {Array.from(captured.values()).map(snap => (
                                            <button
                                                key={viewKey(snap.floorId, snap.viewId)}
                                                onClick={() => setPreviewSnap(snap)}
                                                title={`${snap.floorLabel} — ${snap.viewLabel}`}
                                                style={{
                                                    width: 58, height: 58, borderRadius: 14, overflow: 'hidden', padding: 0,
                                                    border: 'none',
                                                    boxShadow: previewSnap === snap ? `0 0 0 2px ${UI.accentText}, ${clayRaised(false)}` : clayRaised(false),
                                                    cursor: 'pointer', background: '#1E1E1E',
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
                padding: '10px 4px', marginRight: 24, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 500, letterSpacing: 'normal', color: active ? UI.ink : UI.inkFaint,
                boxShadow: active ? `inset 0 -2px 0 ${UI.accentText}` : 'none',
                marginBottom: -1, transition: 'color 160ms ease', fontFamily: UI.font,
            }}
        >
            {label}
        </button>
    )
}

function Row({ children }: { children: React.ReactNode }) {
    return <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>{children}</div>
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.01em', textTransform: 'uppercase', color: UI.inkFaint, display: 'block', flex: 1, fontFamily: UI.font, ...style }}>{children}</label>
}

function LinkButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{ fontSize: 11, fontWeight: 500, letterSpacing: 'normal', color: UI.accentText, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontFamily: UI.font }}>
            {children}
        </button>
    )
}

function Tag({ children }: { children: React.ReactNode }) {
    return <span style={{ fontSize: 10, color: UI.inkFaint, letterSpacing: 'normal' }}>{children}</span>
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{
            border: 'none', borderRadius: 16, padding: 4, overflowY: 'auto', background: UI.surface,
            boxShadow: clayInset(), ...style,
        }}>
            {children}
        </div>
    )
}

function CheckRow({ children, checked, onChange }: { children: React.ReactNode; checked: boolean; onChange: () => void }) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: UI.ink, letterSpacing: 'normal', fontFamily: UI.font }}>
            <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: UI.accentText, width: 15, height: 15 }} />
            {children}
        </label>
    )
}

function Select({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select {...rest} style={{
            width: '100%', height: 38, borderRadius: 12, border: 'none', fontSize: 12.5,
            color: UI.ink, padding: '0 12px', letterSpacing: 'normal', background: UI.surface,
            boxShadow: clayInset(), fontFamily: UI.font, ...(rest.style ?? {}),
        }}>
            {children}
        </select>
    )
}

function ErrorText({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 11.5, color: UI.dangerText, marginBottom: 12, letterSpacing: 'normal' }}>{children}</div>
}

function CTAButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    const [hovered, setHovered] = useState(false)
    return (
        <button onClick={onClick} disabled={disabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: '100%', height: 44, borderRadius: 999, border: 'none',
                background: disabled ? UI.surfaceChip : 'linear-gradient(145deg, #E6D5AC, #D8C7A1)',
                color: '#3A2E1F',
                fontSize: 13, fontWeight: 500, letterSpacing: 'normal', fontFamily: UI.font,
                cursor: disabled ? 'not-allowed' : 'pointer', marginBottom: 8,
                boxShadow: disabled ? 'none' : (hovered ? 'inset 2px 2px 5px rgba(0,0,0,0.18), inset -2px -2px 5px rgba(255,255,255,0.4)' : '0 3px 8px -2px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.4)'),
                transition: 'box-shadow 160ms ease',
            }}
        >
            {children}
        </button>
    )
}

function SecondaryButton({ children, onClick, disabled, muted, style }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; muted?: boolean; style?: React.CSSProperties }) {
    const [hovered, setHovered] = useState(false)
    return (
        <button onClick={onClick} disabled={disabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: '100%', height: 38, borderRadius: 999, border: 'none',
                background: UI.surface, color: muted ? UI.inkMuted : UI.ink,
                fontSize: 12.5, fontWeight: 500, letterSpacing: 'normal', fontFamily: UI.font,
                cursor: disabled ? 'not-allowed' : 'pointer', marginBottom: 8,
                opacity: disabled ? 0.6 : 1,
                boxShadow: hovered && !disabled ? clayRaised(true) : clayRaised(false),
                transition: 'box-shadow 160ms ease',
                ...style,
            }}>
            {children}
        </button>
    )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
        <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, cursor: 'pointer' }}>
            <span style={{ flex: 1, fontSize: 12.5, color: UI.ink, letterSpacing: 'normal', fontFamily: UI.font }}>{label}</span>
            <div style={{
                width: 34, height: 20, borderRadius: 999, flexShrink: 0,
                background: checked ? UI.accentSoft : UI.surface,
                boxShadow: clayInset(),
                position: 'relative', transition: 'background 150ms',
            }}>
                <div style={{
                    position: 'absolute', top: 2, left: checked ? 16 : 2, width: 16, height: 16, borderRadius: '50%',
                    background: checked ? UI.accentText : UI.surfaceChip,
                    boxShadow: '-2px -2px 4px rgba(255,255,255,0.7), 2px 2px 5px rgba(0,0,0,0.18)',
                    transition: 'left 150ms, background 150ms',
                }} />
            </div>
        </div>
    )
}