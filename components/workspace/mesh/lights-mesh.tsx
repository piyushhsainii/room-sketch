import * as THREE from 'three'
import { memo, useEffect, useRef } from 'react'
import { LightFixtureType, PlacedLight } from '../lights-constant'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/Addons.js'

/**
 * Initialize once. Required only if RectAreaLight is used elsewhere in the app.
 * Keeping this here is harmless because Three.js guards the shader chunk setup.
 */
RectAreaLightUniformsLib.init()

function FixtureBody({ type }: { type: LightFixtureType }) {
    switch (type) {
        case 'wall_sconce':
            return (
                <mesh castShadow>
                    <cylinderGeometry args={[0.06, 0.08, 0.14, 16]} />
                    <meshStandardMaterial color="#3A3A38" roughness={0.4} metalness={0.4} />
                </mesh>
            )

        case 'ceiling_pendant':
            return (
                <group>
                    <mesh position={[0, 0.2, 0]}>
                        <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
                        <meshStandardMaterial color="#2A2A28" roughness={0.5} metalness={0.5} />
                    </mesh>
                    <mesh castShadow>
                        <sphereGeometry args={[0.12, 16, 16]} />
                        <meshStandardMaterial color="#EDE8DC" roughness={0.6} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            )

        case 'ceiling_recessed':
            return (
                <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.09, 0.09, 0.02, 20]} />
                    <meshStandardMaterial color="#E8E8E4" roughness={0.4} metalness={0.1} />
                </mesh>
            )

        case 'track_lighting':
            return (
                <group>
                    <mesh castShadow>
                        <boxGeometry args={[0.9, 0.03, 0.05]} />
                        <meshStandardMaterial color="#2A2A28" roughness={0.4} metalness={0.6} />
                    </mesh>
                    {[-0.3, 0, 0.3].map((xOff, i) => (
                        <group key={i} position={[xOff, -0.06, 0]} rotation={[0.3, 0, 0]}>
                            <mesh castShadow>
                                <cylinderGeometry args={[0.035, 0.045, 0.09, 12]} />
                                <meshStandardMaterial color="#3A3A38" roughness={0.35} metalness={0.6} />
                            </mesh>
                        </group>
                    ))}
                </group>
            )

        case 'chandelier':
            return (
                <group>
                    <mesh position={[0, 0.15, 0]}>
                        <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
                        <meshStandardMaterial color="#B8A868" roughness={0.3} metalness={0.7} />
                    </mesh>
                    <mesh>
                        <torusGeometry args={[0.18, 0.012, 8, 24]} />
                        <meshStandardMaterial color="#C9B876" roughness={0.25} metalness={0.75} />
                    </mesh>
                    {Array.from({ length: 6 }, (_, i) => {
                        const a = (i / 6) * Math.PI * 2
                        return (
                            <mesh key={i} position={[Math.cos(a) * 0.18, -0.06, Math.sin(a) * 0.18]}>
                                <sphereGeometry args={[0.03, 10, 10]} />
                                <meshStandardMaterial color="#F0E8D8" roughness={0.5} />
                            </mesh>
                        )
                    })}
                </group>
            )

        case 'spotlight':
            return (
                <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.06, 0.11, 16, 1, true]} />
                    <meshStandardMaterial
                        color="#2E2E2C"
                        roughness={0.35}
                        metalness={0.55}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )

        case 'outdoor_bollard':
            return (
                <mesh castShadow>
                    <cylinderGeometry args={[0.045, 0.05, 0.75, 14]} />
                    <meshStandardMaterial color="#3A3A38" roughness={0.5} metalness={0.4} />
                </mesh>
            )

        case 'string_lights':
            return null

        case 'floor_lamp':
        default:
            return (
                <group>
                    <mesh position={[0, 0.7, 0]} castShadow>
                        <cylinderGeometry args={[0.015, 0.015, 1.3, 10]} />
                        <meshStandardMaterial color="#3A3A38" roughness={0.5} metalness={0.4} />
                    </mesh>
                    <mesh position={[0, 0.02, 0]} castShadow>
                        <cylinderGeometry args={[0.12, 0.14, 0.04, 20]} />
                        <meshStandardMaterial color="#2A2A28" roughness={0.5} metalness={0.3} />
                    </mesh>
                    <mesh position={[0, 1.42, 0]} castShadow>
                        <coneGeometry args={[0.22, 0.32, 20, 1, true]} />
                        <meshStandardMaterial color="#F0E6D0" roughness={0.9} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            )
    }
}

function bulbLocalPosition(type: LightFixtureType): [number, number, number] {
    switch (type) {
        case 'wall_sconce': return [0, 0, 0]
        case 'ceiling_pendant': return [0, 0, 0]
        case 'ceiling_recessed': return [0, -0.02, 0]
        case 'track_lighting': return [0, -0.1, 0]
        case 'chandelier': return [0, -0.06, 0]
        case 'outdoor_bollard': return [0, 0.36, 0]
        case 'spotlight': return [0, -0.05, 0]
        case 'floor_lamp': return [0, 1.42, 0]
        default: return [0, 0, 0]
    }
}

/*
 * Keep real-time shadows deliberately small.
 *
 * IMPORTANT:
 * The best performance comes from setting castShadow=false on normal placed
 * lights and letting the environment/scene lighting handle most shadows.
 *
 * If individual fixture shadowing is required, this cap prevents a scene with
 * dozens of lights from creating dozens of expensive shadow maps.
 */
const MAX_SHADOW_CASTING_LIGHTS = 2
let activeShadowCasters = 0

const SHELF_EMISSIVE_INTENSITY = 4.0
const SHELF_SPOT_DISTANCE = 4.0
const SHELF_SPOT_ANGLE = 0.95
const SHELF_SPOT_PENUMBRA = 0.8

export const LightFixtureMesh = memo(function LightFixtureMesh({
    light,
    position,
    rotation = 0,
    selected = false,
    onSelect,
    opacity = 1,
    transparent = false,
    forceCastShadow,
}: {
    light: PlacedLight
    position: [number, number, number]
    rotation?: number
    selected?: boolean
    onSelect?: () => void
    opacity?: number
    transparent?: boolean
    forceCastShadow?: boolean
}) {
    const bulbPos = bulbLocalPosition(light.type)
    const scale = light.scale ?? 1
    const targetRef = useRef(new THREE.Object3D())
    const groupRef = useRef<THREE.Group>(null)
    const itemTransparent = transparent || opacity < 1

    const holdsShadowSlotRef = useRef(false)
    const wantsShadow = forceCastShadow !== undefined ? forceCastShadow : !!light.castShadow

    useEffect(() => {
        if (
            wantsShadow &&
            !holdsShadowSlotRef.current &&
            activeShadowCasters < MAX_SHADOW_CASTING_LIGHTS
        ) {
            activeShadowCasters += 1
            holdsShadowSlotRef.current = true
        } else if (!wantsShadow && holdsShadowSlotRef.current) {
            activeShadowCasters -= 1
            holdsShadowSlotRef.current = false
        }

        return () => {
            if (holdsShadowSlotRef.current) {
                activeShadowCasters -= 1
                holdsShadowSlotRef.current = false
            }
        }
    }, [wantsShadow])

    const effectiveCastShadow = wantsShadow && holdsShadowSlotRef.current

    /*
     * Opacity changes do not normally need a shader recompile.
     * Only toggle needsUpdate when the transparency state actually changes.
     */
    const previousTransparencyRef = useRef<boolean | null>(null)

    useEffect(() => {
        const root = groupRef.current
        if (!root) return

        root.traverse((obj) => {
            if (!(obj as THREE.Mesh).isMesh) return

            const mesh = obj as THREE.Mesh
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

            for (const mat of mats) {
                if (
                    !(mat instanceof THREE.MeshStandardMaterial) &&
                    !(mat instanceof THREE.MeshPhysicalMaterial)
                ) {
                    continue
                }

                const baseOpacity =
                    mat.userData.__baseOpacity ??
                    (mat.userData.__baseOpacity = mat.opacity)

                const nextTransparent =
                    itemTransparent || baseOpacity < 1

                mat.opacity = baseOpacity * opacity

                if (previousTransparencyRef.current !== nextTransparent) {
                    mat.transparent = nextTransparent
                    mat.needsUpdate = true
                }
            }
        })

        previousTransparencyRef.current = itemTransparent
    }, [opacity, itemTransparent])

    if (light.type === 'string_lights') return null

    const clickHandlers = onSelect
        ? {
            onClick: (e: any) => {
                e.stopPropagation()
                onSelect()
            },
            onPointerOver: () => {
                document.body.style.cursor = 'pointer'
            },
            onPointerOut: () => {
                document.body.style.cursor = 'auto'
            },
        }
        : {}

    /*
     * SHELF STRIP
     *
     * Old implementation:
     *   one point light every ~0.3m
     *
     * New implementation:
     *   one continuous emissive diffuser
     *   + one directional spot for actual room illumination
     *
     * This keeps the fixture visually linear while giving it real light
     * that spreads into the room. The spot is centered on the strip and
     * points toward the side selected by facingInward.
     */
    if (light.type === 'shelf_strip') {
        const w = Math.max(0.1, (light.width ?? 1) * scale)
        const facing = light.facingInward === false ? -1 : 1

        return (
            <group
                ref={groupRef}
                position={position}
                rotation={[0, rotation, 0]}
                {...clickHandlers}
            >
                {/* Physical LED diffuser */}
                <mesh position={[0, 0, 0.018 * facing]}>
                    <boxGeometry args={[w * 0.96, 0.032, 0.018]} />
                    <meshStandardMaterial
                        color={light.color}
                        emissive={light.color}
                        emissiveIntensity={SHELF_EMISSIVE_INTENSITY}
                        roughness={0.5}
                        metalness={0}
                        toneMapped={false}
                    />
                </mesh>

                {/*
                 * Actual illumination.
                 *
                 * A single spot is intentional:
                 * - 1 light regardless of strip length
                 * - directional, so it does not light through the wall
                 * - real illumination reaches floors/furniture/walls
                 * - no segmented point-light explosion
                 *
                 * The small tilt toward the room is handled by the local
                 * target below.
                 */}
                <primitive
                    object={targetRef.current}
                    position={[0, -0.15, 2.8 * facing]}
                />

                <spotLight
                    position={[0, -0.025, 0.055 * facing]}
                    target={targetRef.current}
                    color={light.color}
                    intensity={Math.max(0, light.intensity) * 2.8}
                    angle={SHELF_SPOT_ANGLE}
                    penumbra={SHELF_SPOT_PENUMBRA}
                    distance={SHELF_SPOT_DISTANCE}
                    decay={2}
                    castShadow={false}
                />

                {selected && (
                    <mesh renderOrder={999}>
                        <boxGeometry args={[w * 1.05, 0.1, 0.1]} />
                        <meshBasicMaterial
                            color="#3B82F6"
                            wireframe
                            transparent
                            opacity={0.7}
                            depthTest={false}
                        />
                    </mesh>
                )}
            </group>
        )
    }

    /*
     * Existing adjustable spotlight.
     *
     * The target is kept as an Object3D so Three.js can calculate the actual
     * cone direction without adding extra per-frame calculations in React.
     */
    if (light.type === 'spotlight') {
        const aimYaw = light.aimRotation ?? 0
        const aimTilt = light.aimTilt ?? -0.3

        return (
            <group
                ref={groupRef}
                position={position}
                rotation={[0, rotation, 0]}
                scale={scale}
                {...clickHandlers}
            >
                <group rotation={[aimTilt, aimYaw, 0]}>
                    <FixtureBody type={light.type} />

                    <mesh position={bulbPos}>
                        <sphereGeometry args={[0.025, 10, 10]} />
                        <meshStandardMaterial
                            color={light.color}
                            emissive={light.color}
                            emissiveIntensity={2.5}
                            roughness={0.25}
                            metalness={0.1}
                            toneMapped={false}
                        />
                    </mesh>

                    <primitive
                        object={targetRef.current}
                        position={[0, -3, 0]}
                    />

                    <spotLight
                        position={bulbPos}
                        target={targetRef.current}
                        color={light.color}
                        intensity={light.intensity}
                        angle={0.4}
                        penumbra={0.4}
                        distance={8}
                        decay={2}
                        castShadow={effectiveCastShadow}
                        shadow-mapSize={[256, 256]}
                        shadow-bias={-0.0005}
                        shadow-normalBias={0.05}
                        shadow-radius={2}
                    />
                </group>

                {selected && (
                    <mesh renderOrder={999}>
                        <sphereGeometry args={[0.1, 12, 12]} />
                        <meshBasicMaterial
                            color="#3B82F6"
                            wireframe
                            transparent
                            opacity={0.7}
                            depthTest={false}
                        />
                    </mesh>
                )}
            </group>
        )
    }

    /*
     * Standard fixtures:
     * exactly ONE point light per fixture.
     *
     * This is deliberately not segmented. The fixture's emissive bulb gives
     * the visual source while this single light provides actual illumination.
     */
    return (
        <group
            ref={groupRef}
            position={position}
            rotation={[0, rotation, 0]}
            scale={scale}
            {...clickHandlers}
        >
            <FixtureBody type={light.type} />

            <mesh position={bulbPos}>
                <sphereGeometry
                    args={[
                        light.type === 'chandelier'
                            ? 0.022
                            : light.type === 'ceiling_recessed'
                                ? 0.07
                                : 0.035,
                        12,
                        12,
                    ]}
                />
                <meshStandardMaterial
                    color={light.color}
                    emissive={light.color}
                    emissiveIntensity={
                        light.type === 'ceiling_recessed' ? 3.5 : 2.2
                    }
                    roughness={0.25}
                    metalness={0.1}
                    toneMapped={false}
                />
            </mesh>

            <pointLight
                position={bulbPos}
                color={light.color}
                intensity={
                    light.intensity *
                    (light.type === 'ceiling_recessed' ? 2.2 : 1.8)
                }
                decay={1}
                castShadow={effectiveCastShadow}
                shadow-mapSize={[256, 256]}
                shadow-bias={-0.0005}
                shadow-normalBias={0.05}
                shadow-radius={2}
                distance={
                    light.type === 'chandelier'
                        ? 14
                        : light.type === 'outdoor_bollard'
                            ? 8
                            : light.type === 'track_lighting'
                                ? 10
                                : light.type === 'ceiling_recessed'
                                    ? 3
                                    : light.type === 'wall_sconce'
                                        ? 2.5
                                        : 10
                }
            />

            {selected && (
                <mesh position={bulbPos} renderOrder={999}>
                    <sphereGeometry args={[0.09, 12, 12]} />
                    <meshBasicMaterial
                        color="#3B82F6"
                        wireframe
                        transparent
                        opacity={0.7}
                        depthTest={false}
                    />
                </mesh>
            )}
        </group>
    )
})