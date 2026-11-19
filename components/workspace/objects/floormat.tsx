import * as THREE from 'three'
import { useMemo } from 'react'
import { FloorMaterial, FLOOR_MAT_DEFS, MaterialDef } from '../lib/constants'
import { useTextureMaterialProps } from '../texture/textureLoader'

// ── Procedural fallback for solids / anything without a real texture ──────
// Kept string-matching only as a *visual* fallback for materials that
// genuinely have no textureUrl in the registry (e.g. solid-*, plain) — any
// material WITH a textureUrl now always takes the real-texture path below,
// so this no longer needs to recognize every registry key by name.
function createFloorTexture(mat: FloorMaterial, def: MaterialDef): THREE.CanvasTexture | null {
    if (mat === 'plain' || mat.startsWith('solid-')) return null

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = def.color || '#FFFFFF'
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
    } else if (mat.includes('fabric') || mat.includes('carpet')) {
        for (let i = 0; i < 8000; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2)
        }
    } else if (mat.includes('concrete') || mat === 'plaster') {
        for (let i = 0; i < 15000; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2)
        }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
}

function ProceduralFloorMat({
    mat, def, width, depth, opacity = 1, transparent = false,
}: { mat: FloorMaterial; def: MaterialDef; width: number; depth: number; opacity?: number; transparent?: boolean }) {
    const texture = useMemo(() => {
        const tex = createFloorTexture(mat, def)
        if (tex) { tex.repeat.set(width * def.repeatScale, depth * def.repeatScale); tex.needsUpdate = true }
        return tex
    }, [mat, width, depth, def.repeatScale, def.color])

    return <meshStandardMaterial attach="material" side={THREE.DoubleSide} forceSinglePass color={def.color} roughness={def.roughness} metalness={def.metalness} map={texture || undefined} opacity={opacity} transparent={transparent} />
}
function RealTextureFloorMat({
    width, depth, def, opacity = 1, transparent = false,
}: { width: number; depth: number; def: MaterialDef; opacity?: number; transparent?: boolean }) {
    const { textures } = useTextureMaterialProps({
        map: def.textureUrl,
        normalMap: def.normalMapUrl,
        roughnessMap: def.roughnessMapUrl,
    }, width * def.repeatScale, depth * def.repeatScale)

    return (
        <meshStandardMaterial
            key={Object.keys(textures).join(",")}
            attach="material"
            side={THREE.DoubleSide}
            forceSinglePass
            color={textures.map ? "#FFFFFF" : def.color}
            roughness={textures.map && textures.roughnessMap ? 1 : def.roughness}
            metalness={def.metalness}
            opacity={opacity}
            transparent={transparent}
            map={textures.map ?? null}
            normalMap={textures.map ? textures.normalMap ?? null : null}
            roughnessMap={textures.map ? textures.roughnessMap ?? null : null}
        />
    )
}

export function FloorMat({
    mat = 'plain', width = 10, depth = 10,
    opacity = 1, transparent = false,   // NEW
}: { mat?: FloorMaterial; width?: number; depth?: number; opacity?: number; transparent?: boolean }) {
    const def = FLOOR_MAT_DEFS[mat] || FLOOR_MAT_DEFS['plain']
    const finalTransparent = transparent || opacity < 1

    if (def.textureUrl) {
        return (
            <RealTextureFloorMat width={width} depth={depth} def={def} opacity={opacity} transparent={finalTransparent} />
        )
    }

    const isSolid = mat === 'plain' || mat.startsWith('solid-')
    if (isSolid) {
        return <meshStandardMaterial attach="material" side={THREE.DoubleSide} forceSinglePass color={def.color} roughness={def.roughness} metalness={def.metalness} opacity={opacity} transparent={finalTransparent} />
    }

    return <ProceduralFloorMat mat={mat} def={def} width={width} depth={depth} opacity={opacity} transparent={finalTransparent} />
}
