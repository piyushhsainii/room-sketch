import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from "react"
import { OrbitControls, Sky } from "@react-three/drei"
import { DEFAULT_SCENE_CONFIG, FloorPlanState } from "./lib/constants"
import { Room3D } from "./3dRoom"
import { LineWalls3D } from "./objects/line-walls-3d"
import { StairsMesh } from "./mesh/stairsMesh"
import { WalkModeControls } from "./WalkModeControls"
import { FurnitureMesh } from "./mesh/furnitureMesh"
import { SceneConfig } from "./FloorPlanEditor"
import { LightFixtureMesh } from "./mesh/lights-mesh"
import { OutdoorObjectMesh } from "./mesh/outdoor-object-mesh"
import { CameraView } from "./lib/camera"
import { StringLightsMesh } from "./mesh/string-lights-mesh"
import { useThree } from "@react-three/fiber"
import { computeTopDownView } from "@/lib/helpers"
import * as THREE from "three"
import { sunIntensity, sunLightColor, sunPosition, sunVectorFromAngles } from "./lib/sunPosition"

export type Scene3DHandle = {
    flyTo: (view: CameraView) => void
    getCurrentView: () => { position: [number, number, number]; target: [number, number, number] } | null
    captureSnapshot: () => Promise<Blob | null>
}

type Scene3DProps = {
    exportRootRef: any
    fp: FloorPlanState
    sceneConfig?: SceneConfig
    walkMode?: boolean
    interactiveMode?: boolean
    selectedId?: string | null
    onSelect?: (id: string | null) => void
    onToggleDoorOpen?: (openingId: string) => void
    overlappingIds?: Set<string>
}

const Scene3D = forwardRef<Scene3DHandle, Scene3DProps>(function Scene3D(
    { exportRootRef, fp, sceneConfig, walkMode = false, interactiveMode = false, selectedId, onSelect, onToggleDoorOpen, overlappingIds },
    ref
) {
    const cfg = sceneConfig ?? DEFAULT_SCENE_CONFIG
    const controlsRef = useRef<any>(null)
    const { gl, scene, camera } = useThree()

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

            // Bounding box over ALL entity types, not just rooms — see fix in
            // computeTopDownView below.
            const topView = computeTopDownView(fp, aspect, fovDegrees)

            // Clone the camera rather than moving the live one — the on-screen
            // camera/canvas is never touched, so R3F's own render loop can't
            // race it and there's nothing to restore afterward.
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

            // Read pixels off the render target and draw to an offscreen 2D
            // canvas so we can still get a JPEG blob via toBlob (WebGLRenderTarget
            // has no toBlob of its own).
            const pixels = new Uint8Array(width * height * 4)
            gl.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixels)
            gl.setRenderTarget(prevTarget)
            renderTarget.dispose()

            const offscreen = document.createElement('canvas')
            offscreen.width = width
            offscreen.height = height
            const ctx = offscreen.getContext('2d')!
            const imageData = ctx.createImageData(width, height)

            // WebGL render targets are bottom-up; flip to top-down for canvas 2D.
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
    }), [gl])

    useEffect(() => {
        if (walkMode) return
        const controls = controlsRef.current
        if (!controls) return

        const allX = [
            ...fp.rooms.flatMap(r => [r.x, r.x + r.width]),
            ...fp.lineNodes.map(n => n.x),
        ]
        const allZ = [
            ...fp.rooms.flatMap(r => [r.z, r.z + r.depth]),
            ...fp.lineNodes.map(n => n.z),
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
    }, [])

    // Reuse the same bounds math already used for the mount-camera effect —
    // hoist a shared bounds calc if you'd rather not duplicate; kept inline
    // here to avoid touching the existing effect.
    const sunTimeOfDay = cfg.sunTimeOfDay ?? 12
    const sunCompassHeading = cfg.sunCompassHeading ?? 180
    const sunEnabled = cfg.sunToolEnabled ?? false

    const sunAllX = [...fp.rooms.flatMap(r => [r.x, r.x + r.width]), ...fp.lineNodes.map(n => n.x)]
    const sunAllZ = [...fp.rooms.flatMap(r => [r.z, r.z + r.depth]), ...fp.lineNodes.map(n => n.z)]
    const sunCx = sunAllX.length ? (Math.min(...sunAllX) + Math.max(...sunAllX)) / 2 : 0
    const sunCz = sunAllZ.length ? (Math.min(...sunAllZ) + Math.max(...sunAllZ)) / 2 : 0
    const sunSpan = sunAllX.length ? Math.max(Math.max(...sunAllX) - Math.min(...sunAllX), Math.max(...sunAllZ) - Math.min(...sunAllZ), 5) : 10

    const { azimuth, elevation } = sunPosition(sunTimeOfDay, sunCompassHeading)
    const sunVec = sunVectorFromAngles(azimuth, elevation, sunSpan * 2.5)
    const sunColor = sunEnabled ? sunLightColor(sunTimeOfDay) : '#FFF5E8'
    const sunIntensityVal = sunEnabled ? sunIntensity(sunTimeOfDay) : 2.5

    // drei's Sky wants a normalized sun direction vector, elevation in radians
    const sunAzRad = (azimuth * Math.PI) / 180
    const sunElRad = (elevation * Math.PI) / 180
    const sunDirX = Math.cos(sunElRad) * Math.sin(sunAzRad)
    const sunDirY = Math.sin(sunElRad)
    const sunDirZ = -Math.cos(sunElRad) * Math.cos(sunAzRad)
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
            {cfg.fogEnabled && !sunEnabled && <fog attach="fog" args={['#F2F2F0', 20, 60]} />}            {interactiveMode && (
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

            <group ref={exportRootRef}>
                {fp.rooms.map(room => {
                    const roomCfg = cfg.rooms.find(r => r.roomId === room.id)
                    return (
                        <Room3D
                            key={room.id}
                            room={room}
                            openings={fp.openings.filter(o => o.roomId === room.id)}
                            roomHeight={fp.roomHeight}
                            wallColor={roomCfg?.wallColor ?? '#FFFFFF'}
                            wallRoughness={cfg.wallRoughness}
                            wallTextured={cfg.wallTextured}
                            floorMat={roomCfg?.floorMaterial ?? cfg.globalFloorMaterial ?? 'plain'}
                            doorStyle={cfg.doorStyle ?? 'natural'}
                            wallDecor={fp.wallDecor}
                            interactive={interactiveMode}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            wallMaterial={roomCfg?.wallMaterial ?? cfg.globalWallMaterial ?? 'paint'}
                            onSelectRoom={(roomId) => onSelect?.(roomId)}
                            onToggleDoorOpen={onToggleDoorOpen}
                            roomWallOverrides={roomCfg?.wallOverrides}
                        />
                    )
                })}
                {(fp.lights ?? []).filter(l => l.type === 'string_lights').map(l => (
                    <StringLightsMesh key={l.id} light={l} fp={fp} selected={interactiveMode && selectedId === l.id}
                        onSelect={interactiveMode ? () => onSelect?.(l.id) : undefined} />
                ))}
                {(fp.lights ?? []).filter(l => l.type !== 'string_lights').map(light => {
                    let pos: [number, number, number]
                    let rot = 0
                    const T = 0.15, normalOffset = T / 2 + 0.05
                    const inward = light.facingInward ?? true
                    const faceDir = inward ? 1 : -1   // NEW — mirrors WallDecorMesh's faceDir

                    if (light.segmentNodeIds) {
                        const a = fp.lineNodes.find(n => n.id === light.segmentNodeIds![0])
                        const b = fp.lineNodes.find(n => n.id === light.segmentNodeIds![1])
                        if (!a || !b) return null
                        const t = light.segmentT ?? 0
                        const px = a.x + (b.x - a.x) * t
                        const pz = a.z + (b.z - a.z) * t
                        const angle = Math.atan2(b.z - a.z, b.x - a.x)
                        const nx = Math.sin(angle), nz = -Math.cos(angle)
                        // NEW — faceDir flips which side of the segment the fixture sits on
                        pos = [px + nx * normalOffset * faceDir, light.heightOffset, pz + nz * normalOffset * faceDir]
                        rot = inward ? -angle : -angle + Math.PI   // NEW — flip facing 180° on exterior
                    } else if (light.roomId && light.wall) {
                        const room = fp.rooms.find(r => r.id === light.roomId)
                        if (!room) return null
                        if (light.wall === 'north') {
                            pos = [room.x + (light.position ?? 0), light.heightOffset, room.z + normalOffset * faceDir]
                            rot = inward ? 0 : Math.PI
                        } else if (light.wall === 'south') {
                            pos = [room.x + (light.position ?? 0), light.heightOffset, room.z + room.depth - normalOffset * faceDir]
                            rot = inward ? Math.PI : 0
                        } else if (light.wall === 'west') {
                            pos = [room.x + normalOffset * faceDir, light.heightOffset, room.z + (light.position ?? 0)]
                            rot = inward ? Math.PI / 2 : -Math.PI / 2
                        } else {
                            pos = [room.x + room.width - normalOffset * faceDir, light.heightOffset, room.z + (light.position ?? 0)]
                            rot = inward ? -Math.PI / 2 : Math.PI / 2
                        }
                    } else {
                        pos = [light.x ?? 0, light.heightOffset, light.z ?? 0]
                    }

                    return (
                        <LightFixtureMesh
                            key={light.id}
                            light={light}
                            position={pos}
                            rotation={rot}
                            selected={interactiveMode && selectedId === light.id}
                            onSelect={interactiveMode ? () => onSelect?.(light.id) : undefined}
                        />
                    )
                })}
                {(fp.outdoorObjects ?? []).map(o => (
                    <OutdoorObjectMesh
                        key={o.id}
                        obj={o}
                        selected={interactiveMode && selectedId === o.id}
                        interactive={interactiveMode}
                        onSelect={interactiveMode ? () => onSelect?.(o.id) : undefined}
                    />
                ))}
                <LineWalls3D
                    fp={fp}
                    wallRoughness={cfg.wallRoughness}
                    wallColor="#FFFFFF"
                    wallMaterial={cfg.globalWallMaterial ?? 'paint'}
                    floorMaterial={cfg.globalFloorMaterial ?? 'plain'}
                    doorStyle={cfg.doorStyle ?? 'natural'}
                    closedShapes={fp.closedShapes}
                    interactive={interactiveMode}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onToggleDoorOpen={onToggleDoorOpen}
                    roomSceneConfigs={cfg.rooms}
                />

            </group>



            {cfg.showFurniture !== false && (fp.furniture ?? []).map(f => (
                <group
                    key={f.id}
                    onClick={interactiveMode ? (e) => { e.stopPropagation(); onSelect?.(f.id) } : undefined}
                    onPointerOver={interactiveMode ? () => { document.body.style.cursor = 'pointer' } : undefined}
                    onPointerOut={interactiveMode ? () => { document.body.style.cursor = 'auto' } : undefined}
                >
                    <FurnitureMesh f={f} selected={interactiveMode && selectedId === f.id} />
                </group>
            ))}
            {cfg.showFurniture !== false && (fp.stairs ?? []).map(s => {
                const anchorSeg = s.anchorSegmentId
                    ? fp.lineSegments?.find(seg => seg.id === s.anchorSegmentId)
                    : undefined
                const effectiveHeight = anchorSeg?.height ?? fp.roomHeight

                return (
                    <group
                        key={s.id}
                        onClick={interactiveMode ? (e) => { e.stopPropagation(); onSelect?.(s.id) } : undefined}
                        onPointerOver={interactiveMode ? () => { document.body.style.cursor = 'pointer' } : undefined}
                        onPointerOut={interactiveMode ? () => { document.body.style.cursor = 'auto' } : undefined}
                    >
                        <StairsMesh s={s} roomHeight={effectiveHeight} />
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


function SunDisc({ position, color }: { position: [number, number, number]; color: string }) {
    return (
        <sprite position={position} scale={[8, 8, 8]}>
            <spriteMaterial
                color={color}
                transparent
                opacity={0.9}
                depthWrite={false}
                toneMapped={false}
            />
        </sprite>
    )
}
export default memo(Scene3D)