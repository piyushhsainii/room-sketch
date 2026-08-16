'use client'

import { Canvas, type CanvasProps } from '@react-three/fiber'
import { useCallback, useRef, useState } from 'react'

const MAX_REMOUNTS = 5

/**
 * R3F Canvas wrapper that remounts when the WebGL context is lost and not
 * automatically restored (common on page reload and React Strict Mode).
 */
export default function ResilientCanvas({ onCreated, ...props }: CanvasProps) {
    const [canvasKey, setCanvasKey] = useState(0)
    const remountCountRef = useRef(0)
    const remountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleCreated = useCallback<NonNullable<CanvasProps['onCreated']>>((state) => {
        const el = state.gl.domElement

        const scheduleRemount = () => {
            if (remountCountRef.current >= MAX_REMOUNTS) return
            if (remountTimerRef.current) clearTimeout(remountTimerRef.current)
            remountTimerRef.current = setTimeout(() => {
                remountTimerRef.current = null
                const gl = el.getContext('webgl2') ?? el.getContext('webgl')
                if (!gl?.isContextLost()) return
                remountCountRef.current += 1
                setCanvasKey((k) => k + 1)
            }, 50)
        }

        const onLost = (e: Event) => {
            e.preventDefault()
            scheduleRemount()
        }

        const onRestored = () => {
            if (remountTimerRef.current) {
                clearTimeout(remountTimerRef.current)
                remountTimerRef.current = null
            }
        }

        el.addEventListener('webglcontextlost', onLost)
        el.addEventListener('webglcontextrestored', onRestored)
        onCreated?.(state)
    }, [onCreated])

    return <Canvas
        gl={{ toneMappingExposure: 1.3 }}
        key={canvasKey}
        {...props}
        onCreated={handleCreated} />
}
