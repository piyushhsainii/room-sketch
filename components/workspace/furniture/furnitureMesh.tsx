import React from 'react'
import { FURNITURE_FOOTPRINTS, PlacedFurniture } from "../Tools/constants"
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Fabric texture set (drop your Fabric049_1K-JPG_* files into /public/textures/fabric049/
// so they resolve at these exact URLs — e.g. public/textures/fabric049/Fabric049_1K-JPG_Color.jpg)
// If the files aren't there, loading fails silently and furniture just renders
// with flat color instead of crashing the whole scene.
// ---------------------------------------------------------------------------
const FABRIC_TEX_URLS = {
    map: '/textures/Fabric049_1K-JPG_Color.jpg',
    normalMap: '/textures/Fabric049_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Fabric049_1K-JPG_Roughness.jpg',
    aoMap: '/textures/Fabric049_1K-JPG_AmbientOcclusion.jpg',
}

// Multiple upholstery colorways so repeated furniture doesn't look identical.
// Applied as a tint multiplied over the fabric texture.
const SOFA_VARIANTS = ['#C7B9A6', '#8A9A8C', '#5E6E82', '#B85C4A', '#4A4640', '#D9C9A8']
const CUSHION_VARIANTS = ['#EDE4D3', '#DCD0BC', '#C9BFAE', '#E6D9C4']

// simple deterministic hash so the same furniture id always gets the same variant
function hashPick<T>(id: string, arr: T[]): T {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
    return arr[h % arr.length]
}

// Module-level cache so we only ever attempt each texture load once,
// regardless of how many furniture instances mount.
const _texCache = new Map<string, THREE.Texture | null>()
const _failed = new Set<string>()

// A LoadingManager whose onError is a no-op swallows the error at the
// three.js level, before it can ever bubble up as an uncaught image error
// that a <SceneErrorBoundary> would treat as a fatal 3D scene crash.
const _manager = new THREE.LoadingManager()
_manager.onError = (url) => {
    _failed.add(url)
    console.warn(`[FurnitureMesh] texture not found (404), using flat color instead: ${url}`)
}
const _loader = new THREE.TextureLoader(_manager)

function loadTextureSafe(url: string): THREE.Texture | null {
    if (_failed.has(url)) return null
    if (_texCache.has(url)) return _texCache.get(url) ?? null
    // Insert a placeholder immediately so concurrent calls don't double-load.
    _texCache.set(url, null)
    try {
        _loader.load(
            url,
            (tex) => { _texCache.set(url, tex) },
            undefined,
            () => {
                // belt-and-braces: also caught here in case a loader ignores the manager
                _failed.add(url)
            }
        )
    } catch {
        _failed.add(url)
    }
    return null
}

/**
 * Fail-safe fabric material builder. Attempts to load the PBR texture set;
 * if any file 404s the furniture still renders (just without that map)
 * instead of crashing the scene. Applies UV repeat so the weave reads at
 * furniture scale instead of stretching.
 */
function useFabricMaterialProps(repeatX = 2, repeatY = 2) {
    const [, forceTick] = React.useState(0)

    // Reading from the cache is a pure computation — fine in useMemo.
    const textures = React.useMemo(() => {
        const out: Record<string, THREE.Texture | undefined> = {}
        for (const [key, url] of Object.entries(FABRIC_TEX_URLS)) {
            const cached = _texCache.get(url)
            if (cached) out[key] = cached
        }
        return out
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Kicking off loads and scheduling a re-render are side effects —
    // they belong in useEffect, not useMemo.
    React.useEffect(() => {
        let cancelled = false
        let pending = false

        for (const url of Object.values(FABRIC_TEX_URLS)) {
            if (_failed.has(url)) continue
            if (_texCache.get(url)) continue
            pending = true
            loadTextureSafe(url)
        }

        if (pending) {
            const t = setTimeout(() => {
                if (!cancelled) forceTick((n) => n + 1)
            }, 150)
            return () => {
                cancelled = true
                clearTimeout(t)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    React.useMemo(() => {
        Object.values(textures).forEach((t) => {
            if (!t) return
            t.wrapS = t.wrapT = THREE.RepeatWrapping
            t.repeat.set(repeatX, repeatY)
            t.needsUpdate = true
        })
    }, [textures, repeatX, repeatY])

    return textures
}

export function FurnitureMesh({
    f,
    selected = false,
    interactive = false,
    onSelect,
}: {
    f: PlacedFurniture
    selected?: boolean
    interactive?: boolean
    onSelect?: (id: string) => void
}) {
    const s = f.scale ?? 1
    const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }
    const [hovered, setHovered] = React.useState(false)

    // fabric textures, shared and reused across all upholstered pieces
    const fabric = useFabricMaterialProps(2.4, 2.4)
    const fabricTight = useFabricMaterialProps(4, 4) // finer repeat for smaller cushions/chairs

    // per-instance color variation, stable per furniture id
    const sofaColor = React.useMemo(() => hashPick(f.id, SOFA_VARIANTS), [f.id])
    const cushionColor = React.useMemo(() => hashPick(f.id, CUSHION_VARIANTS), [f.id])

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

    // Approximate bounding footprint for the highlight outline.
    // Height is a rough per-type guess since footprints only carry w/d.
    const highlightH = f.type === 'wardrobe' ? 1.9 * s
        : f.type === 'led_strip' || f.type === 'painting' || f.type === 'wall_panel_pvc' || f.type === 'mirror' ? 0
            : 1.0 * s

    return (
        <group
            position={[f.x, 0, f.z]}
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
                            {...fabric}
                            color={sofaColor}
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
                            {...fabric}
                            color={sofaColor}
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
                        <meshStandardMaterial {...fabric} color={sofaColor} roughness={0.95} />
                    </RoundedBox>

                    {/* Right Arm */}
                    <RoundedBox
                        args={[0.22 * s, 0.52 * s, 0.92 * s]}
                        radius={0.09 * s}
                        smoothness={8}
                        position={[1.02 * s, 0.42 * s, 0]}
                        castShadow
                    >
                        <meshStandardMaterial {...fabric} color={sofaColor} roughness={0.95} />
                    </RoundedBox>

                    {/* Left Cushion — soft, puffy, slightly lighter tone */}
                    <RoundedBox
                        args={[0.90 * s, 0.18 * s, 0.72 * s]}
                        radius={0.09 * s}
                        smoothness={10}
                        position={[-0.50 * s, 0.44 * s, -0.06 * s]}
                        castShadow
                    >
                        <meshStandardMaterial
                            {...fabricTight}
                            color={cushionColor}
                            roughness={0.97}
                        />
                    </RoundedBox>

                    {/* Right Cushion */}
                    <RoundedBox
                        args={[0.90 * s, 0.18 * s, 0.72 * s]}
                        radius={0.09 * s}
                        smoothness={10}
                        position={[0.50 * s, 0.44 * s, -0.06 * s]}
                        castShadow
                    >
                        <meshStandardMaterial
                            {...fabricTight}
                            color={cushionColor}
                            roughness={0.97}
                        />
                    </RoundedBox>

                    {/* Cushion Gap */}
                    <mesh position={[0, 0.44 * s, -0.06 * s]}>
                        <boxGeometry args={[0.03 * s, 0.15 * s, 0.70 * s]} />
                        <meshStandardMaterial color="#111" roughness={0.9} />
                    </mesh>

                    {/* Throw pillows for texture contrast / realism */}
                    <RoundedBox
                        args={[0.30 * s, 0.28 * s, 0.10 * s]}
                        radius={0.08 * s}
                        smoothness={8}
                        position={[-0.78 * s, 0.56 * s, 0.18 * s]}
                        rotation={[0.15, 0.35, 0.05]}
                        castShadow
                    >
                        <meshStandardMaterial {...fabricTight} color={hashPick(f.id + 'p1', SOFA_VARIANTS)} roughness={0.98} />
                    </RoundedBox>
                    <RoundedBox
                        args={[0.30 * s, 0.28 * s, 0.10 * s]}
                        radius={0.08 * s}
                        smoothness={8}
                        position={[0.78 * s, 0.56 * s, 0.18 * s]}
                        rotation={[0.15, -0.35, -0.05]}
                        castShadow
                    >
                        <meshStandardMaterial {...fabricTight} color={hashPick(f.id + 'p2', SOFA_VARIANTS)} roughness={0.98} />
                    </RoundedBox>

                    {/* Legs — slightly rounded, warm metal */}
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
                                    color="#2b2b2b"
                                    metalness={0.6}
                                    roughness={0.3}
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
                        <meshStandardMaterial {...fabric} color="#EDE8E0" roughness={0.95} />
                    </RoundedBox>
                    <RoundedBox args={[1.7 * s, 0.82 * s, 0.10 * s]} radius={0.06 * s} smoothness={8} position={[0, 0.74 * s, -0.92 * s]} castShadow>
                        <meshStandardMaterial {...fabric} color="#8A8280" roughness={0.9} />
                    </RoundedBox>
                    <RoundedBox args={[1.7 * s, 0.42 * s, 0.08 * s]} radius={0.04 * s} smoothness={6} position={[0, 0.52 * s, 0.92 * s]} castShadow>
                        <meshStandardMaterial color="#4A3A2E" roughness={0.7} />
                    </RoundedBox>
                    <RoundedBox args={[0.58 * s, 0.12 * s, 0.38 * s]} radius={0.06 * s} smoothness={10} position={[-0.38 * s, 0.49 * s, -0.72 * s]} castShadow>
                        <meshStandardMaterial {...fabricTight} color="#F0EBE4" roughness={0.97} />
                    </RoundedBox>
                    <RoundedBox args={[0.58 * s, 0.12 * s, 0.38 * s]} radius={0.06 * s} smoothness={10} position={[0.38 * s, 0.49 * s, -0.72 * s]} castShadow>
                        <meshStandardMaterial {...fabricTight} color="#F0EBE4" roughness={0.97} />
                    </RoundedBox>
                    <RoundedBox args={[1.52 * s, 0.10 * s, 1.15 * s]} radius={0.05 * s} smoothness={8} position={[0, 0.48 * s, 0.35 * s]} castShadow>
                        <meshStandardMaterial {...fabric} color="#E8E0D4" roughness={0.95} />
                    </RoundedBox>
                </group>
            )}
            {f.type === 'dining_table' && (
                <group>
                    <RoundedBox args={[1.5 * s, 0.05 * s, 1.5 * s]} radius={0.015 * s} smoothness={6} position={[0, 0.76 * s, 0]} castShadow receiveShadow>
                        <meshStandardMaterial color="#EAE6E0" roughness={0.25} metalness={0.04} envMapIntensity={1.2} />
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
                        <meshStandardMaterial color="#C8B898" roughness={0.35} />
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
                        <meshStandardMaterial {...fabricTight} color="#C0B8A8" roughness={0.85} />
                    </RoundedBox>
                    <RoundedBox args={[0.50 * s, 0.52 * s, 0.06 * s]} radius={0.03 * s} smoothness={8} position={[0, 0.72 * s, 0.22 * s]} castShadow>
                        <meshStandardMaterial {...fabricTight} color="#B0A898" roughness={0.85} />
                    </RoundedBox>
                    {([-0.20, 0.20] as number[]).flatMap(x => [-0.20, 0.20].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.22 * s, z * s]} castShadow><cylinderGeometry args={[0.02 * s, 0.02 * s, 0.44 * s, 10]} /><meshStandardMaterial color="#8A7868" roughness={0.55} /></mesh>
                    )))}
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
                        <meshStandardMaterial {...fabric} color={sofaColor} roughness={0.95} />
                    </RoundedBox>
                    <RoundedBox args={[0.95 * s, 0.5 * s, 0.14 * s]} radius={0.08 * s} smoothness={8} position={[0, 0.60 * s, 0.36 * s]} castShadow>
                        <meshStandardMaterial {...fabric} color={sofaColor} roughness={0.95} />
                    </RoundedBox>
                    <RoundedBox args={[0.12 * s, 0.42 * s, 0.9 * s]} radius={0.06 * s} smoothness={8} position={[-0.44 * s, 0.44 * s, 0]} castShadow>
                        <meshStandardMaterial {...fabric} color={sofaColor} roughness={0.9} />
                    </RoundedBox>
                    <RoundedBox args={[0.12 * s, 0.42 * s, 0.9 * s]} radius={0.06 * s} smoothness={8} position={[0.44 * s, 0.44 * s, 0]} castShadow>
                        <meshStandardMaterial {...fabric} color={sofaColor} roughness={0.9} />
                    </RoundedBox>
                    <RoundedBox args={[0.68 * s, 0.1 * s, 0.66 * s]} radius={0.06 * s} smoothness={10} position={[0, 0.46 * s, -0.06 * s]} castShadow>
                        <meshStandardMaterial {...fabricTight} color={cushionColor} roughness={0.97} />
                    </RoundedBox>
                    {([-0.38, 0.38] as number[]).flatMap(x => [-0.38, 0.38].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.05 * s, z * s]}><cylinderGeometry args={[0.03 * s, 0.03 * s, 0.1 * s, 10]} /><meshStandardMaterial color="#6B5B4E" roughness={0.5} metalness={0.1} /></mesh>
                    )))}
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

            {/* Selection / hover highlight — wireframe box around bounding footprint */}
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
        </group>
    )
}