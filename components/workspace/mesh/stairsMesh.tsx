import React, { useMemo } from 'react'
import * as THREE from 'three'
import { PlacedStairs } from '../lib/constants'

const STAIR_COLOR = '#C8B898'
const STAIR_SIDE_COLOR = '#A09078'
const RAILING_COLOR = '#6B5B4E'
const ELEVATOR_COLOR = '#888888'
const ELEVATOR_DOOR_COLOR = '#A0A0A0'
const LANDING_COLOR = '#B8A888'

function StairsMeshImpl({ s, roomHeight }: { s: PlacedStairs; roomHeight: number }) {
    const cx = s.x + s.width / 2
    const cz = s.z + s.depth / 2
    const H = roomHeight

    return (
        <group position={[cx, 0, cz]} rotation={[0, s.rotation, 0]}>
            {s.type === 'stairs-straight' && <StraightStairs w={s.width} d={s.depth} h={H} />}
            {s.type === 'stairs-l' && <LStairs w={s.width} d={s.depth} h={H} />}
            {s.type === 'stairs-u' && <UStairs w={s.width} d={s.depth} h={H} />}
            {s.type === 'stairs-spiral' && <SpiralStairs w={s.width} d={s.depth} h={H} />}
            {s.type === 'stairs-ramp' && <RampStairs w={s.width} d={s.depth} h={H} />}
            {s.type === 'elevator' && <ElevatorMesh w={s.width} d={s.depth} h={H} />}
        </group>
    )
}

// Memoized export — StairsMesh does real geometry work (spiral stairs build
// custom ExtrudeGeometry, elevators render ~15+ meshes) that has zero reason
// to re-run on every 2D-editor-only state change (hover, pan, tooltip). See
// the same fix applied to FurnitureMesh for the full explanation.
export const StairsMesh = React.memo(StairsMeshImpl)

const RISER = 0.18   // realistic step height
const RUN = 0.28      // realistic tread depth

function StraightStairs({ w, d, h }: { w: number; d: number; h: number }) {
    const maxTreadsByHeight = Math.round(h / RISER)
    const maxTreadsByDepth = Math.floor(d / RUN)
    const numTreads = Math.max(3, Math.min(maxTreadsByHeight, maxTreadsByDepth))

    const usedH = numTreads * RISER
    const usedD = numTreads * RUN
    const treadW = w - 0.04

    return (
        <group>
            {Array.from({ length: numTreads }, (_, i) => (
                <mesh
                    key={i}
                    position={[0, RISER * (i + 0.5), -usedD / 2 + RUN * (i + 0.5)]}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[treadW, RISER * 0.9, RUN * 0.95]} />
                    <meshStandardMaterial color={STAIR_COLOR} roughness={0.7} />
                </mesh>
            ))}
            <StraightStringer x={-w / 2 + 0.02} d={usedD} h={usedH} />
            <StraightStringer x={w / 2 - 0.02} d={usedD} h={usedH} />
            <Railing x={-w / 2} d={usedD} h={usedH} />
            <Railing x={w / 2} d={usedD} h={usedH} />
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

function Railing({ x, d, h }: { x: number; d: number; h: number }) {
    const railH = 0.9
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
                        <meshStandardMaterial color={RAILING_COLOR} roughness={0.5} metalness={0.2} />
                    </mesh>
                )
            })}
            <mesh
                position={[x, h / 2 + railH, 0]}
                rotation={[-Math.atan2(h, d), 0, 0]}
                castShadow
            >
                <boxGeometry args={[0.04, 0.04, Math.hypot(d, h)]} />
                <meshStandardMaterial color={RAILING_COLOR} roughness={0.4} metalness={0.3} />
            </mesh>
        </group>
    )
}

/* ── L-Shaped Stairs ──────────────────────────────────────────────────── */
function LStairs({ w, d, h }: { w: number; d: number; h: number }) {
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
                    position={[
                        -w / 2 + treadW / 2 + 0.02,
                        treadH1 * (i + 0.5),
                        -d / 2 + treadD1 * (i + 0.5),
                    ]}
                    castShadow receiveShadow
                >
                    <boxGeometry args={[treadW, treadH1 * 0.9, treadD1 * 0.95]} />
                    <meshStandardMaterial color={STAIR_COLOR} roughness={0.7} />
                </mesh>
            ))}

            <mesh position={[0, halfH - treadH1 * 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[landingSize * 1.2, treadH1 * 0.9, landingSize * 1.2]} />
                <meshStandardMaterial color={LANDING_COLOR} roughness={0.65} />
            </mesh>

            {Array.from({ length: run2Treads }, (_, i) => (
                <mesh
                    key={`r2_${i}`}
                    position={[
                        landingSize / 2 + treadW2 * (i + 0.5),
                        halfH + treadH2 * (i + 0.5),
                        d / 2 - treadW2D / 2 - 0.02,
                    ]}
                    castShadow receiveShadow
                >
                    <boxGeometry args={[treadW2 * 0.95, treadH2 * 0.9, treadW2D]} />
                    <meshStandardMaterial color={STAIR_COLOR} roughness={0.7} />
                </mesh>
            ))}
        </group>
    )
}

/* ── U-Shaped Stairs ──────────────────────────────────────────────────── */
function UStairs({ w, d, h }: { w: number; d: number; h: number }) {
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
                    position={[
                        -w / 2 + runW / 2 + 0.05,
                        treadH1 * (i + 0.5),
                        -d / 2 + treadD1 * (i + 0.5),
                    ]}
                    castShadow receiveShadow
                >
                    <boxGeometry args={[runW * 0.9, treadH1 * 0.9, treadD1 * 0.92]} />
                    <meshStandardMaterial color={STAIR_COLOR} roughness={0.7} />
                </mesh>
            ))}

            <mesh position={[0, halfH - treadH1 * 0.4, d / 2 - landingD / 2]} castShadow receiveShadow>
                <boxGeometry args={[w * 0.9, treadH1 * 0.9, landingD * 0.9]} />
                <meshStandardMaterial color={LANDING_COLOR} roughness={0.65} />
            </mesh>

            {Array.from({ length: run2Treads }, (_, i) => (
                <mesh
                    key={`r2_${i}`}
                    position={[
                        w / 2 - runW / 2 - 0.05,
                        halfH + treadH2 * (i + 0.5),
                        d / 2 - landingD - treadD2 * (i + 0.5),
                    ]}
                    castShadow receiveShadow
                >
                    <boxGeometry args={[runW * 0.9, treadH2 * 0.9, treadD2 * 0.92]} />
                    <meshStandardMaterial color={STAIR_COLOR} roughness={0.7} />
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
function SpiralStairs({ w, d, h }: { w: number; d: number; h: number }) {
    const numTreads = Math.max(12, Math.round(h / 0.16))
    const treadH = h / numTreads
    const radius = Math.min(w, d) / 2 - 0.05
    const poleRadius = 0.06
    const totalAngle = Math.PI * 2
    const angleStep = totalAngle / numTreads

    const treadGeo = useMemo(() => {
        const shape = new THREE.Shape()
        const innerR = poleRadius + 0.02
        const outerR = radius - 0.02
        const halfAngle = angleStep * 0.42
        shape.moveTo(innerR * Math.cos(-halfAngle), innerR * Math.sin(-halfAngle))
        shape.lineTo(outerR * Math.cos(-halfAngle), outerR * Math.sin(-halfAngle))
        shape.lineTo(outerR * Math.cos(halfAngle), outerR * Math.sin(halfAngle))
        shape.lineTo(innerR * Math.cos(halfAngle), innerR * Math.sin(halfAngle))
        shape.closePath()
        const geo = new THREE.ExtrudeGeometry(shape, { depth: treadH * 0.6, bevelEnabled: false })
        geo.rotateX(Math.PI / 2)
        return geo
    }, [radius, angleStep, treadH])

    return (
        <group>
            <mesh position={[0, h / 2, 0]} castShadow>
                <cylinderGeometry args={[poleRadius, poleRadius, h, 16]} />
                <meshStandardMaterial color={RAILING_COLOR} roughness={0.4} metalness={0.4} />
            </mesh>

            {Array.from({ length: numTreads }, (_, i) => {
                const angle = i * angleStep
                const y = treadH * i
                return (
                    <mesh
                        key={i}
                        position={[0, y, 0]}
                        rotation={[0, angle, 0]}
                        castShadow
                        receiveShadow
                    >
                        <primitive object={treadGeo.clone()} attach="geometry" />
                        <meshStandardMaterial color={STAIR_COLOR} roughness={0.7} />
                    </mesh>
                )
            })}

            {Array.from({ length: Math.min(numTreads, 16) }, (_, i) => {
                const angle = (i / Math.min(numTreads, 16)) * totalAngle
                const y = (i / Math.min(numTreads, 16)) * h
                const px = (radius - 0.03) * Math.cos(angle)
                const pz = (radius - 0.03) * Math.sin(angle)
                return (
                    <mesh key={`post_${i}`} position={[px, y + 0.45, pz]} castShadow>
                        <boxGeometry args={[0.025, 0.9, 0.025]} />
                        <meshStandardMaterial color={RAILING_COLOR} roughness={0.5} metalness={0.2} />
                    </mesh>
                )
            })}
        </group>
    )
}

/* ── Ramp ─────────────────────────────────────────────────────────────── */
function RampStairs({ w, d, h }: { w: number; d: number; h: number }) {
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
                <meshStandardMaterial color={STAIR_COLOR} roughness={0.75} />
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