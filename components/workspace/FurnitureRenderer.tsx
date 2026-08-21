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

    if (!def || f.forceProcedural) {
        return <FurnitureMesh {...props} />
    }
    const previewUrl = def?.previewUrl
    console.log('[FurnitureRenderer]', f.type, 'hasDef:', !!FURNITURE_MODELS[f.type], 'forceProcedural:', f.forceProcedural)
    return (
        <GLTFErrorBoundary fallback={<FurnitureMesh {...props} />}>
            <Suspense fallback={previewUrl ? <BillboardPreview url={previewUrl} f={f} /> : <FurnitureMesh {...props} />}>
                <GLTFFurnitureMesh {...props} def={def} />
            </Suspense>
        </GLTFErrorBoundary>
    )
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