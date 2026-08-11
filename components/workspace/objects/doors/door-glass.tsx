// ── Configurable glass material ──

import { m, T } from "../door-variants";
import * as THREE from "three"
// instead of hardcoding one look for every sliding door.
type GlassFinish = 'clear' | 'tinted' | 'frosted' | 'reflective'

type GlassViewMode = 'two-way' | 'one-way'

export interface GlassConfig {
    finish?: GlassFinish
    tintColor?: string
    opacity?: number
    viewMode?: GlassViewMode        // NEW — 'two-way' (see through from both sides) or 'one-way' (privacy glass)
    oneWayViewableFrom?: 'front' | 'back'  // NEW — only used when viewMode is 'one-way': which side can see through
    backFinish?: GlassFinish        // NEW — what the "blocked" side looks like when one-way (e.g. mirrored/frosted)
    backTintColor?: string
}

function GlassMat({
    finish = 'clear', tintColor, itemOpacity = 1, itemTransparent = false, faceSide,
}: GlassConfig & { itemOpacity?: number; itemTransparent?: boolean; faceSide: THREE.Side }) {
    const presets: Record<GlassFinish, { color: string; roughness: number; transmission: number }> = {
        clear: { color: tintColor ?? '#dfe9e8', roughness: 0.02, transmission: 0.95 },
        tinted: { color: tintColor ?? '#5b6b63', roughness: 0.05, transmission: 0.75 },
        frosted: { color: tintColor ?? '#eef2f1', roughness: 0.55, transmission: 0.55 },
        reflective: { color: tintColor ?? '#9fb3c8', roughness: 0.03, transmission: 0.4 },
    }
    const p = presets[finish]
    return (
        <meshPhysicalMaterial
            color={p.color}
            roughness={p.roughness}
            transmission={p.transmission}
            thickness={0.02}
            ior={1.5}
            metalness={0}
            clearcoat={0.3}
            side={faceSide}
            transparent={itemTransparent || p.transmission > 0}
            opacity={itemOpacity}
            depthWrite={false}
        />
    )
}


export function GlassPane({ width, height, glass, itemOpacity, itemTransparent }: {
    width: number; height: number; glass?: GlassConfig; itemOpacity: number; itemTransparent: boolean
}) {
    const mode = glass?.viewMode ?? 'two-way'

    if (mode === 'two-way') {
        // FIX: plane + DoubleSide, not boxGeometry — box front/back faces broke transmission
        return (
            <mesh>
                <planeGeometry args={[width, height]} />
                <GlassMat {...glass} faceSide={THREE.DoubleSide} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </mesh>
        )
    }

    // one-way branch unchanged — already uses planes
    const viewableFromFront = (glass?.oneWayViewableFrom ?? 'front') === 'front'
    const frontFinish: GlassConfig = viewableFromFront
        ? { finish: glass?.finish ?? 'clear', tintColor: glass?.tintColor }
        : { finish: glass?.backFinish ?? 'reflective', tintColor: glass?.backTintColor }
    const backFinish: GlassConfig = viewableFromFront
        ? { finish: glass?.backFinish ?? 'reflective', tintColor: glass?.backTintColor }
        : { finish: glass?.finish ?? 'clear', tintColor: glass?.tintColor }

    return (
        <group>
            <mesh position={[0, 0, 0.003]}>
                <planeGeometry args={[width, height]} />
                <GlassMat {...frontFinish} faceSide={THREE.FrontSide} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </mesh>
            <mesh position={[0, 0, -0.003]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[width, height]} />
                <GlassMat {...backFinish} faceSide={THREE.FrontSide} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </mesh>
        </group>
    )
}

// ── Dark aluminum frame material (matches the black frames in the reference photo) ──
export function AluminumMat({ itemOpacity = 1, itemTransparent = false }: { itemOpacity?: number; itemTransparent?: boolean }) {
    return m('#1c1e20', { metalness: 0.75, roughness: 0.3 }, itemOpacity, itemTransparent)
}

// ── A single glazed leaf: thin aluminum stile/rail border + glass infill ──
// FRAME_W controls how slim the visible aluminum is around each pane —
// keep this small (0.04–0.06) to match the slim profiles in the photo.
const FRAME_W = 0.05

export function PanoramaGlassFace({ width, height, glass, itemOpacity, itemTransparent, showHandle = true }: {
    width: number; height: number; glass?: GlassConfig; itemOpacity: number; itemTransparent: boolean; showHandle?: boolean
}) {
    const glassW = width - FRAME_W * 2
    const glassH = height - FRAME_W * 2
    return (
        <group>
            <GlassPane width={glassW} height={glassH} glass={glass} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            {/* REMOVED — old single-mesh glass block, now fully replaced by GlassPane above */}
            {[
                [0, height / 2 - FRAME_W / 2, width, FRAME_W],
                [0, -height / 2 + FRAME_W / 2, width, FRAME_W],
                [-width / 2 + FRAME_W / 2, 0, FRAME_W, height],
                [width / 2 - FRAME_W / 2, 0, FRAME_W, height],
            ].map(([x, y, w, h], i) => (
                <mesh key={i} position={[x, y, 0]}>
                    <boxGeometry args={[w, h, T]} />
                    <AluminumMat itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                </mesh>
            ))}
            {showHandle && (
                <mesh
                    position={[width / 2 - FRAME_W - width * 0.06, 0, T / 2 + 0.02]}
                    renderOrder={999}   // NEW — force this to draw after transparent glass, ignoring its own sort position
                >
                    <boxGeometry args={[0.03, height * 0.25, 0.035]} />
                    <meshStandardMaterial
                        color="#e8e8e2"
                        metalness={0.8}
                        roughness={0.2}
                        emissive="#222220"   // NEW — tiny self-illumination so it doesn't rely purely on scene lighting to read against dark glass
                        emissiveIntensity={0.3}
                        depthTest={true}
                    />
                </mesh>
            )}
        </group>
    )
}