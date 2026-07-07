import { EditorOpening, EditorRoom } from "../Tools/constants"
import * as THREE from 'three'

export function WindowVariant3D({ op, wallAxis, room, wPos }: {
    op: EditorOpening
    wallAxis: 'x' | 'z'
    room: EditorRoom
    wPos: [number, number, number]
}) {
    const opMid = op.position
    const variant = op.variant ?? 'window-fixed'
    const glassY = op.sillHeight + op.height / 2
    const gPos: [number, number, number] = wallAxis === 'x'
        ? [room.x + opMid, glassY, wPos[2]]
        : [wPos[0], glassY, room.z + opMid]
    const frameColor = '#E8E4DC'
    const mullionT = 0.03

    const glassMat = (opacity = 0.35) => (
        <meshStandardMaterial color="#93C5FD" transparent opacity={opacity} roughness={0.05} metalness={0.15} side={THREE.DoubleSide} />
    )

    switch (variant) {
        case 'window-casement': {
            const w = op.width, h = op.height
            const size: [number, number, number] = wallAxis === 'x' ? [w, h, 0.025] : [0.025, h, w]
            const vMullion: [number, number, number] = wallAxis === 'x' ? [mullionT, h, 0.03] : [0.03, h, mullionT]
            const hMullion: [number, number, number] = wallAxis === 'x' ? [w, mullionT, 0.03] : [0.03, mullionT, w]
            return (
                <group position={gPos}>
                    <mesh><boxGeometry args={size} />{glassMat()}</mesh>
                    <mesh><boxGeometry args={vMullion} /><meshStandardMaterial color={frameColor} /></mesh>
                    <mesh><boxGeometry args={hMullion} /><meshStandardMaterial color={frameColor} /></mesh>
                </group>
            )
        }
        case 'window-sliding': {
            const half = op.width / 2
            const paneW = half * 0.96
            const paneSize: [number, number, number] = wallAxis === 'x' ? [paneW, op.height, 0.025] : [0.025, op.height, paneW]
            const leftPos: [number, number, number] = wallAxis === 'x' ? [-half / 2, 0, 0.01] : [0.01, 0, -half / 2]
            const rightPos: [number, number, number] = wallAxis === 'x' ? [half / 2, 0, -0.01] : [-0.01, 0, half / 2]
            return (
                <group position={gPos}>
                    <mesh position={leftPos}><boxGeometry args={paneSize} />{glassMat(0.3)}</mesh>
                    <mesh position={rightPos}><boxGeometry args={paneSize} />{glassMat(0.4)}</mesh>
                </group>
            )
        }
        case 'window-bay': {
            const segW = op.width / 3
            const depth = 0.4
            const angle = Math.PI / 6
            const segSize: [number, number, number] = wallAxis === 'x' ? [segW, op.height, 0.025] : [0.025, op.height, segW]
            const centerOut: [number, number, number] = wallAxis === 'x' ? [0, 0, -depth] : [-depth, 0, 0]
            return (
                <group position={gPos}>
                    <mesh position={centerOut}><boxGeometry args={segSize} />{glassMat()}</mesh>
                    <mesh position={wallAxis === 'x' ? [-segW * 0.75, 0, -depth * 0.4] : [-depth * 0.4, 0, -segW * 0.75]}
                        rotation={wallAxis === 'x' ? [0, angle, 0] : [0, angle + Math.PI / 2, 0]}>
                        <boxGeometry args={segSize} />{glassMat()}
                    </mesh>
                    <mesh position={wallAxis === 'x' ? [segW * 0.75, 0, -depth * 0.4] : [-depth * 0.4, 0, segW * 0.75]}
                        rotation={wallAxis === 'x' ? [0, -angle, 0] : [0, -angle + Math.PI / 2, 0]}>
                        <boxGeometry args={segSize} />{glassMat()}
                    </mesh>
                </group>
            )
        }
        case 'window-skylight': {
            // Note: the data model only has vertical walls, no roof plane yet,
            // so a skylight is approximated here with a warm tint on the wall
            // opening rather than true ceiling-mounted glazing.
            const size: [number, number, number] = wallAxis === 'x' ? [op.width, op.height, 0.025] : [0.025, op.height, op.width]
            return (
                <group position={gPos}>
                    <mesh><boxGeometry args={size} /><meshStandardMaterial color="#FDE9B8" transparent opacity={0.45} roughness={0.1} metalness={0.1} side={THREE.DoubleSide} /></mesh>
                </group>
            )
        }
        case 'window-fixed':
        default: {
            const size: [number, number, number] = wallAxis === 'x' ? [op.width, op.height, 0.025] : [0.025, op.height, op.width]
            return <group position={gPos}><mesh><boxGeometry args={size} />{glassMat()}</mesh></group>
        }
    }
}