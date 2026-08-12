import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef } from "react"
import { OrbitControls, Sky } from "@react-three/drei"
import { DEFAULT_SCENE_CONFIG, DEFAULT_FP, FloorPlanState } from "./lib/constants"
import { WalkModeControls } from "./WalkModeControls"
import { SceneConfig } from "./FloorPlanEditor"
import { CameraView } from "./lib/camera"
import { useThree } from "@react-three/fiber"
import { computeTopDownView, getFloorContentBounds } from "@/lib/helpers"
import * as THREE from "three"
import { sunIntensity, sunLightColor, sunPosition, sunVectorFromAngles } from "./lib/sunPosition"
import { Floor } from "./lib/floor-data"
import { FloorGeometry } from "./FloorGeometry"
import { resolveShadowEligibleLightIdsAcrossFloors } from "./lib/lights/resolveLightPosition"

export type Scene3DHandle = {
    flyTo: (view: CameraView) => void
    getCurrentView: () => { position: [number, number, number]; target: [number, number, number] } | null
    captureSnapshot: () => Promise<Blob | null>
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
        captureSnapshot: async (): Promise<Blob | null> => {
            const canvasEl = gl.domElement
            const aspect = canvasEl.width / canvasEl.height
            const fovDegrees = (camera as THREE.PerspectiveCamera).fov ?? 45
            const topView = computeTopDownView(activeFp, aspect, fovDegrees)

            const snapCamera = camera.clone() as THREE.PerspectiveCamera
            snapCamera.position.set(...topView.position)
            snapCamera.lookAt(new THREE.Vector3(...topView.target))
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

        // Fallback: no geometry anywhere yet (blank new floor) — center on origin at a
        // reasonable default distance instead of leaving the camera at its stale/default spot.
        const cx = hasContent ? (minX + maxX) / 2 : 0
        const cz = hasContent ? (minZ + maxZ) / 2 : 0
        const midY = (minElev + maxElev) / 2
        const span = hasContent ? Math.max(maxX - minX, maxZ - minZ, maxElev - minElev, 5) : 10

        controls.object.position.set(cx, midY + span * 1.6, cz + 0.01)
        controls.target.set(cx, midY, cz)
        controls.update()
        invalidate()
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
    const sunIntensityVal = sunEnabled ? sunIntensity(sunTimeOfDay) : 2.5

    const sunAzRad = (azimuth * Math.PI) / 180
    const sunElRad = (elevation * Math.PI) / 180
    const sunDirX = Math.cos(sunElRad) * Math.sin(sunAzRad)
    const sunDirY = Math.sin(sunElRad)
    const sunDirZ = -Math.cos(sunElRad) * Math.cos(sunAzRad)

    let floorsToRender: { floor: Floor; opacity: number; renderCap?: boolean }[] = []

    if (viewMode === 'single') {
        // Only the active floor. Nothing else.
        floorsToRender = activeFloor ? [{ floor: activeFloor, opacity: 1 }] : []
    } else if (viewMode === 'stacked') {
        // Active floor + every floor below it, all full opacity — no fading.
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

    const shadowEligibleIds = useMemo(
        () => resolveShadowEligibleLightIdsAcrossFloors(floorsToRender.map(f => f.floor.state)),
        [floorsToRender]
    )

    useEffect(() => {
        invalidate()
    }, [viewMode, floors, showUnderlay, activeFloorId, invalidate])
    return (
        <>
            <color attach="background" args={['#FFFFFF']} />
            <mesh
                position={[0, groundPlaneY + 0.01, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={(e) => { e.stopPropagation(); onSelect?.(null) }}
                visible={false}
            >
                <planeGeometry args={[500, 500]} />
                <meshStandardMaterial color="#F5F5F3" roughness={0.9} />
            </mesh>
            <fog attach="fog" args={['#F2F2F0', 30, 90]} />

            <ambientLight intensity={sunEnabled ? cfg.ambientIntensity * 0.4 : cfg.ambientIntensity} color="#FFF8F0" />

            <directionalLight
                color={sunColor}
                intensity={sunIntensityVal}
                position={sunEnabled ? [sunCx + sunVec.x, Math.max(sunVec.y, 1), sunCz + sunVec.z] : [10, 15, 10]}
                castShadow
                shadow-mapSize={[2048, 2048]}
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
                <color attach="background" args={['#FFFFFF']} />
            )}

            <directionalLight position={[-5, 8, -5]} intensity={sunEnabled ? 0.3 : 0.8} color="#C8D4E8" />
            {cfg.fogEnabled && !sunEnabled && <fog attach="fog" args={['#F2F2F0', 20, 60]} />}

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

            {floorsToRender.map(({ floor, opacity, renderCap }) => {
                const floorAbove = renderCap
                    ? floors
                        .filter(f => f.visible && f.order > floor.order)
                        .sort((a, b) => a.order - b.order)[0]
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

export default memo(Scene3D)