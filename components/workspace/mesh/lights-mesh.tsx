import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { LightFixtureType, PlacedLight, LIGHT_PLACEMENT_KIND } from '../lights-constant'

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
                    <meshStandardMaterial color="#2E2E2C" roughness={0.35} metalness={0.55} side={THREE.DoubleSide} />
                </mesh>
            )
        case 'outdoor_bollard':
            return (
                <mesh castShadow>
                    <cylinderGeometry args={[0.045, 0.05, 0.75, 14]} />
                    <meshStandardMaterial color="#3A3A38" roughness={0.5} metalness={0.4} />
                </mesh>
            )
        case 'shelf_strip':
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

// Global cap on how many placed fixtures may cast real-time shadows at once.
// Point-light shadows render a 6-face cubemap EACH, so this is the main lever
// against per-placement frame hitches / freezes once several lights exist.
const MAX_SHADOW_CASTING_LIGHTS = 4
let activeShadowCasters = 0

export function LightFixtureMesh({
    light,
    position,
    rotation = 0,
    selected = false,
    onSelect,
    opacity = 1,          // NEW
    transparent = false,  // NEW
    forceCastShadow
}: {
    light: PlacedLight
    position: [number, number, number]
    rotation?: number
    selected?: boolean
    onSelect?: () => void
    opacity?: number       // NEW
    transparent?: boolean  // NEW
    forceCastShadow?: boolean
}) {
    const bulbPos = bulbLocalPosition(light.type)
    const scale = light.scale ?? 1
    const targetRef = useRef(new THREE.Object3D())
    const groupRef = useRef<THREE.Group>(null)
    const itemTransparent = transparent || opacity < 1

    // Track whether THIS instance currently holds one of the shadow-caster
    // "slots" in the global budget, so we don't leak the count across
    // re-renders/unmounts and don't need external plumbing to cap lights.
    const holdsShadowSlotRef = useRef(false)
    const wantsShadow = forceCastShadow !== undefined ? forceCastShadow : !!light.castShadow

    useEffect(() => {
        if (wantsShadow && !holdsShadowSlotRef.current && activeShadowCasters < MAX_SHADOW_CASTING_LIGHTS) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wantsShadow])

    const effectiveCastShadow = wantsShadow && holdsShadowSlotRef.current

    useEffect(() => {
        const root = groupRef.current
        if (!root) return
        root.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            if (!mesh.isMesh) return
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const mat of mats) {
                if (mat instanceof THREE.MeshBasicMaterial) continue
                if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                    if (mat.userData.__baseOpacity === undefined) {
                        mat.userData.__baseOpacity = mat.opacity
                    }
                    mat.opacity = mat.userData.__baseOpacity * opacity
                    mat.transparent = itemTransparent || mat.userData.__baseOpacity < 1
                    mat.needsUpdate = true
                }
            }
        })
    }, [opacity, itemTransparent, light.type])

    if (light.type === 'string_lights') return null

    const clickHandlers = onSelect
        ? {
            onClick: (e: any) => { e.stopPropagation(); onSelect() },
            onPointerOver: () => { document.body.style.cursor = 'pointer' },
            onPointerOut: () => { document.body.style.cursor = 'auto' },
        }
        : {}

    if (light.type === 'shelf_strip') {
        const w = (light.width ?? 1) * scale
        return (
            <group ref={groupRef} position={position} rotation={[0, rotation, 0]} {...clickHandlers}>
                <mesh position={[0, 0, 0.017]}>
                    <boxGeometry args={[w * 0.96, 0.022, 0.008]} />
                    <meshStandardMaterial color={light.color} emissive={light.color} emissiveIntensity={2.2} roughness={0.3} toneMapped={false} />
                </mesh>
                <pointLight position={[0, -0.02, 0.03]} color={light.color} intensity={light.intensity * 1.5} distance={5} decay={1} castShadow={false} />
                {selected && (
                    <mesh renderOrder={999}>
                        <boxGeometry args={[w * 1.05, 0.1, 0.1]} />
                        <meshBasicMaterial color="#3B82F6" wireframe transparent opacity={0.7} depthTest={false} />
                    </mesh>
                )}
            </group>
        )
    }
    if (light.type === 'spotlight') {
        const aimYaw = light.aimRotation ?? 0
        const aimTilt = light.aimTilt ?? -0.3
        return (
            <group ref={groupRef} position={position} rotation={[0, rotation, 0]} scale={scale} {...clickHandlers}>
                <group rotation={[aimTilt, aimYaw, 0]}>
                    <FixtureBody type={light.type} />
                    <mesh position={bulbPos}>
                        <sphereGeometry args={[0.025, 10, 10]} />
                        <meshStandardMaterial color={light.color} emissive={light.color} emissiveIntensity={2.5} roughness={0.25} metalness={0.1} toneMapped={false} />
                    </mesh>
                    <primitive object={targetRef.current} position={[0, -3, 0]} />
                    <spotLight position={bulbPos} target={targetRef.current} color={light.color} intensity={light.intensity}
                        angle={0.4} penumbra={0.4} distance={8} decay={2} castShadow={effectiveCastShadow} shadow-mapSize={[256, 256]} />
                </group>
                {selected && (
                    <mesh renderOrder={999}>
                        <sphereGeometry args={[0.1, 12, 12]} />
                        <meshBasicMaterial color="#3B82F6" wireframe transparent opacity={0.7} depthTest={false} />
                    </mesh>
                )}
            </group>
        )
    }
    return (
        <group ref={groupRef} position={position} rotation={[0, rotation, 0]} scale={scale} {...clickHandlers}>
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
                    emissiveIntensity={light.type === 'ceiling_recessed' ? 3.5 : 2.2}
                    roughness={0.25}
                    metalness={0.1}
                    toneMapped={false}
                />
            </mesh>
            <pointLight
                position={bulbPos}
                color={light.color} intensity={light.intensity * (light.type === 'ceiling_recessed' ? 2.2 : 1.8)}
                decay={1}
                castShadow={effectiveCastShadow}
                shadow-mapSize={[256, 256]}
                shadow-bias={-0.0005}
                shadow-normalBias={0.05}
                shadow-radius={2}
                distance={
                    light.type === 'chandelier' ? 14
                        : light.type === 'outdoor_bollard' ? 8
                            : light.type === 'track_lighting' ? 10
                                : light.type === 'ceiling_recessed' ? 5
                                    : light.type === 'wall_sconce' ? 2.5
                                        : 10
                }
            />
            {selected && (
                <mesh position={bulbPos} renderOrder={999}>
                    <sphereGeometry args={[0.09, 12, 12]} />
                    <meshBasicMaterial color="#3B82F6" wireframe transparent opacity={0.7} depthTest={false} />
                </mesh>
            )}
        </group>
    )
}