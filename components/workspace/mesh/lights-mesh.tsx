import * as THREE from 'three'
import { LightFixtureType, PlacedLight } from '../lights-constant';

function FixtureBody({ type, color }: { type: LightFixtureType; color: string }) {
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
        case 'floor_lamp': return [0, 1.42, 0]
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

    return (
        <group
            position={position}
            rotation={[0, rotation, 0]}
            scale={scale}
            onClick={onSelect ? (e: any) => { e.stopPropagation(); onSelect() } : undefined}
            onPointerOver={onSelect ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={onSelect ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            <FixtureBody type={light.type} color={light.color} />

            {/* Emissive "bulb" — reads as lit even before checking illumination
                on nearby surfaces */}
            <mesh position={bulbPos}>
                <sphereGeometry args={[0.035, 12, 12]} />
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
                distance={6}
                decay={2}
                castShadow={light.castShadow}
                shadow-mapSize={[512, 512]}
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