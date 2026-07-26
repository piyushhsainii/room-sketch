import * as THREE from 'three'

export function Railing3D({ len, wallRoughness = 0.6, color = '#8A8A8A', height }: {
    len: number
    wallRoughness?: number
    color?: string
    height?: number
}) {
    // Waist-height handrail, but never taller than the segment's own
    // effective height (e.g. a 0.6m parapet shouldn't grow a 0.9m rail).
    const railHeight = Math.min(0.9, height ?? 0.9)
    const postThickness = 0.04
    const railThickness = 0.05
    const balusterSpacing = 0.12
    const balusterCount = Math.max(2, Math.floor(len / balusterSpacing))
    const actualSpacing = len / balusterCount

    const balusters: React.ReactNode[] = []
    for (let i = 0; i <= balusterCount; i++) {
        const x = -len / 2 + i * actualSpacing
        balusters.push(
            <mesh key={i} position={[x, railHeight / 2, 0]} castShadow>
                <boxGeometry args={[0.02, railHeight, 0.02]} />
                <meshStandardMaterial color={color} roughness={wallRoughness} metalness={0.2} />
            </mesh>
        )
    }

    return (
        <group>
            <mesh position={[0, 0.04, 0]} castShadow>
                <boxGeometry args={[len, 0.03, railThickness]} />
                <meshStandardMaterial color={color} roughness={wallRoughness} metalness={0.2} />
            </mesh>
            <mesh position={[0, railHeight, 0]} castShadow>
                <boxGeometry args={[len, railThickness, railThickness]} />
                <meshStandardMaterial color={color} roughness={wallRoughness} metalness={0.2} />
            </mesh>
            <mesh position={[-len / 2, railHeight / 2, 0]} castShadow>
                <boxGeometry args={[postThickness, railHeight + 0.03, postThickness]} />
                <meshStandardMaterial color={color} roughness={wallRoughness} metalness={0.25} />
            </mesh>
            <mesh position={[len / 2, railHeight / 2, 0]} castShadow>
                <boxGeometry args={[postThickness, railHeight + 0.03, postThickness]} />
                <meshStandardMaterial color={color} roughness={wallRoughness} metalness={0.25} />
            </mesh>
            {balusters}
        </group>
    )
}