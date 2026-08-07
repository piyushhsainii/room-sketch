import { useMemo } from "react"
import { FloorPlanState } from "../constants"
import { resolveLightTransform, resolveShadowEligibleLightIds } from "./resolveLightPosition"
import { LightFixtureMesh } from "../../mesh/lights-mesh"
import { StringLightsMesh } from "../../mesh/string-lights-mesh"
import { PlacedLight } from "../../lights-constant"

type LightsLayerProps = {
    fp: FloorPlanState
    interactive: boolean
    selectedId?: string | null
    onSelect?: (id: string | null) => void
    opacity: number
    transparent: boolean
    shadowEligibleIds?: Set<string>
}

export function LightsLayer({ fp, interactive, selectedId, onSelect, opacity, transparent }: LightsLayerProps) {
    const shadowEligibleIds = useMemo(() => resolveShadowEligibleLightIds(fp), [fp.lights, fp.rooms])
    const localShadowEligibleIds = useMemo(() => resolveShadowEligibleLightIds(fp), [fp.lights, fp.rooms])
    const effectiveShadowIds = shadowEligibleIds ?? localShadowEligibleIds
    // Single pass instead of two separate .filter() calls/allocations —
    // avoids scanning fp.lights twice every render, matters more as light
    // count grows and across multiple stacked floors.
    const { stringLights, otherLights } = useMemo(() => {
        const stringLights: PlacedLight[] = []
        const otherLights: PlacedLight[] = []
        for (const l of fp.lights ?? []) {
            if (l.type === 'string_lights') stringLights.push(l)
            else otherLights.push(l)
        }
        return { stringLights, otherLights }
    }, [fp.lights])

    return (
        <>
            {stringLights.map(l => (
                <StringLightsMesh key={l.id} light={l} fp={fp} selected={interactive && selectedId === l.id}
                    onSelect={interactive ? () => onSelect?.(l.id) : undefined} />
            ))}
            {otherLights.map(light => {
                const t = resolveLightTransform(light, fp)
                if (!t) return null
                return (
                    <LightFixtureMesh
                        key={light.id}
                        light={light}
                        position={t.pos}
                        rotation={t.rot}
                        selected={interactive && selectedId === light.id}
                        onSelect={interactive ? () => onSelect?.(light.id) : undefined}
                        opacity={opacity}
                        transparent={transparent}
                        forceCastShadow={effectiveShadowIds.has(light.id)}
                    />
                )
            })}
        </>
    )
}