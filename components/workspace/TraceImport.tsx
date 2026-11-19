import { useEffect, useState } from 'react'
import { calibrationScale, type TracingImage } from './lib/practical-features'
import { saveTracingImage } from './lib/practical-storage'
import { menuButton } from '../ui/editor-menu-theme'

export function TraceImport({ onApply }: { onApply: (image: TracingImage) => void }) {
    const [file, setFile] = useState<File | null>(null)
    const [url, setUrl] = useState('')
    const [size, setSize] = useState({ width: 0, height: 0 })
    const [points, setPoints] = useState<{ x: number; y: number }[]>([])
    const [distance, setDistance] = useState('5')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    async function loadExample() {
        setBusy(true)
        setError('')
        try {
            const response = await fetch('/demo-office-reference.png')
            if (!response.ok) throw new Error('The example image could not be loaded.')
            const blob = await response.blob()
            setPoints([])
            setSize({ width: 0, height: 0 })
            setFile(new File([blob], 'office-reference.png', { type: 'image/png' }))
        } catch {
            setError('The example image could not be loaded. Choose a local image instead.')
        } finally {
            setBusy(false)
        }
    }
    useEffect(() => {
        if (!file) return
        const next = URL.createObjectURL(file)
        setUrl(next)
        return () => URL.revokeObjectURL(next)
    }, [file])
    async function apply() {
        if (!file || points.length !== 2 || !size.width) return
        setBusy(true)
        setError('')
        try {
            const scale = calibrationScale(points[0], points[1], Number(distance))
            const id = crypto.randomUUID()
            await saveTracingImage(id, file)
            onApply({ id, width: size.width * scale, height: size.height * scale, x: 0, z: 0, opacity: 0.35 })
            setFile(null)
            setUrl('')
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Unable to store tracing image.')
        } finally { setBusy(false) }
    }
    return <div className="space-y-3">
        <p className="text-sm text-neutral-600">Import a PNG, JPEG or WebP plan for tracing. The source image stays on this device.</p>
        <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Import tracing image"
            className="block w-full text-sm" onChange={event => {
                const next = event.target.files?.[0]
                setError('')
                if (!next) return
                if (!['image/png', 'image/jpeg', 'image/webp'].includes(next.type) || next.size > 10 * 1024 * 1024) {
                    setError('Choose a PNG, JPEG or WebP image smaller than 10 MB.')
                    return
                }
                setPoints([])
                setSize({ width: 0, height: 0 })
                setFile(next)
            }} />
        <button type="button" disabled={busy} onClick={loadExample} className={menuButton + ' border border-neutral-200'}>Use office reference image</button>
        {url && <>
            <p className="text-sm">Select two points with a known distance. {points.length}/2 selected.</p>
            <button type="button" aria-label="Choose calibration points" className="relative block w-full cursor-crosshair"
                onClick={event => {
                    const rect = event.currentTarget.getBoundingClientRect()
                    if (!size.width) return
                    const point = { x: (event.clientX - rect.left) / rect.width * size.width, y: (event.clientY - rect.top) / rect.height * size.height }
                    setPoints(previous => previous.length === 2 ? [point] : [...previous, point])
                }}>
                <img src={url} alt="Plan to calibrate" className="block h-auto w-full" onError={() => setError('This image could not be decoded.')}
                    onLoad={event => {
                        const img = event.currentTarget
                        if (img.naturalWidth > 8192 || img.naturalHeight > 8192) {
                            setError('Resize the image to at most 8192 pixels per side.')
                            setSize({ width: 0, height: 0 })
                        } else setSize({ width: img.naturalWidth, height: img.naturalHeight })
                    }} />
                {points.map((point, i) => <span key={i} className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600"
                    style={{ left: point.x / size.width * 100 + '%', top: point.y / size.height * 100 + '%' }} />)}
            </button>
            <label className="block text-sm">Distance between points (m)
                <input type="number" min="0.01" step="0.01" value={distance} onChange={event => setDistance(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-200 p-2" />
            </label>
            <button type="button" disabled={busy || points.length !== 2 || !size.width} onClick={apply}
                className={menuButton + ' bg-neutral-900 text-white'}>{busy ? 'Importing…' : 'Use calibrated image'}</button>
        </>}
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
}
