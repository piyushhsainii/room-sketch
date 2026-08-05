import * as THREE from 'three'
import { OUTDOOR_FLAT_TYPES, OutdoorObjectType, PlacedOutdoorObject } from '../lib/outdoor-constants'
import { MATERIAL_REGISTRY } from '../lib/constants';
import { useEffect, useRef } from 'react';

function ObjectBody({ type, materialId }: { type: OutdoorObjectType; materialId?: string }) {
    switch (type) {
        case 'crosswalk': {
            const matDef = materialId ? MATERIAL_REGISTRY[materialId] : undefined
            return (
                <group rotation={[-Math.PI / 2, 0, 0]}>
                    <mesh position={[0, 0, -0.001]}>
                        <planeGeometry args={[2.0, 3.0]} />
                        <meshStandardMaterial
                            color={matDef?.color ?? '#A8A8A0'}
                            roughness={matDef?.roughness ?? 0.85}
                        />
                    </mesh>
                    {Array.from({ length: 5 }, (_, i) => (
                        <mesh key={i} position={[0, -0.6 + i * 0.3, 0.001]}>
                            <planeGeometry args={[1.8, 0.22]} />
                            <meshStandardMaterial color="#F0F0F0" roughness={0.9} />
                        </mesh>
                    ))}
                </group>
            )
        }

        case 'dustbin': {
            const matDef = materialId ? MATERIAL_REGISTRY[materialId] : undefined
            return (
                <group>
                    {/* Body */}
                    <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                        <cylinderGeometry args={[0.22, 0.18, 0.5, 16]} />
                        <meshStandardMaterial
                            color={matDef?.color ?? '#4A5560'}
                            roughness={matDef?.roughness ?? 0.6}
                            metalness={matDef?.metalness ?? 0.2}
                        />
                    </mesh>
                    {/* Lid */}
                    <mesh position={[0, 0.51, 0]} castShadow>
                        <cylinderGeometry args={[0.235, 0.235, 0.03, 16]} />
                        <meshStandardMaterial color="#2E353C" roughness={0.5} metalness={0.3} />
                    </mesh>
                </group>
            )
        }

        case 'bench': {
            const matDef = materialId ? MATERIAL_REGISTRY[materialId] : undefined
            const woodColor = matDef?.color ?? '#8A6D4E'
            return (
                <group>
                    {/* Seat slats */}
                    {[-0.14, 0, 0.14].map((zOff, i) => (
                        <mesh key={`seat${i}`} position={[0, 0.42, zOff]} castShadow receiveShadow>
                            <boxGeometry args={[1.5, 0.04, 0.12]} />
                            <meshStandardMaterial color={woodColor} roughness={matDef?.roughness ?? 0.75} />
                        </mesh>
                    ))}
                    {/* Backrest slats */}
                    {[0.1, 0.24].map((yOff, i) => (
                        <mesh key={`back${i}`} position={[0, 0.55 + yOff, -0.22]} rotation={[-0.15, 0, 0]} castShadow>
                            <boxGeometry args={[1.5, 0.06, 0.04]} />
                            <meshStandardMaterial color={woodColor} roughness={matDef?.roughness ?? 0.75} />
                        </mesh>
                    ))}
                    {/* Legs */}
                    {[-0.68, 0.68].map((xOff, i) => (
                        <mesh key={`leg${i}`} position={[xOff, 0.2, 0]} castShadow receiveShadow>
                            <boxGeometry args={[0.05, 0.4, 0.4]} />
                            <meshStandardMaterial color="#2E2E2E" roughness={0.6} metalness={0.3} />
                        </mesh>
                    ))}
                </group>
            )
        }

        case 'mailbox': {
            const matDef = materialId ? MATERIAL_REGISTRY[materialId] : undefined
            return (
                <group>
                    {/* Post */}
                    <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.06, 0.8, 0.06]} />
                        <meshStandardMaterial color="#4A3A2E" roughness={0.8} />
                    </mesh>
                    {/* Box */}
                    <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.35, 0.22, 0.25]} />
                        <meshStandardMaterial
                            color={matDef?.color ?? '#3A5A8A'}
                            roughness={matDef?.roughness ?? 0.5}
                            metalness={matDef?.metalness ?? 0.3}
                        />
                    </mesh>
                    {/* Flag */}
                    <mesh position={[0.19, 0.88, -0.1]} rotation={[0, 0, Math.PI / 6]} castShadow>
                        <boxGeometry args={[0.02, 0.1, 0.02]} />
                        <meshStandardMaterial color="#C0392B" roughness={0.6} />
                    </mesh>
                </group>
            )
        }

        default:
            if (process.env.NODE_ENV !== 'production') {
                console.warn(
                    `[OutdoorObjectMesh] type "${type}" has no ObjectBody case — ` +
                    `it will render (and export to glTF/OBJ) as nothing, silently.`
                )
            }
            return null
    }
}


export function OutdoorObjectMesh({
    obj, selected = false, interactive = false, onSelect,
    opacity = 1,          // NEW
    transparent = false,  // NEW
}: {
    obj: PlacedOutdoorObject
    selected?: boolean
    interactive?: boolean
    onSelect?: () => void
    opacity?: number       // NEW
    transparent?: boolean  // NEW
}) {
    const isFlat = OUTDOOR_FLAT_TYPES.has(obj.type)
    const scale = obj.scale ?? 1
    const fp2 = { crosswalk: { w: 2.0, d: 3.0 }, dustbin: { w: 0.5, d: 0.5 }, bench: { w: 1.6, d: 0.5 }, mailbox: { w: 0.35, d: 0.35 } }[obj.type]
    const groupRef = useRef<THREE.Group>(null)
    const itemTransparent = transparent || opacity < 1

    useEffect(() => {
        const root = groupRef.current
        if (!root) return
        root.traverse((o) => {
            const mesh = o as THREE.Mesh
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
    }, [opacity, itemTransparent, obj.type, obj.materialId])

    return (
        <group
            ref={groupRef}
            position={[obj.x, isFlat ? 0.003 : 0, obj.z]}
            rotation={[0, obj.rotation, 0]}
            scale={scale}
            userData={{ __meshType: obj.type, __id: obj.id }}
            onClick={onSelect ? (e: any) => { e.stopPropagation(); onSelect() } : undefined}
            onPointerOver={onSelect ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={onSelect ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            <ObjectBody type={obj.type} materialId={obj.materialId} />
            {interactive && selected && (
                isFlat ? (
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} renderOrder={999}>
                        <planeGeometry args={[fp2.w * 1.03, fp2.d * 1.03]} />
                        <meshBasicMaterial color="#3B82F6" wireframe transparent opacity={0.7} depthTest={false} />
                    </mesh>
                ) : (
                    <mesh position={[0, 0.5, 0]} renderOrder={999}>
                        <boxGeometry args={[fp2.w * 1.1, 1.0, fp2.d * 1.1]} />
                        <meshBasicMaterial color="#3B82F6" wireframe transparent opacity={0.7} depthTest={false} />
                    </mesh>
                )
            )}
        </group>
    )
}