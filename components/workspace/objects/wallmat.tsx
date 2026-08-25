import * as THREE from 'three'
import { Suspense, useMemo, useRef } from 'react'
import { WALL_MAT_DEFS, WallMaterial, } from '../lib/constants'
import { useFrame, useLoader } from '@react-three/fiber'
import { MaterialDef, } from '../texture/materials-registry'

interface WallMatProps {
    color?: string
    roughness?: number
    textured?: boolean
    mat?: WallMaterial
    width?: number
    height?: number
    depth?: number
    opacity?: number
    transparent?: boolean
    polygonOffset?: boolean
    polygonOffsetFactor?: number
    polygonOffsetUnits?: number
    attach?: string   // NEW — e.g. 'material-4', defaults to 'material'
}


export function createProceduralTexture(mat: WallMaterial): THREE.CanvasTexture | null {
    if (mat === 'paint' || mat === 'pvc-panel-groove') return null

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 512, 512)

    if (mat === 'wallpaper-stripe') {
        ctx.fillStyle = '#E0E0E0'
        for (let i = 0; i < 512; i += 64) ctx.fillRect(i, 0, 32, 512)
    } else if (mat === 'wallpaper-floral') {
        ctx.fillStyle = '#C9A9A6'
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * 512, y = Math.random() * 512
            ctx.beginPath()
            ctx.arc(x, y, 8 + Math.random() * 10, 0, Math.PI * 2)
            ctx.fill()
        }
    } else if (mat === 'brick-red' || mat === 'brick-white') {
        // Brick fill color per variant, mortar lines on top
        ctx.fillStyle = mat === 'brick-red' ? '#9C4A34' : '#D8D2C4'
        ctx.fillRect(0, 0, 512, 512)
        ctx.strokeStyle = mat === 'brick-red' ? '#5C2A1E' : '#A8A296'
        ctx.lineWidth = 5
        for (let y = 0; y < 512; y += 48) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke()
            const offset = (y / 48) % 2 === 0 ? 0 : 64
            for (let x = -64; x < 512; x += 128) {
                ctx.beginPath(); ctx.moveTo(x + offset, y); ctx.lineTo(x + offset, y + 48); ctx.stroke()
            }
        }
        // subtle per-brick shade variance so it doesn't look flat
        for (let i = 0; i < 200; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 20, 12)
        }
    } else if (mat === 'tile-ceramic') {
        ctx.fillStyle = '#F2F1EC'
        ctx.fillRect(0, 0, 512, 512)
        ctx.strokeStyle = '#C9C7C0'
        ctx.lineWidth = 3
        const tileSize = 85
        for (let x = 0; x <= 512; x += tileSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke() }
        for (let y = 0; y <= 512; y += tileSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke() }
        // faint specular highlight streaks for a glossy read
        for (let i = 0; i < 6; i++) {
            const y = Math.random() * 512
            ctx.fillStyle = 'rgba(255,255,255,0.15)'
            ctx.fillRect(0, y, 512, 2)
        }
    } else if (mat.includes('brick')) { // pvc-panel-brick, exposed-brick fallback
        ctx.strokeStyle = '#555555'
        ctx.lineWidth = 4
        for (let y = 0; y < 512; y += 64) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke()
            const offset = (y / 64) % 2 === 0 ? 0 : 64
            for (let x = 0; x < 512; x += 128) {
                ctx.beginPath(); ctx.moveTo(x + offset, y); ctx.lineTo(x + offset, y + 64); ctx.stroke()
            }
        }
    } else if (mat === 'concrete-raw' || mat === 'wallpaper-textured') {
        for (let i = 0; i < 20000; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2)
        }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
}

function LoadingMaterial({ opacity = 1, transparent = false, attach = 'material' }: { opacity?: number; transparent?: boolean; attach?: string }) {
    const ref = useRef<THREE.MeshStandardMaterial>(null)
    useFrame(({ clock }) => {
        if (ref.current) {
            const t = (Math.sin(clock.elapsedTime * 3) + 1) / 2
            ref.current.color.setScalar(0.75 + t * 0.1)
        }
    })
    return <meshStandardMaterial ref={ref} attach={attach} roughness={0.9} opacity={opacity} transparent={transparent} />
}

export function RealTextureWallMat({
    width,
    height,
    depth,
    def,
    opacity = 1,
    transparent = false,
    polygonOffset = false,
    polygonOffsetFactor = 0,
    polygonOffsetUnits = 0,
    attach = 'material',
}: {
    width: number
    height: number
    depth: number
    def: MaterialDef
    opacity?: number
    transparent?: boolean
    polygonOffset?: boolean
    polygonOffsetFactor?: number
    polygonOffsetUnits?: number
    attach?: string
}) {
    const urls = [def.textureUrl!, def.normalMapUrl, def.roughnessMapUrl].filter(Boolean) as string[]
    const loaded = useLoader(THREE.TextureLoader, urls)

    // Map results back by which URLs were actually present — don't assume fixed
    // array positions, since `.filter(Boolean)` shifts indices when a map is absent.
    let i = 0
    const colorMap = loaded[i++]
    const normalMap = def.normalMapUrl ? loaded[i++] : undefined
    const roughnessMap = def.roughnessMapUrl ? loaded[i++] : undefined

    const maps = useMemo(() => {
        const prep = (t: THREE.Texture) => {
            const c = t.clone()
            c.wrapS = c.wrapT = THREE.RepeatWrapping
            c.repeat.set(
                Math.max(1, width * def.repeatScale),
                Math.max(1, height * def.repeatScale)
            )
            c.needsUpdate = true
            c.generateMipmaps = true
            c.minFilter = THREE.LinearMipmapLinearFilter
            c.magFilter = THREE.LinearFilter
            c.anisotropy = 8
            return c
        }
        const result: any = { map: prep(colorMap) }
        if (normalMap) result.normalMap = prep(normalMap)
        if (roughnessMap) result.roughnessMap = prep(roughnessMap)
        return result
    }, [colorMap, normalMap, roughnessMap, width, height, def])

    return (
        <meshStandardMaterial
            attach={attach}
            color="#FFFFFF"
            roughness={def.roughnessMapUrl ? 1 : def.roughness}
            metalness={def.metalness}
            opacity={opacity}
            transparent={transparent}
            polygonOffset={polygonOffset}
            polygonOffsetFactor={polygonOffsetFactor}
            polygonOffsetUnits={polygonOffsetUnits}
            {...maps}
        />
    )
}

function wallFaceAttach(wallName: 'north' | 'south' | 'east' | 'west'): { interior: number; exterior: number; ends: number[] } {
    switch (wallName) {
        case 'north': return { interior: 4, exterior: 5, ends: [0, 1, 2, 3] } // interior faces +z (toward center)
        case 'south': return { interior: 5, exterior: 4, ends: [0, 1, 2, 3] } // interior faces -z (toward center)
        case 'east': return { interior: 1, exterior: 0, ends: [2, 3, 4, 5] }  // interior faces -x (toward center)
        case 'west': return { interior: 0, exterior: 1, ends: [2, 3, 4, 5] }  // interior faces +x (toward center)
    }
}

// NEW — renders the 6-slot material array for one wall box. `ends` (top/
// bottom + the thin short-end caps) always get the interior material,
// same convention as line-walls-3d.tsx §4g ("mostly hidden anyway,
// doesn't matter visually"). runLength/runHeight/runDepth are that box's
// own dimensions, needed for correct texture repeat on each face.
function WallFaceMaterials({
    wallName, interiorMat, exteriorMat, interiorColor, exteriorColor,
    isSelected, roughness, textured, runLength, runHeight, runDepth, opacity, transparent,
}: {
    wallName: 'north' | 'south' | 'east' | 'west'
    interiorMat: WallMaterial
    exteriorMat: WallMaterial
    interiorColor: string
    exteriorColor: string
    isSelected: boolean
    roughness: number
    textured: boolean
    runLength: number
    runHeight: number
    runDepth: number
    opacity: number
    transparent: boolean
}) {
    const { interior, exterior, ends } = wallFaceAttach(wallName)
    const selColor = '#A5A6F5'
    return (
        <>
            <WallMat attach={`material-${interior}`} mat={interiorMat} color={isSelected ? selColor : interiorColor}
                roughness={roughness} textured={textured} width={runLength} height={runHeight} depth={runDepth}
                opacity={opacity} transparent={transparent} />
            <WallMat attach={`material-${exterior}`} mat={exteriorMat} color={isSelected ? selColor : exteriorColor}
                roughness={roughness} textured={textured} width={runLength} height={runHeight} depth={runDepth}
                opacity={opacity} transparent={transparent} />
            {ends.map(i => (
                <WallMat key={i} attach={`material-${i}`} mat={interiorMat} color={isSelected ? selColor : interiorColor}
                    roughness={roughness} textured={textured} width={runLength} height={runHeight} depth={runDepth}
                    opacity={opacity} transparent={transparent} />
            ))}
        </>
    )
}

export function WallMat({
    color,
    roughness,
    textured = false,
    mat = 'paint',
    width = 1,
    height = 2.7,
    depth = 0.15,
    opacity = 1,
    transparent = false,
    wallRunLength,
    wallRunHeight,
    polygonOffset = false,
    polygonOffsetFactor = 0,
    polygonOffsetUnits = 0,
    attach = 'material',
}: WallMatProps & {
    wallRunLength?: number
    wallRunHeight?: number
}) {
    const def = WALL_MAT_DEFS[mat] || WALL_MAT_DEFS['paint']

    const finalColor =
        color && color !== '#FFFFFF'
            ? color
            : def.color

    const finalRoughness =
        roughness ?? def.roughness

    const finalTransparent =
        transparent || opacity < 1

    const repeatW = wallRunLength ?? width
    const repeatH = wallRunHeight ?? height

    const texture = useMemo(() => {
        if (def.textureUrl) return null

        const tex = createProceduralTexture(mat)

        if (tex) {
            tex.repeat.set(
                Math.max(1, repeatW * def.repeatScale),
                Math.max(1, repeatH * def.repeatScale)
            )
            tex.needsUpdate = true
        }

        return tex
    }, [
        mat,
        repeatW,
        repeatH,
        def.repeatScale,
        def.textureUrl,
    ])

    if (def.textureUrl) {
        return (
            <Suspense fallback={<LoadingMaterial opacity={opacity} transparent={finalTransparent} attach={attach} />}>
                <RealTextureWallMat width={repeatW} height={repeatH} depth={depth} def={def} opacity={opacity} transparent={finalTransparent}
                    polygonOffset={polygonOffset} polygonOffsetFactor={polygonOffsetFactor} polygonOffsetUnits={polygonOffsetUnits}
                    attach={attach} />
            </Suspense>
        )
    }

    if (mat === 'pvc-panel-groove') {
        const numGrooves = Math.floor(width / 0.15)
        const grooveW = 0.015

        return (
            <>
                <meshStandardMaterial
                    attach={attach}
                    color={finalColor}
                    roughness={finalRoughness}
                    metalness={def.metalness}
                    opacity={opacity}
                    transparent={finalTransparent}
                    polygonOffset={polygonOffset}
                    polygonOffsetFactor={polygonOffsetFactor}
                    polygonOffsetUnits={polygonOffsetUnits}
                />

                <group
                    position={[
                        0,
                        0,
                        depth / 2 + 0.002,
                    ]}
                >
                    {Array.from({
                        length: numGrooves,
                    }).map((_, i) => {
                        const startX =
                            -width / 2 + 0.075

                        return (
                            <mesh
                                key={i}
                                position={[
                                    startX + i * 0.15,
                                    0,
                                    0,
                                ]}
                                castShadow
                                receiveShadow
                            >
                                <boxGeometry
                                    args={[
                                        grooveW,
                                        height,
                                        0.005,
                                    ]}
                                />

                                <meshStandardMaterial
                                    color={finalColor}
                                    roughness={
                                        finalRoughness + 0.1
                                    }
                                    opacity={opacity}
                                    transparent={
                                        finalTransparent
                                    }
                                />
                            </mesh>
                        )
                    })}
                </group>

                <group
                    position={[
                        0,
                        0,
                        -depth / 2 - 0.002,
                    ]}
                >
                    {Array.from({
                        length: numGrooves,
                    }).map((_, i) => {
                        const startX =
                            -width / 2 + 0.075

                        return (
                            <mesh
                                key={i}
                                position={[
                                    startX + i * 0.15,
                                    0,
                                    0,
                                ]}
                                castShadow
                                receiveShadow
                            >
                                <boxGeometry
                                    args={[
                                        grooveW,
                                        height,
                                        0.005,
                                    ]}
                                />

                                <meshStandardMaterial
                                    color={finalColor}
                                    roughness={
                                        finalRoughness + 0.1
                                    }
                                    opacity={opacity}
                                    transparent={
                                        finalTransparent
                                    }
                                />
                            </mesh>
                        )
                    })}
                </group>
            </>
        )
    }

    /*
     * PROCEDURAL / BASIC MATERIAL
     */
    return (
        <meshStandardMaterial
            attach={attach}
            color={finalColor}
            roughness={finalRoughness}
            metalness={def.metalness}
            map={texture || undefined}
            opacity={opacity}
            transparent={finalTransparent}
            polygonOffset={polygonOffset}
            polygonOffsetFactor={polygonOffsetFactor}
            polygonOffsetUnits={polygonOffsetUnits}
        />
    )
}

