'use client'
import { PublicFloorPlan2D } from "@/components/dashboard/PublicFloorPlan2d";
import { DEFAULT_SCENE_CONFIG } from "@/components/workspace/lib/constants";
import { ShareProject } from "@/components/workspace/lib/getShareProject";
import SceneErrorBoundary from "@/components/workspace/objects/error-boundary";
import { sceneJSONToFloorPlanState } from "@/lib/workspace/floorPlanConvertor";
import { Floor, ProjectFloorPlan } from "@/components/workspace/lib/floor-data";
import { SceneJSON } from "@/types/workspace";
import { Canvas } from "@react-three/fiber";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three"
import Scene3D, { Scene3DHandle } from '@/components/workspace/3DScene'
import { SceneConfig } from "@/components/workspace/FloorPlanEditor";

// ── Soft-UI (neumorphic) design tokens ──────────────────────────────────
// Light gray surface, raised elements via a dual light/dark soft shadow,
// pressed/active state via a subtle inset shadow instead of a hard fill.
const NEU = {
    surface: '#E8E9EC',
    surfaceRaised: '#F1F2F4',
    textDim: 'rgba(15,23,42,0.42)',
    textDimmer: 'rgba(15,23,42,0.28)',
    text: '#1E2434',
    shadowRaised: '6px 6px 14px rgba(163,168,178,0.55), -6px -6px 14px rgba(255,255,255,0.85)',
    shadowRaisedSm: '3px 3px 7px rgba(163,168,178,0.5), -3px -3px 7px rgba(255,255,255,0.85)',
    shadowInset: 'inset 3px 3px 7px rgba(163,168,178,0.55), inset -3px -3px 7px rgba(255,255,255,0.8)',
    shadowInsetLg: 'inset 4px 4px 10px rgba(163,168,178,0.5), inset -4px -4px 10px rgba(255,255,255,0.85)',
}

export default function ShareView({ token, initialData }: { token: string; initialData: ShareProject }) {
    const searchParams = useSearchParams()
    const viewId = searchParams.get('view')

    const data = initialData

    // ── Convert to a full multi-floor wrapper ─────────────────────────────
    // floorplan_editor_state is the real, live save the editor writes on
    // every change — { projectFloorPlan, sceneConfig }, per context.md §8.
    // scene_json is a derived single-floor snapshot that lags behind it
    // (context.md §7: "scene_json is derived from the active floor only").
    // Prefer the real state; only fall back to scene_json → migrateToMultiFloor()
    // for old rows saved before floorplan_editor_state existed.
    const converted = useMemo(() => {
        const editorState = data.floorplan_editor_state as
            | { projectFloorPlan?: ProjectFloorPlan; sceneConfig?: unknown }
            | null
            | undefined

        if (editorState?.projectFloorPlan) {
            return {
                projectFloorPlan: editorState.projectFloorPlan,
                sceneConfig: editorState.sceneConfig ?? DEFAULT_SCENE_CONFIG,
            }
        }

        // Legacy row — no floorplan_editor_state yet.
        return sceneJSONToFloorPlanState(data.scene_json as SceneJSON)
    }, [data.floorplan_editor_state, data.scene_json])

    const projectFloorPlan: ProjectFloorPlan | null = converted?.projectFloorPlan ?? null
    const sceneConfig = converted?.sceneConfig! ?? DEFAULT_SCENE_CONFIG

    const [View, setView] = useState<'2d' | '3d'>('3d')
    const [walkMode, setWalkMode] = useState(false)

    const [activeFloorId, setActiveFloorId] = useState<string>(
        projectFloorPlan?.activeFloorId ?? projectFloorPlan?.floors[0]?.id ?? ''
    )
    const [viewMode, setViewMode] = useState<ProjectFloorPlan['viewMode']>(
        projectFloorPlan?.viewMode ?? 'single'
    )
    const [showUnderlay, setShowUnderlay] = useState(projectFloorPlan?.showUnderlay ?? false)

    const scene3DRef = useRef<Scene3DHandle>(null)
    const exportRootRef = useRef<THREE.Group>(null)

    const floors: Floor[] = projectFloorPlan?.floors ?? []
    const activeFloor = floors.find(f => f.id === activeFloorId) ?? floors[0] ?? null
    const fp = activeFloor?.state ?? null

    function CubeLogo() {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L21 6.5V17.5L12 22L3 17.5V6.5L12 2Z" stroke="#12213E" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M12 2V22M3 6.5L12 11M21 6.5L12 11" stroke="#12213E" strokeWidth="1.6" strokeLinejoin="round" />
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

    function LayersIcon() {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
            </svg>
        )
    }

    // ── Soft-UI pill toggle group (used for View, and the viewMode row) ────
    function NeuToggleGroup<T extends string>({
        value, onChange, options,
    }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; title?: string; icon?: React.ReactNode }[] }) {
        return (
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: 4,
                    borderRadius: 999, background: NEU.surface, boxShadow: NEU.shadowInset,
                }}
            >
                {options.map(opt => {
                    const active = opt.value === value
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            title={opt.title}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                height: 34, padding: '0 16px', borderRadius: 999, border: 'none',
                                background: active ? NEU.surfaceRaised : 'transparent',
                                boxShadow: active ? NEU.shadowRaisedSm : 'none',
                                color: active ? NEU.text : NEU.textDim,
                                fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                transition: 'background 150ms ease, box-shadow 150ms ease, color 150ms ease',
                            }}
                        >
                            {opt.icon}
                            {opt.label}
                        </button>
                    )
                })}
            </div>
        )
    }

    // ── Soft-UI standalone pill button (Underlay / Walk Mode) ───────────────
    function NeuButton({
        active, onClick, children, title,
    }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
        return (
            <button
                onClick={onClick}
                title={title}
                style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    height: 40, padding: '0 18px', borderRadius: 999, border: 'none',
                    background: NEU.surfaceRaised,
                    boxShadow: active ? NEU.shadowInsetLg : NEU.shadowRaised,
                    color: active ? NEU.text : NEU.textDim,
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    transition: 'box-shadow 150ms ease, color 150ms ease',
                }}
            >
                {children}
            </button>
        )
    }

    return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui' }}>
            <div
                style={{
                    height: 72, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 18,
                    background: NEU.surface,
                    boxShadow: '0 2px 10px rgba(163,168,178,0.35)',
                    position: 'relative', zIndex: 5,
                }}
            >
                <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
                    <div
                        style={{
                            width: 34, height: 34, borderRadius: 12, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: NEU.surfaceRaised, boxShadow: NEU.shadowRaisedSm,
                        }}
                    >
                        <CubeLogo />
                    </div>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: '#12213E', letterSpacing: '-0.01em' }}>roomsketch</span>
                </a>

                <div
                    style={{
                        width: 1, height: 26, flexShrink: 0,
                        background: 'linear-gradient(180deg, rgba(163,168,178,0.5), rgba(255,255,255,0.7))',
                    }}
                />

                <span style={{ fontWeight: 700, fontSize: 14, color: NEU.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {data.project_name}
                </span>

                {floors.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                        <span
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, borderRadius: 10,
                                color: NEU.textDim, background: NEU.surfaceRaised, boxShadow: NEU.shadowRaisedSm,
                            }}
                        >
                            <LayersIcon />
                        </span>
                        <select
                            value={activeFloorId}
                            onChange={(e) => setActiveFloorId(e.target.value)}
                            style={{
                                height: 36, padding: '0 12px', borderRadius: 999,
                                border: 'none', background: NEU.surfaceRaised, boxShadow: NEU.shadowInset,
                                fontSize: 12.5, fontWeight: 600, color: NEU.text, cursor: 'pointer',
                                outline: 'none', appearance: 'none',
                            }}
                        >
                            {[...floors]
                                .sort((a, b) => a.order - b.order)
                                .filter(f => f.visible !== false)
                                .map(f => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                        </select>
                    </div>
                )}

                <div style={{ flex: 1 }} />

                <NeuToggleGroup
                    value={View}
                    onChange={setView}
                    options={[
                        { value: '3d', label: '3D View' },
                        { value: '2d', label: '2D Plan' },
                    ]}
                />

                {View === '3d' && floors.length > 1 && (
                    <NeuToggleGroup
                        value={viewMode}
                        onChange={setViewMode}
                        options={[
                            { value: 'single', label: 'Single', title: 'Only the selected floor' },
                            { value: 'stacked', label: 'Stacked', title: 'All floors, others dimmed' },
                            { value: 'stacked-full', label: 'Stacked (full)', title: 'All floors, full opacity' },
                        ]}
                    />
                )}

                {View === '3d' && viewMode === 'single' && (
                    <NeuButton
                        active={showUnderlay}
                        onClick={() => setShowUnderlay(u => !u)}
                        title="Show the floor directly below, faded"
                    >
                        Underlay
                    </NeuButton>
                )}

                {View === '3d' && (
                    <NeuButton active={walkMode} onClick={() => setWalkMode(w => !w)}>
                        <WalkIcon />
                        {walkMode ? 'Exit Walk Mode' : 'Walk Mode'}
                    </NeuButton>
                )}
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
                {!fp ? (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(15,23,42,0.4)', fontSize: 14, fontWeight: 500,
                    }}>
                        This floor plan isn't available.
                    </div>
                ) : View === '3d' ? (
                    <Canvas
                        shadows
                        frameloop="always"
                        gl={{
                            antialias: true,
                            alpha: false,
                            powerPreference: 'low-power',
                            stencil: true,
                            depth: true,
                            preserveDrawingBuffer: true,
                        }}
                        dpr={[1, 2]}
                        camera={{ position: [8, 10, 12], fov: 50, near: 0.1, far: 500 }}
                    >
                        <SceneErrorBoundary fallback={
                            <mesh>
                                <boxGeometry args={[0.001, 0.001, 0.001]} />
                            </mesh>
                        }>
                            <Suspense fallback={null}>
                                <Scene3D
                                    exportRootRef={exportRootRef}
                                    ref={scene3DRef}
                                    activeFp={fp}
                                    activeFloorId={activeFloor?.id ?? ''}
                                    floors={floors}
                                    showUnderlay={showUnderlay}
                                    viewMode={viewMode}
                                    selectedId={null}
                                    // @ts-ignore
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