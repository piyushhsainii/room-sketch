import { useState } from 'react'
import { useSceneQuality, type SceneQuality } from './hooks/useSceneQuality'

export function QualityControl() {
    const [quality, setQuality] = useSceneQuality()
    const [error, setError] = useState('')
    return <label className="block px-3 py-2 text-sm text-neutral-600">Scene quality
        <select aria-label="Scene quality" value={quality} className="mt-1 min-h-10 w-full rounded-xl border border-neutral-200 bg-white px-2 text-neutral-900"
            onChange={event => {
                try { setQuality(event.target.value as SceneQuality); setError('') }
                catch { setError('Unable to save this device preference.') }
            }}>
            <option value="performance">Performance</option>
            <option value="balanced">Balanced</option>
            <option value="high">High</option>
        </select>
        {error && <span role="alert" className="text-xs text-red-800">{error}</span>}
    </label>
}
