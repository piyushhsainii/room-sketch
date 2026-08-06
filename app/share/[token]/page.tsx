'use client'



import { useEffect, useState, useRef, use } from 'react'

import { useSearchParams } from 'next/navigation'

import { Canvas } from '@react-three/fiber'

import { Suspense } from 'react'

import SceneErrorBoundary from '@/components/workspace/objects/error-boundary'

import type { SceneJSON } from '@/types/workspace'

import { sceneJSONToFloorPlanState } from '@/lib/workspace/floorPlanConvertor'

import Scene3D, { Scene3DHandle } from '@/components/workspace/3DScene'

import { getBuiltInViews } from '@/components/workspace/lib/camera'

// ASSUMPTION: DEFAULT_SCENE_CONFIG exists here — same lib/constants that

// exports DEFAULT_FP elsewhere (seen in WorkspaceNav's "Clear" button).

// If it's exported under a different name/path, fix this import.

import { DEFAULT_SCENE_CONFIG } from '@/components/workspace/lib/constants'

import * as THREE from "three"

import { PublicFloorPlan2D } from '@/components/dashboard/PublicFloorPlan2d'



function CubeLogo() {

  return (

    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">

      <path d="M12 2L21 6.5V17.5L12 22L3 17.5V6.5L12 2Z" stroke="#12213E" strokeWidth="1.6" strokeLinejoin="round" />

      <path d="M12 2V22M3 6.5L12 11M21 6.5L12 11" stroke="#12213E" strokeWidth="1.6" strokeLinejoin="round" />

    </svg>

  )

}



function EyeIcon() {

  return (

    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">

      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />

      <circle cx="12" cy="12" r="3" />

    </svg>

  )

}



function WalkIcon() {

  return (

    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">

      <circle cx="13" cy="4" r="1.6" />

      <path d="M10.5 21l1.5-6 2 2 1 4M8 14l2-5 3 1 3 4M9 9l2.5-2.5" />

    </svg>

  )

}



export default function SharePage({ params }: { params: Promise<{ token: string }> }) {

  const { token } = use(params)

  const searchParams = useSearchParams()

  const viewId = searchParams.get('view')



  const [data, setData] = useState<{

    project_name: string

    scene_json: SceneJSON

    builder: { full_name: string | null; avatar_url: string | null } | null

  } | null>(null)

  const [notFound, setNotFound] = useState(false)

  const [View, setView] = useState<'2d' | '3d'>('3d')

  const [walkMode, setWalkMode] = useState(false)

  const scene3DRef = useRef<Scene3DHandle>(null)

  const exportRootRef = useRef<THREE.Group>(null)



  useEffect(() => {

    fetch(`/api/workspace/share/${token}`)

      .then(res => {

        if (!res.ok) throw new Error('not found')

        return res.json()

      })

      .then(setData)

      .catch(() => setNotFound(true))

  }, [token])



  const converted = data ? sceneJSONToFloorPlanState(data.scene_json) : null

  const fp = converted?.fp ?? null

  // Fallback to DEFAULT_SCENE_CONFIG — previously this could be `undefined`

  // and get passed straight into Scene3D, which expects a real SceneConfig.

  const sceneConfig = converted?.sceneConfig ?? DEFAULT_SCENE_CONFIG

  const singleFloor = fp
    ? {
      id: 'shared-floor',
      label: data?.project_name ?? 'Floor',
      order: 0,
      elevation: 0,
      visible: true,
      state: fp,
    }
    : null

  useEffect(() => {

    if (!viewId || !fp) return

    const target = [...getBuiltInViews(fp), ...(fp.savedViews ?? [])].find(v => v.id === viewId)

    if (!target) return

    const t = setTimeout(() => scene3DRef.current?.flyTo(target), 50)

    return () => clearTimeout(t)

  }, [fp, viewId])



  if (notFound) {

    return (

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, height: '100vh', fontFamily: 'system-ui', background: '#FAFAF8' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          <CubeLogo />

          <span style={{ fontSize: 16, fontWeight: 600, color: '#12213E', letterSpacing: '-0.01em' }}>roomsketch</span>

        </div>

        <div style={{ textAlign: 'center' }}>

          <h2 style={{ margin: '0 0 4px', fontSize: 17, color: '#0F172A' }}>Link not found</h2>

          <p style={{ color: '#666', margin: 0, fontSize: 13.5 }}>This share link is invalid or no longer active.</p>

        </div>

      </div>

    )

  }



  if (!data || !fp) {

    return (

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, height: '100vh', fontFamily: 'system-ui', background: '#FAFAF8', color: '#94A3B8', fontSize: 13 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          <CubeLogo />

          <span style={{ fontSize: 16, fontWeight: 600, color: '#12213E', letterSpacing: '-0.01em' }}>roomsketch</span>

        </div>

        Loading…

      </div>

    )

  }



  return (

    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui' }}>

      <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, borderBottom: '1px solid rgba(15,23,42,0.08)', background: '#fff' }}>

        {/* Branding */}

        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>

          <CubeLogo />

          <span style={{ fontSize: 15.5, fontWeight: 600, color: '#12213E', letterSpacing: '-0.01em' }}>roomsketch</span>

        </a>



        <div style={{ width: 1, height: 22, background: 'rgba(15,23,42,0.1)', flexShrink: 0 }} />



        <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>

          {data.project_name}

        </span>



        <div style={{ flex: 1 }} />



        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 9, background: '#F1F5F9', border: '1px solid rgba(15,23,42,0.06)' }}>

          <button

            onClick={() => setView('3d')}

            style={{

              display: 'flex', alignItems: 'center', gap: 6,

              height: 32, padding: '0 14px', borderRadius: 7, border: 'none',

              background: View === '3d' ? '#12213E' : 'transparent',

              color: View === '3d' ? '#fff' : 'rgba(15,23,42,0.55)',

              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'background 150ms ease, color 150ms ease',

            }}

          >

            3D View

          </button>

          <button

            onClick={() => setView('2d')}

            style={{

              display: 'flex', alignItems: 'center', gap: 6,

              height: 32, padding: '0 14px', borderRadius: 7, border: 'none',

              background: View === '2d' ? '#12213E' : 'transparent',

              color: View === '2d' ? '#fff' : 'rgba(15,23,42,0.55)',

              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'background 150ms ease, color 150ms ease',

            }}

          >

            2D Plan

          </button>

        </div>



        {View === '3d' && (

          <button

            onClick={() => setWalkMode(w => !w)}

            style={{

              display: 'flex', alignItems: 'center', gap: 7,

              height: 38, padding: '0 16px', borderRadius: 9, border: walkMode ? 'none' : '1px solid rgba(15,23,42,0.12)',

              background: walkMode ? '#12213E' : '#fff',

              color: walkMode ? '#fff' : '#0F172A',

              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'background 150ms ease, color 150ms ease',

            }}

          >

            <WalkIcon />

            {walkMode ? 'Exit Walk Mode' : 'Walk Mode'}

          </button>

        )}

      </div>



      <div style={{ flex: 1, position: 'relative' }}>

        {View === '3d' ? (

          <Canvas shadows camera={{ position: [8, 10, 12], fov: 50, near: 0.1, far: 500 }}>

            <SceneErrorBoundary fallback={null}>

              <Suspense fallback={null}>

                <Scene3D
                  exportRootRef={exportRootRef}
                  ref={scene3DRef}
                  activeFp={fp!}
                  activeFloorId={singleFloor?.id ?? ''}
                  floors={singleFloor ? [singleFloor] : []}
                  showUnderlay={false}
                  viewMode="single"
                  selectedId={null}
                  sceneConfig={sceneConfig}
                  walkMode={walkMode}
                  interactiveMode={false}

                />

              </Suspense>

            </SceneErrorBoundary>

          </Canvas>

        ) : (

          <PublicFloorPlan2D fp={fp} />

        )}

        {data.builder && (data.builder.full_name || data.builder.avatar_url) && (

          <div

            style={{

              position: 'absolute', bottom: 16, right: 16, zIndex: 10,

              display: 'flex', alignItems: 'center', gap: 9,

              padding: '9px 14px 9px 9px', borderRadius: 999,

              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',

              border: '1px solid rgba(15,23,42,0.08)',

              boxShadow: '0 4px 16px rgba(15,23,42,0.10)',

            }}

          >

            {data.builder.avatar_url ? (

              <img

                src={data.builder.avatar_url}

                alt=""

                style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}

              />

            ) : (

              <div

                style={{

                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,

                  background: '#12213E', color: '#fff', fontSize: 11, fontWeight: 700,

                  display: 'flex', alignItems: 'center', justifyContent: 'center',

                }}

              >

                {(data.builder.full_name ?? '?').charAt(0).toUpperCase()}

              </div>

            )}

            <div style={{ lineHeight: 1.25 }}>

              <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(15,23,42,0.4)' }}>

                Built by

              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>

                {data.builder.full_name ?? 'roomsketch user'}

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  )

}