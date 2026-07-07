import { WALL_TEX } from "@/lib/helpers";
import { useTexture } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from 'three'

function WallMatPBR({ color, roughness }: { color: string; roughness: number }) {
    const textures = useTexture({ normalMap: WALL_TEX.normal, roughnessMap: WALL_TEX.rough })
    useMemo(() => {
        ;[textures.normalMap, textures.roughnessMap].forEach(t => {
            if (!t) return
            t.wrapS = t.wrapT = THREE.RepeatWrapping
            t.repeat.set(2, 2)
            t.needsUpdate = true
        })
    }, [textures])
    return (
        <meshStandardMaterial
            color={color}
            roughness={roughness}
            metalness={0}
            normalMap={textures.normalMap}
            normalScale={new THREE.Vector2(0.35, 0.35)}
            roughnessMap={textures.roughnessMap}
        />
    )
}

export function WallMat({ color, roughness, textured = false }: { color: string; roughness: number; textured?: boolean }) {
    if (!textured) {
        return <meshStandardMaterial color={color} roughness={roughness} metalness={0} />
    }
    return (
        <Suspense fallback={<meshStandardMaterial color={color} roughness={roughness} metalness={0} />}>
            <WallMatPBR color={color} roughness={roughness} />
        </Suspense>
    )
}