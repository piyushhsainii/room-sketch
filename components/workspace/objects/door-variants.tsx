import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { EditorOpening } from "../lib/constants"
import { DoorMat } from "./doormat"

export function DoorVariant3D({ op, angle, basePos, doorStyle, interactive = false, onToggleOpen }: {
    op: EditorOpening
    angle: number
    basePos: [number, number, number]
    doorStyle: string
    /** When true, clicking a swinging door panel toggles op.isOpen. Matches
     *  the same `interactive` convention used everywhere else this
     *  component's siblings (walls, windows, wall decor) gate click
     *  handlers on. */
    interactive?: boolean
    /** Threaded down from wherever setFp lives — same pattern as onSelect.
     *  ASSUMPTION: Room3D/LineWalls3D didn't have a path to mutate
     *  fp.openings before this, so this prop is new at every level of the
     *  chain (Scene3D → Room3D/LineWalls3D → DoorVariant3D). Flagging this
     *  explicitly since I haven't seen the very top of that wiring — worth
     *  double-checking it actually reaches a setFp call once wired through.
     */
    onToggleOpen?: (openingId: string) => void
}) {
    const resolvedStyle = op.material ?? doorStyle

    const inward = op.swingDirection !== 'outward'
    const swingSign = inward ? 1 : -1
    const variant = op.variant ?? 'door-swing-single'
    const T = 0.045 // panel thickness

    const dirX = Math.cos(angle), dirZ = Math.sin(angle)
    const perpX = -dirZ, perpZ = dirX

    // ── Realistic door knob — rosette plate flush on the face, a short rod
    // standing off the face, and a horizontal lever bar at the rod's end.
    // Replaces the old single stub cylinder (which just poked straight out
    // of the door and read as a peg, not a handle).
    function DoorKnob({ zSide }: { zSide: 1 | -1 }) {
        const rosetteZ = zSide * (T / 2 + 0.003)
        const rodLen = 0.045
        const rodZ = zSide * (T / 2 + rodLen / 2)
        const leverZ = zSide * (T / 2 + rodLen)
        return (
            <group>
                <mesh position={[0, 0, rosetteZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.028, 0.028, 0.006, 16]} />
                    <meshStandardMaterial color="#C9C9C2" metalness={0.7} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0, rodZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.011, 0.011, rodLen, 12]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.6} roughness={0.3} />
                </mesh>
                {/* Lever points back toward the hinge-opposite (free) edge,
                    i.e. away from where the knob itself is mounted. */}
                <mesh position={[-0.06, 0, leverZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.009, 0.009, 0.12, 12]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.65} roughness={0.28} />
                </mesh>
                {/* Small return-cap at the far end of the lever so it doesn't
                    read as a bare-ended rod from the free-edge side. */}
                <mesh position={[-0.115, 0, leverZ]} castShadow>
                    <sphereGeometry args={[0.009, 10, 10]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.65} roughness={0.28} />
                </mesh>
            </group>
        )
    }

    // ── Butt hinges — three stacked leaf-and-knuckle hinges along the
    // hinge-side edge of a panel, mounted flush on the hinge face (the side
    // that meets the frame). Purely cosmetic; position is derived the same
    // way DoorKnob's is, mirrored to the hinge edge instead of the free edge.
    function DoorHinges({ height, hingeSign }: { height: number; hingeSign: 1 | -1 }) {
        const hingeX = hingeSign * (0.045 / 2) // sits right at the panel's edge face
        const knuckleR = 0.009
        const positions = [0.85, 0.5, 0.15].map(f => (f - 0.5) * height * 0.9)
        return (
            <group>
                {positions.map((y, i) => (
                    <group key={i} position={[hingeX, y, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[0.01, 0.14, 0.07]} />
                            <meshStandardMaterial color="#B9B9B4" metalness={0.6} roughness={0.35} />
                        </mesh>
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[hingeSign * 0.008, 0, 0]} castShadow>
                            <cylinderGeometry args={[knuckleR, knuckleR, 0.15, 10]} />
                            <meshStandardMaterial color="#A8A8A2" metalness={0.7} roughness={0.25} />
                        </mesh>
                    </group>
                ))}
            </group>
        )
    }

    // ── Raised-panel molding — thin inset rectangular frame lines pressed
    // slightly into the face on both sides, giving the flat slab a
    // traditional stile-and-rail look instead of reading as a plain board.
    // Skipped automatically for narrow leaves (folding/garage slats) via the
    // minInset guard below.
    function PanelMolding({ width, height, zSide }: { width: number; height: number; zSide: 1 | -1 }) {
        const margin = Math.min(0.09, width * 0.14, height * 0.06)
        if (width - margin * 2 < 0.15 || height - margin * 2 < 0.3) return null
        const mw = width - margin * 2
        const mh = height - margin * 2
        const midY = height * 0.42 // split into upper (long) and lower (short) panel, classic 2-panel door
        const upperH = mh - midY
        const lowerH = midY - 0.06
        const frameZ = zSide * (T / 2 + 0.0015)
        const bar = 0.02
        function rect(w: number, h: number, cy: number, key: string) {
            return (
                <group key={key} position={[0, cy, frameZ]}>
                    <mesh position={[0, h / 2 - bar / 2, 0]}><boxGeometry args={[w, bar, 0.003]} /><meshStandardMaterial color="#00000022" transparent opacity={0.35} roughness={0.9} /></mesh>
                    <mesh position={[0, -h / 2 + bar / 2, 0]}><boxGeometry args={[w, bar, 0.003]} /><meshStandardMaterial color="#00000022" transparent opacity={0.35} roughness={0.9} /></mesh>
                    <mesh position={[-w / 2 + bar / 2, 0, 0]}><boxGeometry args={[bar, h, 0.003]} /><meshStandardMaterial color="#00000022" transparent opacity={0.35} roughness={0.9} /></mesh>
                    <mesh position={[w / 2 - bar / 2, 0, 0]}><boxGeometry args={[bar, h, 0.003]} /><meshStandardMaterial color="#00000022" transparent opacity={0.35} roughness={0.9} /></mesh>
                </group>
            )
        }
        // Both rects are laid out bottom-up from y=0 (panel's own local
        // origin is centered), so shift by -height/2 to get into local space.
        const lowerCenterY = margin + lowerH / 2 - height / 2
        const upperCenterY = margin + lowerH + 0.06 + upperH / 2 - height / 2
        return (
            <group>
                {rect(mw, upperH, upperCenterY, 'upper')}
                {rect(mw, lowerH, lowerCenterY, 'lower')}
            </group>
        )
    }

    // hingeSign tells us which side of this panel's local origin the hinge
    // pivot maps to (see SwingHinge's offset math) — the knob must sit on
    // the OPPOSITE side (the free/swinging edge), which flips sign with
    // hingeSign. Previously this was a fixed +x offset regardless of
    // hingeSign, which put the knob right at the hinge for the default
    // single-door case (hingeSign=-1) instead of the free edge.
    function DoorFace({ width, height, hingeSign }: { width: number; height: number; hingeSign: 1 | -1 }) {
        const inset = Math.min(0.06, width * 0.08)
        const knobX = hingeSign * (width / 2 - inset - 0.03)
        return (
            <group>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[width, height, T]} />
                    <DoorMat style={resolvedStyle} />
                </mesh>
                <PanelMolding width={width} height={height} zSide={1} />
                <PanelMolding width={width} height={height} zSide={-1} />
                <group position={[knobX, 0, 0]}>
                    <DoorKnob zSide={1} />
                    <DoorKnob zSide={-1} />
                </group>
                <DoorHinges height={height} hingeSign={hingeSign} />
                {/* thin kickplate along the bottom, both faces */}
                <mesh position={[0, -height / 2 + 0.09, T / 2 + 0.0015]}>
                    <boxGeometry args={[width - inset, 0.16, 0.002]} />
                    <meshStandardMaterial color="#8f8f88" metalness={0.5} roughness={0.4} />
                </mesh>
                <mesh position={[0, -height / 2 + 0.09, -T / 2 - 0.0015]}>
                    <boxGeometry args={[width - inset, 0.16, 0.002]} />
                    <meshStandardMaterial color="#8f8f88" metalness={0.5} roughness={0.4} />
                </mesh>
            </group>
        )
    }

    // ── Door frame / jamb — simple three-sided casing around the opening,
    // sitting flush with the wall face on both sides of the swinging
    // leaves. Purely cosmetic trim so the door doesn't look like it's just
    // floating inside a hole in the wall.
    function DoorFrame({ width, height }: { width: number; height: number }) {
        const jambW = 0.05
        const jambD = T + 0.02
        // basePos[1] is the door's *vertical center* (op.height / 2), not
        // floor level — every other user of basePos in this file (DoorFace,
        // SwingHinge) relies on that offset being baked in already, since
        // their own geometry is centered on 0 locally. DoorFrame's jamb
        // meshes below are authored in floor-relative coordinates (0 = floor,
        // height = door top), so we deliberately zero out basePos[1] here and
        // work in absolute floor-relative Y instead of stacking another
        // offset on top of the existing one — that double-offset was what
        // sent the frame floating up near the ceiling.
        const floorPos: [number, number, number] = [basePos[0], 0, basePos[2]]
        return (
            <group position={floorPos} rotation={[0, -angle, 0]}>
                <mesh position={[-width / 2 - jambW / 2, height / 2, 0]} castShadow>
                    <boxGeometry args={[jambW, height + jambW, jambD]} />
                    <meshStandardMaterial color="#e8e5df" roughness={0.6} />
                </mesh>
                <mesh position={[width / 2 + jambW / 2, height / 2, 0]} castShadow>
                    <boxGeometry args={[jambW, height + jambW, jambD]} />
                    <meshStandardMaterial color="#e8e5df" roughness={0.6} />
                </mesh>
                <mesh position={[0, height + jambW / 2, 0]} castShadow>
                    <boxGeometry args={[width + jambW * 2, jambW, jambD]} />
                    <meshStandardMaterial color="#e8e5df" roughness={0.6} />
                </mesh>
            </group>
        )
    }

    // ── Hinge-pivoted swinging panel with animated open/close ─────────────
    // hingeSign: which edge the leaf is hinged on (-1 = start edge, +1 = end
    // edge). panelWidth: leaf width. centerOffset: leaf's flush-position
    // center measured along the wall from the opening's own center.
    // closedRestAngle: the small "ajar" angle used when closed (matches the
    // original always-on ~4.5deg ajar look). fullyOpenAngle: target angle
    // when op.isOpen is true — sign supplied by the caller per leaf, same
    // convention the original code already used for closedRestAngle.
    function swingingPanel(
        hingeSign: 1 | -1, panelWidth: number, centerOffset: number, key: string,
        closedRestAngle: number, fullyOpenAngle: number,
    ) {
        const hingeAlong = centerOffset - hingeSign * (panelWidth / 2)

        return (
            <SwingHinge
                key={key}
                hingeAlong={hingeAlong}
                hingeSign={hingeSign}
                panelWidth={panelWidth}
                basePos={basePos}
                dirX={dirX} dirZ={dirZ} perpX={perpX} perpZ={perpZ}
                angle={angle}
                closedRestAngle={closedRestAngle}
                fullyOpenAngle={fullyOpenAngle}
                isOpen={!!op.isOpen}
                interactive={interactive}
                onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}
            >
                <DoorFace width={panelWidth} height={op.height} hingeSign={hingeSign} />
            </SwingHinge>
        )
    }

    switch (variant) {
        case 'door-swing-double': {
            const half = op.width / 2
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 0.85 * swingSign
            // Hinges swapped to the opposite edges from the original
            // pairing (left leaf now hinges on its inner/center edge,
            // right leaf on its outer edge, and vice versa) — per explicit
            // correction rather than re-derived from scratch.
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} />
                    {swingingPanel(1, half, -half / 2, 'doorL', restAngle, openAngle)}
                    {swingingPanel(-1, half, half / 2, 'doorR', -restAngle, -openAngle)}
                </group>
            )
        }

        case 'door-sliding':
        case 'door-pocket': {
            const slideFrac = variant === 'door-pocket' ? 0.88 : 0.5
            const offset = op.width * slideFrac
            const visibleWidth = variant === 'door-pocket' ? op.width * (1 - slideFrac) + 0.06 : op.width
            const pos: [number, number, number] = [
                basePos[0] + dirX * offset,
                basePos[1],
                basePos[2] + dirZ * offset,
            ]
            return (
                <group>
                    {/* Top track rail the panel appears to hang from */}
                    <group position={basePos} rotation={[0, -angle, 0]}>
                        <mesh position={[0, op.height + 0.03, 0]}>
                            <boxGeometry args={[op.width + 0.1, 0.04, 0.08]} />
                            <meshStandardMaterial color="#9a9a94" metalness={0.55} roughness={0.4} />
                        </mesh>
                    </group>
                    <group position={pos} rotation={[0, -angle, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[visibleWidth, op.height, T]} />
                            <DoorMat style={resolvedStyle} />
                        </mesh>
                        <PanelMolding width={visibleWidth} height={op.height} zSide={1} />
                        <PanelMolding width={visibleWidth} height={op.height} zSide={-1} />
                        {/* recessed pull instead of a knob, appropriate for sliding/pocket doors */}
                        <mesh position={[visibleWidth / 2 - 0.08, 0, T / 2 + 0.006]}>
                            <boxGeometry args={[0.02, 0.16, 0.012]} />
                            <meshStandardMaterial color="#B9B9B4" metalness={0.6} roughness={0.3} />
                        </mesh>
                        <mesh position={[visibleWidth / 2 - 0.08, 0, -T / 2 - 0.006]}>
                            <boxGeometry args={[0.02, 0.16, 0.012]} />
                            <meshStandardMaterial color="#B9B9B4" metalness={0.6} roughness={0.3} />
                        </mesh>
                    </group>
                </group>
            )
        }

        case 'door-folding': {
            const panelCount = 4
            const panelW = op.width / panelCount
            const foldAngle = Math.PI / 8
            const panels: React.ReactNode[] = []
            for (let i = 0; i < panelCount; i++) {
                const centerOffset = -op.width / 2 + panelW * (i + 0.5)
                const angleFold = (i % 2 === 0 ? 1 : -1) * foldAngle * swingSign
                const perp = Math.abs(Math.sin(angleFold)) * (panelW / 2)
                const pos: [number, number, number] = [
                    basePos[0] + dirX * centerOffset + perpX * perp,
                    basePos[1],
                    basePos[2] + dirZ * centerOffset + perpZ * perp,
                ]
                panels.push(
                    <group key={`fold${i}`} position={pos} rotation={[0, -angle + angleFold, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[panelW * 0.96, op.height, T]} />
                            <DoorMat style={resolvedStyle} />
                        </mesh>
                        {/* thin vertical reveal line at each fold seam to
                            read as separate louvered leaves rather than one
                            continuous slab bent into a zig-zag */}
                        <mesh position={[panelW * 0.96 / 2 - 0.006, 0, T / 2 + 0.001]}>
                            <boxGeometry args={[0.008, op.height * 0.92, 0.002]} />
                            <meshStandardMaterial color="#00000030" transparent opacity={0.4} />
                        </mesh>
                    </group>
                )
            }
            return <group>{panels}</group>
        }

        case 'door-garage': {
            const slats = 5
            const slatH = Math.min(0.5, op.height * 0.4) / slats
            const panels: React.ReactNode[] = []
            for (let i = 0; i < slats; i++) {
                const y = op.height - slatH * (i + 0.5) - 0.02
                const pos: [number, number, number] = [basePos[0], y, basePos[2]]
                panels.push(
                    <group key={`slat${i}`} position={pos} rotation={[0, -angle, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[op.width * 0.98, slatH * 0.85, T]} />
                            <DoorMat style={resolvedStyle} />
                        </mesh>
                        {/* recessed shadow line under each slat for a
                            corrugated-panel look instead of flat stacked bars */}
                        <mesh position={[0, -slatH * 0.85 / 2 - 0.004, T / 2 + 0.001]}>
                            <boxGeometry args={[op.width * 0.98, 0.006, 0.002]} />
                            <meshStandardMaterial color="#00000040" transparent opacity={0.45} />
                        </mesh>
                    </group>
                )
            }
            // side tracks for a bit of realism
            const trackPositions: [number, number][] = [[-op.width / 2 - 0.02, 1], [op.width / 2 + 0.02, 1]]
            return (
                <group>
                    {panels}
                    {trackPositions.map(([x], i) => (
                        <group key={`track${i}`} position={[basePos[0] + dirX * x, 0, basePos[2] + dirZ * x]} rotation={[0, -angle, 0]}>
                            <mesh position={[0, op.height / 2, 0]}>
                                <boxGeometry args={[0.03, op.height, 0.05]} />
                                <meshStandardMaterial color="#9a9a94" metalness={0.5} roughness={0.4} />
                            </mesh>
                        </group>
                    ))}
                </group>
            )
        }

        case 'door-swing-single':
        default: {
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 0.85 * swingSign
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} />
                    {swingingPanel(-1, op.width, 0, 'doorSingle', restAngle, openAngle)}
                </group>
            )
        }
    }
}

// ── Hinge pivot + per-frame animation ──────────────────────────────────────
// Pivots at the hinge point (not the panel center) so rotating the group IS
// the swing — no more recomputing an analytic world position from a static
// angle every render. The panel is offset inside this group so its hinge
// edge sits at the local origin.
function SwingHinge({
    children, hingeAlong, hingeSign, panelWidth, basePos, dirX, dirZ, perpX, perpZ,
    angle, closedRestAngle, fullyOpenAngle, isOpen, interactive, onToggleOpen,
}: {
    children: React.ReactNode
    hingeAlong: number
    hingeSign: 1 | -1
    panelWidth: number
    basePos: [number, number, number]
    dirX: number; dirZ: number; perpX: number; perpZ: number
    angle: number
    closedRestAngle: number
    fullyOpenAngle: number
    isOpen: boolean
    interactive?: boolean
    onToggleOpen?: () => void
}) {
    const groupRef = useRef<THREE.Group>(null)
    const currentAngle = useRef(closedRestAngle)

    const hingePos: [number, number, number] = [
        basePos[0] + dirX * hingeAlong,
        basePos[1],
        basePos[2] + dirZ * hingeAlong,
    ]

    useFrame((_, delta) => {
        const target = isOpen ? fullyOpenAngle : closedRestAngle
        // Smooth exponential approach — fast enough to feel responsive
        // (~0.2s to settle) without snapping instantly.
        const speed = 10
        const diff = target - currentAngle.current
        if (Math.abs(diff) < 0.001) {
            currentAngle.current = target
        } else {
            currentAngle.current += diff * Math.min(1, delta * speed)
        }
        if (groupRef.current) {
            groupRef.current.rotation.y = -angle + currentAngle.current
        }
    })

    return (
        <group
            ref={groupRef}
            position={hingePos}
            rotation={[0, -angle + currentAngle.current, 0]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            {/* Panel is offset so its hinge edge sits at this group's origin */}
            <group position={[hingeSign * (panelWidth / 2), 0, 0]}>
                {children}
            </group>
        </group>
    )
}