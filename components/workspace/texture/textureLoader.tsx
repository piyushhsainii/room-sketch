import * as THREE from 'three'
import { useState, useEffect, useMemo } from 'react'

const _texCache = new Map<string, THREE.Texture>()
const _pending = new Set<string>()
const _failed = new Set<string>()

const _manager = new THREE.LoadingManager()
_manager.onError = (url) => {
    _pending.delete(url)
    _failed.add(url)
    console.error(`[textureLoader] ❌ texture 404, falling back to solid color: ${url}`)
}
const _loader = new THREE.TextureLoader(_manager)

const _subscribers = new Map<string, Set<() => void>>()

function subscribe(url: string, cb: () => void): () => void {
    if (!_subscribers.has(url)) _subscribers.set(url, new Set())
    _subscribers.get(url)!.add(cb)
    return () => {
        _subscribers.get(url)?.delete(cb)
        if (_subscribers.get(url)?.size === 0) _subscribers.delete(url)
    }
}

function notify(url: string) {
    _subscribers.get(url)?.forEach((cb) => cb())
    _subscribers.delete(url)
}

function loadTextureSafe(url: string): THREE.Texture | null {
    if (_failed.has(url)) return null
    const cached = _texCache.get(url)
    if (cached) return cached
    if (_pending.has(url)) return null

    _pending.add(url)
    const timeout = setTimeout(() => { _pending.delete(url) }, 8000)

    try {
        _loader.load(
            url,
            (tex) => {
                clearTimeout(timeout)
                _pending.delete(url)
                _texCache.set(url, tex)
                notify(url)
            },
            undefined,
            () => {
                clearTimeout(timeout)
                _pending.delete(url)
                _failed.add(url)
                notify(url)
            }
        )
    } catch {
        clearTimeout(timeout)
        _pending.delete(url)
        _failed.add(url)
        notify(url)
    }
    return null
}

export type TextureLoadStatus = 'none' | 'loading' | 'failed' | 'loaded'

/**
 * Shared across every mesh type (furniture, stairs, floor, etc.) — one
 * cache, one set of in-flight loads, one subscriber list per URL. Two
 * independent instances of this hook loading the same texture URL will
 * share the same underlying THREE.Texture rather than double-fetching.
 */
export function useTextureMaterialProps(
    urls: Record<string, string> | null,
    repeatX = 2,
    repeatY = 2
): { textures: Record<string, THREE.Texture | undefined>; status: TextureLoadStatus } {
    // FIX: previously used `require('react')` to grab useState/useEffect/
    // useMemo. In an ESM bundle (Vite/webpack in the browser) `require` is
    // not defined at runtime, so this hook threw immediately on call —
    // which is why textures never loaded for ANY mesh type, not just
    // stairs. Replaced with standard ES imports at the top of the file.
    const [tick, forceTick] = useState(0)
    const key = urls ? Object.values(urls).join('|') : ''

    const { textures, status } = useMemo(() => {
        if (!urls) return { textures: {}, status: 'none' as const }
        const out: Record<string, THREE.Texture | undefined> = {}
        let anyPending = false
        let anyFailed = false
        for (const [k, url] of Object.entries(urls)) {
            const cached = _texCache.get(url)
            if (cached) { out[k] = cached; continue }
            if (_failed.has(url)) { anyFailed = true; continue }
            anyPending = true
        }
        const status: TextureLoadStatus = anyPending ? 'loading' : anyFailed ? 'failed' : 'loaded'
        return { textures: out, status }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, tick])

    useEffect(() => {
        if (!urls) return
        let cancelled = false
        const unsubs: (() => void)[] = []
        for (const url of Object.values(urls)) {
            if (_failed.has(url) || _texCache.get(url)) continue
            loadTextureSafe(url)
            unsubs.push(subscribe(url, () => { if (!cancelled) forceTick((n: number) => n + 1) }))
        }
        return () => { cancelled = true; unsubs.forEach(u => u()) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    useMemo(() => {
        Object.values(textures).forEach((t) => {
            if (!t) return
            t.wrapS = t.wrapT = THREE.RepeatWrapping
            t.repeat.set(repeatX, repeatY)
            t.needsUpdate = true
        })
    }, [textures, repeatX, repeatY])

    return { textures, status }
}