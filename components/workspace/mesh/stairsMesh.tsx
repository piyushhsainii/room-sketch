import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PlacedStairs } from '../lib/stairs-constants'
import { Railing3D } from '../objects/railing-3d'
import { TextureLoadStatus, useTextureMaterialProps } from '../texture/textureLoader'
import { MATERIAL_REGISTRY } from '../lib/constants'
import { DEFAULT_RAILING, DEFAULT_SKIRT, DEFAULT_TREAD, RailingConfig, resolveFlightRailing, SkirtConfig, TreadConfig } from '../objects/stair-config'

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

type RiserAxis = 'x' | 'z' // which local axis is the "run" (forward-travel) direction

function renderTread({
    key, position, width, run, riser, treadConfig, treadMaterial, riserAxis, prevRiser,
}: {
    key: string
    position: [number, number, number]
    width: number      // size across the flight (perpendicular to travel)
    run: number         // nominal step spacing along travel direction
    riser: number        // nominal step height
    treadConfig: TreadConfig
    treadMaterial?: ResolvedTreadMaterial
    riserAxis: RiserAxis
    /** Riser height of the PREVIOUS step, for closed-mode riser panel sizing (usually === riser). */
    prevRiser?: number
}) {
    const gap = treadConfig.mode === 'floating' ? (treadConfig.gap ?? 0.03) : 0
    const treadDepth = treadConfig.depth ?? run * 0.95
    const treadThickness = treadConfig.thickness ?? riser * 0.9

    const sizeX = riserAxis === 'x' ? treadDepth : width
    const sizeZ = riserAxis === 'z' ? treadDepth : width

    const nodes: React.ReactNode[] = [
        <mesh key={key} position={position} castShadow receiveShadow>
            <boxGeometry args={[sizeX, Math.max(0.005, treadThickness), sizeZ]} />
            <TreadMaterial def={treadMaterial} />
        </mesh>,
    ]

    if (treadConfig.mode === 'closed') {
        // Riser panel: fills the vertical face behind/below this tread down
        // to the previous tread's top, so consecutive steps read as one
        // continuous solid stair instead of floating slabs.
        const rh = prevRiser ?? riser
        const riserThickness = 0.02
        const riserPos: [number, number, number] = [...position] as [number, number, number]
        riserPos[1] -= riser / 2 - treadThickness / 4
        if (riserAxis === 'z') {
            riserPos[2] -= run / 2 * Math.sign(run) // shift to the step's back edge
        } else {
            riserPos[0] -= run / 2 * Math.sign(run)
        }
        const rSizeX = riserAxis === 'x' ? riserThickness : width
        const rSizeZ = riserAxis === 'z' ? riserThickness : width
        nodes.push(
            <mesh key={`${key}_riser`} position={riserPos} castShadow receiveShadow>
                <boxGeometry args={[rSizeX, rh, rSizeZ]} />
                <TreadMaterial def={treadMaterial} />
            </mesh>
        )
    }

    return nodes
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

// Shared helper — resolves a stair's railing/skirt config with legacy
// fallback, so every branch below (and old saves that predate `railing`/
// `skirt`) gets consistent defaults instead of each stair type inventing
// its own fallback logic.
function resolveRailingSkirt(s: PlacedStairs): { railing: RailingConfig; skirt: SkirtConfig } {
    const railing: RailingConfig = (s as any).railing ?? {
        ...DEFAULT_RAILING,
        enabled: (s as any).railingEnabled ?? true,
        style: (s as any).railingStyle ?? 'baluster',
        color: (s as any).railingColor ?? RAILING_COLOR,
        height: (s as any).railingHeight ?? 0.9,
    }
    const skirt: SkirtConfig = (s as any).skirt ?? DEFAULT_SKIRT
    return { railing, skirt }
}

function flightSideEnabled(skirt: SkirtConfig, flightIndex: number, side: 'left' | 'right' | 'front' | 'back') {
    if (!skirt.enabled) return false
    const cfg = skirt.perFlight.find((p: any) => p.flightIndex === flightIndex)
    return cfg?.sides?.includes(side) ?? false
}
function resolveTreadConfig(s: PlacedStairs): TreadConfig {
    return (s as any).tread ?? DEFAULT_TREAD
}

// One straight railing run between two EXPLICIT local points, always in the
// same coordinate frame the tread geometry itself is already computed in —
// no separate rotated wrapper group. Callers compute `from`/`to` the exact
// same way StraightStringer computes its own endpoints (fixed x, z ranging
// -usedD/2..usedD/2, y ranging 0..usedH), which is what SpiralStairs already
// does correctly with its postTopPoints. This replaces the old
// pathSegments+rotationY composition that produced the wrong, crossing
// diagonal geometry — two independently-signed rotations stacking wrong
// once a flight wasn't the one axis-aligned case they were tested against.
function FlightRailing({
    from, to, side, railing, flightIndex,
}: {
    from: [number, number, number]
    to: [number, number, number]
    side: 'left' | 'right'
    railing: RailingConfig
    flightIndex: number
}) {
    const resolved = resolveFlightRailing(railing, flightIndex, side)
    if (!resolved) return null

    return (
        <Railing3D
            from={from}
            to={to}
            color={resolved.color ?? RAILING_COLOR}
            height={resolved.height}
            style={resolved.style}
            postSpacing={resolved.postSpacing}
            railingWidth={resolved.railingWidth}
        />
    )
}

// Solid skirt board between two explicit points — same explicit-endpoint
// approach as FlightRailing, built the same way StraightStringer builds its
// sloped stringer box (hypot for length, atan2 for tilt), just wider.
function FlightSkirt({
    from, to, color, groundY = 0, material, width = 0.02,
}: {
    from: [number, number, number]
    to: [number, number, number]
    color: string
    groundY?: number
    material?: ResolvedTreadMaterial
    width?: number
}) {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const dz = to[2] - from[2]
    const horizLen = Math.hypot(dx, dz)
    const len = Math.hypot(horizLen, dy)
    const yaw = Math.atan2(dx, dz)
    const pitch = -Math.atan2(dy, horizLen)

    const lowY = Math.min(from[1], to[1])
    const panelH = Math.max(0.35, lowY - groundY + Math.max(from[1], to[1]) - lowY + 0.05)
    const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - panelH / 2, (from[2] + to[2]) / 2]

    return (
        <group position={mid} rotation={[0, yaw, 0]}>
            <mesh rotation={[pitch, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, panelH, len]} />
                {material?.textureUrl
                    ? <TreadMaterial def={{ ...material, color }} />
                    : <meshStandardMaterial color={color} roughness={0.6} />}
            </mesh>
        </group>
    )
}

function SkirtTrianglePrism({
    front, back, top, color, material, thickness = 0.02, normalAxis = 'x',
}: {
    front: [number, number, number]  // pointed bottom-front corner
    back: [number, number, number]   // right-angle bottom-back corner
    top: [number, number, number]    // top-back corner
    color: string
    material?: ResolvedTreadMaterial
    thickness?: number
    normalAxis?: 'x' | 'z'
}) {
    const geometry = useMemo(() => {
        const off: [number, number, number] =
            normalAxis === 'x' ? [thickness, 0, 0] : [0, 0, thickness]

        const a0 = new THREE.Vector3(...front)
        const b0 = new THREE.Vector3(...back)
        const c0 = new THREE.Vector3(...top)
        const a1 = a0.clone().add(new THREE.Vector3(...off))
        const b1 = b0.clone().add(new THREE.Vector3(...off))
        const c1 = c0.clone().add(new THREE.Vector3(...off))

        const pos = [
            // front triangle
            a0, b0, c0,
            // back triangle (reversed winding)
            c1, b1, a1,
            // three side quads connecting them
            a0, a1, b1, a0, b1, b0,
            b0, b1, c1, b0, c1, c0,
            c0, c1, a1, c0, a1, a0,
        ].flatMap(v => [v.x, v.y, v.z])

        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
        g.computeVertexNormals()
        return g
    }, [front, back, top, thickness, normalAxis])

    return (
        <mesh geometry={geometry} castShadow receiveShadow>
            {material?.textureUrl
                ? <TreadMaterial def={{ ...material, color }} />
                : <meshStandardMaterial color={color} roughness={0.6} />}
        </mesh>
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
    const { railing, skirt } = resolveRailingSkirt(s)
    const tread = resolveTreadConfig(s)
    const filledRisers = s.filledRisers ?? false
    const groupRef = useRef<THREE.Group>(null)
    const itemTransparent = transparent || opacity < 1

    const treadMaterialDef = resolveTreadMaterialDef(s.materialId)
    const skirtMaterialDef = resolveTreadMaterialDef(skirt.materialId)   // NEW

    const skirtUrls = useMemo(() => {
        if (!skirtMaterialDef?.textureUrl) return null
        return {
            map: skirtMaterialDef.textureUrl,
            ...(skirtMaterialDef.normalMapUrl ? { normalMap: skirtMaterialDef.normalMapUrl } : {}),
            ...(skirtMaterialDef.roughnessMapUrl ? { roughnessMap: skirtMaterialDef.roughnessMapUrl } : {}),
        }
    }, [skirtMaterialDef?.textureUrl, skirtMaterialDef?.normalMapUrl, skirtMaterialDef?.roughnessMapUrl])

    const { textures: skirtTextures, status: skirtStatus } = useTextureMaterialProps(skirtUrls, 2, 2)
    const resolvedSkirtMaterial: ResolvedTreadMaterial = useMemo(
        () => ({ ...skirtMaterialDef, textures: skirtTextures, status: skirtStatus }),
        [skirtMaterialDef, skirtTextures, skirtStatus]
    )

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
                    railing={railing} skirt={skirt} tread={tread}
                    treadMaterial={resolvedTreadMaterial} />
            )}
            {s.type === 'stairs-l' && (
                <LStairs w={s.width} d={s.depth} h={H} railing={railing} skirt={skirt} tread={tread}
                    steps1={s.steps1} steps2={s.steps2}
                    treadMaterial={resolvedTreadMaterial} />
            )}
            {s.type === 'stairs-u' && (
                <UStairs w={s.width} d={s.depth} h={H} railing={railing} skirt={skirt} tread={tread}
                    steps1={s.steps1} steps2={s.steps2}
                    showCenterWall={s.showCenterWall ?? true}
                    treadMaterial={resolvedTreadMaterial} />
            )}
            {s.type === 'stairs-spiral' && (
                <SpiralStairs w={s.width} d={s.depth} h={H} steps={s.steps}
                    railing={railing} tread={tread}
                    treadMaterial={resolvedTreadMaterial} />
            )}
            {s.type === 'stairs-ramp' && (
                <RampStairs w={s.width} d={s.depth} h={H} railing={railing} treadMaterial={resolvedTreadMaterial} />
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

/* ── Straight Stairs ─────────────────────────────────────────────────── */
function StraightStairs({
    w, d, h, steps, railing, skirt, treadMaterial, tread,
}: {
    w: number
    d: number
    h: number
    steps?: number
    railing: RailingConfig
    skirt: SkirtConfig
    treadMaterial?: ResolvedTreadMaterial
    tread: TreadConfig
}) {
    const maxTreadsByHeight = Math.round(h / RISER)
    const maxTreadsByDepth = Math.floor(d / RUN)
    const numTreads = steps ?? Math.max(3, Math.min(maxTreadsByHeight, maxTreadsByDepth))

    const riser = h / numTreads
    const run = d / numTreads

    const usedH = numTreads * riser
    const usedD = numTreads * run
    const treadW = w - 0.04
    const skirtColor = skirt.color ?? STAIR_SIDE_COLOR

    const skirtDrop = 0.03 // how far the skirt panel extends below the first stair

    const leftFrom: [number, number, number] = [-w / 2, -skirtDrop, -usedD / 2]
    const leftTo: [number, number, number] = [-w / 2, usedH, usedD / 2]
    const rightFrom: [number, number, number] = [w / 2, -skirtDrop, -usedD / 2]
    const rightTo: [number, number, number] = [w / 2, usedH, usedD / 2]

    const leftSkirtFrom: [number, number, number] = [-w / 2, -skirtDrop, -usedD / 2]
    const rightSkirtFrom: [number, number, number] = [w / 2, -skirtDrop, -usedD / 2]

    {
        flightSideEnabled(skirt, 0, 'left') && (
            <FlightSkirt from={[leftFrom[0] + 0.005, leftFrom[1], leftFrom[2]]} to={[leftTo[0] + 0.005, leftTo[1], leftTo[2]]} color={skirtColor} material={treadMaterial} />
        )
    }
    {
        flightSideEnabled(skirt, 0, 'right') && (
            <FlightSkirt from={[rightFrom[0] - 0.005, rightFrom[1], rightFrom[2]]} to={[rightTo[0] - 0.005, rightTo[1], rightTo[2]]} color={skirtColor} material={treadMaterial} />
        )
    }
    return (
        <group>
            {Array.from({ length: numTreads }, (_, i) =>
                renderTread({
                    key: `t_${i}`,
                    position: [0, riser * (i + 0.5), -usedD / 2 + run * (i + 0.5)],
                    width: treadW,
                    run,
                    riser,
                    treadConfig: tread,
                    treadMaterial,
                    riserAxis: 'z',
                })
            )}

            <StraightStringer
                from={[leftFrom[0] + 0.02, leftFrom[1], leftFrom[2]]}
                to={[leftTo[0] + 0.02, leftTo[1], leftTo[2]]}
                material={treadMaterial}
            />
            <StraightStringer
                from={[rightFrom[0] - 0.02, rightFrom[1], rightFrom[2]]}
                to={[rightTo[0] - 0.02, rightTo[1], rightTo[2]]}
                material={treadMaterial}
            />

            <FlightRailing from={leftFrom} to={leftTo} side="left" railing={railing} flightIndex={0} />
            <FlightRailing from={rightFrom} to={rightTo} side="right" railing={railing} flightIndex={0} />

            {flightSideEnabled(skirt, 0, 'left') && (
                <SkirtTrianglePrism
                    front={[leftFrom[0] + 0.005, leftFrom[1], leftFrom[2]]}
                    back={[leftFrom[0] + 0.005, leftFrom[1], leftTo[2]]}
                    top={[leftTo[0] + 0.005, leftTo[1], leftTo[2]]}
                    color={skirtColor}
                    material={treadMaterial}
                    normalAxis="x"
                />
            )}
            {flightSideEnabled(skirt, 0, 'right') && (
                <SkirtTrianglePrism
                    front={[rightFrom[0] - 0.005, rightFrom[1], rightFrom[2]]}
                    back={[rightFrom[0] - 0.005, rightFrom[1], rightTo[2]]}
                    top={[rightTo[0] - 0.005, rightTo[1], rightTo[2]]}
                    color={skirtColor}
                    material={treadMaterial}
                    normalAxis="x"
                />
            )}

            {flightSideEnabled(skirt, 0, 'front') && (
                <mesh position={[0, 0.01, -usedD / 2]} castShadow receiveShadow>
                    <boxGeometry args={[w, 0.02, 0.35]} />
                    {treadMaterial?.textureUrl
                        ? <TreadMaterial def={{ ...treadMaterial, color: skirtColor }} />
                        : <meshStandardMaterial color={skirtColor} roughness={0.6} />}
                </mesh>
            )}

            {flightSideEnabled(skirt, 0, 'back') && (() => {
                const backH = usedH * 0.97
                return (
                    <mesh
                        position={[0, backH / 2, usedD / 2 - 0.01]}
                        rotation={[-Math.atan2(riser, run) * 0.025, 0, 0]}
                        castShadow
                        receiveShadow
                    >
                        <boxGeometry args={[w, backH, 0.02]} />
                        {treadMaterial?.textureUrl
                            ? <TreadMaterial def={{ ...treadMaterial, color: skirtColor }} />
                            : <meshStandardMaterial color={skirtColor} roughness={0.6} />}
                    </mesh>
                )
            })()}
        </group>
    )
}

// Reconstructed to accept a material — replace with your real geometry if
// this differs from what you already have (I don't have your original body,
// so double-check the box dimensions/rotation match your stringer's actual
// diagonal geometry before dropping this in).
function StraightStringer({
    from, to, material, thickness = 0.04, width = 0.2,
}: {
    from: [number, number, number]
    to: [number, number, number]
    material?: ResolvedTreadMaterial
    thickness?: number
    width?: number
}) {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const dz = to[2] - from[2]
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const angle = -Math.atan2(dy, dz) // rotate about X, matching riserAxis 'z' travel direction

    const mid: [number, number, number] = [
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2,
        (from[2] + to[2]) / 2,
    ]

    return (
        <mesh position={mid} rotation={[angle, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[thickness, width, length]} />
            <TreadMaterial def={material} />
        </mesh>
    )
}

/* ── L-Shaped Stairs ──────────────────────────────────────────────────── */
function LStairs({
    w, d, h, railing, skirt, treadMaterial, tread,
    steps1, steps2, flightWidth: flightWidthProp, landingThickness: landingThicknessProp,
}: {
    w: number
    d: number
    h: number
    railing: RailingConfig
    skirt: SkirtConfig
    treadMaterial?: ResolvedTreadMaterial
    tread: TreadConfig
    steps1?: number
    steps2?: number
    flightWidth?: number
    landingThickness?: number
}) {
    const halfH = h / 2
    const skirtColor = skirt.color ?? STAIR_SIDE_COLOR

    const flightWidth = clamp(
        flightWidthProp ?? Math.min(w * 0.42, d * 0.42),
        0.6,
        Math.min(w, d) * 0.5,
    )

    const run1Depth = d - flightWidth
    const run2Width = w - flightWidth
    const run1Treads = Math.max(3, steps1 ?? Math.round(halfH / 0.18))
    const run2Treads = Math.max(3, steps2 ?? Math.round((h - halfH) / 0.18))
    const treadRise1 = halfH / run1Treads
    const treadRun1 = run1Depth / run1Treads
    const treadRise2 = (h - halfH) / run2Treads
    const treadRun2 = run2Width / run2Treads
    const landingThickness = landingThicknessProp ?? (treadRise1 + treadRise2) * 0.45

    const f1X = -w / 2 + flightWidth / 2
    const f1StartZ = -d / 2
    const f1EndZ = -d / 2 + run1Depth
    const landingX = f1X
    const landingZ = d / 2 - flightWidth / 2
    const f2Z = landingZ
    const f2StartX = -w / 2 + flightWidth
    const f2EndX = w / 2

    // FIX: each flight now has TWO distinct rail lines — outer edge (away
    // from the stair's footprint) and inner edge (facing the landing/well).
    // Previously "left" and "right" both pointed at the same single edge
    // per flight, so enabling both sides stacked two railings on top of
    // each other — a big solid-panel style completely hid a thin baluster
    // style rendered at the identical position.
    const f1OuterX = -w / 2
    const f1InnerX = -w / 2 + flightWidth
    const f1OuterFrom: [number, number, number] = [f1OuterX, 0, f1StartZ]
    const f1OuterTo: [number, number, number] = [f1OuterX, halfH, f1EndZ]
    const f1InnerFrom: [number, number, number] = [f1InnerX, 0, f1StartZ]
    const f1InnerTo: [number, number, number] = [f1InnerX, halfH, f1EndZ]

    const f2OuterZ = d / 2
    const f2InnerZ = d / 2 - flightWidth
    const f2OuterFrom: [number, number, number] = [f2StartX, halfH, f2OuterZ]
    const f2OuterTo: [number, number, number] = [f2EndX, h, f2OuterZ]
    const f2InnerFrom: [number, number, number] = [f2StartX, halfH, f2InnerZ]
    const f2InnerTo: [number, number, number] = [f2EndX, h, f2InnerZ]

    return (
        <group>
            {Array.from({ length: run1Treads }, (_, i) =>
                renderTread({
                    key: `r1_${i}`,
                    position: [f1X, treadRise1 * (i + 0.5), f1StartZ + treadRun1 * (i + 0.5)],
                    width: flightWidth * 0.96,
                    run: treadRun1,
                    riser: treadRise1,
                    treadConfig: tread,
                    treadMaterial,
                    riserAxis: 'z',
                })
            )}

            <mesh position={[landingX, halfH - landingThickness / 2, landingZ]} castShadow receiveShadow>
                <boxGeometry args={[flightWidth, landingThickness, flightWidth]} />
                <TreadMaterial def={treadMaterial} />
            </mesh>

            {Array.from({ length: run2Treads }, (_, i) =>
                renderTread({
                    key: `r2_${i}`,
                    position: [f2StartX + treadRun2 * (i + 0.5), halfH + treadRise2 * (i + 0.5), f2Z],
                    width: flightWidth * 0.96,
                    run: treadRun2,
                    riser: treadRise2,
                    treadConfig: tread,
                    treadMaterial,
                    riserAxis: 'x',
                })
            )}

            {/* "left" = outer edge, "right" = inner edge, per flight — now
                genuinely two different physical rail lines instead of one
                position with two labels. */}
            <FlightRailing from={f1OuterFrom} to={f1OuterTo} side="left" railing={railing} flightIndex={0} />
            <FlightRailing from={f1InnerFrom} to={f1InnerTo} side="right" railing={railing} flightIndex={0} />
            <FlightRailing from={f2InnerFrom} to={f2InnerTo} side="left" railing={railing} flightIndex={1} />
            <FlightRailing from={f2OuterFrom} to={f2OuterTo} side="right" railing={railing} flightIndex={1} />

            {flightSideEnabled(skirt, 0, 'left') && (
                <FlightSkirt from={[f1OuterFrom[0] + 0.005, f1OuterFrom[1], f1OuterFrom[2]]} to={[f1OuterTo[0] + 0.005, f1OuterTo[1], f1OuterTo[2]]} color={skirtColor} groundY={0} />
            )}
            {flightSideEnabled(skirt, 1, 'right') && (
                <FlightSkirt from={[f2OuterFrom[0], f2OuterFrom[1], f2OuterFrom[2] - 0.005]} to={[f2OuterTo[0], f2OuterTo[1], f2OuterTo[2] - 0.005]} color={skirtColor} groundY={halfH} />
            )}
        </group>
    )
}

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v))
}



/* ── U-Shaped Stairs ──────────────────────────────────────────────────── */
function UStairs({
    w, d, h, railing, skirt, treadMaterial, tread,
    steps1, steps2, showCenterWall = true,
}: {
    w: number
    d: number
    h: number
    railing: RailingConfig
    skirt: SkirtConfig
    treadMaterial?: ResolvedTreadMaterial
    tread: TreadConfig
    steps1?: number
    steps2?: number
    showCenterWall?: boolean
}) {
    const halfH = h / 2
    const runW = (w - 0.2) / 2
    const landingD = d * 0.25
    const runD = d - landingD
    const run1Treads = Math.max(3, steps1 ?? Math.round(halfH / 0.18))
    const run2Treads = Math.max(3, steps2 ?? Math.round((h - halfH) / 0.18))
    const treadH1 = halfH / run1Treads
    const treadD1 = runD / run1Treads
    const treadH2 = (h - halfH) / run2Treads
    const treadD2 = runD / run2Treads
    const skirtColor = skirt.color ?? STAIR_SIDE_COLOR

    const f1RailX = -w / 2
    const f1From: [number, number, number] = [f1RailX, 0, -d / 2]
    const f1To: [number, number, number] = [f1RailX, halfH, d / 2 - landingD]

    const f2RailX = w / 2
    const f2From: [number, number, number] = [f2RailX, halfH, d / 2 - landingD]
    const f2To: [number, number, number] = [f2RailX, h, d / 2 - landingD - runD]

    return (
        <group>
            {Array.from({ length: run1Treads }, (_, i) =>
                renderTread({
                    key: `r1_${i}`,
                    position: [-w / 2 + runW / 2 + 0.05, treadH1 * (i + 0.5), -d / 2 + treadD1 * (i + 0.5)],
                    width: runW * 0.9, run: treadD1, riser: treadH1,
                    treadConfig: tread, treadMaterial, riserAxis: 'z',
                })
            )}

            <mesh position={[0, halfH - treadH1 * 0.4, d / 2 - landingD / 2]} castShadow receiveShadow>
                <boxGeometry args={[w * 0.9, treadH1 * 0.9, landingD * 0.9]} />
                <TreadMaterial def={treadMaterial} />
            </mesh>

            {Array.from({ length: run2Treads }, (_, i) =>
                renderTread({
                    key: `r2_${i}`,
                    position: [w / 2 - runW / 2 - 0.05, halfH + treadH2 * (i + 0.5), d / 2 - landingD - treadD2 * (i + 0.5)],
                    width: runW * 0.9, run: treadD2, riser: treadH2,
                    treadConfig: tread, treadMaterial, riserAxis: 'z',
                })
            )}

            {/* Center dividing wall — now optional. Real U-stairs sometimes
                have an open well between the two flights instead of a solid
                divider (e.g. your Image 2/3 references), so this is a toggle
                rather than always-on. */}
            {showCenterWall && (
                <mesh position={[0, h / 2, -landingD / 2]} castShadow>
                    <boxGeometry args={[0.06, h, runD * 0.85]} />
                    <meshStandardMaterial color={STAIR_SIDE_COLOR} roughness={0.6} />
                </mesh>
            )}

            <FlightRailing from={f1From} to={f1To} side="left" railing={railing} flightIndex={0} />
            <FlightRailing from={f1From} to={f1To} side="right" railing={railing} flightIndex={0} />
            <FlightRailing from={f2From} to={f2To} side="left" railing={railing} flightIndex={1} />
            <FlightRailing from={f2From} to={f2To} side="right" railing={railing} flightIndex={1} />

            {flightSideEnabled(skirt, 0, 'left') && (
                <FlightSkirt from={[f1From[0] + 0.005, f1From[1], f1From[2]]} to={[f1To[0] + 0.005, f1To[1], f1To[2]]} color={skirtColor} groundY={0} />
            )}
            {flightSideEnabled(skirt, 1, 'right') && (
                <FlightSkirt from={[f2From[0] - 0.005, f2From[1], f2From[2]]} to={[f2To[0] - 0.005, f2To[1], f2To[2]]} color={skirtColor} groundY={halfH} />
            )}
        </group>
    )
}
/* ── Spiral Stairs ────────────────────────────────────────────────────── */
function SpiralStairs({
    w, d, h, steps, railing, treadMaterial, filledRisers, tread,
}: {
    w: number
    d: number
    h: number
    steps?: number
    railing: RailingConfig
    treadMaterial?: ResolvedTreadMaterial
    filledRisers?: boolean
    tread?: TreadConfig
}) {
    const numTreads = steps ?? Math.max(12, Math.round(h / 0.16))
    const treadH = h / numTreads
    // Radius driven by width alone. A spiral stair's "Width" is its
    // diameter — it shouldn't get capped by depth just because depth
    // wasn't also dragged up.
    const radius = w / 2 - 0.05
    const poleRadius = 0.06
    const railingHeight = railing.height ?? 0.9
    const railingColor = railing.color ?? RAILING_COLOR

    // `isClosed` unifies the legacy boolean `filledRisers` prop with the
    // newer `tread.mode` config — either one can request the solid/closed
    // spiral look, so old callers that only ever passed `filledRisers`
    // keep working exactly as before.
    const isClosed = tread?.mode === 'closed' || !!filledRisers

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
    // each other. (This is the pattern the rest of the stair types above
    // now follow too — explicit points, no compound rotation.)
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
        const geo = new THREE.ExtrudeGeometry(shape, { depth: tread?.thickness ?? treadH * 0.6, bevelEnabled: false })
        geo.rotateX(Math.PI / 2)
        return geo
    }, [innerR, outerR, angleStep, treadH, tread?.thickness])

    // Riser panel geometry, shared the same way, for the closed/solid
    // spiral style. Depth now honors tread.thickness when provided,
    // falling back to the original hardcoded 0.03 panel thickness.
    const riserGeo = useMemo(() => {
        if (!isClosed) return null
        const shape = new THREE.Shape()
        shape.moveTo(innerR, 0)
        shape.lineTo(outerR, 0)
        shape.lineTo(outerR, treadH)
        shape.lineTo(innerR, treadH)
        shape.closePath()
        const geo = new THREE.ExtrudeGeometry(shape, { depth: tread?.thickness ?? 0.03, bevelEnabled: false })
        geo.rotateY(Math.PI / 2)
        return geo
    }, [isClosed, innerR, outerR, treadH, tread?.thickness])

    // A spiral's railing is a continuous helix, not a "left/right of a
    // flight" — RailingConfig.side is treated as an on/off switch here
    // (`none` hides it, anything else shows the single continuous rail),
    // since there's only one physical rail to toggle.
    const railingEnabled = railing.enabled && railing.side !== 'none'

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

            {/* Filled riser panels between consecutive treads, closed/solid
                spiral style matching the reference image. Driven by
                `isClosed` (tread.mode === 'closed' OR legacy filledRisers),
                using TreadMaterial (textured) so risers match the treads. */}
            {isClosed && riserGeo && Array.from({ length: numTreads - 1 }, (_, i) => {
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
function RampStairs({
    w, d, h, railing, treadMaterial,
}: {
    w: number
    d: number
    h: number
    railing: RailingConfig
    treadMaterial?: ResolvedTreadMaterial
}) {
    const rampLen = Math.hypot(d, h)
    const angle = Math.atan2(h, d)

    const leftFrom: [number, number, number] = [-w / 2, 0, -d / 2]
    const leftTo: [number, number, number] = [-w / 2, h, d / 2]
    const rightFrom: [number, number, number] = [w / 2, 0, -d / 2]
    const rightTo: [number, number, number] = [w / 2, h, d / 2]

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

            <FlightRailing from={leftFrom} to={leftTo} side="left" railing={railing} flightIndex={0} />
            <FlightRailing from={rightFrom} to={rightTo} side="right" railing={railing} flightIndex={0} />

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