import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { MATERIAL_REGISTRY } from '../Tools/constants' // adjust path to wherever MATERIAL_REGISTRY actually lives

export type DoorMaterial = 'wood_oak' | 'wood_dark' | 'wood_white' | 'glass_frosted' | 'glass_clear' | 'metal_steel' | 'panel_white'

const DOOR_MATERIAL_TO_REGISTRY_KEY: Record<DoorMaterial, string> = {
    wood_oak: 'wood-oak',
    wood_dark: 'wood-slat-dark',
    wood_white: 'solid-white',
    glass_frosted: 'glass_frosted',
    glass_clear: 'glass_clear',
    metal_steel: 'metal-brushed',
    panel_white: 'solid-white',
}

const FALLBACK_REGISTRY_KEY = 'wood-oak'

type ResolvedDoorMat = {
    color: string
    roughness: number
    metalness: number
    transparent: boolean
    opacity: number
    textureUrl?: string
    normalMapUrl?: string
    roughnessMapUrl?: string
}

/**
 * Resolves a DoorMaterial to registry data. Always returns a valid object —
 * unknown/legacy style values (see doorStyleMigration.ts for the proper fix
 * at the data-loading boundary) fall back to FALLBACK_REGISTRY_KEY here as a
 * structural safety net, not just a per-call-site `?? ...` that's easy to
 * forget to add somewhere.
 */
function resolveDoorMaterial(style: string): ResolvedDoorMat {
    const registryKey = DOOR_MATERIAL_TO_REGISTRY_KEY[style as DoorMaterial] ?? FALLBACK_REGISTRY_KEY
    const def = MATERIAL_REGISTRY[registryKey] ?? MATERIAL_REGISTRY[FALLBACK_REGISTRY_KEY]

    // def is still theoretically undefined only if FALLBACK_REGISTRY_KEY
    // itself were removed from MATERIAL_REGISTRY — guard that too, with a
    // hardcoded last-resort so this function truly cannot throw.
    if (!def) {
        return { color: '#C8A878', roughness: 0.55, metalness: 0.02, transparent: false, opacity: 1 }
    }

    const isGlass = def.category === 'glass'
    return {
        color: def.color,
        roughness: def.roughness,
        metalness: def.metalness,
        transparent: isGlass,
        opacity: isGlass ? (style === 'glass_frosted' ? 0.55 : 0.25) : 1.0,
        textureUrl: def.textureUrl,
        normalMapUrl: def.normalMapUrl,
        roughnessMapUrl: def.roughnessMapUrl,
    }
}

function DoorMatTextured({ resolved }: { resolved: ResolvedDoorMat }) {
    // resolved.textureUrl is guaranteed present when this component is used
    // (see DoorMatPBR's branch below) — useTexture still needs concrete URLs.
    const textures = useTexture({
        map: resolved.textureUrl!,
        normalMap: resolved.normalMapUrl ?? resolved.textureUrl!,
        roughnessMap: resolved.roughnessMapUrl ?? resolved.textureUrl!,
    })
    useMemo(() => {
        Object.values(textures).forEach((t) => {
            if (t instanceof THREE.Texture) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2.2); t.needsUpdate = true }
        })
    }, [textures])
    return (
        <meshStandardMaterial
            map={textures.map}
            normalMap={resolved.normalMapUrl ? textures.normalMap : undefined}
            roughnessMap={resolved.roughnessMapUrl ? textures.roughnessMap : undefined}
            color={resolved.color}
            roughness={resolved.roughness}
            metalness={resolved.metalness}
        />
    )
}

function DoorMatPBR({ style }: { style: string }) {
    const resolved = resolveDoorMaterial(style)
    if (resolved.textureUrl) {
        return <DoorMatTextured resolved={resolved} />
    }
    return (
        <meshStandardMaterial
            color={resolved.color}
            roughness={resolved.roughness}
            metalness={resolved.metalness}
            transparent={resolved.transparent}
            opacity={resolved.opacity}
        />
    )
}

export function DoorMat({ style }: { style: string }) {
    const resolved = resolveDoorMaterial(style)
    return (
        <Suspense fallback={
            <meshStandardMaterial
                color={resolved.color}
                roughness={resolved.roughness}
                metalness={resolved.metalness}
                transparent={resolved.transparent}
                opacity={resolved.opacity}
            />
        }>
            <DoorMatPBR style={style} />
        </Suspense>
    )
}