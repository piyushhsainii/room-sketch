import * as THREE from 'three'
import { useRef } from 'react'
import { LightFixtureType, PlacedLight, LIGHT_PLACEMENT_KIND } from '../lights-constant'
import { WallDecorMesh } from './wall-decor-mesh'

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
            // Rendered entirely by their own bulb/emissive logic — no
            // fixture housing mesh for either.
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

export function LightFixtureMesh({
    light,
    position,
    rotation = 0,
    selected = false,
    onSelect,
}: {
    light: PlacedLight
    position: [number, number, number]
    rotation?: number
    selected?: boolean
    onSelect?: () => void
}) {
    const bulbPos = bulbLocalPosition(light.type)
    const scale = light.scale ?? 1
    const kind = LIGHT_PLACEMENT_KIND[light.type]

    // FIX — hooks must run unconditionally on every render, in the same
    // order, regardless of which branch below eventually returns. This was
    // previously declared inside `if (light.type === 'spotlight') {...}`,
    // which violates the Rules of Hooks: React tracks hook call order per
    // component instance, and skipping a hook call on some renders (any
    // non-spotlight instance) can throw and unmount a much larger part of
    // the tree than just this component, especially under Strict Mode's
    // double-invoke or Fast Refresh — a plausible cause for "every light
    // type except wall_sconce/shelf_strip stopped rendering" reports.
    const targetRef = useRef(new THREE.Object3D())

    // string_lights are rendered by a separate <StringLightsMesh> that walks
    // fp.lineNodes along light.pathNodeIds — this component only handles
    // single-point/strip fixtures with a fixed position+rotation.
    if (light.type === 'string_lights') return null

    const clickHandlers = onSelect
        ? {
            onClick: (e: any) => { e.stopPropagation(); onSelect() },
            onPointerOver: () => { document.body.style.cursor = 'pointer' },
            onPointerOut: () => { document.body.style.cursor = 'auto' },
        }
        : {}

    // ── Shelf / cabinet strip — reuses WallDecorMesh's led_strip visual,
    // plus an actual point light since (unlike the purely decorative wall
    // decor version) this needs to illuminate the room. ──
    if (light.type === 'shelf_strip') {
        const w = (light.width ?? 1) * scale
        return (
            <group position={position} rotation={[0, rotation, 0]} {...clickHandlers}>
                <mesh position={[0, 0, 0.017]}>
                    <boxGeometry args={[w * 0.96, 0.022, 0.008]} />
                    <meshStandardMaterial
                        color={light.color}
                        emissive={light.color}
                        emissiveIntensity={2.2}
                        roughness={0.3}
                        toneMapped={false}
                    />
                </mesh>
                <pointLight
                    position={[0, -0.02, 0.03]}
                    color={light.color}
                    intensity={light.intensity}
                    distance={2.5}
                    decay={2}
                    castShadow={false}
                />
                {selected && (
                    <mesh renderOrder={999}>
                        <boxGeometry args={[w * 1.05, 0.1, 0.1]} />
                        <meshBasicMaterial color="#3B82F6" wireframe transparent opacity={0.7} depthTest={false} />
                    </mesh>
                )}
            </group>
        )
    }

    // ── Directional spotlight — separate aim rotation/tilt applied inside
    // the group, independent of the wall/segment-derived `rotation` prop so
    // the fixture housing still sits flush on the wall while the beam aims
    // wherever the user set it. ──
    if (light.type === 'spotlight') {
        const aimYaw = light.aimRotation ?? 0
        const aimTilt = light.aimTilt ?? -0.3

        return (
            <group position={position} rotation={[0, rotation, 0]} scale={scale} {...clickHandlers}>
                <group rotation={[aimTilt, aimYaw, 0]}>
                    <FixtureBody type={light.type} />
                    <mesh position={bulbPos}>
                        <sphereGeometry args={[0.025, 10, 10]} />
                        <meshStandardMaterial
                            color={light.color}
                            emissive={light.color}
                            emissiveIntensity={2.5}
                            toneMapped={false}
                        />
                    </mesh>
                    <primitive object={targetRef.current} position={[0, -3, 0]} />
                    <spotLight
                        position={bulbPos}
                        target={targetRef.current}
                        color={light.color}
                        intensity={light.intensity}
                        angle={0.4}
                        penumbra={0.4}
                        distance={8}
                        decay={2}
                        castShadow={light.castShadow}
                        shadow-mapSize={[512, 512]}
                    />
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

    // ── Everything else — wall_sconce, ceiling_pendant, ceiling_recessed,
    // floor_lamp, track_lighting, chandelier, outdoor_bollard — the
    // existing single point-light + emissive-bulb pattern. ──
    return (
        <group
            position={position}
            rotation={[0, rotation, 0]}
            scale={scale}
            {...clickHandlers}
        >
            <FixtureBody type={light.type} />

            {/* Emissive "bulb" — reads as lit even before checking illumination
                on nearby surfaces */}
            <mesh position={bulbPos}>
                <sphereGeometry args={[light.type === 'chandelier' ? 0.022 : 0.035, 12, 12]} />
                <meshStandardMaterial
                    color={light.color}
                    emissive={light.color}
                    emissiveIntensity={2.2}
                    toneMapped={false}
                />
            </mesh>

            {/* Actual light source — smaller shadow map than the scene's main
                directional light since these are secondary/accent lights
                (project constraint: expects only 2–5 placed at once) */}
            <pointLight
                position={bulbPos}
                color={light.color}
                intensity={light.intensity}
                distance={light.type === 'chandelier' ? 8 : light.type === 'outdoor_bollard' ? 5 : light.type === 'track_lighting' ? 6.5 : 6}
                decay={2}
                castShadow={light.castShadow}
                shadow-mapSize={[512, 512]}
                shadow-bias={-0.002}
                shadow-radius={2}
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