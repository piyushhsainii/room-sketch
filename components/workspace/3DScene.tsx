import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react"
import { Environment, OrbitControls, Sky } from "@react-three/drei"
import { DEFAULT_SCENE_CONFIG, DEFAULT_FP, FloorPlanState } from "./lib/constants"
import { WalkModeControls } from "./WalkModeControls"
import { SceneConfig } from "./FloorPlanEditor"
import { CameraView } from "./lib/camera"
import { useThree } from "@react-three/fiber"
import { computeTopDownView, getFloorContentBounds, useClickVsDrag } from "@/lib/helpers"
import * as THREE from "three"
import { sunIntensity, sunLightColor, sunPosition, sunVectorFromAngles } from "./lib/sunPosition"
import { Floor } from "./lib/floor-data"
import { FloorGeometry } from "./FloorGeometry"
import { resolveShadowEligibleLightIdsAcrossFloors } from "./lib/lights/resolveLightPosition"

// Neutral clay-gray backdrop instead of stark white — keeps the model from
// dissolving into an infinite white void and matches the app's canvas color
// elsewhere. Stage platform is a slightly lighter tone so it still reads as
// a distinct surface against this background.
const SCENE_BG = '#E5E5E5'
const STAGE_COLOR = '#EEEEEC'
const FOG_COLOR = '#E2E2E0'

export type Scene3DHandle = {
    flyTo: (view: CameraView) => void
    getCurrentView: () => { position: [number, number, number]; target: [number, number, number] } | null
    captureSnapshot: (view?: CameraView) => Promise<Blob | null>
}

type Scene3DProps = {
    exportRootRef: any
    floors: Floor[]
    activeFloorId: string
    activeFp: FloorPlanState
    viewMode: 'single' | 'stacked' | 'stacked-full'
    showUnderlay: boolean
    sceneConfig?: SceneConfig
    walkMode?: boolean
    interactiveMode?: boolean
    selectedId?: string | null
    onSelect?: (id: string | null) => void
    onToggleDoorOpen?: (openingId: string) => void
    overlappingIds?: Set<string>
    cutoutDrawInProgress: boolean
}

const Scene3D = forwardRef<Scene3DHandle, Scene3DProps>(function Scene3D(
    {
        exportRootRef,
        floors,
        activeFloorId,
        viewMode,
        showUnderlay,
        sceneConfig,
        walkMode = false,
        interactiveMode = false,
        selectedId,
        onSelect,
        onToggleDoorOpen,
        overlappingIds,
        activeFp: liveFp,
        cutoutDrawInProgress
    },
    ref
) {
    const cfg = sceneConfig ?? DEFAULT_SCENE_CONFIG
    const controlsRef = useRef<any>(null)
    const { gl, scene, camera, invalidate } = useThree()

    const activeFloor = floors.find(f => f.id === activeFloorId)
    const activeFp: FloorPlanState = liveFp ?? activeFloor?.state ?? DEFAULT_FP
    const activeElevation = activeFloor?.elevation ?? 0

    useImperativeHandle(ref, () => ({
        flyTo: (view: CameraView) => {
            const apply = () => {
                const controls = controlsRef.current
                if (!controls) {
                    requestAnimationFrame(apply)
                    return
                }
                controls.object.position.set(...view.position)
                controls.target.set(...view.target)
                controls.update()
            }
            apply()
        },
        getCurrentView: () => {
            const controls = controlsRef.current
            if (!controls) return null
            return {
                position: controls.object.position.toArray() as [number, number, number],
                target: controls.target.toArray() as [number, number, number],
            }
        },
        captureSnapshot: async (view?: CameraView): Promise<Blob | null> => {
            const canvasEl = gl.domElement
            const aspect = canvasEl.width / canvasEl.height
            const fovDegrees = (camera as THREE.PerspectiveCamera).fov ?? 45

            // Use the caller-provided view if given; otherwise keep the existing
            // default (computed top-down framing of the active floor's content).
            const resolvedPosition = view?.position ?? computeTopDownView(activeFp, aspect, fovDegrees).position
            const resolvedTarget = view?.target ?? computeTopDownView(activeFp, aspect, fovDegrees).target

            const snapCamera = camera.clone() as THREE.PerspectiveCamera
            snapCamera.position.set(...resolvedPosition)
            snapCamera.lookAt(new THREE.Vector3(...resolvedTarget))
            snapCamera.updateProjectionMatrix()

            const width = canvasEl.width
            const height = canvasEl.height
            const renderTarget = new THREE.WebGLRenderTarget(width, height, {
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType,
            })

            const prevTarget = gl.getRenderTarget()
            gl.setRenderTarget(renderTarget)
            gl.render(scene, snapCamera)

            const pixels = new Uint8Array(width * height * 4)
            gl.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixels)
            gl.setRenderTarget(prevTarget)
            renderTarget.dispose()

            const offscreen = document.createElement('canvas')
            offscreen.width = width
            offscreen.height = height
            const ctx = offscreen.getContext('2d')!
            const imageData = ctx.createImageData(width, height)

            const rowBytes = width * 4
            for (let y = 0; y < height; y++) {
                const srcStart = (height - y - 1) * rowBytes
                imageData.data.set(pixels.subarray(srcStart, srcStart + rowBytes), y * rowBytes)
            }
            ctx.putImageData(imageData, 0, 0)

            return new Promise<Blob | null>((resolve) => {
                offscreen.toBlob((b) => resolve(b), 'image/jpeg', 0.82)
            })
        },
    }), [gl, activeFp])

    useEffect(() => {
        if (walkMode) return
        const controls = controlsRef.current
        if (!controls) return

        const isStacked = viewMode !== 'single'
        const relevantFloors = isStacked ? floors.filter(f => f.visible) : (activeFloor ? [activeFloor] : [])

        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
        let minElev = 0, maxElev = 0
        let hasContent = false

        for (const f of relevantFloors) {
            const src = f.id === activeFloorId ? activeFp : f.state
            const b = getFloorContentBounds(src)
            if (b) {
                hasContent = true
                minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX)
                minZ = Math.min(minZ, b.minZ); maxZ = Math.max(maxZ, b.maxZ)
            }
            const relElev = f.elevation - activeElevation
            minElev = Math.min(minElev, relElev)
            maxElev = Math.max(maxElev, relElev + f.state.roomHeight)
        }

        const cx = hasContent ? (minX + maxX) / 2 : 0
        const cz = hasContent ? (minZ + maxZ) / 2 : 0
        const midY = (minElev + maxElev) / 2
        const span = hasContent ? Math.max(maxX - minX, maxZ - minZ, maxElev - minElev, 5) : 10

        const targetPos = new THREE.Vector3(cx, midY + span * 1.6, cz + 0.01)
        const targetLookAt = new THREE.Vector3(cx, midY, cz)
        const startPos = controls.object.position.clone()
        const startLookAt = controls.target.clone()

        const start = performance.now()
        const duration = 600
        let raf = 0

        function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

        function tick(now: number) {
            const t = Math.min(1, (now - start) / duration)
            const k = easeOutCubic(t)
            controls.object.position.lerpVectors(startPos, targetPos, k)
            controls.target.lerpVectors(startLookAt, targetLookAt, k)
            controls.update()
            invalidate()
            if (t < 1) raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFloorId, viewMode])

    const sunTimeOfDay = cfg.sunTimeOfDay ?? 12
    const sunCompassHeading = cfg.sunCompassHeading ?? 180
    const sunEnabled = cfg.sunToolEnabled ?? false

    const sunAllX = [...activeFp.rooms.flatMap(r => [r.x, r.x + r.width]), ...activeFp.lineNodes.map((n) => n.x)]
    const sunAllZ = [...activeFp.rooms.flatMap(r => [r.z, r.z + r.depth]), ...activeFp.lineNodes.map((n) => n.z)]
    const sunCx = sunAllX.length ? (Math.min(...sunAllX) + Math.max(...sunAllX)) / 2 : 0
    const sunCz = sunAllZ.length ? (Math.min(...sunAllZ) + Math.max(...sunAllZ)) / 2 : 0
    const sunSpan = sunAllX.length ? Math.max(Math.max(...sunAllX) - Math.min(...sunAllX), Math.max(...sunAllZ) - Math.min(...sunAllZ), 5) : 10

    const { azimuth, elevation } = sunPosition(sunTimeOfDay, sunCompassHeading)
    const sunVec = sunVectorFromAngles(azimuth, elevation, sunSpan * 2.5)
    const sunColor = sunEnabled ? sunLightColor(sunTimeOfDay) : '#FFF5E8'
    const sunIntensityVal = sunEnabled ? sunIntensity(sunTimeOfDay) * 2.2 : 2.5

    const sunAzRad = (azimuth * Math.PI) / 180
    const sunElRad = (elevation * Math.PI) / 180
    const sunDirX = Math.cos(sunElRad) * Math.sin(sunAzRad)
    const sunDirY = Math.sin(sunElRad)
    const sunDirZ = -Math.cos(sunElRad) * Math.cos(sunAzRad)
    const isNight = !sunEnabled || sunTimeOfDay < 6 || sunTimeOfDay > 19.5

    let floorsToRender: { floor: Floor; opacity: number; renderCap?: boolean }[] = []

    if (viewMode === 'single') {
        floorsToRender = activeFloor ? [{ floor: activeFloor, opacity: 1 }] : []
    } else if (viewMode === 'stacked') {
        floorsToRender = floors
            .filter(f => f.visible && (f.id === activeFloorId || (activeFloor && f.order < activeFloor.order)))
            .map(f => ({
                floor: f,
                opacity: 1,
                renderCap: activeFloor ? f.order < activeFloor.order : false,
            }))
    } else {
        // stacked-full — everything, full opacity, regardless of active floor's position
        floorsToRender = floors.filter(f => f.visible).map(f => ({
            floor: f,
            opacity: 1,
            renderCap: activeFloor ? f.order < activeFloor.order : false,
        }))
    }
    const lowestGroupY = floorsToRender.length > 0
        ? Math.min(...floorsToRender.map(({ floor }) => floor.elevation - activeElevation))
        : 0
    const groundPlaneY = lowestGroupY - 0.02

    // Stage platform sizing — reuses the same content-bounds calc already
    // driving the shadow camera (sunCx/sunCz/sunSpan) so the platform always
    // comfortably contains whatever's on the active floor(s), with margin so
    // the building doesn't look like it's balanced right at the edge.
    const stageRadius = Math.max(sunSpan * 0.85, 6)

    const shadowEligibleIds = useMemo(
        () => resolveShadowEligibleLightIdsAcrossFloors(floorsToRender.map(f => f.floor.state)),
        [floorsToRender]
    )
    const envPreset = useMemo(() => (sunEnabled ? "sunset" : "apartment"), [sunEnabled])
    const shadowExtent = Math.max(sunSpan * 1.15, 4)
    const downPos = useRef<{ x: number; y: number } | null>(null)

    const deselect = useCallback((e: any) => {
        e.stopPropagation()
        onSelect?.(null)
    }, [onSelect])
    const groundClickHandlers = useClickVsDrag(deselect)

    useEffect(() => {
        invalidate()
    }, [viewMode, floors, showUnderlay, activeFloorId, invalidate])
    return (
        <>
            <color attach="background" args={[SCENE_BG]} />

            {/* Visible staging platform — a circular disc the model sits on,
                sized to the active floor(s)' content bounds with margin.
                receiveShadow picks up the directional light's cast shadow
                (already enabled below), giving the grounded, staged look
                instead of the model floating in an infinite void. */}
            <mesh
                position={[sunCx, groundPlaneY, sunCz]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
            >
                <circleGeometry args={[stageRadius, 64]} />
                <meshStandardMaterial color={STAGE_COLOR} roughness={0.95} />
            </mesh>

            <mesh
                position={[0, groundPlaneY + 0.01, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                {...groundClickHandlers}
                visible={false}
            >
                <planeGeometry args={[500, 500]} />
                <meshStandardMaterial color="#F5F5F3" roughness={0.9} />
            </mesh>
            <fog attach="fog" args={[FOG_COLOR, 30, 90]} />

            <Environment preset={envPreset} background={false} />

            <directionalLight
                color={sunColor}
                intensity={sunIntensityVal}
                position={sunEnabled ? [sunCx + sunVec.x, Math.max(sunVec.y, 1), sunCz + sunVec.z] : [10, 15, 10]}
                target-position={[sunCx, 0, sunCz]}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-shadowExtent}
                shadow-camera-right={shadowExtent}
                shadow-camera-top={shadowExtent}
                shadow-camera-bottom={-shadowExtent}
                shadow-camera-near={0.1}
                shadow-camera-far={sunSpan * 6}
                shadow-bias={-0.0003}
                shadow-normalBias={0.02}
            />
            {sunEnabled ? (
                <Sky
                    distance={450000}
                    sunPosition={[sunDirX, Math.max(sunDirY, -0.05), sunDirZ]}
                    turbidity={8}
                    rayleigh={sunDirY > 0.15 ? 2 : 4}
                    mieCoefficient={0.005}
                    mieDirectionalG={0.8}
                />
            ) : (
                <color attach="background" args={[SCENE_BG]} />
            )}

            <directionalLight position={[-5, 8, -5]} intensity={sunEnabled ? 0.15 : 0.8} color="#C8D4E8" />
            {cfg.fogEnabled && !sunEnabled && <fog attach="fog" args={[FOG_COLOR, 20, 60]} />}

            {interactiveMode && (
                <mesh
                    position={[0, -0.01, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    onClick={(e) => { e.stopPropagation(); onSelect?.(null) }}
                    visible={false}
                >
                    <planeGeometry args={[500, 500]} />
                    <meshBasicMaterial />
                </mesh>
            )}

            {isNight && (
                <hemisphereLight
                    color="#3A4A6B"
                    groundColor="#1A1510"
                    intensity={0.6}
                />
            )}

            {floorsToRender.map(({ floor, opacity, renderCap }) => {
                const floorAbove = renderCap
                    ? floors.filter(f => f.visible && f.order > floor.order).sort((a, b) => a.order - b.order)[0]
                    : undefined

                const floorAboveFp = floorAbove
                    ? (floorAbove.id === activeFloorId ? activeFp : floorAbove.state)
                    : undefined

                return (
                    <group key={floor.id} position={[0, floor.elevation - activeElevation, 0]}>
                        <FloorGeometry
                            fp={floor.id === activeFloorId ? activeFp : floor.state}
                            cfg={cfg}
                            exportRootRef={floor.id === activeFloorId ? exportRootRef : undefined}
                            interactive={interactiveMode && floor.id === activeFloorId}
                            selectedId={floor.id === activeFloorId ? selectedId : null}
                            onSelect={floor.id === activeFloorId ? onSelect : undefined}
                            onToggleDoorOpen={floor.id === activeFloorId ? onToggleDoorOpen : undefined}
                            opacity={opacity}
                            renderCap={renderCap}
                            floorAboveFp={floorAboveFp}
                            floorAboveId={floorAbove?.id}
                            overlappingIds={overlappingIds}
                            shadowEligibleIds={shadowEligibleIds}
                            cutoutDrawInProgress={floor.id === activeFloorId ? cutoutDrawInProgress : false}
                        />
                    </group>
                )
            })}
            {walkMode ? (
                <WalkModeControls />
            ) : (
                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    enableDamping
                    dampingFactor={0.05}
                    minPolarAngle={0.05}
                    maxPolarAngle={Math.PI / 2 - 0.02}
                    minDistance={1}
                    maxDistance={100}
                    screenSpacePanning={false}
                />
            )}
        </>
    )
})

// Custom equality check instead of the default shallow-prop comparison.
// Scene3D was already wrapped in memo(), but was still re-rendering on every
// 2D-canvas hover tick — meaning some prop reference (a callback, a Set, or
// activeFp itself) was being recreated in the parent on every hover-state
// update. This explicit comparator stops Scene3D (and the whole 3D tree,
// including FloorGeometry and its shadow map recomputation) from re-rendering
// unless a prop that actually matters to the 3D scene changed.
//
// IMPORTANT: this treats onSelect/onToggleDoorOpen/exportRootRef as "always
// equal" (i.e. not compared) — see the note in the chat reply about why, and
// wrap those in useCallback in the parent so this assumption is actually safe.
function scene3DPropsAreEqual(prev: Scene3DProps, next: Scene3DProps) {
    return (
        prev.floors === next.floors &&
        prev.activeFloorId === next.activeFloorId &&
        prev.activeFp === next.activeFp &&
        prev.viewMode === next.viewMode &&
        prev.showUnderlay === next.showUnderlay &&
        prev.sceneConfig === next.sceneConfig &&
        prev.walkMode === next.walkMode &&
        prev.interactiveMode === next.interactiveMode &&
        prev.selectedId === next.selectedId &&
        prev.overlappingIds === next.overlappingIds &&
        prev.cutoutDrawInProgress === next.cutoutDrawInProgress
    )
}

export default memo(Scene3D, scene3DPropsAreEqual)