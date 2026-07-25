import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { EditorOpening } from "../lib/constants"
import * as THREE from 'three'

export function WindowVariant3D({ op, angle, basePos, interactive = false, onToggleOpen }: {
    op: EditorOpening
    angle: number
    basePos: [number, number, number]
    interactive?: boolean
    onToggleOpen?: () => void
}) {
    const variant = op.variant ?? 'window-fixed'
    const frameColor = '#EDE9E0'
    const sillColor = '#DCD5C6'
    const frameT = 0.06        // visible casing width around the glass
    const frameDepth = 0.08    // frame box spans -frameDepth/2 .. +frameDepth/2 in local z
    const frameFrontZ = frameDepth / 2 + 0.01   // FIX — first safe z clearly in front of (outside) the frame box
    const mullionT = 0.028
    const groupRot: [number, number, number] = [0, -angle, 0]

    const glassMat = (opacity = 0.32) => (
        <meshStandardMaterial color="#A9C9E8" transparent opacity={opacity} roughness={0.04} metalness={0.1} side={THREE.DoubleSide} />
    )

    const innerW = op.width - frameT * 2
    const innerH = op.height - frameT * 2

    const OuterFrame = () => (
        <>
            <mesh castShadow>
                <boxGeometry args={[op.width, op.height, frameDepth]} />
                <meshStandardMaterial color={frameColor} roughness={0.55} />
            </mesh>
            <mesh position={[0, -op.height / 2 - 0.015, frameDepth * 0.3]} castShadow>
                <boxGeometry args={[op.width + 0.08, 0.03, frameDepth + 0.05]} />
                <meshStandardMaterial color={sillColor} roughness={0.6} />
            </mesh>
        </>
    )

    switch (variant) {
        case 'window-fixed': {
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame />
                    {/* FIX — was frameDepth*0.15 (inside the frame box); now
                        clearly in front of its +z face */}
                    <mesh position={[0, 0, frameFrontZ]}>
                        <boxGeometry args={[innerW, innerH, 0.02]} />
                        {glassMat()}
                    </mesh>
                </group>
            )
        }

        case 'window-casement': {
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame />
                    <CasementSash
                        width={innerW}
                        height={innerH}
                        frontZ={frameFrontZ}
                        mullionT={mullionT}
                        frameColor={frameColor}
                        glassMat={glassMat}
                        isOpen={!!op.isOpen}
                        interactive={interactive}
                        onToggleOpen={onToggleOpen}
                    />
                </group>
            )
        }

        case 'window-sliding': {
            const half = innerW / 2
            const paneW = half * 1.02
            const paneSize: [number, number, number] = [paneW, innerH, 0.02]
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame />
                    {/* Fixed pane, left — sits at the front-most safe z */}
                    <mesh position={[-half / 2, 0, frameFrontZ]}>
                        <boxGeometry args={paneSize} />
                        {glassMat(0.28)}
                    </mesh>
                    {/* Sliding pane, right — one layer further forward so it
                        visibly overlaps the fixed pane rather than z-fighting
                        with it */}
                    <SlidingSash
                        restX={half / 2}
                        openOffset={paneW * 0.85}
                        y={0}
                        z={frameFrontZ + 0.015}
                        size={paneSize}
                        isOpen={!!op.isOpen}
                        interactive={interactive}
                        onToggleOpen={onToggleOpen}
                        glassMat={glassMat}
                    />
                    <mesh position={[0, 0, frameFrontZ]}>
                        <boxGeometry args={[mullionT * 1.4, innerH, 0.035]} />
                        <meshStandardMaterial color={frameColor} />
                    </mesh>
                </group>
            )
        }

        case 'window-bay': {
            const segW = innerW / 3
            const depth = 0.5
            const angleOut = Math.PI / 6
            const segSize: [number, number, number] = [segW * 0.94, innerH, 0.02]
            const segFrameDepth = 0.04
            const segFrameSize: [number, number, number] = [segW, innerH + frameT, segFrameDepth]
            const segFrontZ = segFrameDepth / 2 + 0.008   // FIX — same z-outside-the-box rule, applied per bay segment

            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh castShadow>
                        <boxGeometry args={[op.width, op.height, 0.04]} />
                        <meshStandardMaterial color={frameColor} roughness={0.55} />
                    </mesh>
                    <mesh position={[0, -innerH / 2 - 0.06, -depth * 0.5]} castShadow>
                        <boxGeometry args={[op.width * 0.92, 0.1, depth]} />
                        <meshStandardMaterial color={sillColor} roughness={0.6} />
                    </mesh>
                    <group position={[0, 0, -depth]}>
                        <mesh>
                            <boxGeometry args={segFrameSize} />
                            <meshStandardMaterial color={frameColor} roughness={0.55} />
                        </mesh>
                        <mesh position={[0, 0, segFrontZ]}>
                            <boxGeometry args={segSize} />
                            {glassMat()}
                        </mesh>
                    </group>
                    {[[-1, angleOut], [1, -angleOut]].map(([side, rot], idx) => (
                        <group key={idx} position={[side * segW * 0.9, 0, -depth * 0.42]} rotation={[0, rot, 0]}>
                            <mesh>
                                <boxGeometry args={segFrameSize} />
                                <meshStandardMaterial color={frameColor} roughness={0.55} />
                            </mesh>
                            <mesh position={[0, 0, segFrontZ]}>
                                <boxGeometry args={segSize} />
                                {glassMat()}
                            </mesh>
                        </group>
                    ))}
                </group>
            )
        }

        case 'window-skylight': {
            const skyFrameDepth = 0.05
            const skyFrontZ = skyFrameDepth / 2 + 0.008   // FIX — was 0.02/0.025 against a 0.025 half-depth (right on the boundary)
            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh castShadow>
                        <boxGeometry args={[op.width, op.height, skyFrameDepth]} />
                        <meshStandardMaterial color="#3A3A38" roughness={0.4} metalness={0.3} />
                    </mesh>
                    <mesh position={[0, 0, skyFrontZ]}>
                        <boxGeometry args={[innerW, innerH, 0.02]} />
                        <meshStandardMaterial color="#FDE9B8" transparent opacity={0.4} roughness={0.08} metalness={0.15} side={THREE.DoubleSide} />
                    </mesh>
                    {[-innerW / 4, innerW / 4].map((gx, i) => (
                        <mesh key={`v${i}`} position={[gx, 0, skyFrontZ + 0.006]}>
                            <boxGeometry args={[mullionT, innerH, 0.02]} />
                            <meshStandardMaterial color="#2E2E2C" metalness={0.3} roughness={0.4} />
                        </mesh>
                    ))}
                    <mesh position={[0, 0, skyFrontZ + 0.006]}>
                        <boxGeometry args={[innerW, mullionT, 0.02]} />
                        <meshStandardMaterial color="#2E2E2C" metalness={0.3} roughness={0.4} />
                    </mesh>
                </group>
            )
        }

        default:
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame />
                    <mesh position={[0, 0, frameFrontZ]}>
                        <boxGeometry args={[innerW, innerH, 0.02]} />
                        {glassMat()}
                    </mesh>
                </group>
            )
    }
}

// ── Casement sash — hinged on the left edge, swings open on click. ──
function CasementSash({ width, height, frontZ, mullionT, frameColor, glassMat, isOpen, interactive, onToggleOpen }: {
    width: number; height: number; frontZ: number; mullionT: number
    frameColor: string
    glassMat: (o?: number) => React.ReactNode
    isOpen: boolean
    interactive?: boolean
    onToggleOpen?: () => void
}) {
    const groupRef = useRef<THREE.Group>(null)
    const currentAngle = useRef(0)
    const restAngle = 0
    const openAngle = -Math.PI / 2.4

    useFrame((_, delta) => {
        const target = isOpen ? openAngle : restAngle
        const diff = target - currentAngle.current
        if (Math.abs(diff) < 0.001) currentAngle.current = target
        else currentAngle.current += diff * Math.min(1, delta * 8)
        if (groupRef.current) groupRef.current.rotation.y = currentAngle.current
    })

    return (
        <group
            ref={groupRef}
            // FIX — was depth*0.2 (inside the outer frame box); the hinge
            // pivot itself now sits at the frame's front-most safe z, so the
            // whole sash swings from a point clearly outside the frame.
            position={[-width / 2, 0, frontZ]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            <group position={[width / 2, 0, 0]}>
                <mesh>
                    <boxGeometry args={[width * 0.98, height * 0.98, 0.03]} />
                    <meshStandardMaterial color={frameColor} roughness={0.5} />
                </mesh>
                <mesh position={[0, 0, 0.025]}>
                    <boxGeometry args={[width * 0.85, height * 0.85, 0.015]} />
                    {glassMat()}
                </mesh>
                <mesh position={[0, 0, 0.033]}>
                    <boxGeometry args={[mullionT, height * 0.9, 0.01]} />
                    <meshStandardMaterial color={frameColor} />
                </mesh>
                <mesh position={[0, 0, 0.033]}>
                    <boxGeometry args={[width * 0.9, mullionT, 0.01]} />
                    <meshStandardMaterial color={frameColor} />
                </mesh>
                <mesh position={[width * 0.35, 0, 0.035]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.09, 8]} />
                    <meshStandardMaterial color="#B9B9B4" metalness={0.6} roughness={0.3} />
                </mesh>
            </group>
        </group>
    )
}

// ── Sliding sash — translates along local X between rest and open. ──
function SlidingSash({ restX, openOffset, y, z, size, isOpen, interactive, onToggleOpen, glassMat }: {
    restX: number; openOffset: number; y: number; z: number
    size: [number, number, number]
    isOpen: boolean
    interactive?: boolean
    onToggleOpen?: () => void
    glassMat: (o?: number) => React.ReactNode
}) {
    const meshRef = useRef<THREE.Group>(null)
    const currentX = useRef(restX)

    useFrame((_, delta) => {
        const target = isOpen ? restX + openOffset : restX
        const diff = target - currentX.current
        if (Math.abs(diff) < 0.001) currentX.current = target
        else currentX.current += diff * Math.min(1, delta * 8)
        if (meshRef.current) meshRef.current.position.x = currentX.current
    })

    return (
        <group
            ref={meshRef}
            position={[restX, y, z]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            <mesh>
                <boxGeometry args={size} />
                {glassMat(0.4)}
            </mesh>
        </group>
    )
}