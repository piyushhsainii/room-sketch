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
    interactive?: boolean
    onToggleOpen?: (openingId: string) => void
}) {
    const resolvedStyle = op.material ?? doorStyle

    const inward = op.swingDirection !== 'outward'
    const swingSign = inward ? 1 : -1
    const variant = op.variant ?? 'door-swing-single'
    const T = 0.045 // panel thickness
    const dirX = Math.cos(angle), dirZ = Math.sin(angle)
    const perpX = -dirZ, perpZ = dirX

    // NOTE: `flipped` mirrors which jamb a single-leaf door hinges from
    // (and therefore which side the knob ends up on). This assumes
    // `EditorOpening` has (or will have) an optional `flipped?: boolean`
    // field — add it to the type in lib/constants.ts if it isn't there
    // yet. Reading it defensively via `(op as any)` in the meantime so
    // this compiles either way.
    const baseHingeSign: 1 | -1 = (op as any).flipped ? 1 : -1

    function DoorKnob({ zSide, hingeSign }: { zSide: 1 | -1; hingeSign: 1 | -1 }) {
        const rosetteZ = zSide * (T / 2 + 0.003)
        const rodLen = 0.045
        const rodZ = zSide * (T / 2 + rodLen / 2)
        const leverZ = zSide * (T / 2 + rodLen)
        // Lever must point away from the free/latch edge (where the knob
        // itself is mounted) back toward the panel's own hinge side. That
        // direction is `-hingeSign`, not a fixed sign — using a hardcoded
        // `-0.06` here (regardless of hingeSign) happened to be correct
        // for one leaf of a double door but pointed the *other* leaf's
        // lever the wrong way, back in toward the center meeting line,
        // where it visually crossed and overlapped the first leaf's
        // lever. Mirroring by hingeSign fixes both leaves symmetrically.
        const leverX = -hingeSign * 0.06
        const capX = -hingeSign * 0.115
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
                    i.e. away from where the knob itself is mounted. Given a
                    slight downward pitch (rotation.x) instead of sitting
                    perfectly horizontal — a real lever handle hangs down a
                    little, and dead-flat read as "floating rod" rather than
                    a handle. */}
                <mesh position={[leverX, -0.012, leverZ]} rotation={[0.3, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.009, 0.009, 0.12, 12]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.65} roughness={0.28} />
                </mesh>
                {/* Small return-cap at the far end of the lever so it doesn't
                    read as a bare-ended rod from the free-edge side. */}
                <mesh position={[capX, -0.03, leverZ]} castShadow>
                    <sphereGeometry args={[0.009, 10, 10]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.65} roughness={0.28} />
                </mesh>
            </group>
        )
    }

    function DoorPull({ zSide, width }: { zSide: 1 | -1; width: number }) {
        // Slim vertical bar pull, used on glazed/French leaves where a
        // protruding lever would visually collide with the glass grid.
        const x = width / 2 - 0.08
        const z = zSide * (T / 2 + 0.012)
        return (
            <group>
                <mesh position={[x, 0, z]} castShadow>
                    <boxGeometry args={[0.022, 0.22, 0.02]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.65} roughness={0.28} />
                </mesh>
                <mesh position={[x, 0.09, zSide * (T / 2 + 0.006)]} castShadow>
                    <boxGeometry args={[0.022, 0.022, 0.012]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.65} roughness={0.28} />
                </mesh>
                <mesh position={[x, -0.09, zSide * (T / 2 + 0.006)]} castShadow>
                    <boxGeometry args={[0.022, 0.022, 0.012]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.65} roughness={0.28} />
                </mesh>
            </group>
        )
    }

    function DoorHinges({ width, height, hingeSign }: { width: number; height: number; hingeSign: 1 | -1 }) {
        // BUG FIX: this used to be `hingeSign * (0.045 / 2)` — half the
        // panel's *thickness* (T), not its *width*. That placed every
        // hinge ~2cm from the door's vertical centerline regardless of how
        // wide the panel was, which is why they showed up as floating
        // clanks scattered down the middle of the face instead of sitting
        // on the door's actual edge. Hinges belong at the hinge-side edge,
        // same edge the panel itself pivots from — mirroring how knobX is
        // computed on the free edge, just on the opposite side.
        // Hinge edge is the *opposite* of the free edge knobX sits on —
        // knobX uses `+hingeSign` to land on the free edge (see DoorFace),
        // so this must use `-hingeSign` to land on the true hinge/jamb
        // edge. Using the same sign as knobX (as before) put both the
        // knob and the hinges on the free edge, which is why hinges were
        // showing up clustered at the doors' meeting line instead of out
        // at the jambs.
        const inset = Math.min(0.05, width * 0.05)
        const hingeX = -hingeSign * (width / 2 - inset)
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
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[-hingeSign * 0.008, 0, 0]} castShadow>
                            <cylinderGeometry args={[knuckleR, knuckleR, 0.15, 10]} />
                            <meshStandardMaterial color="#A8A8A2" metalness={0.7} roughness={0.25} />
                        </mesh>
                    </group>
                ))}
            </group>
        )
    }

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

        const lowerCenterY = margin + lowerH / 2 - height / 2
        const upperCenterY = margin + lowerH + 0.06 + upperH / 2 - height / 2
        return (
            <group>
                {rect(mw, upperH, upperCenterY, 'upper')}
                {rect(mw, lowerH, lowerCenterY, 'lower')}
            </group>
        )
    }

    /** Full-height glazed grid (the defining "French door" look). Renders
     *  identical mullion grids on both faces plus a translucent glass pane
     *  behind them, leaving a solid bottom rail like a real French door. */
    function GlassGrid({ width, height, cols = 3, rows = 5, bottomRail = 0.12 }: {
        width: number; height: number; cols?: number; rows?: number; bottomRail?: number
    }) {
        const margin = 0.07
        const glassW = width - margin * 2
        const glassH = height - margin * 2 - bottomRail
        const glassCenterY = bottomRail / 2 + margin / 2 - 0.03
        return (
            <group>
                {[1, -1].map(z => (
                    <mesh key={`pane${z}`} position={[0, glassCenterY, z * (T / 2 + 0.001)]}>
                        <boxGeometry args={[glassW, glassH, 0.006]} />
                        <meshPhysicalMaterial color="#dfeaf0" transparent opacity={0.3} roughness={0.04} transmission={0.65} />
                    </mesh>
                ))}
                {[1, -1].map(zSide => {
                    const gz = zSide * (T / 2 + 0.0015)
                    const bars: React.ReactNode[] = []
                    for (let c = 1; c < cols; c++) {
                        const x = -glassW / 2 + (glassW / cols) * c
                        bars.push(
                            <mesh key={`v${zSide}${c}`} position={[x, glassCenterY, gz]}>
                                <boxGeometry args={[0.018, glassH, 0.008]} />
                                <meshStandardMaterial color="#f4f2ec" roughness={0.5} />
                            </mesh>
                        )
                    }
                    for (let r = 1; r < rows; r++) {
                        const y = glassCenterY - glassH / 2 + (glassH / rows) * r
                        bars.push(
                            <mesh key={`h${zSide}${r}`} position={[0, y, gz]}>
                                <boxGeometry args={[glassW, 0.018, 0.008]} />
                                <meshStandardMaterial color="#f4f2ec" roughness={0.5} />
                            </mesh>
                        )
                    }
                    bars.push(
                        <mesh key={`frame${zSide}`} position={[0, glassCenterY, gz]}>
                            <boxGeometry args={[glassW + 0.02, 0.02, 0.008]} />
                            <meshStandardMaterial color="#f4f2ec" roughness={0.5} />
                        </mesh>,
                        <mesh key={`frame2${zSide}`} position={[0, glassCenterY, gz]}>
                            <boxGeometry args={[0.02, glassH + 0.02, 0.008]} />
                            <meshStandardMaterial color="#f4f2ec" roughness={0.5} />
                        </mesh>
                    )
                    return <group key={zSide}>{bars}</group>
                })}
                {bottomRail > 0.02 && [1, -1].map(z => (
                    <mesh key={`rail${z}`} position={[0, -height / 2 + bottomRail / 2 + margin * 0.4, z * (T / 2 + 0.001)]}>
                        <boxGeometry args={[width - margin * 1.2, bottomRail, 0.006]} />
                        <meshStandardMaterial color="#00000018" transparent opacity={0.3} roughness={0.9} />
                    </mesh>
                ))}
            </group>
        )
    }

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
                    <DoorKnob zSide={1} hingeSign={hingeSign} />
                    <DoorKnob zSide={-1} hingeSign={hingeSign} />
                </group>
                <DoorHinges width={width} height={height} hingeSign={hingeSign} />
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

    /** Full glazed-grid face used by the French-door variants — swaps the
     *  solid molded panel for a mullion grid and a slim bar pull instead
     *  of a lever knob (levers visually collide with a full-height grid). */
    function FrenchFace({ width, height, hingeSign }: { width: number; height: number; hingeSign: 1 | -1 }) {
        return (
            <group>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[width, height, T]} />
                    <DoorMat style={resolvedStyle} />
                </mesh>
                <GlassGrid width={width} height={height} cols={3} rows={5} bottomRail={0.12} />
                <group position={[hingeSign * (width / 2 - 0.08), 0, 0]}>
                    <DoorPull zSide={1} width={0} />
                    <DoorPull zSide={-1} width={0} />
                </group>
                <DoorHinges width={width} height={height} hingeSign={hingeSign} />
            </group>
        )
    }

    /** Arched-top glazed face — same grid language as FrenchFace but the
     *  top row of "panes" is omitted/shortened to leave room for the
     *  curved head cut by ArchedFrame below. */
    function ArchedGlassFace({ width, height, hingeSign }: { width: number; height: number; hingeSign: 1 | -1 }) {
        return (
            <group>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[width, height, T]} />
                    <DoorMat style={resolvedStyle} />
                </mesh>
                <GlassGrid width={width} height={height * 0.92} cols={2} rows={4} bottomRail={0.12} />
                <group position={[hingeSign * (width / 2 - 0.08), 0, 0]}>
                    <DoorPull zSide={1} width={0} />
                    <DoorPull zSide={-1} width={0} />
                </group>
                <DoorHinges width={width} height={height} hingeSign={hingeSign} />
            </group>
        )
    }

    /** Floor + head pivot pins — replaces the row of edge hinges on a
     *  pivot door, since a pivot door rotates on top/bottom center pins
     *  set back from the edge rather than on a hinge line at the edge. */
    function PivotPins({ height, pivotX }: { height: number; pivotX: number }) {
        return (
            <group>
                <mesh position={[pivotX, 0.01, 0]} castShadow>
                    <cylinderGeometry args={[0.014, 0.014, 0.03, 12]} />
                    <meshStandardMaterial color="#A8A8A2" metalness={0.75} roughness={0.2} />
                </mesh>
                <mesh position={[pivotX, height - 0.01, 0]} castShadow>
                    <cylinderGeometry args={[0.014, 0.014, 0.03, 12]} />
                    <meshStandardMaterial color="#A8A8A2" metalness={0.75} roughness={0.2} />
                </mesh>
            </group>
        )
    }

    /** Plain panel face for the pivot-door variant — no edge hinges (see
     *  PivotPins) and the handle sits on the free edge as usual. */
    function PivotFace({ width, height, hingeSign }: { width: number; height: number; hingeSign: 1 | -1 }) {
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
                    <DoorKnob zSide={1} hingeSign={hingeSign} />
                    <DoorKnob zSide={-1} hingeSign={hingeSign} />
                </group>
            </group>
        )
    }

    function DoorFrame({ width, height }: { width: number; height: number }) {
        const jambW = 0.05
        const jambD = T + 0.02
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

    /** Side jambs only (no head lintel) for sliding / pocket / bypass
     *  doors. The head track rail rendered alongside these already reads
     *  as the "head" visually — without these jambs the rail had nothing
     *  to visually anchor to and looked like a disconnected floating
     *  shelf above the opening, which is what this fixes. */
    function SlidingSideJambs({ width, height }: { width: number; height: number }) {
        const jambW = 0.05
        const jambD = T + 0.02
        const floorPos: [number, number, number] = [basePos[0], 0, basePos[2]]
        return (
            <group position={floorPos} rotation={[0, -angle, 0]}>
                <mesh position={[-width / 2 - jambW / 2, height / 2, 0]} castShadow>
                    <boxGeometry args={[jambW, height, jambD]} />
                    <meshStandardMaterial color="#e8e5df" roughness={0.6} />
                </mesh>
                <mesh position={[width / 2 + jambW / 2, height / 2, 0]} castShadow>
                    <boxGeometry args={[jambW, height, jambD]} />
                    <meshStandardMaterial color="#e8e5df" roughness={0.6} />
                </mesh>
            </group>
        )
    }

    /** Segmented-arch head frame instead of a flat lintel, for the arched
     *  double-door variant. Jambs stop short of full height, and a fan of
     *  short boxes traces a sine-curve arch across the top. */
    function ArchedFrame({ width, height }: { width: number; height: number }) {
        const jambW = 0.05
        const jambD = T + 0.02
        const archHeight = 0.28
        const floorPos: [number, number, number] = [basePos[0], 0, basePos[2]]
        const segs = 10
        return (
            <group position={floorPos} rotation={[0, -angle, 0]}>
                <mesh position={[-width / 2 - jambW / 2, (height - archHeight) / 2, 0]} castShadow>
                    <boxGeometry args={[jambW, height - archHeight + jambW, jambD]} />
                    <meshStandardMaterial color="#e8e5df" roughness={0.6} />
                </mesh>
                <mesh position={[width / 2 + jambW / 2, (height - archHeight) / 2, 0]} castShadow>
                    <boxGeometry args={[jambW, height - archHeight + jambW, jambD]} />
                    <meshStandardMaterial color="#e8e5df" roughness={0.6} />
                </mesh>
                {Array.from({ length: segs }).map((_, i) => {
                    const t = i / (segs - 1)
                    const x = -width / 2 + t * width
                    const y = height - archHeight + Math.sin(t * Math.PI) * archHeight
                    return (
                        <mesh key={i} position={[x, y, 0]} castShadow>
                            <boxGeometry args={[width / segs + 0.01, jambW, jambD]} />
                            <meshStandardMaterial color="#e8e5df" roughness={0.6} />
                        </mesh>
                    )
                })}
            </group>
        )
    }

    function swingingPanel(
        hingeSign: 1 | -1, panelWidth: number, centerOffset: number, key: string,
        closedRestAngle: number, fullyOpenAngle: number,
        FaceComponent: (p: { width: number; height: number; hingeSign: 1 | -1 }) => React.ReactElement = DoorFace,
        pivotInset = 0,
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
                pivotInset={pivotInset}
            >
                <FaceComponent width={panelWidth} height={op.height} hingeSign={hingeSign} />
                {/* Pins sit at the rotation axis, expressed relative to the
                    panel's own center (panel center is offset from the
                    axis by hingeSign*(panelWidth/2 - pivotInset), so the
                    axis is at the negative of that in panel-local space). */}
                {pivotInset > 0 && <PivotPins height={op.height} pivotX={-hingeSign * (panelWidth / 2 - pivotInset)} />}
            </SwingHinge>
        )
    }

    /** Animated accordion/bifold leaves — shared by door-folding,
     *  door-folding-single and door-folding-french. Previously these
     *  variants rendered a single static folded pose and ignored
     *  `op.isOpen` entirely (no animation, no click-to-toggle). Now a
     *  shared `frac` ref eases 0 (closed/flat) → 1 (open/folded) via
     *  useFrame, same easing approach as SwingHinge/SlidingLeaf, and each
     *  panel's position/rotation is recomputed from it every frame. */
    function FoldingDoor({
        width, height, panelCount, foldAngleMax, glazed = false,
    }: {
        width: number; height: number; panelCount: number; foldAngleMax: number; glazed?: boolean
    }) {
        const groupRefs = useRef<(THREE.Group | null)[]>([])
        const frac = useRef(0)
        const panelW = width / panelCount
        const isOpen = !!op.isOpen

        useFrame((_, delta) => {
            const target = isOpen ? 1 : 0
            const speed = 9
            const diff = target - frac.current
            frac.current = Math.abs(diff) < 0.001 ? target : frac.current + diff * Math.min(1, delta * speed)
            for (let i = 0; i < panelCount; i++) {
                const g = groupRefs.current[i]
                if (!g) continue
                const angleFold = (i % 2 === 0 ? 1 : -1) * foldAngleMax * swingSign * frac.current
                const centerOffset = -width / 2 + panelW * (i + 0.5)
                const perp = Math.abs(Math.sin(angleFold)) * (panelW / 2)
                g.position.set(
                    basePos[0] + dirX * centerOffset + perpX * perp,
                    basePos[1],
                    basePos[2] + dirZ * centerOffset + perpZ * perp,
                )
                g.rotation.set(0, -angle + angleFold, 0)
            }
        })

        return (
            <group
                onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen(op.id) } : undefined}
                onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
                onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
            >
                {Array.from({ length: panelCount }).map((_, i) => (
                    <group key={i} ref={el => { groupRefs.current[i] = el }}>
                        <mesh castShadow>
                            <boxGeometry args={[panelW * 0.96, height, T]} />
                            <DoorMat style={resolvedStyle} />
                        </mesh>
                        {glazed && <GlassGrid width={panelW * 0.96} height={height} cols={1} rows={5} bottomRail={0.1} />}
                        <mesh position={[panelW * 0.96 / 2 - 0.006, 0, T / 2 + 0.001]}>
                            <boxGeometry args={[0.008, height * 0.92, 0.002]} />
                            <meshStandardMaterial color="#00000030" transparent opacity={0.4} />
                        </mesh>
                    </group>
                ))}
            </group>
        )
    }

    /** Animated garage door — previously a fully static slat stack that
     *  never reacted to `op.isOpen` at all. Now eases a lift fraction
     *  (0 = down/closed, 1 = risen into the head) via useFrame and is
     *  click-to-toggle like every other variant. */
    function AnimatedGarageDoor({ width, height }: { width: number; height: number }) {
        const groupRef = useRef<THREE.Group>(null)
        const frac = useRef(0)
        const isOpen = !!op.isOpen
        const slats = 5
        const slatH = Math.min(0.5, height * 0.4) / slats

        useFrame((_, delta) => {
            const target = isOpen ? 1 : 0
            const speed = 6
            const diff = target - frac.current
            frac.current = Math.abs(diff) < 0.001 ? target : frac.current + diff * Math.min(1, delta * speed)
            if (groupRef.current) {
                groupRef.current.position.y = frac.current * height * 0.92
            }
        })

        return (
            <group
                ref={groupRef}
                onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen(op.id) } : undefined}
                onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
                onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
            >
                {Array.from({ length: slats }).map((_, i) => {
                    const y = height - slatH * (i + 0.5) - 0.02
                    return (
                        <group key={`slat${i}`} position={[basePos[0], y, basePos[2]]} rotation={[0, -angle, 0]}>
                            <mesh castShadow>
                                <boxGeometry args={[width * 0.98, slatH * 0.85, T]} />
                                <DoorMat style={resolvedStyle} />
                            </mesh>
                            <mesh position={[0, -slatH * 0.85 / 2 - 0.004, T / 2 + 0.001]}>
                                <boxGeometry args={[width * 0.98, 0.006, 0.002]} />
                                <meshStandardMaterial color="#00000040" transparent opacity={0.45} />
                            </mesh>
                        </group>
                    )
                })}
            </group>
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

        case 'door-swing-double-french': {
            // Same hinge/swing mechanism as door-swing-double, glazed
            // full-height French face instead of the solid molded panel.
            const half = op.width / 2
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 0.85 * swingSign
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} />
                    {swingingPanel(1, half, -half / 2, 'doorFrL', restAngle, openAngle, FrenchFace)}
                    {swingingPanel(-1, half, half / 2, 'doorFrR', -restAngle, -openAngle, FrenchFace)}
                </group>
            )
        }

        case 'door-swing-double-arched': {
            // Same swing mechanism, arched head frame + shortened glazed
            // grid so the curve reads correctly against the arch.
            const half = op.width / 2
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 0.85 * swingSign
            return (
                <group>
                    <ArchedFrame width={op.width} height={op.height} />
                    {swingingPanel(1, half, -half / 2, 'doorArL', restAngle, openAngle, ArchedGlassFace)}
                    {swingingPanel(-1, half, half / 2, 'doorArR', -restAngle, -openAngle, ArchedGlassFace)}
                </group>
            )
        }

        case 'door-pivot': {
            // Mechanically distinct from door-swing-single: the rotation
            // axis sits inset from the panel edge (pivotInset) rather than
            // riding an edge hinge line, so the hinge-side edge also
            // sweeps clear of the frame as it opens — the defining trait
            // of a pivot door. Swings further open than a hinged door
            // typically would, and uses floor/head pins instead of hinges.
            const pivotInset = Math.min(0.16, op.width * 0.14)
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 1.05 * swingSign
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} />
                    {swingingPanel(baseHingeSign, op.width, 0, 'doorPivot', restAngle, openAngle, PivotFace, pivotInset)}
                </group>
            )
        }

        case 'door-folding-single': {
            // Same fold mechanism as door-folding, but 2 leaves anchored
            // to one jamb (like a closet/bifold door) instead of 4 leaves
            // meeting in the center — matches the chart's single "Bi-Fold
            // Door", which is a narrower opening than door-folding's
            // double-sided 4-leaf version. Now animated (see FoldingDoor).
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} />
                    <FoldingDoor width={op.width} height={op.height} panelCount={2} foldAngleMax={Math.PI / 6} />
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
                    <SlidingSideJambs width={op.width} height={op.height} />
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

        case 'door-sliding-double': {
            // Two panels sliding apart from center on independent tracks —
            // distinct mechanism from door-sliding's single leaf. Uses a
            // large-single-pane glass face (thin perimeter frame, no
            // mullion grid) rather than French's divided-light grid —
            // that's the shape that reads as "patio slider" vs "French
            // door" even though both are glazed.
            function SlidingGlassFace({ width, height, hingeSign }: { width: number; height: number; hingeSign: 1 | -1 }) {
                const margin = 0.06
                const glassW = width - margin * 2
                const glassH = height - margin * 2
                return (
                    <group>
                        <mesh castShadow receiveShadow>
                            <boxGeometry args={[width, height, T]} />
                            <DoorMat style={resolvedStyle} />
                        </mesh>
                        {[1, -1].map(z => (
                            <mesh key={z} position={[0, 0, z * (T / 2 + 0.001)]}>
                                <boxGeometry args={[glassW, glassH, 0.006]} />
                                <meshPhysicalMaterial color="#dfeaf0" transparent opacity={0.28} roughness={0.03} transmission={0.7} />
                            </mesh>
                        ))}
                        {/* Pull near each leaf's meeting edge (center of
                            the opening), not the hinge-relative edge
                            DoorPull assumes — inlined rather than reusing
                            DoorPull for that reason. */}
                        {[1, -1].map(z => (
                            <mesh key={`pull${z}`} position={[-hingeSign * (width / 2 - 0.07), 0, z * (T / 2 + 0.012)]} castShadow>
                                <boxGeometry args={[0.022, 0.22, 0.02]} />
                                <meshStandardMaterial color="#B9B9B4" metalness={0.65} roughness={0.28} />
                            </mesh>
                        ))}
                    </group>
                )
            }
            const half = op.width / 2
            return (
                <group>
                    <SlidingSideJambs width={op.width} height={op.height} />
                    <group position={basePos} rotation={[0, -angle, 0]}>
                        <mesh position={[0, op.height + 0.03, 0]}>
                            <boxGeometry args={[op.width + 0.14, 0.04, 0.1]} />
                            <meshStandardMaterial color="#9a9a94" metalness={0.55} roughness={0.4} />
                        </mesh>
                    </group>
                    <SlidingLeaf basePos={basePos} dirX={dirX} dirZ={dirZ} angle={angle}
                        centerOffset={-half / 2} panelWidth={half} openOffset={-half * 0.85}
                        isOpen={!!op.isOpen} interactive={interactive}
                        onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}>
                        <SlidingGlassFace width={half} height={op.height} hingeSign={1} />
                    </SlidingLeaf>
                    <SlidingLeaf basePos={basePos} dirX={dirX} dirZ={dirZ} angle={angle}
                        centerOffset={half / 2} panelWidth={half} openOffset={half * 0.85}
                        isOpen={!!op.isOpen} interactive={interactive}
                        onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}>
                        <SlidingGlassFace width={half} height={op.height} hingeSign={-1} />
                    </SlidingLeaf>
                </group>
            )
        }

        case 'door-folding': {
            return <FoldingDoor width={op.width} height={op.height} panelCount={4} foldAngleMax={Math.PI / 8} />
        }

        case 'door-folding-french': {
            // Same bifold mechanism as door-folding, glazed leaves instead
            // of solid slats — matches "Bifold French Doors".
            return <FoldingDoor width={op.width} height={op.height} panelCount={4} foldAngleMax={Math.PI / 8} glazed />
        }

        case 'door-garage': {
            const trackPositions: [number, number][] = [[-op.width / 2 - 0.02, 1], [op.width / 2 + 0.02, 1]]
            return (
                <group>
                    <AnimatedGarageDoor width={op.width} height={op.height} />
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
                    {swingingPanel(baseHingeSign, op.width, 0, 'doorSingle', restAngle, openAngle)}
                </group>
            )
        }
    }
}

/** Rotating hinge mechanism — shared by every double/single swing variant
 *  (plain, French, arched). Panel is offset within this group so its hinge
 *  edge sits at the group's own pivot origin, and useFrame smoothly eases
 *  the group's Y rotation toward whichever target angle isOpen selects. */
function SwingHinge({
    children, hingeAlong, hingeSign, panelWidth, basePos, dirX, dirZ, perpX, perpZ,
    angle, closedRestAngle, fullyOpenAngle, isOpen, interactive, onToggleOpen,
    pivotInset = 0,
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
    /** Distance the rotation axis sits inward from the panel's edge.
     *  0 (default) = ordinary edge-hinged door. >0 = pivot door, where the
     *  axis is set back from the edge so both the hinge-side and free-side
     *  edges sweep past the frame as it swings — the defining mechanical
     *  difference from a normal hinge. hingeAlong passed in should already
     *  be computed for the true edge; this shifts both the world pivot
     *  position and the panel's internal offset by the same inset. */
    pivotInset?: number
}) {
    const groupRef = useRef<THREE.Group>(null)
    const currentAngle = useRef(closedRestAngle)

    const adjustedHingeAlong = hingeAlong + hingeSign * pivotInset
    const hingePos: [number, number, number] = [
        basePos[0] + dirX * adjustedHingeAlong,
        basePos[1],
        basePos[2] + dirZ * adjustedHingeAlong,
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
            {/* Panel is offset so its hinge edge sits at this group's origin
                (or, for a pivot door, so the panel is centered correctly
                around an axis set back from the edge by pivotInset). */}
            <group position={[hingeSign * (panelWidth / 2 - pivotInset), 0, 0]}>
                {children}
            </group>
        </group>
    )
}

/** Translation (slide) mechanism used by the bypass double-sliding variant.
 *  Distinct from SwingHinge: instead of rotating about a pivot, the panel
 *  translates along the wall direction between a closed offset and an open
 *  offset, easing the same way SwingHinge eases its angle. */
function SlidingLeaf({
    children, basePos, dirX, dirZ, angle, centerOffset, panelWidth, openOffset,
    isOpen, interactive, onToggleOpen,
}: {
    children: React.ReactNode
    basePos: [number, number, number]
    dirX: number; dirZ: number
    angle: number
    centerOffset: number
    panelWidth: number
    openOffset: number
    isOpen: boolean
    interactive?: boolean
    onToggleOpen?: () => void
}) {
    const groupRef = useRef<THREE.Group>(null)
    const currentOffset = useRef(centerOffset)

    useFrame((_, delta) => {
        const target = isOpen ? centerOffset + openOffset : centerOffset
        const speed = 8
        const diff = target - currentOffset.current
        if (Math.abs(diff) < 0.0005) {
            currentOffset.current = target
        } else {
            currentOffset.current += diff * Math.min(1, delta * speed)
        }
        if (groupRef.current) {
            groupRef.current.position.set(
                basePos[0] + dirX * currentOffset.current,
                basePos[1],
                basePos[2] + dirZ * currentOffset.current,
            )
        }
    })

    return (
        <group
            ref={groupRef}
            position={[basePos[0] + dirX * centerOffset, basePos[1], basePos[2] + dirZ * centerOffset]}
            rotation={[0, -angle, 0]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            {children}
        </group>
    )
}