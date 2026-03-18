'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { VIEWER, WORKSPACE } from '@/constants/content'
import type { SceneJSON, WorkspaceConfig, WorkspaceStatus } from '@/types/workspace'
import { DEFAULT_WORKSPACE_CONFIG } from '@/types/workspace'

import WorkspaceCanvas from '@/components/workspace/WorkspaceCanvas'
import WorkspaceLoader from '@/components/workspace/WorkspaceLoader'

type Props = {
  projectId: string
  floorplanUrl: string
  onExit: () => void
}

type ExtractResponse = {
  scene_json: SceneJSON
  workspace_config?: WorkspaceConfig | null
}

export default function WorkspaceContainer({ projectId, floorplanUrl, onExit }: Props) {
  const [status, setStatus] = useState<WorkspaceStatus>('idle')
  const [sceneJSON, setSceneJSON] = useState<SceneJSON | null>(null)
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig>(DEFAULT_WORKSPACE_CONFIG)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const stepTimerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)

  const clearStepTimer = useCallback(() => {
    if (stepTimerRef.current) {
      window.clearInterval(stepTimerRef.current)
      stepTimerRef.current = null
    }
  }, [])

  const startExtraction = useCallback(async () => {
    if (!floorplanUrl) {
      setStatus('error')
      setError(WORKSPACE.errorNoFloorplan)
      return
    }

    setError(null)
    setSceneJSON(null)
    setLoadingStep(0)
    setStatus('extracting')

    clearStepTimer()
    stepTimerRef.current = window.setInterval(() => {
      setLoadingStep((s) => (s < 3 ? s + 1 : s))
    }, 3000)

    try {
      // Extract scene JSON
      const res = await fetch('/api/workspace/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })

      const body = (await res.json()) as Partial<ExtractResponse> & { error?: string }
      if (!res.ok || !body.scene_json) {
        throw new Error(body.error ?? WORKSPACE.errorExtraction)
      }

      if (cancelledRef.current) return

      // Load saved config in parallel
      try {
        const cfgRes = await fetch(`/api/workspace/config?project_id=${projectId}`)
        if (cfgRes.ok) {
          const cfgBody = await cfgRes.json() as { workspace_config: WorkspaceConfig | null }
          if (cfgBody.workspace_config) {
            setWorkspaceConfig(cfgBody.workspace_config)
          }
        }
      } catch {
        // Non-fatal — use defaults
      }

      setStatus('building')
      setLoadingStep(4)

      await new Promise((r) => setTimeout(r, 300))
      if (cancelledRef.current) return
      setLoadingStep(5)
      await new Promise((r) => setTimeout(r, 300))
      if (cancelledRef.current) return
      setLoadingStep(6)
      await new Promise((r) => setTimeout(r, 300))
      if (cancelledRef.current) return

      setSceneJSON(body.scene_json)
      setStatus('ready')
      clearStepTimer()
    } catch (e) {
      clearStepTimer()
      setStatus('error')
      setError(e instanceof Error ? e.message : WORKSPACE.errorBuilding)
    }
  }, [clearStepTimer, floorplanUrl, projectId])

  useEffect(() => {
    cancelledRef.current = false
    void startExtraction()
    return () => {
      cancelledRef.current = true
      clearStepTimer()
    }
  }, [clearStepTimer, startExtraction])

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      overflow: 'hidden', zIndex: 50, padding: 16,
      background: 'rgba(2, 6, 23, 0.72)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'relative',
        width: 'min(1400px, 100%)',
        height: 'min(900px, 100%)',
        borderRadius: 18,
        overflow: 'hidden',
        background: '#1C1A17',
        border: '1px solid rgba(148,163,184,0.16)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
      }}>
        {(status === 'extracting' || status === 'building') && (
          <WorkspaceLoader status={status} currentStep={loadingStep} />
        )}

        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24 }}>
            <div style={{
              width: 'min(560px, 92vw)', borderRadius: 16,
              border: '1px solid rgba(148,163,184,0.16)',
              background: 'rgba(2,6,23,0.35)', padding: 16,
              color: 'rgba(226,232,240,0.92)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{WORKSPACE.errorBuilding}</div>
              <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.85)', marginBottom: 12 }}>
                {error ?? WORKSPACE.errorBuilding}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="ra-button ra-buttonPrimary" onClick={() => void startExtraction()}>
                  {VIEWER.regenerate}
                </button>
                <button type="button" className="ra-button ra-buttonGhost" onClick={onExit}>
                  {WORKSPACE.toolbar.exit}
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'ready' && sceneJSON && (
          <WorkspaceCanvas
            sceneJSON={sceneJSON}
            workspaceConfig={workspaceConfig}
            onConfigChange={setWorkspaceConfig}
            projectId={projectId}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  )
}