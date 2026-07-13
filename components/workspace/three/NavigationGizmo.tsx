'use client'

import React from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A plain mutable box (not React state) that both components share — the
// reporter (inside Canvas) writes to it every frame; the gizmo (outside
// Canvas) reads it imperatively via a DOM ref. No setState anywhere in this
// path, so no React re-renders are ever triggered by camera movement.
export type GizmoApi = {
    setOrientation: (yawDeg: number, pitchDeg: number) => void
}
export function useGizmoApiRef() {
    return React.useRef<GizmoApi | null>(null)
}

/**
 * Lives INSIDE the main <Canvas>. Reads camera orientation every frame and
 * pushes it straight into the DOM via gizmoApiRef — bypasses React state
 * completely, so this can run at full frame rate with zero re-render cost.
 */
export function CameraOrientationReporter({
    gizmoApiRef,
}: {
    gizmoApiRef: React.RefObject<GizmoApi | null>
}) {
    const last = React.useRef({ yaw: 0, pitch: 0 })

    useFrame(({ camera }) => {
        const api = gizmoApiRef.current
        if (!api) return
        const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
        const yawDeg = (e.y * 180) / Math.PI
        const pitchDeg = (e.x * 180) / Math.PI

        if (Math.abs(yawDeg - last.current.yaw) > 0.05 || Math.abs(pitchDeg - last.current.pitch) > 0.05) {
            last.current = { yaw: yawDeg, pitch: pitchDeg }
            api.setOrientation(yawDeg, pitchDeg)
        }
    })

    return null
}

/**
 * Plain HTML/SVG overlay, outside the Canvas. Registers itself into
 * gizmoApiRef so the reporter (inside Canvas) can drive it directly via DOM
 * mutation — no props/state re-render loop involved.
 */
export function NavigationGizmo({
    gizmoApiRef,
    size = 84,
}: {
    gizmoApiRef: React.RefObject<GizmoApi | null>
    size?: number
}) {
    const ringRef = React.useRef<SVGSVGElement>(null)
    const dotRef = React.useRef<SVGCircleElement>(null)

    React.useEffect(() => {
        gizmoApiRef.current = {
            setOrientation: (yawDeg, pitchDeg) => {
                if (ringRef.current) {
                    ringRef.current.style.transform = `rotate(${-yawDeg}deg)`
                }
                if (dotRef.current) {
                    const cy = 50 + Math.max(-14, Math.min(14, pitchDeg / 4))
                    dotRef.current.setAttribute('cy', String(cy))
                }
            },
        }
        return () => { gizmoApiRef.current = null }
    }, [gizmoApiRef])

    return (
        <div
            style={{
                position: 'absolute',
                left: 16,
                bottom: 16,
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                border: '1px solid rgba(15,15,15,0.08)',
                pointerEvents: 'none',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <svg
                ref={ringRef}
                width={size - 16}
                height={size - 16}
                viewBox="0 0 100 100"
                style={{ transformOrigin: '50% 50%' }} // no CSS transition — driven at frame rate instead
            >
                <circle cx="50" cy="50" r="46" fill="none" stroke="#D4D4D4" strokeWidth="1.5" />
                {[0, 90, 180, 270].map(a => (
                    <line
                        key={a}
                        x1="50" y1="6" x2="50" y2="14"
                        stroke="#A3A3A3" strokeWidth="2"
                        transform={`rotate(${a} 50 50)`}
                    />
                ))}
                <g>
                    <circle cx="50" cy="12" r="6" fill="#EF4444" />
                    <text x="50" y="16" fontSize="8" fill="white" textAnchor="middle" fontWeight="700">N</text>
                </g>
                <circle ref={dotRef} cx="50" cy="50" r="5" fill="#3B82F6" />
            </svg>
        </div>
    )
}