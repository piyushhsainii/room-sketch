import * as THREE from 'three'
import { useMemo } from 'react'
import { FloorMaterial, FLOOR_MAT_DEFS } from '../Tools/constants'

function createFloorTexture(mat: FloorMaterial): THREE.CanvasTexture | null {
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
        ctx.strokeRect(0, 0, 512, 512) // plank edges
    } else if (mat.includes('tile')) {
        ctx.strokeStyle = '#CCCCCC'
        ctx.lineWidth = 8
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
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
}

export function FloorMat({ mat = 'plain', width = 10, depth = 10 }: { mat?: FloorMaterial, width?: number, depth?: number }) {
    const def = FLOOR_MAT_DEFS[mat] || FLOOR_MAT_DEFS['plain']

    const texture = useMemo(() => {
        const tex = createFloorTexture(mat)
        if (tex) {
            tex.repeat.set(width * def.repeatScale, depth * def.repeatScale)
            tex.needsUpdate = true
        }
        return tex
    }, [mat, width, depth, def.repeatScale])

    return (
        <meshStandardMaterial
            attach="material"
            color={def.color}
            roughness={def.roughness}
            metalness={def.metalness}
            map={texture || undefined}
        />
    )
}