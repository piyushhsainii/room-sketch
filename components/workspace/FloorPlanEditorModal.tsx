'use client'
import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import type { SceneConfig } from '@/components/workspace/FloorPlanEditor'
import { floorPlanStateToSceneJSON } from '@/lib/workspace/floorPlanConvertor'
import { FloorPlanState } from './Tools/constants'

const FloorPlanEditor = dynamic(
    () => import('@/components/workspace/FloorPlanEditor'),
    {
        ssr: false, loading: () => (
            <div style={{
                width: '100vw', height: '100vh', display: 'grid', placeItems: 'center',
                background: '#0F0E0C', color: 'rgba(148,163,184,0.6)', fontSize: 13,
            }}>
                Loading editor…
            </div>
        )
    }
)
type Props = {
    projectId: string
    initialFloorPlanState?: any | null
    initialSceneConfig?: SceneConfig | null
    onSaved: (sceneJSON: any) => void
    onClose: () => void
}

export default function FloorPlanEditorModal({ projectId, initialFloorPlanState, initialSceneConfig, onSaved, onClose }: Props) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    const handleSave = useCallback(async (fp: FloorPlanState, sceneConfig?: SceneConfig) => {
        setSaving(true)
        setError(null)
        try {
            const sceneJSON = floorPlanStateToSceneJSON(fp, sceneConfig!)

            const res = await fetch('/api/workspace/save-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId, scene_json: sceneJSON }),
            })

            if (!res.ok) {
                const body = await res.json() as { error?: string }
                throw new Error(body.error ?? 'Failed to save')
            }
            const stateRes = await fetch('/api/workspace/floorplan-editor-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    state: { floorPlanState: fp, sceneConfig },
                }),
            })

            if (!stateRes.ok) {
                const body = await stateRes.json() as { error?: string }
                throw new Error(body.error ?? 'Failed to save editor state')
            }

            onSaved(sceneJSON)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }, [projectId, onSaved])


    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
        }}>
            {saving && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 200,
                    background: 'rgba(10,9,7,0.7)', display: 'grid', placeItems: 'center',
                }}>
                    <div style={{ fontSize: 14, color: 'rgba(165,168,255,0.9)' }}>Saving floor plan…</div>
                </div>
            )}

            {error && (
                <div style={{
                    position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 200, background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    borderRadius: 8, padding: '8px 16px', fontSize: 12,
                    color: 'rgba(248,113,113,0.9)',
                }}>
                    {error}
                </div>
            )}

            <FloorPlanEditor
                onSave={handleSave}
                onClose={onClose}
                initialState={initialFloorPlanState ?? undefined}
                initialSceneConfig={initialSceneConfig ?? undefined}
                isSaving={saving}
                isSaved={saved}
            />
        </div>
    )
}