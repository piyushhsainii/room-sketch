import { EditorOpening } from "../Tools/constants"
import { DoorMat } from "./doormat"

export function DoorVariant3D({ op, angle, basePos, doorStyle }: {
    op: EditorOpening
    angle: number
    basePos: [number, number, number]
    /** Scene-wide default. Renamed conceptually to "fallback" — the door's
     *  own op.material always wins when set. */
    doorStyle: string
}) {
    // Single source of truth for which style this specific door renders in:
    // the door's own override if set, otherwise the scene-wide default.
    // Resolving this HERE (rather than trusting the caller to have already
    // merged it) means DoorVariant3D can never silently ignore a per-door
    // override again, no matter where it's rendered from.
    const resolvedStyle = op.material ?? doorStyle

    const inward = op.swingDirection !== 'outward'
    const swingSign = inward ? 1 : -1
    const variant = op.variant ?? 'door-swing-single'
    const T = 0.045 // panel thickness

    const dirX = Math.cos(angle), dirZ = Math.sin(angle)
    const perpX = -dirZ, perpZ = dirX

    function DoorFace({ width, height }: { width: number; height: number }) {
        const inset = Math.min(0.06, width * 0.08)
        return (
            <group>
                {/* Plain door slab — the texture/material shows across the
                    full face now, no raised panel overlays covering it */}
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[width, height, T]} />
                    <DoorMat style={resolvedStyle} />
                </mesh>
                {/* Handle — front */}
                <mesh position={[width / 2 - inset - 0.03, 0, T / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.012, 0.012, 0.11, 12]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.55} roughness={0.35} />
                </mesh>
                {/* Handle — back, mirrored so it's reachable from both sides */}
                <mesh position={[width / 2 - inset - 0.03, 0, -(T / 2 + 0.02)]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.012, 0.012, 0.11, 12]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.55} roughness={0.35} />
                </mesh>
            </group>
        )
    }

    // hingeSign: which edge of the opening the leaf is hinged on (-1 = start edge, +1 = end edge)
    // panelWidth: leaf width. centerOffset: leaf's flush-position center, measured
    // along the wall from the opening's own center (0 = opening center).
    function swingingPanel(hingeSign: 1 | -1, panelWidth: number, centerOffset: number, key: string, openAngle: number) {
        const hingeAlong = centerOffset - hingeSign * (panelWidth / 2)
        const along = hingeAlong + hingeSign * (panelWidth / 2) * Math.cos(openAngle)
        const perp = hingeSign * (panelWidth / 2) * Math.sin(openAngle)

        const pos: [number, number, number] = [
            basePos[0] + dirX * along + perpX * perp,
            basePos[1],
            basePos[2] + dirZ * along + perpZ * perp,
        ]
        const rot: [number, number, number] = [0, -angle + openAngle, 0]

        return (
            <group key={key} position={pos} rotation={rot}>
                <DoorFace width={panelWidth} height={op.height} />
            </group>
        )
    }

    switch (variant) {
        case 'door-swing-double': {
            const half = op.width / 2
            const restAngle = (Math.PI / 40) * swingSign // ~4.5° ajar, still reads closed
            return (
                <group>
                    {swingingPanel(-1, half, -half / 2, 'doorL', restAngle)}
                    {swingingPanel(1, half, half / 2, 'doorR', -restAngle)}
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
        default:
            return swingingPanel(-1, op.width, 0, 'doorSingle', (Math.PI / 40) * swingSign)
    }
}