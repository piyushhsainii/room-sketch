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
    const T = 0.04 // panel thickness

    // World-space anchor for the opening's centerline (no swing/offset applied)
    const basePos: [number, number, number] = wallAxis === 'x'
        ? [room.x + opMid, op.height / 2, wPos[2]]
        : [wPos[0], op.height / 2, room.z + opMid]

    function swingingPanel(hingeSign: 1 | -1, panelWidth: number, panelOffset: number, keySuffix: string, angleOverride?: number) {
        const openAngle = angleOverride ?? (Math.PI / 6) * swingSign
        const hingeOffset = hingeSign * (panelWidth / 2) + panelOffset
        const pos: [number, number, number] = wallAxis === 'x'
            ? [room.x + opMid + hingeOffset - hingeSign * (panelWidth / 2) * Math.cos(openAngle) + hingeSign * (panelWidth / 2), op.height / 2, wPos[2] + (panelWidth / 2) * Math.sin(openAngle)]
            : [wPos[0] + (panelWidth / 2) * Math.sin(openAngle), op.height / 2, room.z + opMid + hingeOffset - hingeSign * (panelWidth / 2) * Math.cos(openAngle) + hingeSign * (panelWidth / 2)]
        const rot: [number, number, number] = wallAxis === 'x' ? [0, openAngle, 0] : [0, openAngle + Math.PI / 2, 0]
        return (
            <mesh key={keySuffix} position={pos} rotation={rot} castShadow>
                <boxGeometry args={[panelWidth, op.height, T]} />
                <DoorMat style={doorStyle} />
            </mesh>
        )
    }

    switch (variant) {
        case 'door-swing-double': {
            const half = op.width / 2
            const leftOffset = wallAxis === 'x' ? -half / 2 : -half / 2
            return (
                <group>
                    {swingingPanel(-1, half, -half / 2, 'doorL', (Math.PI / 6))}
                    {swingingPanel(1, half, half / 2, 'doorR', -(Math.PI / 6))}
                </group>
            )
        }

        case 'door-sliding':
        case 'door-pocket': {
            // Panel slides along the wall — no rotation, offset toward one side.
            // Pocket doors slide fully "into" the wall so only a sliver stays visible.
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
            // Accordion — several narrow panels alternating a small fold angle.
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
            // Rolled up into slats near the header — represented as a stack of
            // thin horizontal slats near the top of the opening.
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
            return swingingPanel(-1, op.width, 0, 'doorSingle')
    }
}