import { DOOR_TEX_OAK } from "@/lib/helpers"
import { useTexture } from "@react-three/drei"
import { Suspense, useMemo } from "react"
import * as THREE from 'three'

export function DoorMat({ style }: { style: string }) {
    const isGlass = style === 'glass'
    const fallbackColor = isGlass ? '#B8D4E4' : style === 'white' ? '#F0EDE8' : style === 'dark' ? '#3A2E22' : '#C8A878'
    return (
        <Suspense fallback={<meshStandardMaterial color={fallbackColor} roughness={0.6} transparent={isGlass} opacity={isGlass ? 0.35 : 1} />}>
            <DoorMatPBR style={style} />
        </Suspense>
    )
}


function DoorMatPBR({ style }: { style: string }) {
    const isGlass = style === 'glass'
    const isDark = style === 'dark'
    const isWhite = style === 'white'
    if (isGlass) return <meshStandardMaterial color="#B8D4E4" roughness={0.05} metalness={0.1} transparent opacity={0.35} />
    if (isWhite) return <meshStandardMaterial color="#F0EDE8" roughness={0.75} metalness={0} />
    return <DoorMatWood tint={isDark ? '#3A2E22' : undefined} />
}

function DoorMatWood({ tint }: { tint?: string }) {
    const textures = useTexture({ map: DOOR_TEX_OAK.map, normalMap: DOOR_TEX_OAK.normal, roughnessMap: DOOR_TEX_OAK.rough })
    useMemo(() => {
        ;[textures.map, textures.normalMap, textures.roughnessMap].forEach(t => {
            if (!t) return
            t.wrapS = t.wrapT = THREE.RepeatWrapping
            t.repeat.set(1, 2)
            t.needsUpdate = true
        })
    }, [textures])
    return (
        <meshStandardMaterial
            map={textures.map}
            normalMap={textures.normalMap}
            roughnessMap={textures.roughnessMap}
            color={tint ?? '#FFFFFF'}
            roughness={0.6}
            metalness={0.02}
        />
    )
}