import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PlacedStairs } from '../lib/stairs-constants'
import { TextureLoadStatus, useTextureMaterialProps } from '../texture/textureLoader'
import { MATERIAL_REGISTRY } from '../lib/constants'

const STAIR_COLOR = '#C8B898'
const STAIR_SIDE_COLOR = '#A09078'
const RAILING_COLOR = '#6B5B4E'
const ELEVATOR_COLOR = '#888888'
const ELEVATOR_DOOR_COLOR = '#A0A0A0'
const LANDING_COLOR = '#B8A888'

type TreadMaterialDef = {
    color: string
    roughness?: number
    metalness?: number
    textureUrl?: string
    normalMapUrl?: string
    roughnessMapUrl?: string
}

// Resolved shape passed down from StairsMeshImpl to every tread-rendering
// component — carries both the material def AND the already-loaded
// textures/status. Loaded ONCE per stair instance (in StairsMeshImpl),
// not once per tread.
type ResolvedTreadMaterial = {
    color?: string
    roughness?: number
    metalness?: number
    textureUrl?: string
    normalMapUrl?: string
    roughnessMapUrl?: string
    textures?: Record<string, THREE.Texture | undefined>
    status?: TextureLoadStatus
}

function resolveTreadMaterialDef(materialId?: string): TreadMaterialDef | undefined {
    if (!materialId) return undefined
    const def = MATERIAL_REGISTRY[materialId]
    if (!def) return undefined
    return {
        color: def.color,
        roughness: def.roughness,
        metalness: def.metalness,
        textureUrl: def.textureUrl,
        normalMapUrl: def.normalMapUrl,
        roughnessMapUrl: def.roughnessMapUrl,
    }
}

function TreadMaterial({ def }: { def?: ResolvedTreadMaterial }) {
    const useTextured = !!def?.textures?.map && def.status === 'loaded'

    if (useTextured) {
        return (
            <meshStandardMaterial
                key={def!.textureUrl}
                map={def!.textures!.map}
                normalMap={def!.textures!.normalMap}
                roughnessMap={def!.textures!.roughnessMap}
                color="#FFFFFF"
                roughness={def?.roughness ?? 0.7}
                metalness={def?.metalness ?? 0}
            />
        )
    }
    return (
        <meshStandardMaterial
            key="solid"
            color={def?.color ?? STAIR_COLOR}
            roughness={def?.roughness ?? 0.7}
            metalness={def?.metalness ?? 0}
        />
    )
}

function StairsMeshImpl({
    s, roomHeight,
    opacity = 1,          // NEW
    transparent = false,  // NEW
}: {
    s: PlacedStairs
    roomHeight: number
    opacity?: number       // NEW
    transparent?: boolean  // NEW
}) {
    const cx = s.x + s.width / 2
    const cz = s.z + s.depth / 2
    const H = s.rise ?? roomHeight
    const railingEnabled = s.railingEnabled ?? true
    const railingColor = s.railingColor ?? RAILING_COLOR
    const railingHeight = s.railingHeight ?? 0.9
    const filledRisers = s.filledRisers ?? false
    const groupRef = useRef<THREE.Group>(null)
    const itemTransparent = transparent || opacity < 1

    const treadMaterialDef = resolveTreadMaterialDef(s.materialId)

    const urls = useMemo(() => {
        if (!treadMaterialDef?.textureUrl) return null
        return {
            map: treadMaterialDef.textureUrl,
            ...(treadMaterialDef.normalMapUrl ? { normalMap: treadMaterialDef.normalMapUrl } : {}),
            ...(treadMaterialDef.roughnessMapUrl ? { roughnessMap: treadMaterialDef.roughnessMapUrl } : {}),
        }
    }, [treadMaterialDef?.textureUrl, treadMaterialDef?.normalMapUrl, treadMaterialDef?.roughnessMapUrl])

    const { textures, status } = useTextureMaterialProps(urls, 2, 2)
    const resolvedTreadMaterial: ResolvedTreadMaterial = useMemo(
        () => ({ ...treadMaterialDef, textures, status }),
        [treadMaterialDef, textures, status]
    )

    // Ghosting via traversal — StraightStairs/LStairs/UStairs/SpiralStairs/
    // RampStairs/ElevatorMesh internals aren't visible here, so this covers
    // whatever materials they create without needing each threaded by hand.
    useEffect(() => {
        const root = groupRef.current
        if (!root) return
        root.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            if (!mesh.isMesh) return
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const mat of mats) {
                if (mat instanceof THREE.MeshBasicMaterial) continue
                if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                    if (mat.userData.__baseOpacity === undefined) {
                        mat.userData.__baseOpacity = mat.opacity
                    }
                    mat.opacity = mat.userData.__baseOpacity * opacity
                    mat.transparent = itemTransparent || mat.userData.__baseOpacity < 1
                    mat.needsUpdate = true
                }
            }
        })
        // Re-run when the tread material finishes loading (status change
        // swaps in new materials that need their baseline captured) or when
        // the stair type/id changes (different sub-component subtree).
    }, [opacity, itemTransparent, s.id, s.type, status])

    return (
        <group ref={groupRef} key={`${s.id}-${s.type}`} position={[cx, 0, cz]} rotation={[0, s.rotation, 0]}>
            {s.type === 'stairs-straight' && (
                <StraightStairs w={s.width} d={s.depth} h={H} steps={s.steps}
                    railingEnabled={railingEnabled} railingColor={railingColor} railingHeight={railingHeight}
                    treadMaterial={resolvedTreadMaterial} />
            )}
            {s.type === 'stairs-l' && (
                <LStairs w={s.width} d={s.depth} h={H} treadMaterial={resolvedTreadMaterial} />
            )}
            {s.type === 'stairs-u' && (
                <UStairs w={s.width} d={s.depth} h={H} treadMaterial={resolvedTreadMaterial} />
            )}
            {s.type === 'stairs-spiral' && (
                <SpiralStairs w={s.width} d={s.depth} h={H} steps={s.steps}
                    railingEnabled={railingEnabled} railingColor={railingColor} railingHeight={railingHeight}
                    treadMaterial={resolvedTreadMaterial} filledRisers={filledRisers} />
            )}
            {s.type === 'stairs-ramp' && (
                <RampStairs w={s.width} d={s.depth} h={H} treadMaterial={resolvedTreadMaterial} />
            )}
            {s.type === 'elevator' && (
                <ElevatorMesh w={s.width} d={s.depth} h={H} />
            )}
        </group>
    )
}

// Memoized export — StairsMesh does real geometry work (spiral stairs build
// custom ExtrudeGeometry, elevators render ~15+ meshes) that has zero reason
// to re-run on every 2D-editor-only state change (hover, pan, tooltip).
export const StairsMesh = React.memo(StairsMeshImpl)

const RISER = 0.18   // realistic step height
const RUN = 0.28      // realistic tread depth

function StraightStairs({
    w, d, h, steps, railingEnabled, railingColor, railingHeight, treadMaterial,
}: {
    w: number
    d: number
    h: number
    steps?: number
    railingEnabled: boolean
    railingColor: string
    railingHeight: number
    treadMaterial?: ResolvedTreadMaterial
}) {
    const maxTreadsByHeight = Math.round(h / RISER)
    const maxTreadsByDepth = Math.floor(d / RUN)
    const numTreads = steps ?? Math.max(3, Math.min(maxTreadsByHeight, maxTreadsByDepth))

    const riser = h / numTreads
    const run = d / numTreads

    const usedH = numTreads * riser
    const usedD = numTreads * run
    const treadW = w - 0.04

    return (
        <group>
            {Array.from({ length: numTreads }, (_, i) => (
                <mesh key={i} position={[0, riser * (i + 0.5), -usedD / 2 + run * (i + 0.5)]} castShadow receiveShadow>
                    <boxGeometry args={[treadW, riser * 0.9, run * 0.95]} />
                    <TreadMaterial def={treadMaterial} />
                </mesh>
            ))}
            <StraightStringer x={-w / 2 + 0.02} d={usedD} h={usedH} />
            <StraightStringer x={w / 2 - 0.02} d={usedD} h={usedH} />
            {railingEnabled && <Railing x={-w / 2} d={usedD} h={usedH} color={railingColor} railH={railingHeight} />}
            {railingEnabled && <Railing x={w / 2} d={usedD} h={usedH} color={railingColor} railH={railingHeight} />}
        </group>
    )
}

function StraightStringer({ x, d, h }: { x: number; d: number; h: number }) {
    const len = Math.hypot(d, h)
    const angle = Math.atan2(h, d)
    return (
        <mesh
            position={[x, h / 2, 0]}
            rotation={[-angle, 0, 0]}
            castShadow
        >
            <boxGeometry args={[0.04, 0.08, len]} />
            <meshStandardMaterial color={STAIR_SIDE_COLOR} roughness={0.6} />
        </mesh>
    )
}

function Railing({ x, d, h, color = RAILING_COLOR, railH = 0.9 }: { x: number; d: number; h: number; color?: string; railH?: number }) {
    const posts = 5
    return (
        <group>
            {Array.from({ length: posts }, (_, i) => {
                const t = i / (posts - 1)
                const py = t * h + railH / 2
                const pz = -d / 2 + t * d
                return (
                    <mesh key={i} position={[x, py, pz]} castShadow>
                        <boxGeometry args={[0.03, railH, 0.03]} />
                        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
                    </mesh>
                )
            })}
            <mesh
                position={[x, h / 2 + railH, 0]}
                rotation={[-Math.atan2(h, d), 0, 0]}
                castShadow
            >
                <boxGeometry args={[0.04, 0.04, Math.hypot(d, h)]} />
                <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
            </mesh>
        </group>
    )
}

/* ── L-Shaped Stairs ──────────────────────────────────────────────────── */
function LStairs({ w, d, h, treadMaterial }: { w: number; d: number; h: number; treadMaterial?: ResolvedTreadMaterial }) {
    const halfH = h / 2
    const landingSize = Math.min(w, d) * 0.4
    const run1Treads = Math.max(4, Math.round(halfH / 0.18))
    const run2Treads = Math.max(4, Math.round(halfH / 0.18))
    const run1D = d / 2 - landingSize / 2
    const run2W = w / 2 - landingSize / 2
    const treadH1 = halfH / run1Treads
    const treadD1 = run1D / run1Treads
    const treadH2 = halfH / run2Treads
    const treadW2 = run2W / run2Treads
    const treadW = w * 0.42
    const treadW2D = d * 0.42

    return (
        <group>
            {Array.from({ length: run1Treads }, (_, i) => (
                <mesh
                    key={`r1_${i}`}
                    position={[-w / 2 + treadW / 2 + 0.02, treadH1 * (i + 0.5), -d / 2 + treadD1 * (i + 0.5)]}
                    castShadow receiveShadow
                >
                    <boxGeometry args={[treadW, treadH1 * 0.9, treadD1 * 0.95]} />
                    <TreadMaterial def={treadMaterial} />
                </mesh>
            ))}

            <mesh position={[0, halfH - treadH1 * 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[landingSize * 1.2, treadH1 * 0.9, landingSize * 1.2]} />
                <TreadMaterial def={treadMaterial} />
            </mesh>

            {Array.from({ length: run2Treads }, (_, i) => (
                <mesh
                    key={`r2_${i}`}
                    position={[landingSize / 2 + treadW2 * (i + 0.5), halfH + treadH2 * (i + 0.5), d / 2 - treadW2D / 2 - 0.02]}
                    castShadow receiveShadow
                >
                    <boxGeometry args={[treadW2 * 0.95, treadH2 * 0.9, treadW2D]} />
                    <TreadMaterial def={treadMaterial} />
                </mesh>
            ))}
        </group>
    )
}

/* ── U-Shaped Stairs ──────────────────────────────────────────────────── */
function UStairs({ w, d, h, treadMaterial }: { w: number; d: number; h: number; treadMaterial?: ResolvedTreadMaterial }) {
    const halfH = h / 2
    const runW = (w - 0.2) / 2
    const landingD = d * 0.25
    const runD = d - landingD
    const run1Treads = Math.max(4, Math.round(halfH / 0.18))
    const run2Treads = Math.max(4, Math.round(halfH / 0.18))
    const treadH1 = halfH / run1Treads
    const treadD1 = runD / run1Treads
    const treadH2 = halfH / run2Treads
    const treadD2 = runD / run2Treads

    return (
        <group>
            {Array.from({ length: run1Treads }, (_, i) => (
                <mesh
                    key={`r1_${i}`}
                    position={[-w / 2 + runW / 2 + 0.05, treadH1 * (i + 0.5), -d / 2 + treadD1 * (i + 0.5)]}
                    castShadow receiveShadow
                >
                    <boxGeometry args={[runW * 0.9, treadH1 * 0.9, treadD1 * 0.92]} />
                    <TreadMaterial def={treadMaterial} />
                </mesh>
            ))}

            <mesh position={[0, halfH - treadH1 * 0.4, d / 2 - landingD / 2]} castShadow receiveShadow>
                <boxGeometry args={[w * 0.9, treadH1 * 0.9, landingD * 0.9]} />
                <TreadMaterial def={treadMaterial} />
            </mesh>

            {Array.from({ length: run2Treads }, (_, i) => (
                <mesh
                    key={`r2_${i}`}
                    position={[w / 2 - runW / 2 - 0.05, halfH + treadH2 * (i + 0.5), d / 2 - landingD - treadD2 * (i + 0.5)]}
                    castShadow receiveShadow
                >
                    <boxGeometry args={[runW * 0.9, treadH2 * 0.9, treadD2 * 0.92]} />
                    <TreadMaterial def={treadMaterial} />
                </mesh>
            ))}

            <mesh position={[0, h / 2, -landingD / 2]} castShadow>
                <boxGeometry args={[0.06, h, runD * 0.85]} />
                <meshStandardMaterial color={STAIR_SIDE_COLOR} roughness={0.6} />
            </mesh>
        </group>
    )
}

/* ── Spiral Stairs ────────────────────────────────────────────────────── */
function SpiralStairs({
    w, d, h, steps, railingEnabled, railingColor, railingHeight, treadMaterial, filledRisers,
}: {
    w: number
    d: number
    h: number
    steps?: number
    railingEnabled: boolean
    railingColor: string
    railingHeight: number
    treadMaterial?: ResolvedTreadMaterial
    filledRisers?: boolean
}) {
    const numTreads = steps ?? Math.max(12, Math.round(h / 0.16))
    const treadH = h / numTreads
    // Radius driven by width alone. A spiral stair's "Width" is its
    // diameter — it shouldn't get capped by depth just because depth
    // wasn't also dragged up.
    const radius = w / 2 - 0.05
    const poleRadius = 0.06

    // FIX: totalAngle is now DERIVED from numTreads using a realistic
    // per-step turn angle (~27.7°, typical for real spiral stairs),
    // rather than being hardcoded to exactly one revolution regardless
    // of step count. Previously a 31-step spiral was crammed into a
    // single 360° loop; now it correctly winds ~2.4 full turns, matching
    // the reference image's multi-turn helix instead of a compressed
    // single loop.
    const anglePerStep = Math.PI / 6.5 // ≈ 27.7°
    const angleStep = anglePerStep
    const totalAngle = numTreads * angleStep

    const outerR = radius - 0.02
    const innerR = poleRadius + 0.02
    // Posts and rail mount at the tread's true outer edge — same value
    // used by the tread geometry itself, so there's no drift between them.
    const postR = outerR

    // Explicit post-top points computed ONCE, used for BOTH the visible
    // posts AND the rail curve below — single source of truth instead of
    // two independently parametrized paths that could drift relative to
    // each other.
    const postTopPoints = useMemo(() => {
        const pts: THREE.Vector3[] = []
        for (let i = 0; i < numTreads; i++) {
            const angle = i * angleStep
            const y = treadH * i + railingHeight
            pts.push(new THREE.Vector3(postR * Math.cos(angle), y, postR * Math.sin(angle)))
        }
        return pts
    }, [numTreads, angleStep, treadH, railingHeight, postR])

    const railGeo = useMemo(() => {
        if (postTopPoints.length < 2) return null
        const curve = new THREE.CatmullRomCurve3(postTopPoints, false, 'catmullrom', 0.5)
        return new THREE.TubeGeometry(curve, Math.max(numTreads * 4, 48), 0.022, 8, false)
    }, [postTopPoints, numTreads])

    // FIX: this geometry is now shared across ALL treads via the `geometry`
    // prop on <mesh>, instead of being `.clone()`d inside the render loop
    // on every render. Every tread's shape is identical (only position/
    // rotation differ per-tread), so cloning it N times per render was
    // pure waste — it forced N new BufferGeometry allocations + GPU
    // re-uploads on every geometry-tab edit, which is what caused the
    // visible flicker/re-render on property changes.
    const treadGeo = useMemo(() => {
        const shape = new THREE.Shape()
        const halfAngle = angleStep * 0.42
        shape.moveTo(innerR * Math.cos(-halfAngle), innerR * Math.sin(-halfAngle))
        shape.lineTo(outerR * Math.cos(-halfAngle), outerR * Math.sin(-halfAngle))
        shape.lineTo(outerR * Math.cos(halfAngle), outerR * Math.sin(halfAngle))
        shape.lineTo(innerR * Math.cos(halfAngle), innerR * Math.sin(halfAngle))
        shape.closePath()
        const geo = new THREE.ExtrudeGeometry(shape, { depth: treadH * 0.6, bevelEnabled: false })
        geo.rotateX(Math.PI / 2)
        return geo
    }, [innerR, outerR, angleStep, treadH])

    // NEW — riser panel geometry, shared the same way, for the
    // filledRisers (closed spiral) style.
    const riserGeo = useMemo(() => {
        if (!filledRisers) return null
        const shape = new THREE.Shape()
        shape.moveTo(innerR, 0)
        shape.lineTo(outerR, 0)
        shape.lineTo(outerR, treadH)
        shape.lineTo(innerR, treadH)
        shape.closePath()
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false })
        geo.rotateY(Math.PI / 2)
        return geo
    }, [filledRisers, innerR, outerR, treadH])

    return (
        <group>
            <mesh position={[0, h / 2, 0]} castShadow>
                <cylinderGeometry args={[poleRadius, poleRadius, h, 16]} />
                <meshStandardMaterial color={railingColor} roughness={0.4} metalness={0.4} />
            </mesh>

            {Array.from({ length: numTreads }, (_, i) => {
                const angle = i * angleStep
                const y = treadH * i
                return (
                    <mesh key={i} position={[0, y, 0]} rotation={[0, -angle, 0]} castShadow receiveShadow geometry={treadGeo}>
                        <TreadMaterial def={treadMaterial} />
                    </mesh>
                )
            })}

            {/* NEW — filled riser panels between consecutive treads,
                closed/solid spiral style matching the reference image.
                Now uses TreadMaterial (textured) instead of a hardcoded
                flat color, so risers match the treads. */}
            {filledRisers && riserGeo && Array.from({ length: numTreads - 1 }, (_, i) => {
                const angle = i * angleStep + angleStep / 2
                const y = treadH * i
                return (
                    <mesh key={`riser_${i}`} position={[0, y, 0]} rotation={[0, -angle, 0]} castShadow receiveShadow geometry={riserGeo}>
                        <TreadMaterial def={treadMaterial} />
                    </mesh>
                )
            })}

            {railingEnabled && (
                <>
                    {postTopPoints.map((pt, i) => {
                        const angle = i * angleStep
                        const y = treadH * i
                        return (
                            <mesh key={`post_${i}`} position={[pt.x, y + railingHeight / 2, pt.z]} rotation={[0, -angle, 0]} castShadow>
                                <boxGeometry args={[0.025, railingHeight, 0.025]} />
                                <meshStandardMaterial color={railingColor} roughness={0.5} metalness={0.2} />
                            </mesh>
                        )
                    })}
                    {railGeo && (
                        <mesh geometry={railGeo} castShadow>
                            <meshStandardMaterial color={railingColor} roughness={0.4} metalness={0.3} />
                        </mesh>
                    )}
                </>
            )}
        </group>
    )
}

/* ── Ramp ─────────────────────────────────────────────────────────────── */
function RampStairs({ w, d, h, treadMaterial }: { w: number; d: number; h: number; treadMaterial?: ResolvedTreadMaterial }) {
    const rampLen = Math.hypot(d, h)
    const angle = Math.atan2(h, d)

    return (
        <group>
            <mesh
                position={[0, h / 2, 0]}
                rotation={[-angle, 0, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[w - 0.04, 0.08, rampLen]} />
                <TreadMaterial def={treadMaterial} />
            </mesh>

            {[-1, 1].map(side => (
                <mesh
                    key={side}
                    position={[side * (w / 2 - 0.02), h / 2, 0]}
                    rotation={[-angle, 0, 0]}
                    castShadow
                >
                    <boxGeometry args={[0.04, 0.15, rampLen]} />
                    <meshStandardMaterial color={STAIR_SIDE_COLOR} roughness={0.6} />
                </mesh>
            ))}

            {[-1, 1].map(side =>
                Array.from({ length: 5 }, (_, i) => {
                    const t = i / 4
                    const py = t * h + 0.45
                    const pz = -d / 2 + t * d
                    return (
                        <mesh key={`${side}_${i}`} position={[side * (w / 2), py, pz]} castShadow>
                            <boxGeometry args={[0.03, 0.9, 0.03]} />
                            <meshStandardMaterial color={RAILING_COLOR} roughness={0.5} metalness={0.2} />
                        </mesh>
                    )
                })
            )}

            {[-1, 1].map(side => (
                <mesh
                    key={`rail_${side}`}
                    position={[side * (w / 2), h / 2 + 0.9, 0]}
                    rotation={[-angle, 0, 0]}
                    castShadow
                >
                    <boxGeometry args={[0.04, 0.04, rampLen]} />
                    <meshStandardMaterial color={RAILING_COLOR} roughness={0.4} metalness={0.3} />
                </mesh>
            ))}

            {Array.from({ length: 8 }, (_, i) => {
                const t = (i + 1) / 9
                const py = t * h + 0.05
                const pz = -d / 2 + t * d
                return (
                    <mesh key={`line_${i}`} position={[0, py, pz]} rotation={[-angle, 0, 0]}>
                        <boxGeometry args={[w * 0.7, 0.005, 0.02]} />
                        <meshStandardMaterial color="#8A7A68" roughness={0.9} />
                    </mesh>
                )
            })}
        </group>
    )
}

/* ── Elevator ─────────────────────────────────────────────────────────── */
function ElevatorMesh({ w, d, h }: { w: number; d: number; h: number }) {
    const wallT = 0.06
    const doorW = w * 0.7
    const doorH = Math.min(h * 0.85, 2.2)

    return (
        <group>
            <mesh position={[0, 0.01, 0]} receiveShadow>
                <boxGeometry args={[w, 0.02, d]} />
                <meshStandardMaterial color="#D0D0D0" roughness={0.3} metalness={0.1} />
            </mesh>

            <mesh position={[0, h / 2, d / 2 - wallT / 2]} castShadow receiveShadow>
                <boxGeometry args={[w, h, wallT]} />
                <meshStandardMaterial color={ELEVATOR_COLOR} roughness={0.3} metalness={0.4} />
            </mesh>

            <mesh position={[-w / 2 + wallT / 2, h / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[wallT, h, d]} />
                <meshStandardMaterial color={ELEVATOR_COLOR} roughness={0.3} metalness={0.4} />
            </mesh>

            <mesh position={[w / 2 - wallT / 2, h / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[wallT, h, d]} />
                <meshStandardMaterial color={ELEVATOR_COLOR} roughness={0.3} metalness={0.4} />
            </mesh>

            <mesh position={[0, h - wallT / 2, 0]} castShadow>
                <boxGeometry args={[w, wallT, d]} />
                <meshStandardMaterial color="#707070" roughness={0.4} metalness={0.3} />
            </mesh>

            <mesh position={[0, doorH + (h - doorH) / 2, -d / 2 + wallT / 2]} castShadow>
                <boxGeometry args={[w, h - doorH, wallT]} />
                <meshStandardMaterial color={ELEVATOR_COLOR} roughness={0.3} metalness={0.4} />
            </mesh>

            {[-1, 1].map(side => {
                const sideW = (w - doorW) / 2
                if (sideW < 0.01) return null
                return (
                    <mesh key={side} position={[side * (doorW / 2 + sideW / 2), doorH / 2, -d / 2 + wallT / 2]} castShadow>
                        <boxGeometry args={[sideW, doorH, wallT]} />
                        <meshStandardMaterial color={ELEVATOR_COLOR} roughness={0.3} metalness={0.4} />
                    </mesh>
                )
            })}

            <mesh position={[-doorW / 4 - 0.04, doorH / 2, -d / 2 + 0.01]} castShadow>
                <boxGeometry args={[doorW / 2 - 0.06, doorH - 0.04, 0.03]} />
                <meshStandardMaterial color={ELEVATOR_DOOR_COLOR} roughness={0.15} metalness={0.6} />
            </mesh>
            <mesh position={[doorW / 4 + 0.04, doorH / 2, -d / 2 + 0.01]} castShadow>
                <boxGeometry args={[doorW / 2 - 0.06, doorH - 0.04, 0.03]} />
                <meshStandardMaterial color={ELEVATOR_DOOR_COLOR} roughness={0.15} metalness={0.6} />
            </mesh>

            <mesh position={[w / 2 - wallT - 0.005, h * 0.45, -d / 4]}>
                <boxGeometry args={[0.01, 0.35, 0.12]} />
                <meshStandardMaterial color="#2A2A2A" roughness={0.3} />
            </mesh>
            {Array.from({ length: 6 }, (_, i) => (
                <mesh key={i} position={[w / 2 - wallT - 0.01, h * 0.35 + i * 0.05, -d / 4]}>
                    <sphereGeometry args={[0.008, 8, 8]} />
                    <meshStandardMaterial color="#FFD700" roughness={0.2} metalness={0.5} emissive="#AA8800" emissiveIntensity={0.3} />
                </mesh>
            ))}

            {[-1, 1].map(side => (
                <mesh key={`rail_${side}`} position={[side * (w / 2 - wallT - 0.04), h / 2, d / 2 - wallT - 0.02]} castShadow>
                    <boxGeometry args={[0.04, h - 0.1, 0.04]} />
                    <meshStandardMaterial color="#505050" roughness={0.3} metalness={0.6} />
                </mesh>
            ))}

            <mesh position={[0, h - wallT - 0.02, 0]}>
                <boxGeometry args={[w * 0.5, 0.015, d * 0.3]} />
                <meshStandardMaterial
                    color="#FFFFEE"
                    emissive="#FFFFCC"
                    emissiveIntensity={0.5}
                    roughness={0.1}
                />
            </mesh>
        </group>
    )
}