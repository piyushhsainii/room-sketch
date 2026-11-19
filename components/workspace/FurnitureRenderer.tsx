// FurnitureRenderer.tsx
import { Suspense } from 'react'
import { PlacedFurniture } from './lib/furniture-constants'
import { FURNITURE_MODELS } from './mesh/furniture-model-registry'
import { FurnitureMesh } from './mesh/furnitureMesh'
import { GLTFFurnitureMesh } from './mesh/GLTFFurnitureMesh'
import { GLTFErrorBoundary } from './GTLFErrorBoundary'
import { Billboard, useTexture } from '@react-three/drei'


export function FurnitureRenderer(props: {
    f: PlacedFurniture
    selected?: boolean
    interactive?: boolean
    overlapping?: boolean
    onSelect?: (id: string) => void
    opacity?: number
    transparent?: boolean
}) {
    const { f } = props
    const def = FURNITURE_MODELS[f.type]

    const fallback = <FurnitureMesh {...props} />
    return (
        <>
        {(!def || f.forceProcedural) ? fallback :
        <GLTFErrorBoundary key={f.type} fallback={fallback}>
            <Suspense fallback={fallback}>
                <GLTFFurnitureMesh {...props} def={def} />
            </Suspense>
        </GLTFErrorBoundary>
        }
        {f.workstation && f.type === 'desk' && <WorkstationDetails f={f} opacity={props.opacity ?? 1} />}
        </>
    )
}

function WorkstationDetails({ f, opacity }: { f: PlacedFurniture; opacity: number }) {
    const y = (f.heightOffset ?? 0) + (f.targetHeight ?? 0.74) * (f.scale ?? 1)
    return <group position={[f.x, y, f.z]} rotation={[0, f.rotation + (f.rotationOffset ?? 0), 0]} scale={f.scale ?? 1}>
        <mesh position={[0, 0.23, -0.18]} castShadow><boxGeometry args={[0.6, 0.34, 0.028]} /><meshStandardMaterial color="#252b2d" roughness={0.42} transparent={opacity < 1} opacity={opacity} /></mesh>
        <mesh position={[0, 0.23, -0.163]}><planeGeometry args={[0.55, 0.29]} /><meshStandardMaterial color="#567b7d" emissive="#27484d" emissiveIntensity={0.16} roughness={0.35} /></mesh>
        <mesh position={[0, 0.07, -0.18]}><boxGeometry args={[0.035, 0.12, 0.03]} /><meshStandardMaterial color="#292e30" roughness={0.4} /></mesh>
        <mesh position={[0, 0.012, -0.17]}><boxGeometry args={[0.2, 0.018, 0.13]} /><meshStandardMaterial color="#292e30" roughness={0.4} /></mesh>
        <mesh position={[0, 0.02, 0.13]}><boxGeometry args={[0.38, 0.018, 0.13]} /><meshStandardMaterial color="#c2c6c0" roughness={0.65} /></mesh>
        <mesh position={[0.3, 0.025, 0.13]}><sphereGeometry args={[0.045, 12, 8]} /><meshStandardMaterial color="#292e30" roughness={0.6} /></mesh>
    </group>
}


function BillboardPreview({ url, f }: { url: string; f: PlacedFurniture }) {
    const texture = useTexture(url)
    const size = 1 * (f.scale ?? 1)
    return (
        <group position={[f.x, (f.heightOffset ?? 0) + size / 2, f.z]}>
            <Billboard>
                <mesh>
                    <planeGeometry args={[size, size]} />
                    <meshBasicMaterial map={texture} transparent opacity={0.85} />
                </mesh>
            </Billboard>
        </group>
    )
}
