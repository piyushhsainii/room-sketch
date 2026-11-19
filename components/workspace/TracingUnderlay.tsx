import { useEffect, useState } from 'react'
import type { TracingImage } from './lib/practical-features'
import { loadTracingImage } from './lib/practical-storage'
import { PX_PER_M } from './lib/constants'

export function TracingUnderlay({ image, pan, zoom }: { image?: TracingImage; pan: { x: number; y: number }; zoom: number }) {
    const [url, setUrl] = useState('')
    const [missing, setMissing] = useState(false)
    useEffect(() => {
        setUrl('')
        setMissing(false)
        if (!image) return
        let cancelled = false
        let objectUrl = ''
        loadTracingImage(image.id).then(blob => {
            if (cancelled) return
            if (!blob) { setMissing(true); return }
            objectUrl = URL.createObjectURL(blob)
            setUrl(objectUrl)
        }).catch(() => { if (!cancelled) setMissing(true) })
        return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
    }, [image?.id])
    if (!image) return null
    if (missing) return <p role="status" className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-72 rounded-lg bg-white/95 p-2 text-xs text-neutral-600">Tracing image unavailable on this device. Reimport it from Project tools.</p>
    if (!url) return null
    return <img src={url} alt="" draggable={false} className="pointer-events-none absolute"
        style={{ left: pan.x + image.x * PX_PER_M * zoom, top: pan.y + image.z * PX_PER_M * zoom,
            width: image.width * PX_PER_M * zoom, height: image.height * PX_PER_M * zoom, opacity: image.opacity }} />
}
