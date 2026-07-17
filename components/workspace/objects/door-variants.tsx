import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { EditorOpening } from "../Tools/constants"
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
                <group position={[knobX, 0, 0]}>
                    <DoorKnob zSide={1} />
                    <DoorKnob zSide={-1} />
                </group>
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
                <group position={pos} rotation={[0, -angle, 0]}>
                    <mesh castShadow>
                        <boxGeometry args={[visibleWidth, op.height, T]} />
                        <DoorMat style={resolvedStyle} />
                    </mesh>
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
                    </group>
                )
            }
            return <group>{panels}</group>
        }

        case 'door-swing-single':
        default: {
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 0.85 * swingSign
            return swingingPanel(-1, op.width, 0, 'doorSingle', restAngle, openAngle)
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