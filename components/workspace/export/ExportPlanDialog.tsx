// components/workspace/export/ExportPlanDialog.tsx
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { THEME } from '../FloorPlanEditor'
import { FloorPlanState } from '../lib/constants'
import { Floor } from '../lib/floor-data'
import { PrintableFloorPlan2D, PRINT_SCALES, PrintScale, pickAutoScale } from './PrintableFloorPlan2D'

interface Props {
    fp: FloorPlanState
    sceneConfig: any
    projectId: string
    floors: Floor[]
    activeFloorId: string
    onClose: () => void
    onOpenShare: () => void
}

type ExportFormat = 'svg' | 'png' | 'pdf'

const FORMATS: { value: ExportFormat; label: string; sub: string }[] = [
    { value: 'svg', label: 'SVG', sub: 'Vector, editable' },
    { value: 'png', label: 'PNG', sub: 'Raster image' },
    { value: 'pdf', label: 'PDF', sub: 'Printable document' },
]

const PNG_DPI_MULTIPLIER = 3
const RENDER_TIMEOUT_MS = 4000

export function ExportPlanDialog({ fp, projectId, floors, activeFloorId, onClose, onOpenShare }: Props) {
    const [format, setFormat] = useState<ExportFormat>('svg')
    const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter'>('A4')
    const [scaleMode, setScaleMode] = useState<'auto' | PrintScale>('auto')
    const [showFurniture, setShowFurniture] = useState(true)
    const [showLabels, setShowLabels] = useState(true)
    const [selectedFloorIds, setSelectedFloorIds] = useState<Set<string>>(new Set([activeFloorId]))
    const [busy, setBusy] = useState(false)
    const [busyLabel, setBusyLabel] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Ordered list of floors actually being exported, resolving each to the
    // correct FloorPlanState — the active floor uses the live `fp` (which
    // may have unsaved-but-rendered edits), every other floor uses its own
    // stored `.state`, exactly like Scene3D does for `activeFp` vs `f.state`.
    const selectedFloors = floors
        .filter(f => selectedFloorIds.has(f.id))
        .map(f => ({ floor: f, state: f.id === activeFloorId ? fp : f.state }))

    const toggleFloor = (id: string) => {
        setSelectedFloorIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }
    const selectAllFloors = () => setSelectedFloorIds(new Set(floors.map(f => f.id)))
    const selectCurrentOnly = () => setSelectedFloorIds(new Set([activeFloorId]))

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
                    probe.onerror = () => resolve() // don't block export on one bad texture
                    probe.src = href
                    if (probe.complete) resolve()
                })
            })
        )
    }

    // Takes floorLabel now (was previously dropped on the floor — literally
    // — so PrintableFloorPlan2D's floorLabel prop always resolved undefined
    // and the title block's floor-level line never rendered, even though
    // the component itself supported it).
    const renderOffscreenSvg = (state: FloorPlanState, floorLabel: string): Promise<SVGSVGElement | null> => {
        return new Promise((resolve, reject) => {
            const container = document.createElement('div')
            container.style.position = 'fixed'
            container.style.left = '-99999px'
            document.body.appendChild(container)
            const root = createRoot(container)

            const cleanup = () => {
                root.unmount()
                document.body.removeChild(container)
            }

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
                cleanup()
                reject(err)
                return
            }

            const startedAt = performance.now()

            const poll = () => {
                const svgEl = container.querySelector('svg') as SVGSVGElement | null
                if (svgEl) {
                    waitForImages(svgEl)
                        .then(() => {
                            const clone = svgEl.cloneNode(true) as SVGSVGElement
                            cleanup()
                            resolve(clone)
                        })
                        .catch(err => { cleanup(); reject(err) })
                    return
                }
                if (performance.now() - startedAt > RENDER_TIMEOUT_MS) {
                    cleanup()
                    resolve(null) // preserves existing "Could not render {label}" message upstream
                    return
                }
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
                canvas.width = widthPx
                canvas.height = heightPx
                const ctx = canvas.getContext('2d')!
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, widthPx, heightPx)
                ctx.drawImage(img, 0, 0, widthPx, heightPx)
                URL.revokeObjectURL(url)
                resolve(canvas)
            }
            img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
            img.src = url
        })
    }

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
    }

    // Small delay between sequential downloads — browsers can silently drop
    // rapid-fire `a.click()` downloads triggered back-to-back in the same tick.
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

    const safeName = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const handleExport = async () => {
        if (selectedFloors.length === 0) {
            setError('Select at least one floor.')
            return
        }
        setBusy(true)
        setError(null)
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
                        canvas.toBlob(b => {
                            if (b) downloadBlob(b, `floor-plan-${projectId}-${safeName(floor.label)}.png`)
                            resolve()
                        }, 'image/png')
                    })
                    if (i < selectedFloors.length - 1) await wait(150)
                }
            } else if (format === 'pdf') {
                // Multi-floor PDF: one page per selected floor, single file —
                // per your call, not separate PDFs per floor.
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

                    if (!doc) {
                        doc = new jsPDF({ orientation, unit: 'mm', format: [widthMm, heightMm] })
                    } else {
                        doc.addPage([widthMm, heightMm], orientation)
                    }
                    doc.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm)
                    // Page label in the corner so multi-floor PDFs are
                    // navigable without relying on jsPDF's outline UI.
                    doc.setFontSize(7)
                    doc.setTextColor(120)
                    doc.text(floor.label, 4, heightMm - 3)
                }
                doc.save(`floor-plan-${projectId}.pdf`)
            }
            onClose()
        } catch (err) {
            console.error('[ExportPlanDialog] export failed:', err)
            setError('Export failed. Try again.')
        } finally {
            setBusy(false)
            setBusyLabel('')
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 100 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 12, padding: 20, width: 380, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: THEME.text }}>Export Plan</h3>

                <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 6 }}>Format</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {FORMATS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFormat(f.value)}
                            style={{
                                flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                                border: `1.5px solid ${format === f.value ? THEME.accent : THEME.borderStrong}`,
                                background: format === f.value ? 'rgba(99,102,241,0.08)' : 'transparent',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{ fontSize: 12, fontWeight: 700, color: format === f.value ? THEME.accent : THEME.text }}>{f.label}</div>
                            <div style={{ fontSize: 9.5, color: THEME.textFaint, marginTop: 1 }}>{f.sub}</div>
                        </button>
                    ))}
                </div>

                {/* ── Floor picker ── */}
                {floors.length > 1 && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: 11, color: THEME.textMuted, flex: 1 }}>Floors</label>
                            <button onClick={selectAllFloors} style={{ fontSize: 10, color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>All</button>
                            <button onClick={selectCurrentOnly} style={{ fontSize: 10, color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Current only</button>
                        </div>
                        <div style={{ border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 4, marginBottom: 14, maxHeight: 130, overflowY: 'auto' }}>
                            {[...floors].sort((a, b) => b.order - a.order).map(floor => (
                                <label
                                    key={floor.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: THEME.text }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedFloorIds.has(floor.id)}
                                        onChange={() => toggleFloor(floor.id)}
                                        style={{ accentColor: THEME.accent }}
                                    />
                                    <span style={{ flex: 1 }}>{floor.label}</span>
                                    {floor.id === activeFloorId && (
                                        <span style={{ fontSize: 9.5, color: THEME.textFaint }}>current</span>
                                    )}
                                </label>
                            ))}
                        </div>
                    </>
                )}

                <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 4 }}>Paper size</label>
                <select value={paperSize} onChange={e => setPaperSize(e.target.value as any)}
                    style={{ width: '100%', height: 32, borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, marginBottom: 12, fontSize: 12 }}>
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
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

                <button onClick={handleExport} disabled={busy}
                    style={{
                        width: '100%', height: 34, borderRadius: 8, border: 'none',
                        background: busy ? '#A5A9FF' : THEME.accent, color: '#FFF', fontSize: 12.5, fontWeight: 700,
                        cursor: busy ? 'not-allowed' : 'pointer', marginBottom: 8,
                    }}>
                    {busy ? (busyLabel || 'Exporting…') : `Download ${format.toUpperCase()}${selectedFloors.length > 1 ? ` (${selectedFloors.length} floors)` : ''}`}
                </button>
                <button onClick={onOpenShare} style={{ width: '100%', height: 34, borderRadius: 8, border: `1px solid ${THEME.borderStrong}`, background: 'transparent', color: THEME.textMuted, fontSize: 12.5, cursor: 'pointer', marginBottom: 8 }}>
                    Get shareable link instead
                </button>
                <button onClick={onClose} style={{ width: '100%', height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: THEME.textFaint, fontSize: 11.5, cursor: 'pointer' }}>
                    Cancel
                </button>
            </div>
        </div>
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