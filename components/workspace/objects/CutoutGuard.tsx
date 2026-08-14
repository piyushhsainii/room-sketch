// objects/cutout-guard-3d.tsx — NEW, shared by both Room3D.tsx and line-walls-3d.tsx
import { ClosedShape, LineNode, WallMaterial } from '../lib/constants'
import { WallMat } from './wallmat'
import { Railing3D } from './railing-3d'

export function CutoutGuard3D({
    shape, nodesById, wallMaterial, wallColor, wallRoughness,
    thickness = 0.15, opacity = 1, transparent = false,
    height,
    interactive = false, selectedId, onSelect, // NEW — needed for per-edge selection
}: {
    shape: ClosedShape
    nodesById: Map<string, LineNode>
    wallMaterial: WallMaterial
    wallColor: string
    wallRoughness: number
    thickness?: number
    opacity?: number
    transparent?: boolean
    height?: number
    interactive?: boolean
    selectedId?: string | null
    onSelect?: (id: string) => void
}) {
    const guard = shape.cutout?.guard
    if (!guard?.enabled) return null

    const ids = shape.nodeIds
    return (
        <>
            {ids.map((id, i) => {
                const a = nodesById.get(id)
                const b = nodesById.get(ids[(i + 1) % ids.length]!)
                if (!a || !b) return null

                const dx = b.x - a.x, dz = b.z - a.z
                const len = Math.hypot(dx, dz)
                if (len < 0.05) return null
                const mcx = (a.x + b.x) / 2, mcz = (a.z + b.z) / 2
                const angle = Math.atan2(dz, dx)

                const edgeId = `${shape.id}::guard::${i}`
                const override = guard.edgeOverrides?.[edgeId]
                const effType = override?.type ?? guard.type
                const isSelected = interactive && selectedId === edgeId

                const handlers = interactive ? {
                    onClick: (e: any) => { e.stopPropagation(); onSelect?.(edgeId) },
                    onPointerOver: (e: any) => { e.stopPropagation(); document.body.style.cursor = 'pointer' },
                    onPointerOut: () => { document.body.style.cursor = 'auto' },
                } : {}

                if (effType === 'open') {
                    // Still needs an invisible hit-target for selection, same as
                    // wallType === 'open' does in line-walls-3d.tsx.
                    return interactive ? (
                        <mesh key={edgeId} position={[mcx, (height ?? 2.7) / 2, mcz]} rotation={[0, -angle, 0]} {...handlers} visible={false}>
                            <boxGeometry args={[len, height ?? 2.7, thickness]} />
                            <meshBasicMaterial />
                        </mesh>
                    ) : null
                }

                if (effType === 'railing') {
                    const h = override?.height ?? guard.height ?? 0.9
                    return (
                        <group key={edgeId} position={[mcx, 0, mcz]} rotation={[0, -angle, 0]} {...handlers}>
                            <Railing3D
                                from={[-len / 2, 0, 0]} to={[len / 2, 0, 0]}
                                wallRoughness={wallRoughness}
                                color={override?.railingColor ?? guard.railingColor ?? wallColor}
                                height={h}
                                style={override?.railingStyle ?? guard.railingStyle ?? 'baluster'}
                                postSpacing={override?.railingPostSpacing ?? guard.railingPostSpacing}
                                railingWidth={override?.railingWidthDim ?? guard.railingWidthDim}
                            />
                        </group>
                    )
                }

                // 'wall'
                const h = override?.height ?? guard.height ?? height ?? 2.7
                return (
                    <mesh key={edgeId} position={[mcx, h / 2, mcz]} rotation={[0, -angle, 0]} castShadow receiveShadow {...handlers}>
                        <boxGeometry args={[len, h, thickness]} />
                        <WallMat attach="material-4" mat={wallMaterial} color={wallColor} roughness={wallRoughness} width={len} height={h} depth={thickness} opacity={opacity} transparent={transparent} />
                        <WallMat attach="material-5" mat={wallMaterial} color={wallColor} roughness={wallRoughness} width={len} height={h} depth={thickness} opacity={opacity} transparent={transparent} />
                        <WallMat attach="material-0" mat={wallMaterial} color={wallColor} roughness={wallRoughness} width={len} height={h} depth={thickness} opacity={opacity} transparent={transparent} />
                        <WallMat attach="material-1" mat={wallMaterial} color={wallColor} roughness={wallRoughness} width={len} height={h} depth={thickness} opacity={opacity} transparent={transparent} />
                        <WallMat attach="material-2" mat={wallMaterial} color={wallColor} roughness={wallRoughness} width={len} height={h} depth={thickness} opacity={opacity} transparent={transparent} />
                        <WallMat attach="material-3" mat={wallMaterial} color={wallColor} roughness={wallRoughness} width={len} height={h} depth={thickness} opacity={opacity} transparent={transparent} />
                    </mesh>
                )
            })}
        </>
    )
}