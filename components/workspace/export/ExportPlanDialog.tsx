// components/workspace/export/ExportPlanDialog.tsx
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { THEME } from '../FloorPlanEditor'
import { FloorPlanState } from '../lib/constants'
import { PrintableFloorPlan2D, PRINT_SCALES, PrintScale, pickAutoScale } from './PrintableFloorPlan2D'

interface Props {
    fp: FloorPlanState
    sceneConfig: any
    projectId: string
    onClose: () => void
    onOpenShare: () => void
}

export function ExportPlanDialog({ fp, projectId, onClose, onOpenShare }: Props) {
    const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter'>('A4')
    const [scaleMode, setScaleMode] = useState<'auto' | PrintScale>('auto')
    const resolvedScale: PrintScale = scaleMode === 'auto' ? pickAutoScale(fp, paperSize) : scaleMode

    const handleDownloadSvg = () => {
        // Render off-screen into a detached container, serialize, download.
        // Kept self-contained here rather than adding a hidden permanent node
        // to the main tree, since export is an infrequent, on-demand action.
        const container = document.createElement('div')
        const root = createRoot(container)
        root.render(<PrintableFloorPlan2D fp={fp} scale={resolvedScale} paperSize={paperSize} />)
        // Give React a tick to flush before reading the DOM.
        setTimeout(() => {
            const svgEl = container.querySelector('svg')
            if (svgEl) {
                const serializer = new XMLSerializer()
                const svgStr = serializer.serializeToString(svgEl)
                const blob = new Blob([svgStr], { type: 'image/svg+xml' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `floor-plan-${projectId}.svg`
                a.click()
                URL.revokeObjectURL(url)
            }
            root.unmount()
        }, 0)
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 100 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 12, padding: 20, width: 360, boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: THEME.text }}>Export Plan</h3>

                <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 4 }}>Paper size</label>
                <select value={paperSize} onChange={e => setPaperSize(e.target.value as any)}
                    style={{ width: '100%', height: 32, borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, marginBottom: 12, fontSize: 12 }}>
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                </select>

                <label style={{ fontSize: 11, color: THEME.textMuted, display: 'block', marginBottom: 4 }}>Scale</label>
                <select value={scaleMode} onChange={e => setScaleMode(e.target.value === 'auto' ? 'auto' : Number(e.target.value) as PrintScale)}
                    style={{ width: '100%', height: 32, borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, marginBottom: 16, fontSize: 12 }}>
                    <option value="auto">Auto (fit to page)</option>
                    {PRINT_SCALES.map(s => <option key={s} value={s}>1:{s}</option>)}
                </select>

                <div style={{ fontSize: 11, color: THEME.textFaint, marginBottom: 16 }}>Resolved scale: 1:{resolvedScale}</div>

                <button onClick={handleDownloadSvg} style={{ width: '100%', height: 34, borderRadius: 8, border: 'none', background: THEME.accent, color: '#FFF', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                    Download SVG
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