import { EditorOpening, EditorRoom } from "../Tools/constants"
import { DoorMat } from "./doormat"

export function DoorVariant3D({ op, wallAxis, room, wPos, doorStyle }: {
    op: EditorOpening
    wallAxis: 'x' | 'z'
    room: EditorRoom
    wPos: [number, number, number]
    doorStyle: string
}) {
    const opMid = op.position
    const inward = op.swingDirection !== 'outward'
    const swingSign = inward ? 1 : -1
    const variant = op.variant ?? 'door-swing-single'
    const T = 0.045 // panel thickness

    const basePos: [number, number, number] = wallAxis === 'x'
        ? [room.x + opMid, op.height / 2, wPos[2]]
        : [wPos[0], op.height / 2, room.z + opMid]

    // Renders one door leaf, hinged at one edge, at a given open angle.
    // angle = 0 → flush/closed, regardless of hingeSign or centerOffset.
    function DoorFace({ width, height }: { width: number; height: number }) {
        const inset = Math.min(0.06, width * 0.08)
        return (
            <group>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[width, height, T]} />
                    <DoorMat style={doorStyle} />
                </mesh>
                {/* upper panel */}
                <mesh position={[0, height * 0.2, T / 2 + 0.003]}>
                    <boxGeometry args={[width - inset * 2, height * 0.42, 0.006]} />
                    <meshStandardMaterial color="#EDEDEA" roughness={0.55} />
                </mesh>
                {/* lower panel */}
                <mesh position={[0, -height * 0.24, T / 2 + 0.003]}>
                    <boxGeometry args={[width - inset * 2, height * 0.42, 0.006]} />
                    <meshStandardMaterial color="#EDEDEA" roughness={0.55} />
                </mesh>
                {/* handle */}
                <mesh position={[width / 2 - inset - 0.03, 0, T / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.012, 0.012, 0.11, 12]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.55} roughness={0.35} />
                </mesh>
            </group>
        )
    }

    function swingingPanel(hingeSign: 1 | -1, panelWidth: number, centerOffset: number, key: string, openAngle: number) {
        // Hinge sits at the edge opposite the direction the panel extends when flush.
        const hingeAlong = centerOffset - hingeSign * (panelWidth / 2)
        const along = hingeAlong + hingeSign * (panelWidth / 2) * Math.cos(openAngle)
        const perp = hingeSign * (panelWidth / 2) * Math.sin(openAngle)

        const pos: [number, number, number] = wallAxis === 'x'
            ? [room.x + opMid + along, op.height / 2, wPos[2] + perp]
            : [wPos[0] + perp, op.height / 2, room.z + opMid + along]
        const rot: [number, number, number] = wallAxis === 'x' ? [0, openAngle, 0] : [0, openAngle + Math.PI / 2, 0]

        return (
            <group key={key} position={pos} rotation={rot}>
                <DoorFace width={panelWidth} height={op.height} />
            </group>
        )
    }

    switch (variant) {
        case 'door-swing-double': {
            const half = op.width / 2
            return (
                <group>
                    {swingingPanel(-1, half, -half / 2, 'doorL', 0)}
                    {swingingPanel(1, half, half / 2, 'doorR', 0)}
                </group>
            )
        }

        case 'door-sliding':
        case 'door-pocket': {
            const slideFrac = variant === 'door-pocket' ? 0.88 : 0.5
            const offset = op.width * slideFrac
            const visibleWidth = variant === 'door-pocket' ? op.width * (1 - slideFrac) + 0.06 : op.width
            const pos: [number, number, number] = wallAxis === 'x'
                ? [basePos[0] + offset, basePos[1], basePos[2]]
                : [basePos[0], basePos[1], basePos[2] + offset]
            const size: [number, number, number] = wallAxis === 'x' ? [visibleWidth, op.height, T] : [T, op.height, visibleWidth]
            return (
                <mesh position={pos} castShadow>
                    <boxGeometry args={size} />
                    <DoorMat style={doorStyle} />
                </mesh>
            )
        }

        case 'door-folding': {
            const panelCount = 4
            const panelW = op.width / panelCount
            const foldAngle = Math.PI / 8
            const panels: React.ReactNode[] = []
            for (let i = 0; i < panelCount; i++) {
                const centerOffset = -op.width / 2 + panelW * (i + 0.5)
                const angle = (i % 2 === 0 ? 1 : -1) * foldAngle * swingSign
                const pos: [number, number, number] = wallAxis === 'x'
                    ? [room.x + opMid + centerOffset, op.height / 2, wPos[2] + Math.abs(Math.sin(angle)) * (panelW / 2)]
                    : [wPos[0] + Math.abs(Math.sin(angle)) * (panelW / 2), op.height / 2, room.z + opMid + centerOffset]
                const rot: [number, number, number] = wallAxis === 'x' ? [0, angle, 0] : [0, angle + Math.PI / 2, 0]
                panels.push(
                    <mesh key={`fold${i}`} position={pos} rotation={rot} castShadow>
                        <boxGeometry args={[panelW * 0.96, op.height, T]} />
                        <DoorMat style={doorStyle} />
                    </mesh>
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
                const pos: [number, number, number] = wallAxis === 'x'
                    ? [room.x + opMid, y, wPos[2]]
                    : [wPos[0], y, room.z + opMid]
                const size: [number, number, number] = wallAxis === 'x' ? [op.width * 0.98, slatH * 0.85, T] : [T, slatH * 0.85, op.width * 0.98]
                panels.push(
                    <mesh key={`slat${i}`} position={pos} castShadow>
                        <boxGeometry args={size} />
                        <DoorMat style={doorStyle} />
                    </mesh>
                )
            }
            return <group>{panels}</group>
        }

        case 'door-swing-single':
        default:
            return swingingPanel(-1, op.width, 0, 'doorSingle', 0)
    }
}