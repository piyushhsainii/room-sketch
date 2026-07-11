'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import SceneErrorBoundary from '@/components/workspace/objects/error-boundary'
import type { SceneJSON } from '@/types/workspace'
import { sceneJSONToFloorPlanState } from '@/lib/workspace/floorPlanConvertor'
import Scene3D from '@/components/workspace/3DScene'
import { PublicFloorPlan2D } from '@/components/dashboard/PublicFloorPlan2d'

export default function SharePage({ params }: { params: { token: string } }) {
    const [data, setData] = useState<{ project_name: string; scene_json: SceneJSON } | null>(null)
    const [notFound, setNotFound] = useState(false)
    const [view, setView] = useState<'2d' | '3d'>('3d')
    const [walkMode, setWalkMode] = useState(false)

    useEffect(() => {
        fetch(`/api/workspace/share/${params.token}`)
            .then(res => {
                if (!res.ok) throw new Error('not found')
                return res.json()
            })
            .then(setData)
            .catch(() => setNotFound(true))
    }, [params.token])

    if (notFound) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2>Link not found</h2>
                    <p style={{ color: '#666' }}>This share link is invalid or no longer active.</p>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                Loading…
            </div>
        )
    }

    const { fp, sceneConfig } = sceneJSONToFloorPlanState(data.scene_json)

    return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui' }}>
            <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, borderBottom: '1px solid #eee', background: '#fff' }}>
                <span style={{ fontWeight: 700 }}>{data.project_name}</span>
                <div style={{ flex: 1 }} />
                <button onClick={() => setView(v => v === '3d' ? '2d' : '3d')} style={{ height: 30, padding: '0 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer' }}>
                    {view === '3d' ? 'View 2D Plan' : 'View 3D'}
                </button>
                {view === '3d' && (
                    <button onClick={() => setWalkMode(w => !w)} style={{ height: 30, padding: '0 12px', borderRadius: 6, border: '1px solid #ddd', background: walkMode ? '#eef' : '#fafafa', cursor: 'pointer' }}>
                        {walkMode ? 'Exit Walk Mode' : 'Walk Mode'}
                    </button>
                )}
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
                {view === '3d' ? (
                    <Canvas shadows camera={{ position: [8, 10, 12], fov: 50, near: 0.1, far: 500 }}>
                        <SceneErrorBoundary fallback={null}>
                            <Suspense fallback={null}>
                                <Scene3D fp={fp} sceneConfig={sceneConfig} walkMode={walkMode} interactiveMode={false} />
                            </Suspense>
                        </SceneErrorBoundary>
                    </Canvas>
                ) : (
                    <PublicFloorPlan2D fp={fp} />
                )}
            </div>
        </div>
    )
}