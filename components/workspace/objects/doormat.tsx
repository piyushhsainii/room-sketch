import { useTextureMaterialProps } from '../texture/textureLoader'
import { MATERIAL_REGISTRY } from '../lib/constants' // adjust path to wherever MATERIAL_REGISTRY actually lives

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
    const def =
        MATERIAL_REGISTRY[style]
        ?? MATERIAL_REGISTRY[DOOR_MATERIAL_TO_REGISTRY_KEY[style as DoorMaterial] ?? '']
        ?? MATERIAL_REGISTRY[FALLBACK_REGISTRY_KEY]

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
export function DoorMat({ style }: { style: string }) {
    const resolved = resolveDoorMaterial(style)
    const { textures } = useTextureMaterialProps({
        map: resolved.textureUrl,
        normalMap: resolved.normalMapUrl,
        roughnessMap: resolved.roughnessMapUrl,
    }, 1, 2.2)

    return (
        <meshStandardMaterial
            key={Object.keys(textures).join(",")}
            map={textures.map ?? null}
            normalMap={textures.map ? textures.normalMap ?? null : null}
            roughnessMap={textures.map ? textures.roughnessMap ?? null : null}
            color={resolved.color}
            roughness={resolved.roughness}
            metalness={resolved.metalness}
            transparent={resolved.transparent}
            opacity={resolved.opacity}
        />
    )
}
