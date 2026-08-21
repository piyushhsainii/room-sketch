import React, { useEffect, useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { getFurnitureFootprint, PlacedFurniture } from '../lib/furniture-constants'
import { getMaterialsFor } from '../texture/universalMaterials'

const MAP_KEYS = ['map', 'normalMap', 'roughnessMap', 'aoMap'] as const

function normalizeMaterialProps(obj: Record<string, THREE.Texture | undefined>) {
    const out: Record<string, THREE.Texture | undefined> = {}
    for (const k of MAP_KEYS) out[k] = obj[k]
    return out
}
const _texCache = new Map<string, THREE.Texture>()   // only ever holds a REAL loaded texture now
const _pending = new Set<string>()                    // tracks in-flight loads
const _failed = new Set<string>()

const _manager = new THREE.LoadingManager()
_manager.onError = (url) => {
    _pending.delete(url)
    _failed.add(url)
    console.error(`[FurnitureMesh] ❌ texture 404, falling back to solid color: ${url}`)
}
const _loader = new THREE.TextureLoader(_manager)

function loadTextureSafe(url: string): THREE.Texture | null {
    if (_failed.has(url)) return null
    const cached = _texCache.get(url)
    if (cached) return cached
    if (_pending.has(url)) return null

    _pending.add(url)
    // Failsafe: if this never resolves within 8s (aborted mid-flight on
    // unmount, network stall, etc.), clear the pending flag so a future
    // mount can retry instead of being stuck waiting forever.
    const timeout = setTimeout(() => { _pending.delete(url) }, 8000)

    try {
        _loader.load(
            url,
            (tex) => {
                clearTimeout(timeout)
                _pending.delete(url)

                // JPG/PNG used as a color/diffuse texture.
                if (
                    url.toLowerCase().endsWith('.jpg') ||
                    url.toLowerCase().endsWith('.jpeg') ||
                    url.toLowerCase().endsWith('.png')
                ) {
                    tex.colorSpace = THREE.SRGBColorSpace
                }

                tex.needsUpdate = true

                _texCache.set(url, tex)
                notify(url)
            },
            undefined,
            () => {
                clearTimeout(timeout)
                _pending.delete(url)
                _failed.add(url)
                notify(url)
            }
        )
    } catch {
        clearTimeout(timeout)
        _pending.delete(url)
        _failed.add(url)
        notify(url) // NEW: cover the synchronous-throw path too
    }
    return null
}
export function useTextureMaterialProps(
    urls: Record<string, string> | null,
    repeatX = 2,
    repeatY = 2
) {
    const [tick, forceTick] = React.useState(0)

    const key = React.useMemo(
        () => urls
            ? Object.entries(urls)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `${k}:${v}`)
                .join('|')
            : '',
        [urls]
    )

    const { textures, status } = React.useMemo(() => {
        if (!urls) {
            return {
                textures: {} as Record<string, THREE.Texture>,
                status: 'none' as const,
            }
        }

        const out: Record<string, THREE.Texture> = {}

        let pending = 0
        let failed = 0

        for (const [k, url] of Object.entries(urls)) {
            const cached = _texCache.get(url)

            if (cached) {
                out[k] = cached
                continue
            }

            if (_failed.has(url)) {
                failed++
                continue
            }

            pending++
        }

        let status: 'loading' | 'loaded' | 'failed'

        if (pending > 0) {
            status = 'loading'
        } else if (Object.keys(out).length > 0) {
            // Even if AO/normal/etc failed, use whatever successfully loaded.
            status = 'loaded'
        } else if (failed > 0) {
            status = 'failed'
        } else {
            status = 'loaded'
        }

        return { textures: out, status }
    }, [key, tick])

    React.useEffect(() => {
        if (!urls) return

        let cancelled = false
        const unsubs: (() => void)[] = []

        for (const url of Object.values(urls)) {
            if (_failed.has(url) || _texCache.get(url)) continue

            loadTextureSafe(url)

            unsubs.push(
                subscribe(url, () => {
                    if (!cancelled) {
                        forceTick(n => n + 1)
                    }
                })
            )
        }

        return () => {
            cancelled = true
            unsubs.forEach(unsub => unsub())
        }
    }, [key])

    React.useMemo(() => {
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping
            texture.repeat.set(repeatX, repeatY)
            texture.needsUpdate = true
        })
    }, [textures, repeatX, repeatY])

    return { textures, status }
}

const _subscribers = new Map<string, Set<() => void>>()

function subscribe(url: string, cb: () => void): () => void {
    if (!_subscribers.has(url)) _subscribers.set(url, new Set())
    _subscribers.get(url)!.add(cb)
    return () => {
        _subscribers.get(url)?.delete(cb)
        if (_subscribers.get(url)?.size === 0) _subscribers.delete(url)
    }
}

function notify(url: string) {
    _subscribers.get(url)?.forEach((cb) => cb())
    _subscribers.delete(url)
}

// of sync with the panel's source of truth.
const _furnitureMatById = new Map(
    getMaterialsFor('furniture').map((material) => [
        material.id,
        material,
    ])
)

console.log(
    '[FurnitureMesh] furniture materials:',
    [..._furnitureMatById.entries()]
)

export function FurnitureMesh({
    f,
    selected = false,
    interactive = false,
    overlapping = false,
    onSelect,
    opacity = 1,
    transparent = false,
}: {
    f: PlacedFurniture
    selected?: boolean
    interactive?: boolean
    overlapping?: boolean
    onSelect?: (id: string) => void
    opacity?: number
    transparent?: boolean
}) {
    const itemTransparent = transparent || opacity < 1
    const groupRef = useRef<THREE.Group>(null)

    const s = f.scale ?? 1
    const fp2 = getFurnitureFootprint(f.type, undefined);
    const [hovered, setHovered] = React.useState(false)

    const overrideMat = f.materialId
        ? _furnitureMatById.get(f.materialId)
        : undefined

    const { textures: overrideTex, status: overrideStatus } =
        useTextureMaterialProps(
            overrideMat?.textureUrl
                ? { map: overrideMat.textureUrl }
                : null,
            2.4,
            2.4
        );
    const overrideReady = overrideStatus === 'loaded' || overrideStatus === 'failed' || overrideStatus === 'none'
    const useOverride = overrideMat && overrideReady

    // No materialId selected → flat white, no texture at all.
    const bodyColor = !f.materialId
        ? '#FFFFFF'
        : useOverride
            ? (overrideTex.map ? '#FFFFFF' : overrideMat.swatch)
            : '#FFFFFF' // still resolving — show white rather than flashing fabric

    const cushionColorResolved = !f.materialId
        ? '#FFFFFF'
        : useOverride
            ? (overrideTex.map ? '#FFFFFF' : overrideMat.swatch)
            : '#FFFFFF'

    const bodyMaterialProps = useOverride ? normalizeMaterialProps(overrideTex) : normalizeMaterialProps({})
    const cushionMaterialProps = useOverride ? normalizeMaterialProps(overrideTex) : normalizeMaterialProps({})

    const handleClick = (e: any) => {
        if (!interactive) return
        e.stopPropagation()
        onSelect?.(f.id)
    }

    const handleOver = (e: any) => {
        if (!interactive) return
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
    }

    const handleOut = (e: any) => {
        if (!interactive) return
        e.stopPropagation()
        setHovered(false)
        document.body.style.cursor = 'auto'
    }
    const materialKey = useOverride ? `override:${f.materialId}:${overrideStatus}` : 'default'
    const highlightH = f.type === 'wardrobe' ? 1.9 * s
        : f.type === 'led_strip' || f.type === 'painting' || f.type === 'wall_panel_pvc' || f.type === 'mirror' ? 0
            : 1.0 * s

    useEffect(() => {
        const root = groupRef.current
        if (!root) return
        root.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            if (!mesh.isMesh) return
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const mat of mats) {
                if (mat instanceof THREE.MeshBasicMaterial) continue // outlines — leave alone
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
    }, [opacity, itemTransparent, f.type, f.variant, f.materialId])

    return (
        <group
            ref={groupRef}
            position={[f.x, f.heightOffset ?? 0, f.z]}
            rotation={[0, f.rotation, 0]}
            onClick={handleClick}
            onPointerOver={handleOver}
            onPointerOut={handleOut}
        >
            {f.type === 'sofa' && (
                <group>

                    {/* Base — fabric-wrapped, soft rounded edges */}
                    <RoundedBox
                        args={[2.18 * s, 0.34 * s, 0.90 * s]}
                        radius={0.10 * s}
                        smoothness={8}
                        position={[0, 0.20 * s, 0]}
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial
                            key={`${materialKey}-base`}
                            {...bodyMaterialProps}
                            color={bodyColor}
                            roughness={0.95}
                            metalness={0}
                        />
                    </RoundedBox>

                    {/* Back */}
                    <RoundedBox
                        args={[2.15 * s, 0.60 * s, 0.18 * s]}
                        radius={0.10 * s}
                        smoothness={8}
                        position={[0, 0.62 * s, 0.36 * s]}
                        rotation={[-0.08, 0, 0]}
                        castShadow
                    >
                        <meshStandardMaterial
                            key={`${materialKey}-base`}
                            {...bodyMaterialProps}
                            color={bodyColor}
                            roughness={0.95}
                        />
                    </RoundedBox>

                    {/* Left Arm */}
                    <RoundedBox
                        args={[0.22 * s, 0.52 * s, 0.92 * s]}
                        radius={0.09 * s}
                        smoothness={8}
                        position={[-1.02 * s, 0.42 * s, 0]}
                        castShadow
                    >
                        <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} />
                    </RoundedBox>

                    {/* Right Arm */}
                    <RoundedBox
                        args={[0.22 * s, 0.52 * s, 0.92 * s]}
                        radius={0.09 * s}
                        smoothness={8}
                        position={[1.02 * s, 0.42 * s, 0]}
                        castShadow
                    >
                        <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} />
                    </RoundedBox>

                    {/* Left Cushion — soft, puffy, slightly lighter tone */}
                    <RoundedBox
                        args={[0.30 * s, 0.28 * s, 0.10 * s]}
                        radius={0.08 * s}
                        smoothness={8}
                        position={[-0.78 * s, 0.56 * s, 0.18 * s]}
                        rotation={[0.15, 0.35, 0.05]}
                        castShadow
                    >
                        <meshStandardMaterial key={`${materialKey}-pillowL`} {...cushionMaterialProps} color={bodyColor} roughness={0.98} />
                    </RoundedBox>
                    <RoundedBox
                        args={[0.30 * s, 0.28 * s, 0.10 * s]}
                        radius={0.08 * s}
                        smoothness={8}
                        position={[0.78 * s, 0.56 * s, 0.18 * s]}
                        rotation={[0.15, -0.35, -0.05]}
                        castShadow
                    >
                        <meshStandardMaterial key={`${materialKey}-pillowR`} {...cushionMaterialProps} color={bodyColor} roughness={0.98} />
                    </RoundedBox>

                    {/* Cushion Gap */}



                    {[-0.95, 0.95].flatMap(x =>
                        [-0.38, 0.38].map(z => (
                            <mesh
                                key={`${x}-${z}`}
                                position={[x * s, 0.06 * s, z * s]}
                                castShadow
                            >
                                <cylinderGeometry
                                    args={[0.025 * s, 0.035 * s, 0.13 * s, 16]}
                                />
                                <meshStandardMaterial
                                    key={`${materialKey}-base`}
                                    color={bodyColor}
                                    metalness={0.6}
                                    roughness={0.3}
                                    {...bodyMaterialProps}
                                />
                            </mesh>
                        ))
                    )}

                </group>
            )}
            {f.type === 'bed' && (
                <group>
                    <RoundedBox args={[1.7 * s, 0.28 * s, 2.1 * s]} radius={0.05 * s} smoothness={6} position={[0, 0.15 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                    </RoundedBox>
                    <RoundedBox args={[1.58 * s, 0.22 * s, 1.95 * s]} radius={0.07 * s} smoothness={8} position={[0, 0.34 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-mattress`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} />
                    </RoundedBox>
                    <RoundedBox args={[1.7 * s, 0.82 * s, 0.10 * s]} radius={0.06 * s} smoothness={8} position={[0, 0.74 * s, -0.92 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-headboard`} {...bodyMaterialProps} color={bodyColor} roughness={0.9} />
                    </RoundedBox>
                    <RoundedBox args={[1.7 * s, 0.42 * s, 0.08 * s]} radius={0.04 * s} smoothness={6} position={[0, 0.52 * s, 0.92 * s]} castShadow>
                        <meshStandardMaterial color="#4A3A2E" roughness={0.7} />
                    </RoundedBox>
                    <RoundedBox args={[0.58 * s, 0.12 * s, 0.38 * s]} radius={0.06 * s} smoothness={10} position={[-0.38 * s, 0.49 * s, -0.72 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-pillowL`} {...cushionMaterialProps} color={cushionColorResolved} roughness={0.97} />
                    </RoundedBox>
                    <RoundedBox args={[0.58 * s, 0.12 * s, 0.38 * s]} radius={0.06 * s} smoothness={10} position={[0.38 * s, 0.49 * s, -0.72 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-pillowR`} {...cushionMaterialProps} color={cushionColorResolved} roughness={0.97} />
                    </RoundedBox>
                    <RoundedBox args={[1.52 * s, 0.10 * s, 1.15 * s]} radius={0.05 * s} smoothness={8} position={[0, 0.48 * s, 0.35 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-throw`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} />
                    </RoundedBox>
                </group>
            )}
            {f.type === 'dining_table' && (
                <group>
                    <RoundedBox args={[1.5 * s, 0.05 * s, 1.5 * s]} radius={0.015 * s} smoothness={6} position={[0, 0.76 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-tabletop`} {...bodyMaterialProps} color={bodyColor} roughness={0.25} metalness={0.04} envMapIntensity={1.2} />
                    </RoundedBox>
                    {([-0.62, 0.62] as number[]).flatMap(x => [-0.62, 0.62].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.38 * s, z * s]} castShadow>
                            <cylinderGeometry args={[0.03 * s, 0.03 * s, 0.76 * s, 16]} />
                            <meshStandardMaterial color="#C8B898" roughness={0.45} />
                        </mesh>
                    )))}
                </group>
            )}
            {f.type === 'desk' && (
                <group>
                    <RoundedBox args={[1.4 * s, 0.04 * s, 0.7 * s]} radius={0.01 * s} smoothness={6} position={[0, 0.76 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-desktop`} {...bodyMaterialProps} color={bodyColor} roughness={0.35} />
                    </RoundedBox>
                    {([-0.62, 0.62] as number[]).flatMap(x => [-0.3, 0.3].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.38 * s, z * s]} castShadow>
                            <cylinderGeometry args={[0.025 * s, 0.025 * s, 0.76 * s, 12]} />
                            <meshStandardMaterial color="#A09080" roughness={0.45} />
                        </mesh>
                    )))}
                    <RoundedBox args={[0.52 * s, 0.30 * s, 0.03 * s]} radius={0.015 * s} smoothness={6} position={[0, 1.08 * s, -0.22 * s]} castShadow>
                        <meshStandardMaterial color="#1A1A1A" roughness={0.35} />
                    </RoundedBox>
                    <mesh position={[0, 0.82 * s, -0.22 * s]} castShadow><boxGeometry args={[0.08 * s, 0.12 * s, 0.08 * s]} /><meshStandardMaterial color="#2A2A2A" roughness={0.4} /></mesh>
                </group>
            )}
            {f.type === 'wardrobe' && (
                <group>
                    <RoundedBox args={[1.9 * s, 1.9 * s, 0.62 * s]} radius={0.03 * s} smoothness={6} position={[0, 0.95 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#3A2E22" roughness={0.6} />
                    </RoundedBox>
                    <mesh position={[-0.48 * s, 0.95 * s, 0.32 * s]}><boxGeometry args={[0.88 * s, 1.82 * s, 0.02 * s]} /><meshStandardMaterial color="#4E3C28" roughness={0.4} /></mesh>
                    <mesh position={[0.48 * s, 0.95 * s, 0.32 * s]}><boxGeometry args={[0.88 * s, 1.82 * s, 0.02 * s]} /><meshStandardMaterial color="#4E3C28" roughness={0.4} /></mesh>
                    <mesh position={[-0.08 * s, 0.95 * s, 0.33 * s]}><cylinderGeometry args={[0.015 * s, 0.015 * s, 0.12 * s, 10]} /><meshStandardMaterial color="#C0A870" roughness={0.2} metalness={0.6} /></mesh>
                    <mesh position={[0.08 * s, 0.95 * s, 0.33 * s]}><cylinderGeometry args={[0.015 * s, 0.015 * s, 0.12 * s, 10]} /><meshStandardMaterial color="#C0A870" roughness={0.2} metalness={0.6} /></mesh>
                </group>
            )}
            {f.type === 'bathtub' && (
                <group>
                    <RoundedBox args={[0.82 * s, 0.56 * s, 1.6 * s]} radius={0.08 * s} smoothness={10} position={[0, 0.28 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#F0EEEA" roughness={0.1} />
                    </RoundedBox>
                    <mesh position={[0, 0.48 * s, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.60 * s, 1.38 * s]} />
                        <meshStandardMaterial color="#A8D4E0" roughness={0.04} metalness={0.05} transparent opacity={0.85} />
                    </mesh>
                    <mesh position={[0, 0.62 * s, -0.72 * s]} castShadow><cylinderGeometry args={[0.03 * s, 0.03 * s, 0.15 * s, 12]} /><meshStandardMaterial color="#C8C8C8" roughness={0.2} metalness={0.7} /></mesh>
                </group>
            )}
            {f.type === 'toilet' && (
                <group>
                    <RoundedBox args={[0.46 * s, 0.44 * s, 0.68 * s]} radius={0.06 * s} smoothness={10} position={[0, 0.22 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#EEEEEE" roughness={0.18} />
                    </RoundedBox>
                    <RoundedBox args={[0.38 * s, 0.24 * s, 0.18 * s]} radius={0.04 * s} smoothness={8} position={[0, 0.52 * s, -0.26 * s]} castShadow>
                        <meshStandardMaterial color="#E8E8E8" roughness={0.18} />
                    </RoundedBox>
                    <mesh position={[0, 0.45 * s, 0.04 * s]}><boxGeometry args={[0.42 * s, 0.04 * s, 0.52 * s]} /><meshStandardMaterial color="#FFFFFF" roughness={0.12} /></mesh>
                </group>
            )}
            {f.type === 'plant' && (
                <group>
                    <mesh position={[0, 0.14 * s, 0]} castShadow receiveShadow>
                        <cylinderGeometry args={[0.14 * s, 0.10 * s, 0.28 * s, 20]} />
                        <meshStandardMaterial color="#8B5E3C" roughness={0.75} />
                    </mesh>
                    <mesh position={[0, 0.28 * s, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[0.13 * s, 20]} />
                        <meshStandardMaterial color="#3D2B1A" roughness={0.98} />
                    </mesh>
                    <mesh position={[0, 0.50 * s, 0]} castShadow><sphereGeometry args={[0.18 * s, 16, 16]} /><meshStandardMaterial color="#2D7A2D" roughness={0.92} /></mesh>
                    <mesh position={[-0.10 * s, 0.58 * s, 0.06 * s]} castShadow><sphereGeometry args={[0.13 * s, 14, 14]} /><meshStandardMaterial color="#3A9A3A" roughness={0.92} /></mesh>
                    <mesh position={[0.08 * s, 0.62 * s, -0.06 * s]} castShadow><sphereGeometry args={[0.11 * s, 14, 14]} /><meshStandardMaterial color="#259025" roughness={0.92} /></mesh>
                </group>
            )}
            {f.type === 'chair' && (
                <group>
                    <RoundedBox args={[0.50 * s, 0.06 * s, 0.50 * s]} radius={0.03 * s} smoothness={8} position={[0, 0.44 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-seat`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#C0B8A8"} roughness={0.85} />
                    </RoundedBox>
                    <RoundedBox args={[0.50 * s, 0.52 * s, 0.06 * s]} radius={0.03 * s} smoothness={8} position={[0, 0.72 * s, 0.22 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-back`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#B0A898"} roughness={0.85} />
                    </RoundedBox>
                    {[-0.20, 0.20].flatMap(x =>
                        [-0.20, 0.20].map(z => (
                            <mesh
                                key={`leg-${x}-${z}`}
                                position={[x * s, 0.22 * s, z * s]}
                                castShadow
                            >
                                <cylinderGeometry args={[0.02 * s, 0.025 * s, 0.44 * s, 12]} />
                                <meshStandardMaterial
                                    color="#2b2b2b"
                                    metalness={0.5}
                                    roughness={0.35}
                                />
                            </mesh>
                        ))
                    )}
                </group>
            )}
            {f.type === 'lounge_recliner' && (
                <group>
                    {/* Seat base — wider/deeper than a chair, softer profile */}
                    <RoundedBox args={[0.78 * s, 0.22 * s, 0.90 * s]} radius={0.09 * s} smoothness={8} position={[0, 0.24 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-seat`} {...bodyMaterialProps} color={bodyColor} roughness={0.92} />
                    </RoundedBox>

                    {/* Reclined backrest — tilted back, not vertical */}
                    <RoundedBox args={[0.76 * s, 0.85 * s, 0.20 * s]} radius={0.10 * s} smoothness={8}
                        position={[0, 0.62 * s, -0.34 * s]} rotation={[0.35, 0, 0]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-back`} {...bodyMaterialProps} color={bodyColor} roughness={0.92} />
                    </RoundedBox>

                    {/* Seat cushion — sits on top of the base, lighter tone like sofa cushions */}
                    <RoundedBox args={[0.68 * s, 0.14 * s, 0.72 * s]} radius={0.08 * s} smoothness={10} position={[0, 0.40 * s, 0.02 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-cushion`} {...cushionMaterialProps} color={cushionColorResolved} roughness={0.95} />
                    </RoundedBox>

                    {/* Left armrest */}
                    <RoundedBox args={[0.14 * s, 0.30 * s, 0.86 * s]} radius={0.06 * s} smoothness={8} position={[-0.40 * s, 0.44 * s, -0.02 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-armL`} {...bodyMaterialProps} color={bodyColor} roughness={0.92} />
                    </RoundedBox>

                    {/* Right armrest */}
                    <RoundedBox args={[0.14 * s, 0.30 * s, 0.86 * s]} radius={0.06 * s} smoothness={8} position={[0.40 * s, 0.44 * s, -0.02 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-armR`} {...bodyMaterialProps} color={bodyColor} roughness={0.92} />
                    </RoundedBox>

                    {/* Footrest — extended out front, lower profile */}
                    <RoundedBox args={[0.66 * s, 0.16 * s, 0.34 * s]} radius={0.07 * s} smoothness={8} position={[0, 0.16 * s, 0.58 * s]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-footrest`} {...bodyMaterialProps} color={bodyColor} roughness={0.92} />
                    </RoundedBox>

                    {/* Legs — four short, slightly tapered, warm wood-toned rather than
            metal (recliners typically sit on wood/turned legs, not thin
            metal pins like the sofa), positioned under the main seat base */}
                    {[-0.32, 0.32].flatMap(x =>
                        [-0.36, 0.36].map(z => (
                            <mesh key={`leg-${x}-${z}`} position={[x * s, 0.065 * s, z * s]} castShadow>
                                <cylinderGeometry args={[0.025 * s, 0.035 * s, 0.13 * s, 12]} />
                                <meshStandardMaterial color="#3A2A1C" roughness={0.5} metalness={0.05} />
                            </mesh>
                        ))
                    )}
                </group>
            )}
            {f.type === 'coffee_table' && (
                <group>
                    <RoundedBox args={[1.2 * s, 0.05 * s, 0.65 * s]} radius={0.015 * s} smoothness={6} position={[0, 0.38 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#EAE6E0" roughness={0.18} metalness={0.05} />
                    </RoundedBox>
                    <RoundedBox args={[1.1 * s, 0.03 * s, 0.55 * s]} radius={0.01 * s} smoothness={6} position={[0, 0.18 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#D8D4CC" roughness={0.32} />
                    </RoundedBox>
                    {([-0.52, 0.52] as number[]).flatMap(x => [-0.28, 0.28].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.18 * s, z * s]} castShadow><cylinderGeometry args={[0.02 * s, 0.02 * s, 0.36 * s, 10]} /><meshStandardMaterial color="#C0B090" roughness={0.32} /></mesh>
                    )))}
                </group>
            )}
            {f.type === 'single_sofa' && (
                <group>
                    <RoundedBox args={[0.95 * s, 0.42 * s, 0.9 * s]} radius={0.09 * s} smoothness={8} position={[0, 0.21 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} />
                    </RoundedBox>
                    <RoundedBox args={[0.95 * s, 0.5 * s, 0.14 * s]} radius={0.08 * s} smoothness={8} position={[0, 0.60 * s, 0.36 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-back`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} />
                    </RoundedBox>
                    <RoundedBox args={[0.12 * s, 0.42 * s, 0.9 * s]} radius={0.06 * s} smoothness={8} position={[-0.44 * s, 0.44 * s, 0]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-armL`} {...bodyMaterialProps} color={bodyColor} roughness={0.9} />
                    </RoundedBox>
                    <RoundedBox args={[0.12 * s, 0.42 * s, 0.9 * s]} radius={0.06 * s} smoothness={8} position={[0.44 * s, 0.44 * s, 0]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-armR`} {...bodyMaterialProps} color={bodyColor} roughness={0.9} />
                    </RoundedBox>
                    <RoundedBox args={[0.68 * s, 0.1 * s, 0.66 * s]} radius={0.06 * s} smoothness={10} position={[0, 0.46 * s, -0.06 * s]} castShadow>
                        <meshStandardMaterial key={`${materialKey}-cushion`} {...cushionMaterialProps} color={cushionColorResolved} roughness={0.97} />
                    </RoundedBox>
                    {/* feet unchanged — hardcoded metal tone, not upholstered */}
                </group>
            )}
            {f.type === 'lamp' && (
                <group>
                    <mesh position={[0, 0.02 * s, 0]} castShadow>
                        <cylinderGeometry args={[0.12 * s, 0.14 * s, 0.04 * s, 24]} />
                        <meshStandardMaterial color="#2A2A28" roughness={0.5} metalness={0.35} />
                    </mesh>
                    <mesh position={[0, 0.7 * s, 0]} castShadow>
                        <cylinderGeometry args={[0.015 * s, 0.015 * s, 1.3 * s, 12]} />
                        <meshStandardMaterial color="#3A3A38" roughness={0.5} metalness={0.45} />
                    </mesh>
                    <mesh position={[0, 1.42 * s, 0]} castShadow>
                        <coneGeometry args={[0.22 * s, 0.32 * s, 24, 1, true]} />
                        <meshStandardMaterial color="#F0E6D0" roughness={0.9} side={2} emissive="#FFEBC0" emissiveIntensity={0.15} />
                    </mesh>
                </group>
            )}
            {f.type === 'mirror' && (
                <group position={[0, 0.9 * s, 0]}>
                    <RoundedBox args={[0.7 * s, 0.9 * s, 0.04 * s]} radius={0.02 * s} smoothness={6} castShadow>
                        <meshStandardMaterial color="#D8D4CC" roughness={0.6} />
                    </RoundedBox>
                    <mesh position={[0, 0, 0.023 * s]}>
                        <boxGeometry args={[0.64 * s, 0.84 * s, 0.01 * s]} />
                        <meshStandardMaterial color="#C8DCE8" roughness={0.02} metalness={0.65} />
                    </mesh>
                </group>
            )}
            {f.type === 'kitchen_stove' && (
                <group>
                    <RoundedBox args={[0.6 * s, 0.9 * s, 0.6 * s]} radius={0.02 * s} smoothness={6} position={[0, 0.45 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#E4E4E0" roughness={0.35} metalness={0.2} />
                    </RoundedBox>
                    {([-0.14, 0.14] as number[]).flatMap(x => [-0.14, 0.14].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.905 * s, z * s]}>
                            <cylinderGeometry args={[0.09 * s, 0.09 * s, 0.01 * s, 24]} />
                            <meshStandardMaterial color="#1A1A1A" roughness={0.3} metalness={0.5} />
                        </mesh>
                    )))}
                    <mesh position={[0, 0.32 * s, 0.305 * s]}>
                        <boxGeometry args={[0.5 * s, 0.5 * s, 0.02 * s]} />
                        <meshStandardMaterial color="#B8B8B4" roughness={0.3} metalness={0.35} />
                    </mesh>
                </group>
            )}
            {f.type === 'chimney' && (
                <group position={[0, 1.5 * s, 0]}>
                    <RoundedBox args={[0.45 * s, 0.55 * s, 0.25 * s]} radius={0.015 * s} smoothness={6} castShadow>
                        <meshStandardMaterial color="#5A5D62" roughness={0.4} metalness={0.4} />
                    </RoundedBox>
                    <RoundedBox args={[0.9 * s, 0.1 * s, 0.55 * s]} radius={0.01 * s} smoothness={6} position={[0, 0.275 * s + 0.05 * s, 0]} castShadow>
                        <meshStandardMaterial color="#3E4044" roughness={0.35} metalness={0.5} />
                    </RoundedBox>
                </group>
            )}
            {f.type === 'commode' && (
                <group>
                    <RoundedBox args={[0.5 * s, 0.8 * s, 0.45 * s]} radius={0.03 * s} smoothness={6} position={[0, 0.4 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#EFEFEA" roughness={0.5} />
                    </RoundedBox>
                    <mesh position={[0, 0.82 * s, 0]}>
                        <boxGeometry args={[0.54 * s, 0.04 * s, 0.49 * s]} />
                        <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
                    </mesh>
                    <mesh position={[0, 0.4 * s, 0.226 * s]}>
                        <boxGeometry args={[0.16 * s, 0.03 * s, 0.02 * s]} />
                        <meshStandardMaterial color="#C0A870" roughness={0.2} metalness={0.6} />
                    </mesh>
                </group>
            )}
            {f.type === 'shower' && (
                <group>
                    <mesh position={[0, 0.01 * s, 0]} receiveShadow>
                        <boxGeometry args={[0.9 * s, 0.02 * s, 0.9 * s]} />
                        <meshStandardMaterial color="#DCE6E8" roughness={0.15} metalness={0.05} />
                    </mesh>
                    <mesh position={[-0.445 * s, 1.0 * s, 0]}>
                        <boxGeometry args={[0.02 * s, 2.0 * s, 0.9 * s]} />
                        <meshStandardMaterial color="#BFD8DE" transparent opacity={0.25} roughness={0.05} metalness={0.1} />
                    </mesh>
                    <mesh position={[0, 1.0 * s, -0.445 * s]}>
                        <boxGeometry args={[0.9 * s, 2.0 * s, 0.02 * s]} />
                        <meshStandardMaterial color="#BFD8DE" transparent opacity={0.25} roughness={0.05} metalness={0.1} />
                    </mesh>
                    <mesh position={[0, 1.9 * s, 0]} castShadow>
                        <cylinderGeometry args={[0.06 * s, 0.06 * s, 0.08 * s, 20]} />
                        <meshStandardMaterial color="#B9B9B4" metalness={0.6} roughness={0.3} />
                    </mesh>
                </group>
            )}
            {f.type === 'shoe_rack' && (
                <group>
                    <mesh position={[-0.43 * s, 0.425 * s, 0]}>
                        <boxGeometry args={[0.04 * s, 0.85 * s, 0.32 * s]} />
                        <meshStandardMaterial color="#6B5138" roughness={0.7} />
                    </mesh>
                    <mesh position={[0.43 * s, 0.425 * s, 0]}>
                        <boxGeometry args={[0.04 * s, 0.85 * s, 0.32 * s]} />
                        <meshStandardMaterial color="#6B5138" roughness={0.7} />
                    </mesh>
                    {[0, 1, 2].map(i => (
                        <mesh key={i} position={[0, (0.85 / 3) * (i + 0.5) * s, 0]} castShadow>
                            <boxGeometry args={[0.86 * s, 0.03 * s, 0.32 * s]} />
                            <meshStandardMaterial color="#7A5F42" roughness={0.7} />
                        </mesh>
                    ))}
                </group>
            )}
            {f.type === 'led_strip' && (
                <group>
                    <mesh position={[0, 2.4 * s, 0]} castShadow>
                        <boxGeometry args={[1.2 * s, 0.02 * s, 0.03 * s]} />
                        <meshStandardMaterial color="#E8E8E4" roughness={0.5} />
                    </mesh>
                    <mesh position={[0, 2.4 * s, 0.018 * s]}>
                        <boxGeometry args={[1.15 * s, 0.012 * s, 0.006 * s]} />
                        <meshStandardMaterial color="#FFF4D6" emissive="#FFEBA8" emissiveIntensity={1.4} roughness={0.3} toneMapped={false} />
                    </mesh>
                    <mesh position={[0, 2.4 * s, -0.01 * s]}>
                        <boxGeometry args={[1.25 * s, 0.05 * s, 0.02 * s]} />
                        <meshStandardMaterial color="#FFEBA8" emissive="#FFEBA8" emissiveIntensity={0.5} transparent opacity={0.35} toneMapped={false} />
                    </mesh>
                </group>
            )}
            {f.type === 'wall_panel_pvc' && (
                <group position={[0, 1.2 * s, 0]}>
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[1.2 * s, 2.4 * s, 0.025 * s]} />
                        <meshStandardMaterial color="#E4DDCF" roughness={0.35} metalness={0.02} />
                    </mesh>
                    {Array.from({ length: 8 }, (_, i) => {
                        const gx = -0.52 * s + (1.04 * s / 7) * i
                        return (
                            <mesh key={i} position={[gx, 0, 0.014 * s]}>
                                <boxGeometry args={[0.012 * s, 2.36 * s, 0.006 * s]} />
                                <meshStandardMaterial color="#D2CABA" roughness={0.4} />
                            </mesh>
                        )
                    })}
                </group>
            )}
            {f.type === 'painting' && (
                <group position={[0, 1.5 * s, 0]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.9 * s, 0.7 * s, 0.035 * s]} />
                        <meshStandardMaterial color="#3A2E22" roughness={0.5} />
                    </mesh>
                    <mesh position={[0, 0, 0.019 * s]}>
                        <boxGeometry args={[0.8 * s, 0.6 * s, 0.008 * s]} />
                        <meshStandardMaterial color="#DCD2C0" roughness={0.85} />
                    </mesh>
                    <mesh position={[-0.16 * s, 0.08 * s, 0.024 * s]}>
                        <boxGeometry args={[0.28 * s, 0.22 * s, 0.004 * s]} />
                        <meshStandardMaterial color="#8B6A4E" roughness={0.9} />
                    </mesh>
                    <mesh position={[0.14 * s, -0.1 * s, 0.024 * s]}>
                        <boxGeometry args={[0.34 * s, 0.16 * s, 0.004 * s]} />
                        <meshStandardMaterial color="#6B7F6B" roughness={0.9} />
                    </mesh>
                </group>
            )}
            {f.type === 'sofa_l' && (
                <group rotation={[0, f.orientation === 'left' ? Math.PI : 0, 0]}>

                    {(!f.variant || f.variant === 'modern') && (
                        <group>
                            {/* Main run base — spans x:[-1.35, 1.35], z:[-0.475, 0.475] */}
                            <RoundedBox
                                args={[2.70 * s, 0.34 * s, 0.95 * s]}
                                radius={0.10 * s}
                                smoothness={8}
                                position={[0, 0.20 * s, 0]}
                                castShadow
                                receiveShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} metalness={0} />
                            </RoundedBox>

                            {/* Chaise extension base — flush against main run's front edge (z=0.475),
            centered on the main run's right edge (x=1.35) so the inner corner
            is a true seamless join, not an offset overlap */}
                            <RoundedBox
                                args={[0.95 * s, 0.34 * s, 1.70 * s]}
                                radius={0.10 * s}
                                smoothness={8}
                                position={[1.35 * s, 0.20 * s, 1.32 * s]}
                                castShadow
                                receiveShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} metalness={0} />
                            </RoundedBox>

                            {/* Backrest along main run */}
                            <RoundedBox
                                args={[2.66 * s, 0.62 * s, 0.18 * s]}
                                radius={0.09 * s}
                                smoothness={8}
                                position={[0, 0.62 * s, -0.42 * s]}
                                rotation={[0.06, 0, 0]}
                                castShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} />
                            </RoundedBox>

                            {/* Left arm (main run end) */}
                            <RoundedBox
                                args={[0.22 * s, 0.54 * s, 0.97 * s]}
                                radius={0.09 * s}
                                smoothness={8}
                                position={[-1.35 * s, 0.42 * s, 0]}
                                castShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} />
                            </RoundedBox>

                            {/* Chaise low armless edge (open end) — subtle bolster */}
                            <RoundedBox
                                args={[0.95 * s, 0.16 * s, 0.18 * s]}
                                radius={0.07 * s}
                                smoothness={8}
                                position={[1.35 * s, 0.44 * s, 2.15 * s]}
                                castShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.95} />
                            </RoundedBox>

                            {/* Seat cushions — main run (3), stop short of the chaise corner overlap */}
                            {[-1.02, -0.13, 0.76].map((x, i) => (
                                <RoundedBox
                                    key={`seat-${i}`}
                                    args={[0.82 * s, 0.17 * s, 0.86 * s]}
                                    radius={0.07 * s}
                                    smoothness={8}
                                    position={[x * s, 0.38 * s, 0.02 * s]}
                                    castShadow
                                >
                                    <meshStandardMaterial key={`${materialKey}-seat${i}`} {...cushionMaterialProps} color={bodyColor} roughness={0.96} />
                                </RoundedBox>
                            ))}

                            {/* Chaise seat cushion (long) */}
                            <RoundedBox
                                args={[0.86 * s, 0.17 * s, 1.62 * s]}
                                radius={0.07 * s}
                                smoothness={8}
                                position={[1.35 * s, 0.38 * s, 1.32 * s]}
                                castShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-chaiseSeat`} {...cushionMaterialProps} color={bodyColor} roughness={0.96} />
                            </RoundedBox>

                            {/* Back pillows */}
                            {[-1.02, -0.13, 0.76].map((x, i) => (
                                <RoundedBox
                                    key={`pillow-${i}`}
                                    args={[0.32 * s, 0.30 * s, 0.11 * s]}
                                    radius={0.08 * s}
                                    smoothness={8}
                                    position={[x * s, 0.58 * s, -0.20 * s]}
                                    rotation={[0.15, (i - 1) * 0.15, 0.03]}
                                    castShadow
                                >
                                    <meshStandardMaterial key={`${materialKey}-pillow${i}`} {...cushionMaterialProps} color={bodyColor} roughness={0.98} />
                                </RoundedBox>
                            ))}

                            {/* Slim metal legs — repositioned to match new footprint corners */}
                            {[
                                [-1.35, -0.42], [-1.35, 0.42], [0.85, -0.42],
                                [1.78, 0.05], [1.78, 2.05], [0.9, 2.05]
                            ].map(([x, z], i) => (
                                <mesh key={`leg-${i}`} position={[x * s, 0.06 * s, z * s]} castShadow>
                                    <cylinderGeometry args={[0.024 * s, 0.032 * s, 0.13 * s, 16]} />
                                    <meshStandardMaterial key={`${materialKey}-leg`} color="#2b2b2b" metalness={0.7} roughness={0.25} {...bodyMaterialProps} />
                                </mesh>
                            ))}
                        </group>
                    )}``

                    {f.variant === 'classical' && (
                        <group>
                            {/* Wood plinth/skirt base — visible carved wood, not upholstered */}
                            <RoundedBox
                                args={[2.5 * s, 0.16 * s, 1.0 * s]}
                                radius={0.03 * s}
                                smoothness={6}
                                position={[-0.1 * s, 0.10 * s, 0]}
                                castShadow
                                receiveShadow
                            >
                                <meshStandardMaterial color="#3a2a1a" roughness={0.6} />
                            </RoundedBox>
                            <RoundedBox
                                args={[1.05 * s, 0.16 * s, 1.65 * s]}
                                radius={0.03 * s}
                                smoothness={6}
                                position={[1.02 * s, 0.10 * s, 0.65 * s]}
                                castShadow
                                receiveShadow
                            >
                                <meshStandardMaterial color="#3a2a1a" roughness={0.6} />
                            </RoundedBox>

                            {/* Upholstered seat deck, inset above the wood plinth */}
                            <RoundedBox
                                args={[2.4 * s, 0.28 * s, 0.9 * s]}
                                radius={0.05 * s}
                                smoothness={6}
                                position={[-0.1 * s, 0.32 * s, 0.02 * s]}
                                castShadow
                                receiveShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.85} metalness={0} />
                            </RoundedBox>
                            <RoundedBox
                                args={[0.95 * s, 0.28 * s, 1.55 * s]}
                                radius={0.05 * s}
                                smoothness={6}
                                position={[1.02 * s, 0.32 * s, 0.65 * s]}
                                castShadow
                                receiveShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={bodyColor} roughness={0.85} metalness={0} />
                            </RoundedBox>

                            {/* --- Carved wood back frame: outer ring, cushion sits inset --- */}
                            <RoundedBox
                                args={[2.5 * s, 0.85 * s, 0.10 * s]}
                                radius={0.08 * s}
                                smoothness={8}
                                position={[-0.1 * s, 0.78 * s, -0.42 * s]}
                                castShadow
                            >
                                <meshStandardMaterial color="#3a2a1a" roughness={0.65} />
                            </RoundedBox>
                            {/* Carved crest cap on top of frame (arched center) */}
                            <mesh position={[-0.1 * s, 1.22 * s, -0.42 * s]} rotation={[0, 0, 0]} castShadow>
                                <cylinderGeometry args={[0.16 * s, 0.16 * s, 0.10 * s, 20, 1, false, 0, Math.PI]} />
                                <meshStandardMaterial color="#3a2a1a" roughness={0.65} />
                            </mesh>

                            {/* Tufted upholstered back panel, inset within the wood frame */}
                            <RoundedBox
                                args={[2.3 * s, 0.66 * s, 0.14 * s]}
                                radius={0.05 * s}
                                smoothness={6}
                                position={[-0.1 * s, 0.74 * s, -0.36 * s]}
                                castShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-back`} {...cushionMaterialProps} color={bodyColor} roughness={0.9} />
                            </RoundedBox>
                            {/* Tufting buttons */}
                            {[-0.9, -0.5, -0.1, 0.3, 0.7].map((x, i) => (
                                [0.55, 0.9].map((y, j) => (
                                    <mesh key={`tuft-${i}-${j}`} position={[x * s, y * s, -0.29 * s]} castShadow>
                                        <sphereGeometry args={[0.024 * s, 10, 10]} />
                                        <meshStandardMaterial color="#2b1c10" roughness={0.5} metalness={0.3} />
                                    </mesh>
                                ))
                            ))}

                            {/* Scroll arm — main run, left end */}
                            <group position={[-1.32 * s, 0, 0]}>
                                <mesh position={[0, 0.55 * s, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                                    <cylinderGeometry args={[0.24 * s, 0.24 * s, 0.90 * s, 20]} />
                                    <meshStandardMaterial color="#3a2a1a" roughness={0.65} />
                                </mesh>
                                {/* carved scroll detail at the front */}
                                <mesh position={[0, 0.42 * s, 0.42 * s]} castShadow>
                                    <torusGeometry args={[0.11 * s, 0.035 * s, 8, 16]} />
                                    <meshStandardMaterial color="#3a2a1a" roughness={0.6} />
                                </mesh>
                            </group>

                            {/* Scroll arm — chaise open end (mirrors ref sofa's rolled-arm both sides) */}
                            <group position={[1.02 * s, 0, 1.34 * s]}>
                                <mesh position={[0, 0.5 * s, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                                    <cylinderGeometry args={[0.20 * s, 0.20 * s, 0.95 * s, 20]} />
                                    <meshStandardMaterial color="#3a2a1a" roughness={0.65} />
                                </mesh>
                                <mesh position={[0.40 * s, 0.38 * s, 0]} castShadow>
                                    <torusGeometry args={[0.09 * s, 0.03 * s, 8, 16]} />
                                    <meshStandardMaterial color="#3a2a1a" roughness={0.6} />
                                </mesh>
                            </group>

                            {/* Carved cabriole legs */}
                            {[
                                [-1.25, -0.42], [-1.25, 0.42], [0.55, -0.42],
                                [1.5, 0.05], [1.5, 1.35], [0.55, 1.35]
                            ].map(([x, z], i) => (
                                <mesh key={`leg-${i}`} position={[x * s, 0.04 * s, z * s]}
                                    rotation={[0.15 * (z > 0 ? 1 : -1), 0, 0.15 * (x > 0 ? -1 : 1)]} castShadow>
                                    <cylinderGeometry args={[0.022 * s, 0.045 * s, 0.11 * s, 12]} />
                                    <meshStandardMaterial color="#3a2a1a" roughness={0.7} />
                                </mesh>
                            ))}

                            {/* Seat cushions — damask look, main run (3), inset within wood arms */}
                            {[-0.9, -0.1, 0.68].map((x, i) => (
                                <RoundedBox
                                    key={`seat-${i}`}
                                    args={[0.72 * s, 0.20 * s, 0.78 * s]}
                                    radius={0.08 * s}
                                    smoothness={8}
                                    position={[x * s, 0.46 * s, 0.04 * s]}
                                    castShadow
                                >
                                    <meshStandardMaterial key={`${materialKey}-seat${i}`} {...cushionMaterialProps} color={bodyColor} roughness={0.9} />
                                </RoundedBox>
                            ))}
                            {/* Chaise seat cushion */}
                            <RoundedBox
                                args={[0.86 * s, 0.20 * s, 1.40 * s]}
                                radius={0.08 * s}
                                smoothness={8}
                                position={[1.02 * s, 0.46 * s, 0.65 * s]}
                                castShadow
                            >
                                <meshStandardMaterial key={`${materialKey}-chaiseSeat`} {...cushionMaterialProps} color={bodyColor} roughness={0.9} />
                            </RoundedBox>

                            {/* Three loose damask throw pillows against the back, like reference */}
                            {[-0.9, -0.1, 0.68].map((x, i) => (
                                <RoundedBox
                                    key={`pillow-${i}`}
                                    args={[0.32 * s, 0.30 * s, 0.09 * s]}
                                    radius={0.06 * s}
                                    smoothness={8}
                                    position={[x * s, 0.62 * s, -0.20 * s]}
                                    rotation={[0.12, (i - 1) * 0.12, 0.02]}
                                    castShadow
                                >
                                    <meshStandardMaterial key={`${materialKey}-pillow${i}`} {...cushionMaterialProps} color={bodyColor} roughness={0.95} />
                                </RoundedBox>
                            ))}
                        </group>
                    )}
                </group>
            )}
            {f.type === 'bed_single' && (
                <group>
                    {(!f.variant || f.variant === 'modern') && (
                        <group>
                            <RoundedBox args={[1.05 * s, 0.24 * s, 2.0 * s]} radius={0.04 * s} smoothness={6} position={[0, 0.13 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-frame`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#3d3d3d"} roughness={0.5} metalness={0.2} />
                            </RoundedBox>
                            <RoundedBox args={[0.95 * s, 0.20 * s, 1.9 * s]} radius={0.06 * s} smoothness={8} position={[0, 0.32 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-mattress`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#EDE8E0"} roughness={0.95} />
                            </RoundedBox>
                            {/* Low, flat modern headboard */}
                            <RoundedBox args={[1.05 * s, 0.55 * s, 0.06 * s]} radius={0.02 * s} smoothness={6} position={[0, 0.55 * s, -0.97 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-headboard`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#8A8280"} roughness={0.6} metalness={0.1} />
                            </RoundedBox>
                            <RoundedBox args={[0.5 * s, 0.10 * s, 0.36 * s]} radius={0.05 * s} smoothness={10} position={[0, 0.44 * s, -0.68 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-pillow`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#F0EBE4"} roughness={0.97} />
                            </RoundedBox>
                            <RoundedBox args={[0.9 * s, 0.06 * s, 0.7 * s]} radius={0.03 * s} smoothness={8} position={[0, 0.43 * s, 0.5 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-throw`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#B0A99C"} roughness={0.95} />
                            </RoundedBox>
                            {/* Thin metal legs */}
                            {[[-0.45, -0.9], [0.45, -0.9], [-0.45, 0.9], [0.45, 0.9]].map(([x, z], i) => (
                                <mesh key={`leg-${i}`} position={[x * s, 0.04 * s, z * s]} castShadow>
                                    <cylinderGeometry args={[0.02 * s, 0.02 * s, 0.09 * s, 12]} />
                                    <meshStandardMaterial color="#2b2b2b" metalness={0.7} roughness={0.3} />
                                </mesh>
                            ))}
                        </group>
                    )}

                    {f.variant === 'classical' && (
                        <group>
                            <RoundedBox args={[1.1 * s, 0.26 * s, 2.05 * s]} radius={0.05 * s} smoothness={6} position={[0, 0.15 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial color="#4A3A2E" roughness={0.7} />
                            </RoundedBox>
                            <RoundedBox args={[0.98 * s, 0.20 * s, 1.9 * s]} radius={0.06 * s} smoothness={8} position={[0, 0.33 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-mattress`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#EDE8E0"} roughness={0.95} />
                            </RoundedBox>
                            {/* Tall arched wooden headboard */}
                            <RoundedBox args={[1.1 * s, 0.85 * s, 0.09 * s]} radius={0.28 * s} smoothness={10} position={[0, 0.78 * s, -0.98 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-headboard`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#4A3A2E"} roughness={0.75} />
                            </RoundedBox>
                            {/* Matching low footboard */}
                            <RoundedBox args={[1.1 * s, 0.38 * s, 0.07 * s]} radius={0.05 * s} smoothness={8} position={[0, 0.46 * s, 0.98 * s]} castShadow>
                                <meshStandardMaterial color="#4A3A2E" roughness={0.7} />
                            </RoundedBox>
                            <RoundedBox args={[0.5 * s, 0.11 * s, 0.36 * s]} radius={0.05 * s} smoothness={10} position={[0, 0.47 * s, -0.68 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-pillow`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#F0EBE4"} roughness={0.97} />
                            </RoundedBox>
                            <RoundedBox args={[0.92 * s, 0.09 * s, 0.75 * s]} radius={0.04 * s} smoothness={8} position={[0, 0.45 * s, 0.42 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-throw`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#8C2F2F"} roughness={0.9} />
                            </RoundedBox>
                            {/* Turned corner posts */}
                            {[[-0.52, -0.98], [0.52, -0.98], [-0.52, 0.98], [0.52, 0.98]].map(([x, z], i) => (
                                <mesh key={`post-${i}`} position={[x * s, 0.42 * s, z * s]} castShadow>
                                    <cylinderGeometry args={[0.045 * s, 0.05 * s, 0.85 * s, 12]} />
                                    <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                                </mesh>
                            ))}
                        </group>
                    )}
                </group>
            )}
            {f.type === 'bed_double' && (
                <group>
                    {(!f.variant || f.variant === 'modern') && (
                        <group>
                            <RoundedBox args={[1.9 * s, 0.26 * s, 2.15 * s]} radius={0.05 * s} smoothness={6} position={[0, 0.14 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-frame`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#3d3d3d"} roughness={0.5} metalness={0.2} />
                            </RoundedBox>
                            <RoundedBox args={[1.78 * s, 0.22 * s, 2.0 * s]} radius={0.07 * s} smoothness={8} position={[0, 0.35 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-mattress`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#EDE8E0"} roughness={0.95} />
                            </RoundedBox>
                            {/* Wide upholstered panel headboard */}
                            <RoundedBox args={[1.9 * s, 0.9 * s, 0.10 * s]} radius={0.08 * s} smoothness={8} position={[0, 0.78 * s, -1.02 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-headboard`} {...cushionMaterialProps} color={useOverride ? bodyColor : "#8A8280"} roughness={0.9} />
                            </RoundedBox>
                            {/* Two pillows */}
                            {[-0.42, 0.42].map((x, i) => (
                                <RoundedBox key={`pillow-${i}`} args={[0.62 * s, 0.12 * s, 0.4 * s]} radius={0.06 * s} smoothness={10} position={[x * s, 0.5 * s, -0.78 * s]} castShadow>
                                    <meshStandardMaterial key={`${materialKey}-pillow${i}`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#F0EBE4"} roughness={0.97} />
                                </RoundedBox>
                            ))}
                            <RoundedBox args={[1.7 * s, 0.07 * s, 0.85 * s]} radius={0.04 * s} smoothness={8} position={[0, 0.47 * s, 0.5 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-throw`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#B0A99C"} roughness={0.95} />
                            </RoundedBox>
                            {/* Wooden block legs */}
                            {[[-0.85, -1.0], [0.85, -1.0], [-0.85, 1.0], [0.85, 1.0]].map(([x, z], i) => (
                                <mesh key={`leg-${i}`} position={[x * s, 0.045 * s, z * s]} castShadow>
                                    <boxGeometry args={[0.08 * s, 0.10 * s, 0.08 * s]} />
                                    <meshStandardMaterial color="#2b2b2b" roughness={0.6} metalness={0.15} />
                                </mesh>
                            ))}
                        </group>
                    )}

                    {f.variant === 'classical' && (
                        <group>
                            <RoundedBox args={[1.95 * s, 0.28 * s, 2.2 * s]} radius={0.05 * s} smoothness={6} position={[0, 0.16 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                            </RoundedBox>
                            <RoundedBox args={[1.8 * s, 0.22 * s, 2.0 * s]} radius={0.07 * s} smoothness={8} position={[0, 0.37 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-mattress`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#EDE8E0"} roughness={0.95} />
                            </RoundedBox>
                            {/* Grand carved/arched headboard */}
                            <RoundedBox args={[1.95 * s, 1.15 * s, 0.11 * s]} radius={0.4 * s} smoothness={10} position={[0, 0.95 * s, -1.05 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-headboard`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#4A3A2E"} roughness={0.78} />
                            </RoundedBox>
                            {/* Center medallion detail */}
                            <mesh position={[0, 1.35 * s, -1.0 * s]} castShadow>
                                <torusGeometry args={[0.14 * s, 0.025 * s, 8, 20]} />
                                <meshStandardMaterial color="#C9A24B" metalness={0.6} roughness={0.35} />
                            </mesh>
                            {/* Footboard */}
                            <RoundedBox args={[1.95 * s, 0.42 * s, 0.08 * s]} radius={0.05 * s} smoothness={8} position={[0, 0.49 * s, 1.02 * s]} castShadow>
                                <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                            </RoundedBox>
                            {[-0.42, 0.42].map((x, i) => (
                                <RoundedBox key={`pillow-${i}`} args={[0.64 * s, 0.13 * s, 0.42 * s]} radius={0.06 * s} smoothness={10} position={[x * s, 0.53 * s, -0.78 * s]} castShadow>
                                    <meshStandardMaterial key={`${materialKey}-pillow${i}`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#F0EBE4"} roughness={0.97} />
                                </RoundedBox>
                            ))}
                            <RoundedBox args={[1.75 * s, 0.09 * s, 0.9 * s]} radius={0.04 * s} smoothness={8} position={[0, 0.5 * s, 0.42 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-throw`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#6B2C2C"} roughness={0.88} />
                            </RoundedBox>
                            {/* Ornate turned corner posts, rising above headboard */}
                            {[[-0.95, -1.02], [0.95, -1.02]].map(([x, z], i) => (
                                <group key={`post-${i}`} position={[x * s, 0, z * s]}>
                                    <mesh position={[0, 0.7 * s, 0]} castShadow>
                                        <cylinderGeometry args={[0.055 * s, 0.065 * s, 1.3 * s, 14]} />
                                        <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                                    </mesh>
                                    <mesh position={[0, 1.4 * s, 0]} castShadow>
                                        <sphereGeometry args={[0.075 * s, 14, 14]} />
                                        <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                                    </mesh>
                                </group>
                            ))}
                        </group>
                    )}
                </group>
            )}
            {f.type === 'bed_bunk' && (
                <group>
                    {(!f.variant || f.variant === 'modern') && (
                        <group>
                            {/* 4 corner posts */}
                            {[[-0.5, -0.95], [0.5, -0.95], [-0.5, 0.95], [0.5, 0.95]].map(([x, z], i) => (
                                <mesh key={`post-${i}`} position={[x * s, 0.85 * s, z * s]} castShadow>
                                    <boxGeometry args={[0.07 * s, 1.7 * s, 0.07 * s]} />
                                    <meshStandardMaterial key={`${materialKey}-frame`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#3d3d3d"} roughness={0.5} metalness={0.25} />
                                </mesh>
                            ))}
                            {/* Lower bunk frame + mattress */}
                            <RoundedBox args={[1.05 * s, 0.14 * s, 2.0 * s]} radius={0.03 * s} smoothness={6} position={[0, 0.14 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-frame`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#3d3d3d"} roughness={0.5} metalness={0.2} />
                            </RoundedBox>
                            <RoundedBox args={[0.95 * s, 0.16 * s, 1.9 * s]} radius={0.05 * s} smoothness={8} position={[0, 0.29 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-mattressLower`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#EDE8E0"} roughness={0.95} />
                            </RoundedBox>
                            {/* Upper bunk frame + mattress */}
                            <RoundedBox args={[1.05 * s, 0.14 * s, 2.0 * s]} radius={0.03 * s} smoothness={6} position={[0, 0.95 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-frame`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#3d3d3d"} roughness={0.5} metalness={0.2} />
                            </RoundedBox>
                            <RoundedBox args={[0.95 * s, 0.16 * s, 1.9 * s]} radius={0.05 * s} smoothness={8} position={[0, 1.10 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-mattressUpper`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#EDE8E0"} roughness={0.95} />
                            </RoundedBox>
                            {/* Guard rail on upper bunk (open side) */}
                            <RoundedBox args={[0.05 * s, 0.24 * s, 1.5 * s]} radius={0.02 * s} smoothness={6} position={[0.52 * s, 1.3 * s, -0.15 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-frame`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#3d3d3d"} roughness={0.5} metalness={0.2} />
                            </RoundedBox>
                            {/* Ladder */}
                            {[0, 0.35 * s, 0.7 * s, 1.05 * s].map((y, i) => (
                                <mesh key={`rung-${i}`} position={[0.53 * s, 0.25 * s + y, 0.85 * s]} rotation={[0, 0, Math.PI / 2]} castShadow>
                                    <cylinderGeometry args={[0.018 * s, 0.018 * s, 0.28 * s, 8]} />
                                    <meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.3} />
                                </mesh>
                            ))}
                            {[-0.14, 0.14].map((zOff, i) => (
                                <mesh key={`rail-${i}`} position={[0.53 * s, 0.85 * s, 0.85 * s + zOff * s]} castShadow>
                                    <cylinderGeometry args={[0.018 * s, 0.018 * s, 1.25 * s, 8]} />
                                    <meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.3} />
                                </mesh>
                            ))}
                            {/* Pillows top & bottom */}
                            <RoundedBox args={[0.5 * s, 0.09 * s, 0.34 * s]} radius={0.05 * s} smoothness={10} position={[0, 0.40 * s, -0.68 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-pillowLower`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#F0EBE4"} roughness={0.97} />
                            </RoundedBox>
                            <RoundedBox args={[0.5 * s, 0.09 * s, 0.34 * s]} radius={0.05 * s} smoothness={10} position={[0, 1.21 * s, -0.68 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-pillowUpper`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#F0EBE4"} roughness={0.97} />
                            </RoundedBox>
                        </group>
                    )}

                    {f.variant === 'classical' && (
                        <group>
                            {/* Solid wood corner posts with finial caps */}
                            {[[-0.52, -0.97], [0.52, -0.97], [-0.52, 0.97], [0.52, 0.97]].map(([x, z], i) => (
                                <group key={`post-${i}`} position={[x * s, 0, z * s]}>
                                    <mesh position={[0, 0.85 * s, 0]} castShadow>
                                        <cylinderGeometry args={[0.05 * s, 0.06 * s, 1.75 * s, 12]} />
                                        <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                                    </mesh>
                                    <mesh position={[0, 1.76 * s, 0]} castShadow>
                                        <sphereGeometry args={[0.065 * s, 12, 12]} />
                                        <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                                    </mesh>
                                </group>
                            ))}
                            {/* Wooden side rails and slatted panels */}
                            <RoundedBox args={[1.08 * s, 0.16 * s, 2.02 * s]} radius={0.03 * s} smoothness={6} position={[0, 0.15 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                            </RoundedBox>
                            <RoundedBox args={[0.96 * s, 0.16 * s, 1.9 * s]} radius={0.05 * s} smoothness={8} position={[0, 0.31 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-mattressLower`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#EDE8E0"} roughness={0.95} />
                            </RoundedBox>
                            <RoundedBox args={[1.08 * s, 0.16 * s, 2.02 * s]} radius={0.03 * s} smoothness={6} position={[0, 0.98 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                            </RoundedBox>
                            <RoundedBox args={[0.96 * s, 0.16 * s, 1.9 * s]} radius={0.05 * s} smoothness={8} position={[0, 1.14 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-mattressUpper`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#EDE8E0"} roughness={0.95} />
                            </RoundedBox>
                            {/* Solid wood guard rail, upper bunk */}
                            <RoundedBox args={[0.07 * s, 0.28 * s, 1.55 * s]} radius={0.02 * s} smoothness={6} position={[0.53 * s, 1.35 * s, -0.15 * s]} castShadow>
                                <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                            </RoundedBox>
                            {/* Headboard/footboard panels joining posts */}
                            <RoundedBox args={[1.08 * s, 1.8 * s, 0.07 * s]} radius={0.03 * s} smoothness={6} position={[0, 0.9 * s, -1.0 * s]} castShadow>
                                <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                            </RoundedBox>
                            {/* Ladder, turned rungs */}
                            {[0, 0.35 * s, 0.7 * s, 1.05 * s].map((y, i) => (
                                <mesh key={`rung-${i}`} position={[0.55 * s, 0.28 * s + y, 0.85 * s]} rotation={[0, 0, Math.PI / 2]} castShadow>
                                    <cylinderGeometry args={[0.022 * s, 0.022 * s, 0.28 * s, 10]} />
                                    <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                                </mesh>
                            ))}
                            {[-0.14, 0.14].map((zOff, i) => (
                                <mesh key={`rail-${i}`} position={[0.55 * s, 0.9 * s, 0.85 * s + zOff * s]} castShadow>
                                    <cylinderGeometry args={[0.022 * s, 0.022 * s, 1.25 * s, 10]} />
                                    <meshStandardMaterial color="#4A3A2E" roughness={0.75} />
                                </mesh>
                            ))}
                            <RoundedBox args={[0.52 * s, 0.1 * s, 0.36 * s]} radius={0.05 * s} smoothness={10} position={[0, 0.43 * s, -0.68 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-pillowLower`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#F0EBE4"} roughness={0.97} />
                            </RoundedBox>
                            <RoundedBox args={[0.52 * s, 0.1 * s, 0.36 * s]} radius={0.05 * s} smoothness={10} position={[0, 1.26 * s, -0.68 * s]} castShadow>
                                <meshStandardMaterial key={`${materialKey}-pillowUpper`} {...cushionMaterialProps} color={useOverride ? cushionColorResolved : "#F0EBE4"} roughness={0.97} />
                            </RoundedBox>
                        </group>
                    )}
                </group>
            )}
            {f.type === 'dressing_table' && (
                <group>
                    {(!f.variant || f.variant === 'modern') && (
                        <group>
                            {/* Tabletop */}
                            <RoundedBox args={[1.15 * s, 0.05 * s, 0.5 * s]} radius={0.02 * s} smoothness={8} position={[0, 0.75 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-top`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#E8E2D8"} roughness={0.4} metalness={0.05} />
                            </RoundedBox>
                            {/* Drawer unit (right side) */}
                            <RoundedBox args={[0.42 * s, 0.68 * s, 0.46 * s]} radius={0.02 * s} smoothness={6} position={[0.35 * s, 0.40 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#D8D2C6"} roughness={0.55} />
                            </RoundedBox>
                            {/* Drawer fronts */}
                            {[0.56, 0.34, 0.12].map((y, i) => (
                                <group key={`drawer-${i}`}>
                                    <RoundedBox args={[0.36 * s, 0.16 * s, 0.02 * s]} radius={0.01 * s} smoothness={4} position={[0.35 * s, y * s, 0.235 * s]} castShadow>
                                        <meshStandardMaterial color="#C9C2B4" roughness={0.5} />
                                    </RoundedBox>
                                    <mesh position={[0.35 * s, y * s, 0.25 * s]} castShadow>
                                        <boxGeometry args={[0.10 * s, 0.012 * s, 0.012 * s]} />
                                        <meshStandardMaterial color="#8a8378" metalness={0.6} roughness={0.3} />
                                    </mesh>
                                </group>
                            ))}
                            {/* Slim tapered legs (left side, open-leg modern look) */}
                            {[[-0.5, -0.2], [-0.5, 0.2], [0.5, -0.2], [0.5, 0.2]].map(([x, z], i) => (
                                <mesh key={`leg-${i}`} position={[x * s, 0.19 * s, z * s]} castShadow>
                                    <cylinderGeometry args={[0.018 * s, 0.028 * s, 0.75 * s, 10]} />
                                    <meshStandardMaterial color="#4A3A2E" roughness={0.6} />
                                </mesh>
                            ))}
                            {/* Mirror — freestanding oval on tabletop */}
                            <group position={[-0.28 * s, 0.75 * s, -0.18 * s]}>
                                <mesh position={[0, 0.42 * s, 0]} rotation={[0, 0, 0]} castShadow>
                                    <cylinderGeometry args={[0.22 * s, 0.22 * s, 0.02 * s, 24]} />
                                    <meshStandardMaterial color="#cfd6da" metalness={0.9} roughness={0.1} emissive="#a9c9d6" emissiveIntensity={0.05} />
                                </mesh>
                                <mesh position={[0, 0.42 * s, -0.012 * s]} castShadow>
                                    <cylinderGeometry args={[0.235 * s, 0.235 * s, 0.015 * s, 24]} />
                                    <meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.35} />
                                </mesh>
                                <mesh position={[0, 0.02 * s, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                                    <cylinderGeometry args={[0.02 * s, 0.02 * s, 0.02 * s, 10]} />
                                    <meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.35} />
                                </mesh>
                            </group>
                            {/* Stool */}
                            <group position={[0, 0, 0.55 * s]}>
                                <RoundedBox args={[0.34 * s, 0.06 * s, 0.34 * s]} radius={0.03 * s} smoothness={8} position={[0, 0.42 * s, 0]} castShadow>
                                    <meshStandardMaterial key={`${materialKey}-stoolSeat`} {...cushionMaterialProps} color={bodyColor} roughness={0.95} />
                                </RoundedBox>
                                {[[-0.13, -0.13], [-0.13, 0.13], [0.13, -0.13], [0.13, 0.13]].map(([x, z], i) => (
                                    <mesh key={`stoolleg-${i}`} position={[x * s, 0.2 * s, z * s]} castShadow>
                                        <cylinderGeometry args={[0.014 * s, 0.014 * s, 0.4 * s, 8]} />
                                        <meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.3} />
                                    </mesh>
                                ))}
                            </group>
                        </group>
                    )}

                    {f.variant === 'classical' && (
                        <group>
                            {/* Ornate wooden tabletop, kidney/vanity shape approximated */}
                            <RoundedBox args={[1.2 * s, 0.06 * s, 0.55 * s]} radius={0.05 * s} smoothness={8} position={[0, 0.78 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-top`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#4A3A2E"} roughness={0.65} />
                            </RoundedBox>
                            {/* Main cabinet body, both sides with drawers */}
                            <RoundedBox args={[1.15 * s, 0.62 * s, 0.5 * s]} radius={0.03 * s} smoothness={6} position={[0, 0.44 * s, 0]} castShadow receiveShadow>
                                <meshStandardMaterial key={`${materialKey}-base`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#4A3A2E"} roughness={0.7} />
                            </RoundedBox>
                            {/* Central kneehole gap suggestion via recessed panel */}
                            <RoundedBox args={[0.4 * s, 0.42 * s, 0.05 * s]} radius={0.15 * s} smoothness={10} position={[0, 0.36 * s, 0.24 * s]} castShadow>
                                <meshStandardMaterial color="#3a2c20" roughness={0.8} />
                            </RoundedBox>
                            {/* Drawer fronts with brass ring pulls, both sides */}
                            {[-0.42, 0.42].map((x, side) => (
                                [0.62, 0.42].map((y, i) => (
                                    <group key={`drawer-${side}-${i}`}>
                                        <RoundedBox args={[0.28 * s, 0.16 * s, 0.03 * s]} radius={0.015 * s} smoothness={4} position={[x * s, y * s, 0.245 * s]} castShadow>
                                            <meshStandardMaterial color="#5a4634" roughness={0.65} />
                                        </RoundedBox>
                                        <mesh position={[x * s, y * s, 0.265 * s]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                                            <torusGeometry args={[0.022 * s, 0.006 * s, 8, 16]} />
                                            <meshStandardMaterial color="#C9A24B" metalness={0.7} roughness={0.3} />
                                        </mesh>
                                    </group>
                                ))
                            ))}
                            {/* Cabriole-style legs */}
                            {[[-0.5, -0.2], [-0.5, 0.2], [0.5, -0.2], [0.5, 0.2]].map(([x, z], i) => (
                                <mesh key={`leg-${i}`} position={[x * s, 0.16 * s, z * s]} rotation={[0.12 * (z > 0 ? 1 : -1), 0, 0.12 * (x > 0 ? -1 : 1)]} castShadow>
                                    <cylinderGeometry args={[0.02 * s, 0.035 * s, 0.42 * s, 10]} />
                                    <meshStandardMaterial color="#4A3A2E" roughness={0.7} />
                                </mesh>
                            ))}
                            {/* Ornate arched mirror with carved crest */}
                            <group position={[0, 0.8 * s, -0.2 * s]}>
                                <RoundedBox args={[0.02 * s, 0.7 * s, 0.5 * s]} radius={0.15 * s} smoothness={12} position={[0, 0.42 * s, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                                    <meshStandardMaterial color="#4A3A2E" roughness={0.7} />
                                </RoundedBox>
                                <RoundedBox args={[0.02 * s, 0.58 * s, 0.4 * s]} radius={0.13 * s} smoothness={12} position={[0.012 * s, 0.42 * s, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                                    <meshStandardMaterial color="#cfd6da" metalness={0.85} roughness={0.15} emissive="#a9c9d6" emissiveIntensity={0.05} />
                                </RoundedBox>
                                <mesh position={[0, 0.8 * s, 0]} castShadow>
                                    <sphereGeometry args={[0.05 * s, 12, 12]} />
                                    <meshStandardMaterial color="#C9A24B" metalness={0.7} roughness={0.3} />
                                </mesh>
                                {/* Side support posts */}
                                {[-0.24, 0.24].map((x, i) => (
                                    <mesh key={`mirrorpost-${i}`} position={[x * s, 0.05 * s, 0]} castShadow>
                                        <cylinderGeometry args={[0.02 * s, 0.02 * s, 0.15 * s, 10]} />
                                        <meshStandardMaterial color="#4A3A2E" roughness={0.7} />
                                    </mesh>
                                ))}
                            </group>
                            {/* Upholstered stool */}
                            <group position={[0, 0, 0.58 * s]}>
                                <RoundedBox args={[0.36 * s, 0.08 * s, 0.36 * s]} radius={0.04 * s} smoothness={8} position={[0, 0.4 * s, 0]} castShadow>
                                    <meshStandardMaterial key={`${materialKey}-stoolSeat`} {...cushionMaterialProps} color={bodyColor} roughness={0.9} />
                                </RoundedBox>
                                {[[-0.14, -0.14], [-0.14, 0.14], [0.14, -0.14], [0.14, 0.14]].map(([x, z], i) => (
                                    <mesh key={`stoolleg-${i}`} position={[x * s, 0.18 * s, z * s]} rotation={[0.1 * (z > 0 ? 1 : -1), 0, 0.1 * (x > 0 ? -1 : 1)]} castShadow>
                                        <cylinderGeometry args={[0.016 * s, 0.026 * s, 0.36 * s, 10]} />
                                        <meshStandardMaterial color="#4A3A2E" roughness={0.7} />
                                    </mesh>
                                ))}
                            </group>
                        </group>
                    )}
                </group>
            )}
            {f.type === 'kitchen_cabinet_base' && (
                <group>
                    <RoundedBox args={[0.58 * s, 0.85 * s, 0.58 * s]} radius={0.015 * s} smoothness={6} position={[0, 0.425 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-body`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#E4DDCF"} roughness={0.45} />
                    </RoundedBox>
                    {/* Two door fronts, side by side, with slim handles */}
                    {[-0.14, 0.14].map((x, i) => (
                        <group key={`door-${i}`}>
                            <RoundedBox args={[0.26 * s, 0.78 * s, 0.02 * s]} radius={0.008 * s} smoothness={4} position={[x * s, 0.44 * s, 0.30 * s]} castShadow>
                                <meshStandardMaterial color="#DCD4C4" roughness={0.35} />
                            </RoundedBox>
                            <mesh position={[(x + (i === 0 ? 0.1 : -0.1)) * s, 0.44 * s, 0.315 * s]} rotation={[0, 0, Math.PI / 2]} castShadow>
                                <cylinderGeometry args={[0.006 * s, 0.006 * s, 0.14 * s, 8]} />
                                <meshStandardMaterial color="#9a9488" metalness={0.6} roughness={0.3} />
                            </mesh>
                        </group>
                    ))}
                    {/* Toe-kick recess */}
                    <mesh position={[0, 0.04 * s, 0.27 * s]}>
                        <boxGeometry args={[0.5 * s, 0.08 * s, 0.06 * s]} />
                        <meshStandardMaterial color="#2A2622" roughness={0.7} />
                    </mesh>
                </group>
            )}
            {f.type === 'kitchen_cabinet_wall' && (
                <group position={[0, 1.4 * s, 0]}>
                    <RoundedBox args={[0.58 * s, 0.7 * s, 0.33 * s]} radius={0.015 * s} smoothness={6} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-body`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#E4DDCF"} roughness={0.45} />
                    </RoundedBox>
                    {[-0.14, 0.14].map((x, i) => (
                        <group key={`door-${i}`}>
                            <RoundedBox args={[0.26 * s, 0.63 * s, 0.02 * s]} radius={0.008 * s} smoothness={4} position={[x * s, 0, 0.175 * s]} castShadow>
                                <meshStandardMaterial color="#DCD4C4" roughness={0.35} />
                            </RoundedBox>
                            <mesh position={[(x + (i === 0 ? 0.1 : -0.1)) * s, 0, 0.19 * s]} rotation={[0, 0, Math.PI / 2]} castShadow>
                                <cylinderGeometry args={[0.006 * s, 0.006 * s, 0.12 * s, 8]} />
                                <meshStandardMaterial color="#9a9488" metalness={0.6} roughness={0.3} />
                            </mesh>
                        </group>
                    ))}
                </group>
            )}
            {f.type === 'kitchen_countertop_slab' && (
                <group>
                    <RoundedBox args={[1.18 * s, 0.05 * s, 0.6 * s]} radius={0.008 * s} smoothness={8} position={[0, 0.88 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#3A3835" roughness={0.15} metalness={0.05} />
                    </RoundedBox>
                    {/* Front lip / edge detail */}
                    <mesh position={[0, 0.855 * s, 0.29 * s]} castShadow>
                        <boxGeometry args={[1.18 * s, 0.02 * s, 0.02 * s]} />
                        <meshStandardMaterial color="#2E2C2A" roughness={0.2} />
                    </mesh>
                </group>
            )}
            {f.type === 'kitchen_sink' && (
                <group position={[0, 0.86 * s, 0]}>
                    <RoundedBox args={[0.76 * s, 0.04 * s, 0.5 * s]} radius={0.01 * s} smoothness={8} castShadow receiveShadow>
                        <meshStandardMaterial color="#C7CBCD" metalness={0.7} roughness={0.25} />
                    </RoundedBox>
                    {/* Basin recess */}
                    <mesh position={[0, -0.09 * s, 0]}>
                        <boxGeometry args={[0.62 * s, 0.16 * s, 0.36 * s]} />
                        <meshStandardMaterial color="#8C9194" metalness={0.6} roughness={0.35} />
                    </mesh>
                    {/* Faucet */}
                    <mesh position={[0, 0.15 * s, -0.18 * s]} castShadow>
                        <cylinderGeometry args={[0.012 * s, 0.012 * s, 0.28 * s, 10]} />
                        <meshStandardMaterial color="#B9B9B4" metalness={0.7} roughness={0.25} />
                    </mesh>
                    <mesh position={[0, 0.28 * s, -0.10 * s]} rotation={[0, 0, Math.PI / 3]} castShadow>
                        <cylinderGeometry args={[0.01 * s, 0.01 * s, 0.16 * s, 10]} />
                        <meshStandardMaterial color="#B9B9B4" metalness={0.7} roughness={0.25} />
                    </mesh>
                </group>
            )}
            {f.type === 'kitchen_fridge' && (
                <group>
                    <RoundedBox args={[0.72 * s, 1.78 * s, 0.72 * s]} radius={0.02 * s} smoothness={6} position={[0, 0.89 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-body`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#DADADA"} roughness={0.3} metalness={0.35} />
                    </RoundedBox>
                    {/* Freezer/fridge door split line */}
                    <mesh position={[0, 1.32 * s, 0.365 * s]}>
                        <boxGeometry args={[0.68 * s, 0.01 * s, 0.005 * s]} />
                        <meshStandardMaterial color="#9a9a9a" metalness={0.5} roughness={0.4} />
                    </mesh>
                    {/* Handles */}
                    <mesh position={[0.30 * s, 1.55 * s, 0.37 * s]} castShadow>
                        <boxGeometry args={[0.02 * s, 0.35 * s, 0.03 * s]} />
                        <meshStandardMaterial color="#8a8a8a" metalness={0.6} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.30 * s, 0.75 * s, 0.37 * s]} castShadow>
                        <boxGeometry args={[0.02 * s, 0.55 * s, 0.03 * s]} />
                        <meshStandardMaterial color="#8a8a8a" metalness={0.6} roughness={0.3} />
                    </mesh>
                </group>
            )}
            {f.type === 'kitchen_island' && (
                <group>
                    <RoundedBox args={[1.55 * s, 0.85 * s, 0.85 * s]} radius={0.02 * s} smoothness={6} position={[0, 0.425 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial key={`${materialKey}-body`} {...bodyMaterialProps} color={useOverride ? bodyColor : "#E4DDCF"} roughness={0.45} />
                    </RoundedBox>
                    {/* Countertop overhang, slightly larger than the base */}
                    <RoundedBox args={[1.65 * s, 0.05 * s, 0.95 * s]} radius={0.01 * s} smoothness={8} position={[0, 0.88 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#3A3835" roughness={0.15} metalness={0.05} />
                    </RoundedBox>
                    {/* Cabinet door fronts along the long face */}
                    {[-0.5, 0, 0.5].map((x, i) => (
                        <RoundedBox key={i} args={[0.42 * s, 0.78 * s, 0.02 * s]} radius={0.008 * s} smoothness={4} position={[x * s, 0.44 * s, 0.44 * s]} castShadow>
                            <meshStandardMaterial color="#DCD4C4" roughness={0.35} />
                        </RoundedBox>
                    ))}
                </group>
            )}
            {f.type === 'kitchen_dishwasher' && (
                <group>
                    <RoundedBox args={[0.58 * s, 0.82 * s, 0.58 * s]} radius={0.015 * s} smoothness={6} position={[0, 0.41 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#C7CBCD" metalness={0.5} roughness={0.35} />
                    </RoundedBox>
                    {/* Control panel strip near the top */}
                    <mesh position={[0, 0.74 * s, 0.29 * s]}>
                        <boxGeometry args={[0.54 * s, 0.06 * s, 0.01 * s]} />
                        <meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.3} />
                    </mesh>
                    {/* Recessed handle */}
                    <mesh position={[0, 0.68 * s, 0.295 * s]}>
                        <boxGeometry args={[0.5 * s, 0.02 * s, 0.015 * s]} />
                        <meshStandardMaterial color="#9a9488" metalness={0.6} roughness={0.3} />
                    </mesh>
                </group>
            )}
            {f.type === 'kitchen_backsplash_panel' && (
                <group position={[0, 1.15 * s, 0]}>
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[1.0 * s, 0.55 * s, 0.02 * s]} />
                        <meshStandardMaterial color="#EFEAE0" roughness={0.15} metalness={0.05} />
                    </mesh>
                    {/* Subtle grout lines, subway-tile look */}
                    {Array.from({ length: 4 }, (_, i) => (
                        <mesh key={`h${i}`} position={[0, -0.2 * s + (0.4 * s / 3) * i, 0.011 * s]}>
                            <boxGeometry args={[1.0 * s, 0.004 * s, 0.002 * s]} />
                            <meshStandardMaterial color="#D8D2C4" roughness={0.5} />
                        </mesh>
                    ))}
                </group>
            )}
            {interactive && (selected || hovered) && highlightH > 0 && (
                <mesh position={[0, highlightH / 2, 0]} renderOrder={999}>
                    <boxGeometry args={[fp2.w * s * 1.08, highlightH * 1.05, fp2.d * s * 1.08]} />
                    <meshBasicMaterial
                        color={selected ? '#3B82F6' : '#93C5FD'}
                        wireframe
                        transparent
                        opacity={selected ? 0.9 : 0.5}
                        depthTest={false}
                    />
                </mesh>
            )}
            {overlapping && highlightH > 0 && (
                <mesh position={[0, highlightH / 2, 0]} renderOrder={1000}>
                    <boxGeometry args={[fp2.w * s * 1.12, highlightH * 1.1, fp2.d * s * 1.12]} />
                    <meshBasicMaterial
                        color="#EF4444"
                        wireframe
                        transparent
                        opacity={0.9}
                        depthTest={false}
                    />
                </mesh>
            )}
        </group>
    )
}