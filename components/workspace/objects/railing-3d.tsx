import * as THREE from 'three'

export interface RailingStyleConfig {
    style?: 'baluster' | 'glass' | 'cable' | 'solid-panel' | 'criss-cross'
    postSpacing?: number   // baluster/cable spacing target (m)
    railingWidth?: number  // thickness/profile of the rail itself
}

type Vec3 = [number, number, number]

// A single straight railing run between two explicit 3D points, in the
// PARENT's own coordinate frame — no intermediate rotated group. This is
// the same philosophy as SpiralStairs' postTopPoints: compute the real
// world-local points once, then build geometry directly from them, instead
// of composing multiple independent rotations (which is what produced the
// wildly wrong diagonal geometry in the previous pathSegments/rotationY
// version — two separately-signed rotations stacking incorrectly once a
// flight wasn't axis-aligned with the assumed local frame).
export function Railing3D({
    from,
    to,
    color = '#8A8A8A',
    wallRoughness = 0.6,
    height,
    style = 'baluster',
    postSpacing = 0.12,
    railingWidth = 0.05,
}: {
    from: Vec3
    to: Vec3
    color?: string
    wallRoughness?: number
    height?: number
} & RailingStyleConfig) {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const dz = to[2] - from[2]
    const horizLen = Math.hypot(dx, dz)
    const railLen = Math.hypot(horizLen, dy)
    if (railLen < 0.01) return null

    const yaw = Math.atan2(dx, dz)
    const pitch = -Math.atan2(dy, horizLen)
    const postLocalZ = horizLen / 2
    const postLocalY = dy / 2

    // FIX: removed the hardcoded Math.min(0.9, ...) cap — it silently
    // ignored any Height (m) value above 0.9 typed in the panel.
    const railHeight = height ?? 0.9
    const postThickness = railingWidth * 0.8
    const railThickness = railingWidth
    const mid: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]

    const infill: React.ReactNode[] = []
    if (style === 'solid-panel') {
        infill.push(
            <mesh key="panel" position={[0, railHeight / 2, 0]} castShadow>
                <boxGeometry args={[0.03, railHeight * 0.92, railLen * 0.98]} />
                <meshStandardMaterial color={color} roughness={wallRoughness} metalness={0.1} />
            </mesh>
        )
    } else if (style === 'glass') {
        infill.push(
            <mesh key="glass" position={[0, railHeight / 2, 0]} castShadow>
                <boxGeometry args={[0.012, railHeight * 0.88, railLen * 0.98]} />
                <meshPhysicalMaterial color={color} roughness={0.05} metalness={0} transmission={0.85} transparent opacity={0.35} />
            </mesh>
        )
    } else if (style === 'criss-cross') {
        const segLen = Math.max(postSpacing, 0.15)
        const count = Math.max(2, Math.round(railLen / segLen))
        for (let i = 0; i < count; i++) {
            const z0 = -railLen / 2 + i * (railLen / count)
            const z1 = z0 + railLen / count
            const mid = (z0 + z1) / 2
            const dz = z1 - z0
            const diagLen = Math.hypot(dz, railHeight)
            const diagAngle = Math.atan2(railHeight, dz)
            infill.push(
                <mesh key={`x1_${i}`} position={[0, railHeight / 2, mid]} rotation={[diagAngle, 0, 0]} castShadow>
                    <boxGeometry args={[0.016, 0.016, diagLen]} />
                    <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
                </mesh>
            )
            infill.push(
                <mesh key={`x2_${i}`} position={[0, railHeight / 2, mid]} rotation={[-diagAngle, 0, 0]} castShadow>
                    <boxGeometry args={[0.016, 0.016, diagLen]} />
                    <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
                </mesh>
            )
        }
    } else {
        const spacing = style === 'cable' ? Math.max(postSpacing, 0.08) : postSpacing
        const count = Math.max(2, Math.round(railLen / spacing))
        for (let i = 0; i <= count; i++) {
            const t = i / count
            const localZ = -railLen / 2 + t * railLen
            infill.push(
                <mesh key={`inf_${i}`} position={[0, railHeight / 2, localZ]} castShadow>
                    <boxGeometry args={[0.02, railHeight, style === 'cable' ? railThickness * 0.4 : 0.02]} />
                    <meshStandardMaterial color={color} roughness={wallRoughness} metalness={style === 'cable' ? 0.6 : 0.2} />
                </mesh>
            )
        }
    }

    return (
        <group position={mid} rotation={[0, yaw, 0]}>
            <group rotation={[pitch, 0, 0]}>
                <mesh position={[0, railHeight, 0]} castShadow>
                    <boxGeometry args={[railThickness, railThickness, railLen]} />
                    <meshStandardMaterial color={color} roughness={wallRoughness} metalness={0.2} />
                </mesh>
                <mesh position={[0, 0.04, 0]} castShadow>
                    <boxGeometry args={[railThickness, 0.03, railLen]} />
                    <meshStandardMaterial color={color} roughness={wallRoughness} metalness={0.2} />
                </mesh>
                {infill}
            </group>

        </group>
    )
}

// Convenience wrapper for the flat wall-opening case (unchanged behavior,
// horizontal run of length `len` centered at the group's own origin).
export function FlatRailing3D({ len, ...rest }: { len: number } & Omit<Parameters<typeof Railing3D>[0], 'from' | 'to'>) {
    return <Railing3D from={[0, 0, -len / 2]} to={[0, 0, len / 2]} {...rest} />
}