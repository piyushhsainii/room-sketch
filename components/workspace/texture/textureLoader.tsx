import * as THREE from 'three'
import { useEffect, useMemo, useState } from 'react'

const loader = new THREE.TextureLoader()
const cache = new Map<string, THREE.Texture | null>()
const listeners = new Map<string, Set<() => void>>()

function subscribe(url: string, listener: () => void): () => void {
    const pending = listeners.get(url)
    if (pending) {
        pending.add(listener)
        return () => pending.delete(listener)
    }
    if (cache.has(url)) {
        listener()
        return () => {}
    }

    const subscribers = new Set([listener])
    listeners.set(url, subscribers)
    const finish = (texture: THREE.Texture | null) => {
        cache.set(url, texture)
        listeners.delete(url)
        subscribers.forEach(callback => callback())
    }
    try {
        loader.load(url, finish, undefined, () => finish(null))
    } catch {
        finish(null)
    }
    return () => subscribers.delete(listener)
}

export type TextureLoadStatus = 'none' | 'loading' | 'failed' | 'loaded'

/** Load each map independently. The shared cache owns the source images; each
 * material gets its own UV settings so tiling does not leak across surfaces. */
export function useTextureMaterialProps(
    urls: Record<string, string | undefined> | null,
    repeatX = 2,
    repeatY = 2,
): { textures: Record<string, THREE.Texture | undefined>; status: TextureLoadStatus } {
    const [revision, refresh] = useState(0)
    const key = JSON.stringify(Object.entries(urls ?? {}).filter(([, url]) => !!url))
    const entries = useMemo(() => JSON.parse(key) as [string, string][], [key])

    useEffect(() => {
        const unsubscribes = [...new Set(entries.map(([, url]) => url))].map(
            url => subscribe(url, () => refresh(value => value + 1)),
        )
        return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    }, [entries])

    const result = useMemo(() => {
        const textures: Record<string, THREE.Texture> = {}
        let status: TextureLoadStatus = entries.length ? 'loaded' : 'none'
        for (const [name, url] of entries) {
            const source = cache.get(url)
            if (source === undefined) {
                status = 'loading'
            } else if (source === null) {
                if (status !== 'loading') status = 'failed'
            } else {
                const texture = source.clone()
                texture.colorSpace = name === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping
                texture.repeat.set(repeatX, repeatY)
                texture.anisotropy = 8
                texture.needsUpdate = true
                textures[name] = texture
            }
        }
        return { textures, status }
        // The revision reflects completed requests in the shared cache.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries, repeatX, repeatY, revision])

    useEffect(() => () => {
        Object.values(result.textures).forEach(texture => texture.dispose())
    }, [result])

    return result
}
