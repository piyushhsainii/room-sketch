import { useMemo } from "react"
import { FloorPlanState } from "../constants"
import {
    resolveLightTransform,
    resolveShadowEligibleLightIds,
} from "./resolveLightPosition"
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

export function LightsLayer({
    fp,
    interactive,
    selectedId,
    onSelect,
    opacity,
    transparent,
}: LightsLayerProps) {
    const shadowEligibleIds = useMemo(
        () => resolveShadowEligibleLightIds(fp),
        [fp.lights, fp.rooms]
    )

    const { stringLights, otherLights } = useMemo(() => {
        const stringLights: PlacedLight[] = []
        const otherLights: PlacedLight[] = []

        for (const light of fp.lights ?? []) {
            if (light.type === "string_lights") {
                stringLights.push(light)
            } else {
                otherLights.push(light)
            }
        }

        return { stringLights, otherLights }
    }, [fp.lights])

    return (
        <>
            {stringLights.map((light) => (
                <StringLightsMesh
                    key={light.id}
                    light={light}
                    fp={fp}
                    selected={
                        interactive &&
                        selectedId === light.id
                    }
                    onSelect={
                        interactive
                            ? () => onSelect?.(light.id)
                            : undefined
                    }
                />
            ))}

            {otherLights.map((light) => {
                const t = resolveLightTransform(light, fp)

                if (!t) return null

                return (
                    <LightFixtureMesh
                        key={light.id}
                        light={light}
                        position={t.pos}
                        rotation={t.rot}
                        selected={
                            interactive &&
                            selectedId === light.id
                        }
                        onSelect={
                            interactive
                                ? () => onSelect?.(light.id)
                                : undefined
                        }
                        opacity={opacity}
                        transparent={transparent}
                        forceCastShadow={shadowEligibleIds.has(light.id)}
                    />
                )
            })}
        </>
    )
}