// 'use client'

// import { useEffect, useState, useRef, use } from 'react'
// import { useSearchParams } from 'next/navigation'
// import { Canvas } from '@react-three/fiber'
// import { Suspense } from 'react'
// import SceneErrorBoundary from '@/components/workspace/objects/error-boundary'
// import type { SceneJSON } from '@/types/workspace'
// import { sceneJSONToFloorPlanState } from '@/lib/workspace/floorPlanConvertor'
// import Scene3D, { Scene3DHandle } from '@/components/workspace/3DScene'
// import { PublicFloorPlan2D } from '@/components/dashboard/PublicFloorPlan2d'
// import { getBuiltInViews } from '@/components/workspace/lib/camera'
// import * as THREE from "three"

// export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
//   const { token } = use(params)   // unwrap the Promise once, at the top
//   const searchParams = useSearchParams()
//   const viewId = searchParams.get('view')

//   const [data, setData] = useState<{ project_name: string; scene_json: SceneJSON } | null>(null)
//   const [notFound, setNotFound] = useState(false)
//   const [View, setView] = useState<'2d' | '3d'>('3d')
//   const [walkMode, setWalkMode] = useState(false)
//   const scene3DRef = useRef<Scene3DHandle>(null)
//   const exportRootRef = useRef<THREE.Group>(null)

//   useEffect(() => {
//     fetch(`/api/workspace/share/${token}`)
//       .then(res => {
//         if (!res.ok) throw new Error('not found')
//         return res.json()
//       })
//       .then(setData)
//       .catch(() => setNotFound(true))
//   }, [token])

//   // Derive fp/sceneConfig unconditionally (before any early return) so hooks
//   // below can depend on them without breaking hook-order rules.
//   const converted = data ? sceneJSONToFloorPlanState(data.scene_json) : null
//   const fp = converted?.fp ?? null
//   const sceneConfig = converted?.sceneConfig

//   useEffect(() => {
//     if (!viewId || !fp) return
//     const target = [...getBuiltInViews(fp), ...(fp.savedViews ?? [])].find(v => v.id === viewId)
//     if (!target) return
//     // small delay to make sure OrbitControls ref is attached post-mount
//     const t = setTimeout(() => scene3DRef.current?.flyTo(target), 50)
//     return () => clearTimeout(t)
//   }, [fp, viewId])

//   if (notFound) {
//     return (
//       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui' }}>
//         <div style={{ textAlign: 'center' }}>
//           <h2>Link not found</h2>
//           <p style={{ color: '#666' }}>This share link is invalid or no longer active.</p>
//         </div>
//       </div>
//     )
//   }

//   if (!data || !fp) {
//     return (
//       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
//         Loading…
//       </div>
//     )
//   }

//   return (
//     <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui' }}>
//       <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, borderBottom: '1px solid #eee', background: '#fff' }}>
//         <span style={{ fontWeight: 700 }}>{data.project_name}</span>
//         <div style={{ flex: 1 }} />
//         <button onClick={() => setView(v => v === '3d' ? '2d' : '3d')} style={{ height: 30, padding: '0 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer' }}>
//           {View === '3d' ? 'View 2D Plan' : 'View 3D'}
//         </button>
//         {View === '3d' && (
//           <button onClick={() => setWalkMode(w => !w)} style={{ height: 30, padding: '0 12px', borderRadius: 6, border: '1px solid #ddd', background: walkMode ? '#eef' : '#fafafa', cursor: 'pointer' }}>
//             {walkMode ? 'Exit Walk Mode' : 'Walk Mode'}
//           </button>
//         )}
//       </div>

//       <div style={{ flex: 1, position: 'relative' }}>
//         {View === '3d' ? (
//           <Canvas shadows camera={{ position: [8, 10, 12], fov: 50, near: 0.1, far: 500 }}>
//             <SceneErrorBoundary fallback={null}>
//               <Suspense fallback={null}>
//                 <Scene3D
//                   exportRootRef={exportRootRef}
//                   ref={scene3DRef}
//                   fp={fp}
//                   sceneConfig={sceneConfig}
//                   walkMode={walkMode}
//                   interactiveMode={false}
//                 />
//               </Suspense>
//             </SceneErrorBoundary>
//           </Canvas>
//         ) : (
//           <PublicFloorPlan2D fp={fp} />
//         )}
//       </div>
//     </div>
//   )
// }

// import React from 'react'

const Page = () => {
  return (
    <div>  </div>
  )
}

export default Page