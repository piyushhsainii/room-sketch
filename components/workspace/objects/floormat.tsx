import * as THREE from 'three'
import { useMemo } from 'react'
import { FloorMaterial, FLOOR_MAT_DEFS, MaterialDef, FLOOR_TEXTURE_URLS } from '../Tools/constants'
import { useLoader } from '@react-three/fiber'

function createFloorTexture(mat: FloorMaterial, def: MaterialDef): THREE.CanvasTexture | null {
    if (mat === 'plain') return null

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 512, 512)

    if (mat.includes('wood')) {
        ctx.fillStyle = '#F0F0F0'
        for (let i = 0; i < 500; i++) {
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 40, 2)
        }
        ctx.strokeStyle = '#DDDDDD'
        ctx.strokeRect(0, 0, 512, 512)
    } else if (mat.includes('marble')) {
        ctx.strokeStyle = '#E0E0E0'
        ctx.lineWidth = 2
        for (let i = 0; i < 10; i++) {
            ctx.beginPath()
            ctx.moveTo(Math.random() * 512, 0)
            ctx.bezierCurveTo(Math.random() * 512, 256, Math.random() * 512, 256, Math.random() * 512, 512)
            ctx.stroke()
        }
    } else if (mat.includes('brick')) {
        ctx.fillStyle = mat.includes('red') ? '#A85C42' : '#D8D2C4'
        ctx.fillRect(0, 0, 512, 512)
        ctx.strokeStyle = mat.includes('red') ? '#6B3524' : '#A8A296'
        ctx.lineWidth = 4
        for (let y = 0; y < 512; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke()
            const offset = (y / 40) % 2 === 0 ? 0 : 60
            for (let x = -60; x < 512; x += 120) {
                ctx.beginPath(); ctx.moveTo(x + offset, y); ctx.lineTo(x + offset, y + 40); ctx.stroke()
            }
        }
    } else if (mat.includes('tile')) {
        ctx.fillStyle = def.color
        ctx.fillRect(0, 0, 512, 512)
        ctx.strokeStyle = '#CCCCCC'
        ctx.lineWidth = 6
        const tileSize = 85
        for (let x = 0; x <= 512; x += tileSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke() }
        for (let y = 0; y <= 512; y += tileSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke() }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
}

function ProceduralFloorMat({ mat, width, depth }: { mat: FloorMaterial; width: number; depth: number }) {
    const def = FLOOR_MAT_DEFS[mat] || FLOOR_MAT_DEFS['plain']
    const texture = useMemo(() => {
        const tex = createFloorTexture(mat, def)
        if (tex) { tex.repeat.set(width * def.repeatScale, depth * def.repeatScale); tex.needsUpdate = true }
        return tex
    }, [mat, width, depth, def.repeatScale])

    return <meshStandardMaterial attach="material" color={def.color} roughness={def.roughness} metalness={def.metalness} map={texture || undefined} />
}

type FloorTexInfo = {
    map: string; normalMap: string; roughnessMap: string; repeat: number
    roughness: number; metalness: number
}

function RealTextureFloorMat({ width, depth, texInfo }: { width: number; depth: number; texInfo: FloorTexInfo }) {
    const [colorMap, normalMap, roughnessMap] = useLoader(THREE.TextureLoader, [
        texInfo.map, texInfo.normalMap, texInfo.roughnessMap,
    ])

    const maps = useMemo(() => {
        const prep = (t: THREE.Texture) => {
            const c = t.clone()
            c.wrapS = c.wrapT = THREE.RepeatWrapping
            c.repeat.set(width * texInfo.repeat, depth * texInfo.repeat)
            c.needsUpdate = true
            return c
        }
        return { map: prep(colorMap), normalMap: prep(normalMap), roughnessMap: prep(roughnessMap) }
    }, [colorMap, normalMap, roughnessMap, width, depth, texInfo.repeat])

    return (
        <meshStandardMaterial
            attach="material"
            color="#FFFFFF"
            roughness={1} // roughnessMap drives it — flat scalar left at 1 so the map isn't double-applied
            metalness={texInfo.metalness}
            {...maps}
        />
    )
}

export function FloorMat({ mat = 'plain', width = 10, depth = 10 }: { mat?: FloorMaterial; width?: number; depth?: number }) {
    const def = FLOOR_MAT_DEFS[mat] || FLOOR_MAT_DEFS['plain']
    const isSolid = mat === 'plain' || mat.startsWith('solid-')
    if (isSolid) {
        return <meshStandardMaterial attach="material" color={def.color} roughness={def.roughness} metalness={def.metalness} />
    }
    const texInfo = FLOOR_TEXTURE_URLS[mat as Exclude<FloorMaterial, 'plain'>]
    if (texInfo?.map) {
        return <RealTextureFloorMat width={width} depth={depth} texInfo={texInfo} />
    }
    return <ProceduralFloorMat mat={mat} width={width} depth={depth} />
}