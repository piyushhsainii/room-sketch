import * as THREE from 'three'
import { useMemo } from 'react'
import { WallMaterial, WALL_MAT_DEFS, MaterialDef } from '../Tools/constants'
import { useLoader } from '@react-three/fiber'

interface WallMatProps {
    color?: string
    roughness?: number
    textured?: boolean
    mat?: WallMaterial
    width?: number
    height?: number
    depth?: number
}

type WallTexInfo = { map: string; normalMap?: string; roughnessMap?: string }

function createProceduralTexture(mat: WallMaterial): THREE.CanvasTexture | null {
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

export function RealTextureWallMat({ width, height, depth, def }: { width: number; height: number; depth: number; def: MaterialDef }) {
    const urls = [def.textureUrl!, def.normalMapUrl, def.roughnessMapUrl].filter(Boolean) as string[]
    const loaded = useLoader(THREE.TextureLoader, urls)
    const [colorMap, normalMap, roughnessMap] = loaded

    const maps = useMemo(() => {
        const prep = (t: THREE.Texture) => {
            const c = t.clone()
            c.wrapS = c.wrapT = THREE.RepeatWrapping
            c.repeat.set(width * def.repeatScale, height * def.repeatScale)
            c.needsUpdate = true

            // Fix moire/aliasing on tiled textures viewed at oblique angles —
            // mipmaps + anisotropic filtering smooth out high-frequency repeat
            // patterns instead of aliasing into the shimmering interference look.
            c.generateMipmaps = true
            c.minFilter = THREE.LinearMipmapLinearFilter
            c.magFilter = THREE.LinearFilter
            c.anisotropy = 8 // most GPUs support at least this; renderer.capabilities.getMaxAnisotropy() if you have gl access

            return c
        }
        const result: any = { map: prep(colorMap) }
        if (def.normalMapUrl) result.normalMap = prep(normalMap)
        if (def.roughnessMapUrl) result.roughnessMap = prep(roughnessMap)
        return result
    }, [colorMap, normalMap, roughnessMap, width, height, def])

    return (
        <meshStandardMaterial
            attach="material"
            color="#FFFFFF"
            roughness={def.roughnessMapUrl ? 1 : def.roughness}
            metalness={def.metalness}
            {...maps}
        />
    )
}


export function WallMat({ color, roughness, textured = false, mat = 'paint', width = 1, height = 2.7, depth = 0.15 }: WallMatProps) {
    const def = WALL_MAT_DEFS[mat] || WALL_MAT_DEFS['paint']
    const finalColor = color && color !== '#FFFFFF' ? color : def.color
    const finalRoughness = roughness ?? def.roughness
    if (def.textureUrl) {
        return <RealTextureWallMat width={width} height={height} depth={depth} def={def} />
    }
    const texture = useMemo(() => {
        const tex = createProceduralTexture(mat)
        if (tex) {
            // Scale repeats based on real world dimensions
            tex.repeat.set(width * def.repeatScale, height * def.repeatScale)
            tex.needsUpdate = true
        }
        return tex
    }, [mat, width, height, def.repeatScale])

    // PVC Groove Geometry Injection (Generalized across wall width)
    if (mat === 'pvc-panel-groove') {
        const numGrooves = Math.floor(width / 0.15) // Groove every 15cm
        const grooveW = 0.015
        return (
            <>
                <meshStandardMaterial attach="material" color={finalColor} roughness={finalRoughness} metalness={def.metalness} />
                <group position={[0, 0, depth / 2 + 0.002]}>
                    {Array.from({ length: numGrooves }).map((_, i) => {
                        const startX = -width / 2 + 0.075
                        return (
                            <mesh key={i} position={[startX + i * 0.15, 0, 0]} castShadow receiveShadow>
                                <boxGeometry args={[grooveW, height, 0.005]} />
                                <meshStandardMaterial color={finalColor} roughness={finalRoughness + 0.1} />
                            </mesh>
                        )
                    })}
                </group>
                <group position={[0, 0, -depth / 2 - 0.002]}>
                    {Array.from({ length: numGrooves }).map((_, i) => {
                        const startX = -width / 2 + 0.075
                        return (
                            <mesh key={i} position={[startX + i * 0.15, 0, 0]} castShadow receiveShadow>
                                <boxGeometry args={[grooveW, height, 0.005]} />
                                <meshStandardMaterial color={finalColor} roughness={finalRoughness + 0.1} />
                            </mesh>
                        )
                    })}
                </group>
            </>
        )
    }

    return (
        <meshStandardMaterial
            attach="material"
            color={finalColor}
            roughness={finalRoughness}
            metalness={def.metalness}
            map={texture || undefined}
        />
    )
}