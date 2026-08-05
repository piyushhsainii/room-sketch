import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from "react"
import { OrbitControls, Sky } from "@react-three/drei"
import { DEFAULT_SCENE_CONFIG, DEFAULT_FP, FloorPlanState } from "./lib/constants"
import { WalkModeControls } from "./WalkModeControls"
import { SceneConfig } from "./FloorPlanEditor"
import { CameraView } from "./lib/camera"
import { useThree } from "@react-three/fiber"
import { computeTopDownView } from "@/lib/helpers"
import * as THREE from "three"
import { sunIntensity, sunLightColor, sunPosition, sunVectorFromAngles } from "./lib/sunPosition"
import { Floor } from "./lib/floor-data"
import { FloorGeometry } from "./FloorGeometry"

export type Scene3DHandle = {
    flyTo: (view: CameraView) => void
    getCurrentView: () => { position: [number, number, number]; target: [number, number, number] } | null
    captureSnapshot: () => Promise<Blob | null>
}

type Scene3DProps = {
    exportRootRef: any
    floors: Floor[]
    activeFloorId: string
    viewMode: 'single' | 'stacked' | 'stacked-full'
    showUnderlay: boolean
    sceneConfig?: SceneConfig
    walkMode?: boolean
    interactiveMode?: boolean
    selectedId?: string | null
    onSelect?: (id: string | null) => void
    onToggleDoorOpen?: (openingId: string) => void
    overlappingIds?: Set<string>
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
    },
    ref
) {
    const cfg = sceneConfig ?? DEFAULT_SCENE_CONFIG
    const controlsRef = useRef<any>(null)
    const { gl, scene, camera } = useThree()

    // Active floor's state — used anywhere a single FloorPlanState is needed
    // (camera framing, sun-bounds calc, snapshot framing). These are
    // inherently single-floor-scoped concerns, unlike the geometry render
    // below which spans all visible floors.
    const activeFloor = floors.find(f => f.id === activeFloorId)
    const activeFp: FloorPlanState = activeFloor?.state ?? DEFAULT_FP
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

        const allX = [
            ...activeFp.rooms.flatMap(r => [r.x, r.x + r.width]),
            ...activeFp.lineNodes.map((n) => n.x),
        ]
        const allZ = [
            ...activeFp.rooms.flatMap(r => [r.z, r.z + r.depth]),
            ...activeFp.lineNodes.map((n) => n.z),
        ]
        if (allX.length === 0) return

        const minX = Math.min(...allX), maxX = Math.max(...allX)
        const minZ = Math.min(...allZ), maxZ = Math.max(...allZ)
        const cx = (minX + maxX) / 2
        const cz = (minZ + maxZ) / 2
        const span = Math.max(maxX - minX, maxZ - minZ, 5)

        controls.object.position.set(cx, span * 1.6, cz + 0.01)
        controls.target.set(cx, 0, cz)
        controls.update()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFloorId])

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

    // ── Determine which floors render, and at what opacity ──────────────
    let floorsToRender: { floor: Floor; opacity: number }[] = []

    if (viewMode === 'single') {
        floorsToRender = activeFloor ? [{ floor: activeFloor, opacity: 1 }] : []
        if (showUnderlay && activeFloor) {
            const belowFloor = [...floors]
                .filter(f => f.order < activeFloor.order && f.visible)
                .sort((a, b) => b.order - a.order)[0]
            if (belowFloor) {
                floorsToRender = [{ floor: belowFloor, opacity: 0.25 }, ...floorsToRender]
            }
        }
    } else if (viewMode === 'stacked') {
        floorsToRender = floors
            .filter(f => f.visible)
            .map(f => ({ floor: f, opacity: f.id === activeFloorId ? 1 : 0.35 }))
    } else {
        // stacked-full
        floorsToRender = floors.filter(f => f.visible).map(f => ({ floor: f, opacity: 1 }))
    }

    return (
        <>
            <color attach="background" args={['#FFFFFF']} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
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

            {floorsToRender.map(({ floor, opacity }) => (
                <group key={floor.id} position={[0, floor.elevation - activeElevation, 0]}>
                    <FloorGeometry
                        fp={floor.state}
                        cfg={cfg}
                        exportRootRef={floor.id === activeFloorId ? exportRootRef : undefined}
                        interactive={interactiveMode && floor.id === activeFloorId}
                        selectedId={floor.id === activeFloorId ? selectedId : null}
                        onSelect={floor.id === activeFloorId ? onSelect : undefined}
                        onToggleDoorOpen={floor.id === activeFloorId ? onToggleDoorOpen : undefined}
                        opacity={opacity}
                    />
                </group>
            ))}

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