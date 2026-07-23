import { FloorPlanState, LineNode } from "../lib/constants"
import { PlacedLight } from "../lights-constant"

export function StringLightsMesh({ light, fp, selected, onSelect }: {
    light: PlacedLight
    fp: FloorPlanState
    selected?: boolean
    onSelect?: () => void
}) {
    const nodes = (light.pathNodeIds ?? []).map(id => fp.lineNodes.find(n => n.id === id)).filter(Boolean) as LineNode[]
    if (nodes.length < 2) return null

    const bulbCount = light.bulbCount ?? 12
    const totalLen = nodes.slice(1).reduce((acc, n, i) => acc + Math.hypot(n.x - nodes[i]!.x, n.z - nodes[i]!.z), 0)
    const points: [number, number, number][] = []
    for (let i = 0; i < bulbCount; i++) {
        const targetDist = (i / (bulbCount - 1)) * totalLen
        let acc = 0
        for (let s = 0; s < nodes.length - 1; s++) {
            const a = nodes[s]!, b = nodes[s + 1]!
            const segLen = Math.hypot(b.x - a.x, b.z - a.z)
            if (acc + segLen >= targetDist || s === nodes.length - 2) {
                const t = segLen === 0 ? 0 : (targetDist - acc) / segLen
                const x = a.x + (b.x - a.x) * t
                const z = a.z + (b.z - a.z) * t
                const sag = Math.sin((i / (bulbCount - 1)) * Math.PI) * 0.15 // gentle catenary-ish droop
                points.push([x, light.heightOffset - sag, z])
                break
            }
            acc += segLen
        }
    }

    return (
        <group onClick={onSelect ? (e: any) => { e.stopPropagation(); onSelect() } : undefined}>
            {points.map((p, i) => (
                <mesh key={i} position={p}>
                    <sphereGeometry args={[0.02, 8, 8]} />
                    <meshStandardMaterial color={light.color} emissive={light.color} emissiveIntensity={2.5} toneMapped={false} />
                </mesh>
            ))}
            {/* ONE shared light for the whole string, per the plan's cost note —
                positioned at the path midpoint rather than one real light per bulb */}
            <pointLight
                position={points[Math.floor(points.length / 2)]}
                color={light.color}
                intensity={light.intensity}
                distance={4}
                decay={2}
                castShadow={false}
            />
            {selected && points.map((p, i) => (
                <mesh key={`sel${i}`} position={p} renderOrder={999}>
                    <sphereGeometry args={[0.045, 8, 8]} />
                    <meshBasicMaterial color="#3B82F6" wireframe transparent opacity={0.7} depthTest={false} />
                </mesh>
            ))}
        </group>
    )
}