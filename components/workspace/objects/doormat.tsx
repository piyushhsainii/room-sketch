import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

export type DoorMaterial = 'wood_oak' | 'wood_dark' | 'wood_white' | 'glass_frosted' | 'glass_clear' | 'metal_steel' | 'panel_white'

export const DOOR_MATERIALS: { id: DoorMaterial; label: string; swatch: string }[] = [
    { id: 'wood_oak', label: 'Oak', swatch: '#C8A878' },
    { id: 'wood_dark', label: 'Dark Wood', swatch: '#4A3220' },
    { id: 'wood_white', label: 'White', swatch: '#F0EDE8' },
    { id: 'glass_frosted', label: 'Frosted Glass', swatch: '#C8D8E4' },
    { id: 'glass_clear', label: 'Clear Glass', swatch: '#B8D0E0' },
    { id: 'metal_steel', label: 'Steel', swatch: '#9AABB8' },
    { id: 'panel_white', label: 'Panel White', swatch: '#F5F2EE' },
]

interface DoorMatConfig {
    color: string
    roughness: number
    metalness: number
    transparent: boolean
    opacity: number
    textureKey: 'wood_oak' | 'wood_dark' | 'metal' | null
}

// Mirrors RoomWall.tsx's DOOR_MAT_CONFIGS exactly, so a door looks the same
// in the live editor preview as it does in the published workspace view.
const DOOR_MAT_CONFIGS: Record<DoorMaterial, DoorMatConfig> = {
    wood_oak: { color: '#C8A878', roughness: 0.55, metalness: 0.02, transparent: false, opacity: 1.0, textureKey: 'wood_oak' },
    wood_dark: { color: '#4A3220', roughness: 0.60, metalness: 0.02, transparent: false, opacity: 1.0, textureKey: 'wood_dark' },
    wood_white: { color: '#F0EDE8', roughness: 0.75, metalness: 0.0, transparent: false, opacity: 1.0, textureKey: null },
    glass_frosted: { color: '#C8D8E4', roughness: 0.35, metalness: 0.08, transparent: true, opacity: 0.55, textureKey: null },
    glass_clear: { color: '#B8D0E0', roughness: 0.05, metalness: 0.12, transparent: true, opacity: 0.25, textureKey: null },
    metal_steel: { color: '#9AABB8', roughness: 0.22, metalness: 0.85, transparent: false, opacity: 1.0, textureKey: 'metal' },
    panel_white: { color: '#F5F2EE', roughness: 0.70, metalness: 0.0, transparent: false, opacity: 1.0, textureKey: null },
}

const WOOD_OAK_TEX_URLS = {
    map: '/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Color.jpg',
    normalMap: '/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Roughness.jpg',
}
const WOOD_DARK_TEX_URLS = {
    map: '/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_Color.jpg',
    normalMap: '/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_Roughness.jpg',
}
const METAL_TEX_URLS = {
    normalMap: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_Roughness.jpg',
}

function DoorMatWood({ style }: { style: DoorMaterial }) {
    const cfg = DOOR_MAT_CONFIGS[style]
    const urls = style === 'wood_dark' ? WOOD_DARK_TEX_URLS : WOOD_OAK_TEX_URLS
    const textures = useTexture(urls)
    useMemo(() => {
        Object.values(textures).forEach((t) => {
            if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2.2); t.needsUpdate = true }
        })
    }, [textures])
    return (
        <meshStandardMaterial
            map={textures.map}
            normalMap={textures.normalMap}
            roughnessMap={textures.roughnessMap}
            color={cfg.color}
            roughness={cfg.roughness}
            metalness={cfg.metalness}
        />
    )
}

function DoorMatMetal() {
    const cfg = DOOR_MAT_CONFIGS.metal_steel
    const textures = useTexture(METAL_TEX_URLS)
    useMemo(() => {
        Object.values(textures).forEach((t) => {
            if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); t.needsUpdate = true }
        })
    }, [textures])
    return (
        <meshStandardMaterial
            normalMap={textures.normalMap}
            roughnessMap={textures.roughnessMap}
            color={cfg.color}
            roughness={cfg.roughness}
            metalness={cfg.metalness}
        />
    )
}

function DoorMatPBR({ style }: { style: DoorMaterial }) {
    const cfg = DOOR_MAT_CONFIGS[style] ?? DOOR_MAT_CONFIGS.wood_oak
    if (cfg.textureKey === 'wood_oak' || cfg.textureKey === 'wood_dark') {
        return <DoorMatWood style={style} />
    }
    if (cfg.textureKey === 'metal') {
        return <DoorMatMetal />
    }
    return (
        <meshStandardMaterial
            color={cfg.color}
            roughness={cfg.roughness}
            metalness={cfg.metalness}
            transparent={cfg.transparent}
            opacity={cfg.opacity}
        />
    )
}

export function DoorMat({ style }: { style: string }) {
    const cfg = DOOR_MAT_CONFIGS[style as DoorMaterial] ?? DOOR_MAT_CONFIGS.wood_oak
    return (
        <Suspense fallback={
            <meshStandardMaterial
                color={cfg.color}
                roughness={cfg.roughness}
                metalness={cfg.metalness}
                transparent={cfg.transparent}
                opacity={cfg.opacity}
            />
        }>
            <DoorMatPBR style={style as DoorMaterial} />
        </Suspense>
    )
}