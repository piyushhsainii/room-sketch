import { EditorOpening } from "../lib/constants"
import * as THREE from 'three'

/**
 * Generalized the same way DoorVariant3D was: takes a wall `angle` (radians,
 * `Math.atan2(dz, dx)` convention) and `basePos` (world position of the
 * opening's glazing center) instead of `wallAxis`/`room`/`wPos`, so Room3D
 * (rect rooms) and LineWalls3D (freeform line walls) render every window
 * variant identically.
 */
export function WindowVariant3D({ op, angle, basePos }: {
    op: EditorOpening
    angle: number
    basePos: [number, number, number]
}) {
    const variant = op.variant ?? 'window-fixed'
    const frameColor = '#E8E4DC'
    const mullionT = 0.03

    const glassMat = (opacity = 0.35) => (
        <meshStandardMaterial color="#93C5FD" transparent opacity={opacity} roughness={0.05} metalness={0.15} side={THREE.DoubleSide} />
    )

    // All variants are authored in local space with their "width" axis along
    // local X (matching how plain wall panels are authored: [length, height,
    // thickness] then rotated by -angle) and rendered inside a single group
    // rotated by -angle so they land flush in the wall regardless of wall
    // direction.
    const groupRot: [number, number, number] = [0, -angle, 0]

    switch (variant) {
        case 'window-casement': {
            const w = op.width, h = op.height
            const size: [number, number, number] = [w, h, 0.025]
            const vMullion: [number, number, number] = [mullionT, h, 0.03]
            const hMullion: [number, number, number] = [w, mullionT, 0.03]
            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh><boxGeometry args={size} />{glassMat()}</mesh>
                    <mesh><boxGeometry args={vMullion} /><meshStandardMaterial color={frameColor} /></mesh>
                    <mesh><boxGeometry args={hMullion} /><meshStandardMaterial color={frameColor} /></mesh>
                </group>
            )
        }
        case 'window-sliding': {
            const half = op.width / 2
            const paneW = half * 0.96
            const paneSize: [number, number, number] = [paneW, op.height, 0.025]
            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh position={[-half / 2, 0, 0.01]}><boxGeometry args={paneSize} />{glassMat(0.3)}</mesh>
                    <mesh position={[half / 2, 0, -0.01]}><boxGeometry args={paneSize} />{glassMat(0.4)}</mesh>
                </group>
            )
        }
        case 'window-bay': {
            const segW = op.width / 3
            const depth = 0.4
            const angleOut = Math.PI / 6
            const segSize: [number, number, number] = [segW, op.height, 0.025]
            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh position={[0, 0, -depth]}><boxGeometry args={segSize} />{glassMat()}</mesh>
                    <mesh position={[-segW * 0.75, 0, -depth * 0.4]} rotation={[0, angleOut, 0]}>
                        <boxGeometry args={segSize} />{glassMat()}
                    </mesh>
                    <mesh position={[segW * 0.75, 0, -depth * 0.4]} rotation={[0, -angleOut, 0]}>
                        <boxGeometry args={segSize} />{glassMat()}
                    </mesh>
                </group>
            )
        }
        case 'window-skylight': {
            // Data model only has vertical walls (no roof plane yet), so this
            // is approximated with a warm tint on the wall opening rather than
            // true ceiling-mounted glazing.
            const size: [number, number, number] = [op.width, op.height, 0.025]
            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh><boxGeometry args={size} /><meshStandardMaterial color="#FDE9B8" transparent opacity={0.45} roughness={0.1} metalness={0.1} side={THREE.DoubleSide} /></mesh>
                </group>
            )
        }
        case 'window-fixed':
        default: {
            const size: [number, number, number] = [op.width, op.height, 0.025]
            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh><boxGeometry args={size} />{glassMat()}</mesh>
                </group>
            )
        }
    }
}