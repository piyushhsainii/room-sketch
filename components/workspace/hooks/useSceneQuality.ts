import { useSyncExternalStore } from 'react'

export type SceneQuality = 'performance' | 'balanced' | 'high'
const key = 'roomsketch:scene-quality'
const changed = 'roomsketch:scene-quality-changed'

function read(): SceneQuality {
    try {
        const value = localStorage.getItem(key)
        if (value === 'performance' || value === 'high') return value
    } catch { /* The default also works when storage is blocked. */ }
    return 'balanced'
}

function subscribe(listener: () => void) {
    window.addEventListener('storage', listener)
    window.addEventListener(changed, listener)
    return () => {
        window.removeEventListener('storage', listener)
        window.removeEventListener(changed, listener)
    }
}

export function useSceneQuality() {
    const quality = useSyncExternalStore(subscribe, read, () => 'balanced' as const)
    const setQuality = (value: SceneQuality) => {
        localStorage.setItem(key, value)
        window.dispatchEvent(new Event(changed))
    }
    return [quality, setQuality] as const
}
