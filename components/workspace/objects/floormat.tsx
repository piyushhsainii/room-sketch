import { FLOOR_TEX } from "@/lib/helpers";
import { useTexture } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from 'three'

function FloorMatPBR({ mat, repeat, worldWidth, worldDepth }: { mat: string; repeat: number; worldWidth?: number; worldDepth?: number }) {
    const cfg = FLOOR_TEX[mat] ?? FLOOR_TEX['wood']!
    const textures = useTexture({ map: cfg.map, normalMap: cfg.normal, roughnessMap: cfg.rough })
    useMemo(() => {
        // If worldWidth/worldDepth are given, compute aspect-correct repeat
        let rx = repeat, rz = repeat
        if (worldWidth && worldDepth && worldWidth > 0 && worldDepth > 0) {
            // 1 repeat unit = 1 metre of texture; use repeat as tiles-per-metre
            const tilesPerMetre = repeat
            rx = worldWidth * tilesPerMetre / Math.max(worldWidth, worldDepth)
            rz = worldDepth * tilesPerMetre / Math.max(worldWidth, worldDepth)
            // Ensure minimum repeat so textures don't look giant on small shapes
            const minRepeat = repeat * 0.5
            rx = Math.max(minRepeat, rx)
            rz = Math.max(minRepeat, rz)
        }
        ;[textures.map, textures.normalMap, textures.roughnessMap].forEach(t => {
            if (!t) return
            t.wrapS = t.wrapT = THREE.RepeatWrapping
            t.repeat.set(rx, rz)
            t.needsUpdate = true
        })
    }, [textures, repeat, worldWidth, worldDepth])
    return (
        <meshStandardMaterial
            map={textures.map}
            normalMap={textures.normalMap}
            roughnessMap={textures.roughnessMap}
            roughness={cfg.roughness}
            metalness={cfg.metalness}
            side={THREE.DoubleSide}
        />
    )
}

function FloorMatFallback({ mat }: { mat: string }) {
    const colors: Record<string, string> = {
        wood: '#C8A878', marble: '#EAE6E0', concrete: '#A8A8A8',
        tiles: '#D4D0C8', fabric: '#B8A898', plaster: '#D8D0C8',
    }
    return <meshStandardMaterial color={colors[mat] ?? '#C8A878'} roughness={0.8} side={THREE.DoubleSide} />
}

export function FloorMat({ mat, worldWidth, worldDepth }: { mat: string; worldWidth?: number; worldDepth?: number }) {
    if (mat === 'plain') {
        return <meshStandardMaterial color="#F2F2F0" roughness={0.95} metalness={0} />
    }
    const cfg = FLOOR_TEX[mat] ?? FLOOR_TEX['wood']!
    return (
        <Suspense fallback={<FloorMatFallback mat={mat} />}>
            <FloorMatPBR mat={mat} repeat={cfg.repeat} worldWidth={worldWidth} worldDepth={worldDepth} />
        </Suspense>
    )
}