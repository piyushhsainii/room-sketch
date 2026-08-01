// import { useState } from 'react'
// import { SceneConfig } from '../workspace/FloorPlanEditor'

// function formatTime(t: number): string {
//     const h = Math.floor(t)
//     const m = Math.round((t - h) * 60)
//     const period = h >= 12 ? 'PM' : 'AM'
//     const h12 = h % 12 === 0 ? 12 : h % 12
//     return `${h12}:${m.toString().padStart(2, '0')} ${period}`
// }

// export function SunScenePanel({
//     sceneConfig,
//     onChange,
// }: {
//     sceneConfig: SceneConfig
//     onChange: (patch: Partial<SceneConfig>) => void
// }) {
//     const [open, setOpen] = useState(false)
//     const enabled = sceneConfig.sunToolEnabled ?? false
//     const timeOfDay = sceneConfig.sunTimeOfDay ?? 12
//     const heading = sceneConfig.sunCompassHeading ?? 180

//     const onDialPointer = (e: React.PointerEvent<HTMLDivElement>) => {
//         const el = e.currentTarget
//         const move = (ev: PointerEvent) => {
//             const rect = el.getBoundingClientRect()
//             const cx = rect.left + rect.width / 2
//             const cy = rect.top + rect.height / 2
//             const angle = Math.atan2(ev.clientX - cx, -(ev.clientY - cy))
//             let deg = (angle * 180) / Math.PI
//             if (deg < 0) deg += 360
//             onChange({ sunCompassHeading: Math.round(deg) })
//         }
//         const up = () => {
//             window.removeEventListener('pointermove', move)
//             window.removeEventListener('pointerup', up)
//         }
//         window.addEventListener('pointermove', move)
//         window.addEventListener('pointerup', up)
//         move(e.nativeEvent)
//     }

//     return (
//         <div style={{ position: 'relative' }}>
//             <button
//                 onClick={() => setOpen(o => !o)}
//                 title="Sun & Lighting"
//                 style={{
//                     width: 40, height: 40, borderRadius: 10, cursor: 'pointer',
//                     border: open || enabled ? '1px solid var(--fp-accent-border, rgba(99,102,241,0.4))' : '1px solid transparent',
//                     background: open || enabled ? 'var(--fp-accent-bg, rgba(99,102,241,0.1))' : 'transparent',
//                     color: open || enabled ? 'var(--fp-accent, #6366F1)' : 'var(--fp-text-muted, rgba(26,26,26,0.55))',
//                     display: 'flex', alignItems: 'center', justifyContent: 'center',
//                     transition: 'all 150ms cubic-bezier(0.34,1.56,0.64,1)',
//                     transform: open ? 'scale(1.06)' : 'scale(1)',
//                 }}
//             >
//                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                     <circle cx="12" cy="12" r="4" />
//                     <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
//                 </svg>
//             </button>

//             {open && (
//                 <div style={{
//                     position: 'absolute', right: 50, top: 0, width: 240,
//                     background: 'var(--fp-bg, #FFFFFF)',
//                     border: '1px solid var(--fp-border, rgba(15,15,15,0.08))',
//                     borderRadius: 14,
//                     boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
//                     padding: 16, display: 'flex', flexDirection: 'column', gap: 18,
//                     zIndex: 90,
//                 }}>
//                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                         <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fp-text, #1A1A1A)' }}>
//                             Sun & Lighting
//                         </span>
//                         <button
//                             onClick={() => setOpen(false)}
//                             style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fp-text-muted, rgba(26,26,26,0.5))', fontSize: 14, padding: 2 }}
//                         >
//                             ✕
//                         </button>
//                     </div>

//                     <label style={{
//                         display: 'flex', alignItems: 'center', justifyContent: 'space-between',
//                         fontSize: 13, color: 'var(--fp-text, #1A1A1A)', cursor: 'pointer',
//                     }}>
//                         <span>Enable sun override</span>
//                         <input
//                             type="checkbox"
//                             checked={enabled}
//                             onChange={e => onChange({ sunToolEnabled: e.target.checked })}
//                             style={{ width: 16, height: 16, accentColor: 'var(--fp-accent, #6366F1)' }}
//                         />
//                     </label>

//                     <div style={{
//                         opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none',
//                         display: 'flex', flexDirection: 'column', gap: 18,
//                     }}>
//                         <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
//                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fp-text-muted, rgba(26,26,26,0.55))' }}>
//                                 <span>Time of day</span>
//                                 <span style={{ fontWeight: 600, color: 'var(--fp-text, #1A1A1A)' }}>{formatTime(timeOfDay)}</span>
//                             </div>
//                             <input
//                                 type="range" min={0} max={24} step={0.25} value={timeOfDay}
//                                 onChange={e => onChange({ sunTimeOfDay: parseFloat(e.target.value) })}
//                                 style={{ width: '100%', accentColor: 'var(--fp-accent, #6366F1)' }}
//                             />
//                         </div>

//                         <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
//                             <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, color: 'var(--fp-text-muted, rgba(26,26,26,0.55))' }}>
//                                 <span>Compass heading</span>
//                                 <span style={{ fontWeight: 600, color: 'var(--fp-text, #1A1A1A)' }}>{Math.round(heading)}°</span>
//                             </div>
//                             <div
//                                 onPointerDown={onDialPointer}
//                                 style={{
//                                     width: 120, height: 120, borderRadius: '50%',
//                                     border: '1px solid var(--fp-border, rgba(15,15,15,0.12))',
//                                     position: 'relative', cursor: 'grab',
//                                     background: 'radial-gradient(circle, rgba(99,102,241,0.04), transparent 70%)',
//                                 }}
//                             >
//                                 <span style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--fp-text-muted, rgba(26,26,26,0.5))', fontWeight: 600 }}>N</span>
//                                 <span style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--fp-text-muted, rgba(26,26,26,0.4))' }}>S</span>
//                                 <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--fp-text-muted, rgba(26,26,26,0.4))' }}>W</span>
//                                 <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--fp-text-muted, rgba(26,26,26,0.4))' }}>E</span>
//                                 <div
//                                     style={{
//                                         position: 'absolute', top: '50%', left: '50%', width: 3, height: 48,
//                                         background: 'var(--fp-accent, #6366F1)', borderRadius: 2,
//                                         transformOrigin: 'top center',
//                                         transform: `translate(-50%, 0) rotate(${heading}deg)`,
//                                     }}
//                                 />
//                                 <div style={{
//                                     position: 'absolute', top: '50%', left: '50%', width: 8, height: 8,
//                                     borderRadius: '50%', background: 'var(--fp-accent, #6366F1)',
//                                     transform: 'translate(-50%, -50%)',
//                                 }} />
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     )
// }