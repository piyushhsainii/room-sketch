import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { EditorOpening } from "../lib/constants"
import * as THREE from 'three'
import { glassMat, mat } from "../windows/materials"
import { WindowGlass } from "./windows-glass"

const INSTALL_GAP = 0.025

function getFrameDimensions(op: EditorOpening) {
    const frameWidth = op.width - INSTALL_GAP * 2
    const frameHeight = op.height - INSTALL_GAP * 2

    return {
        frameWidth,
        frameHeight,
        innerW: frameWidth - frameT * 2,
        innerH: frameHeight - frameT * 2,
    }
}

function getWindowFaceOffset(wallThickness = 0.15) {
    return wallThickness / 2 + frameDepth / 2
}



const frameColor = '#EDE9E0'
const sillColor = '#DCD5C6'
const frameT = 0.045
const frameDepth = 0.08
const mullionT = 0.0

function OuterFrame({
    width,
    height,
    itemOpacity,
    itemTransparent,
}: {
    width: number
    height: number
    itemOpacity: number
    itemTransparent: boolean
}) {
    const t = frameT
    const d = frameDepth

    const innerWidth = width - t * 2
    const innerHeight = height - t * 2

    const bead = 0.014
    const beadDepth = 0.012

    return (
        <>
            {/* ===========================
               OUTER FRAME
            =========================== */}

            {/* Left */}
            <mesh position={[-width / 2 + t / 2, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[t, height, d]} />
                {mat(frameColor, {
                    roughness: 0.45,
                    metalness: 0.12,
                }, itemOpacity, itemTransparent)}
            </mesh>

            {/* Right */}
            <mesh position={[width / 2 - t / 2, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[t, height, d]} />
                {mat(frameColor, {
                    roughness: 0.45,
                    metalness: 0.12,
                }, itemOpacity, itemTransparent)}
            </mesh>

            {/* Top */}
            <mesh position={[0, height / 2 - t / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[innerWidth, t, d]} />
                {mat(frameColor, {
                    roughness: 0.45,
                    metalness: 0.12,
                }, itemOpacity, itemTransparent)}
            </mesh>

            {/* Bottom */}
            <mesh position={[0, -height / 2 + t / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[innerWidth, t, d]} />
                {mat(frameColor, {
                    roughness: 0.45,
                    metalness: 0.12,
                }, itemOpacity, itemTransparent)}
            </mesh>

            {/* ===========================
               INNER GLAZING BEAD
            =========================== */}

            {/* Left */}
            <mesh
                position={[
                    -innerWidth / 2 + bead / 2,
                    0,
                    d / 2 - beadDepth / 2,
                ]}
            >
                <boxGeometry args={[bead, innerHeight, beadDepth]} />
                {mat(frameColor, {
                    roughness: 0.38,
                }, itemOpacity, itemTransparent)}
            </mesh>

            {/* Right */}
            <mesh
                position={[
                    innerWidth / 2 - bead / 2,
                    0,
                    d / 2 - beadDepth / 2,
                ]}
            >
                <boxGeometry args={[bead, innerHeight, beadDepth]} />
                {mat(frameColor, {
                    roughness: 0.38,
                }, itemOpacity, itemTransparent)}
            </mesh>

            {/* Top */}
            <mesh
                position={[
                    0,
                    innerHeight / 2 - bead / 2,
                    d / 2 - beadDepth / 2,
                ]}
            >
                <boxGeometry
                    args={[
                        innerWidth - bead * 2,
                        bead,
                        beadDepth,
                    ]}
                />
                {mat(frameColor, {
                    roughness: 0.38,
                }, itemOpacity, itemTransparent)}
            </mesh>

            {/* Bottom */}
            <mesh
                position={[
                    0,
                    -innerHeight / 2 + bead / 2,
                    d / 2 - beadDepth / 2,
                ]}
            >
                <boxGeometry
                    args={[
                        innerWidth - bead * 2,
                        bead,
                        beadDepth,
                    ]}
                />
                {mat(frameColor, {
                    roughness: 0.38,
                }, itemOpacity, itemTransparent)}
            </mesh>

            {/* ===========================
               RUBBER GASKET
            =========================== */}

            <mesh position={[0, 0, d / 2 - beadDepth - 0.004]}>
                <boxGeometry
                    args={[
                        innerWidth - bead * 2,
                        innerHeight - bead * 2,
                        0.003,
                    ]}
                />
                {mat(
                    "#222222",
                    {
                        roughness: 1,
                    },
                    itemOpacity,
                    itemTransparent
                )}
            </mesh>

            {/* ===========================
               EXTERIOR SILL
            =========================== */}

            <mesh
                position={[
                    0,
                    -height / 2 - 0.02,
                    d * 0.33,
                ]}
                castShadow
                receiveShadow
            >
                <boxGeometry
                    args={[
                        width + 0.05,
                        0.04,
                        d + 0.03,
                    ]}
                />
                {mat(
                    sillColor,
                    {
                        roughness: 0.7,
                    },
                    itemOpacity,
                    itemTransparent
                )}
            </mesh>

            {/* ===========================
               INTERIOR SILL
            =========================== */}

            <mesh
                position={[
                    0,
                    -height / 2 + 0.005,
                    -d * 0.33,
                ]}
                castShadow
                receiveShadow
            >
                <boxGeometry
                    args={[
                        width - 0.02,
                        0.012,
                        d * 0.55,
                    ]}
                />
                {mat(
                    "#F3F1EC",
                    {
                        roughness: 0.6,
                    },
                    itemOpacity,
                    itemTransparent
                )}
            </mesh>
        </>
    )
}

// ── Casement sash — hinged on the left edge, swings open on click. ──
function CasementSash({
    width, height, frontZ, mullionT, frameColor, isOpen, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    width: number; height: number; frontZ: number; mullionT: number
    frameColor: string
    isOpen: boolean
    interactive?: boolean
    onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
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
            position={[-width / 2, 0, frontZ]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            <group position={[width / 2, 0, 0]}>
                <mesh>
                    <boxGeometry args={[width * 0.98, height * 0.98, 0.03]} />
                    {mat(frameColor, { roughness: 0.5 }, itemOpacity, itemTransparent)}
                </mesh>
                <group position={[0, 0, 0.025]}>
                    <WindowGlass
                        width={width * 0.85}
                        height={height * 0.85}
                        itemOpacity={itemOpacity}
                        itemTransparent={itemTransparent}
                    />
                </group>
                <mesh position={[0, 0, 0.033]}>
                    <boxGeometry args={[mullionT, height * 0.9, 0.01]} />
                    {mat(frameColor, {}, itemOpacity, itemTransparent)}
                </mesh>
                <mesh position={[0, 0, 0.033]}>
                    <boxGeometry args={[width * 0.9, mullionT, 0.01]} />
                    {mat(frameColor, {}, itemOpacity, itemTransparent)}
                </mesh>
                <mesh position={[width * 0.35, 0, 0.035]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.09, 8]} />
                    {mat('#B9B9B4', { metalness: 0.6, roughness: 0.3 }, itemOpacity, itemTransparent)}
                </mesh>
            </group>
        </group>
    )
}

// ── Sliding sash — translates along local X between rest and open. ──
function SlidingSash({
    restX, openOffset, y, z, size, frameColor, isOpen, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    restX: number; openOffset: number; y: number; z: number
    size: [number, number, number]
    frameColor: string,
    isOpen: boolean
    interactive?: boolean
    onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
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
            <>
                <mesh>
                    <boxGeometry
                        args={[
                            size[0],
                            size[1],
                            0.03,
                        ]}
                    />
                    {mat(
                        frameColor,
                        {
                            roughness: 0.5,
                        },
                        itemOpacity,
                        itemTransparent
                    )}
                </mesh>

                <group position={[0, 0, 0.02]}>
                    <WindowGlass
                        width={size[0] * 0.84}
                        height={size[1] * 0.84}
                        itemOpacity={itemOpacity}
                        itemTransparent={itemTransparent}
                    />
                </group>
            </>
        </group>
    )
}

export function WindowVariant3D({
    op, angle, basePos, interactive = false, onToggleOpen,
    opacity = 1, transparent = false,   // NEW
}: {
    op: EditorOpening
    angle: number
    basePos: [number, number, number]
    interactive?: boolean
    onToggleOpen?: () => void
    opacity?: number
    transparent?: boolean
}) {
    const {
        frameWidth,
        frameHeight,
        innerW,
        innerH,
    } = getFrameDimensions(op)
    const variant = op.variant ?? 'window-fixed'
    const itemOpacity = opacity
    const itemTransparent = transparent || opacity < 1
    const frameFrontZ = frameDepth * 0.22
    const groupRot: [number, number, number] = [0, -angle, 0]

    const INSTALL_GAP = 0.025


    switch (variant) {
        case 'window-fixed': {
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame
                        width={frameWidth}
                        height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <group position={[0, 0, frameFrontZ]}>
                        <WindowGlass
                            width={innerW}
                            height={innerH}
                            itemOpacity={itemOpacity}
                            itemTransparent={itemTransparent}
                        />
                    </group>
                </group>
            )
        }

        case 'window-casement': {
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame
                        width={frameWidth}
                        height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <CasementSash
                        width={innerW}
                        height={innerH}
                        frontZ={frameFrontZ}
                        mullionT={mullionT}
                        frameColor={frameColor}
                        isOpen={!!op.isOpen}
                        interactive={interactive}
                        onToggleOpen={onToggleOpen}
                        itemOpacity={itemOpacity}
                        itemTransparent={itemTransparent}
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
                    <OuterFrame width={frameWidth}
                        height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <group position={[0, 0, frameFrontZ]}>
                        <WindowGlass
                            width={innerW}
                            height={innerH}
                            itemOpacity={itemOpacity}
                            itemTransparent={itemTransparent}
                        />
                    </group>
                    <SlidingSash
                        restX={half / 2}
                        openOffset={paneW * 0.85}
                        y={0}
                        z={frameFrontZ + 0.015}
                        size={paneSize}
                        frameColor={frameColor}
                        isOpen={!!op.isOpen}
                        interactive={interactive}
                        onToggleOpen={onToggleOpen}
                        itemOpacity={itemOpacity}
                        itemTransparent={itemTransparent}
                    />
                    <mesh position={[0, 0, frameFrontZ]}>
                        <boxGeometry args={[mullionT * 1.4, innerH, 0.035]} />
                        {mat(frameColor, {}, itemOpacity, itemTransparent)}
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
            const segFrontZ = segFrameDepth / 2 + 0.008

            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh castShadow>
                        <boxGeometry args={[op.width, op.height, 0.04]} />
                        {mat(frameColor, { roughness: 0.55 }, itemOpacity, itemTransparent)}
                    </mesh>
                    <mesh position={[0, -innerH / 2 - 0.06, -depth * 0.5]} castShadow>
                        <boxGeometry args={[op.width * 0.92, 0.1, depth]} />
                        {mat(sillColor, { roughness: 0.6 }, itemOpacity, itemTransparent)}
                    </mesh>
                    <group position={[0, 0, -depth]}>
                        <mesh>
                            <boxGeometry args={segFrameSize} />
                            {mat(frameColor, { roughness: 0.55 }, itemOpacity, itemTransparent)}
                        </mesh>
                        <group position={[0, 0, frameFrontZ]}>
                            <WindowGlass
                                width={innerW}
                                height={innerH}
                                itemOpacity={itemOpacity}
                                itemTransparent={itemTransparent}
                            />
                        </group>
                    </group>
                    {[[-1, angleOut], [1, -angleOut]].map(([side, rot], idx) => (
                        <group key={idx} position={[side * segW * 0.9, 0, -depth * 0.42]} rotation={[0, rot, 0]}>
                            <mesh>
                                <boxGeometry args={segFrameSize} />
                                {mat(frameColor, { roughness: 0.55 }, itemOpacity, itemTransparent)}
                            </mesh>
                            <group position={[0, 0, frameFrontZ]}>
                                <WindowGlass
                                    width={innerW}
                                    height={innerH}
                                    itemOpacity={itemOpacity}
                                    itemTransparent={itemTransparent}
                                />
                            </group>
                        </group>
                    ))}
                </group>
            )
        }

        case 'window-skylight': {
            const skyFrameDepth = 0.05
            const skyFrontZ = skyFrameDepth / 2 + 0.008
            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh castShadow>
                        <boxGeometry args={[op.width, op.height, skyFrameDepth]} />
                        {mat('#3A3A38', { roughness: 0.4, metalness: 0.3 }, itemOpacity, itemTransparent)}
                    </mesh>
                    <mesh position={[0, 0, skyFrontZ]}>
                        <boxGeometry args={[innerW, innerH, 0.02]} />
                        <meshStandardMaterial
                            color="#FDE9B8"
                            transparent
                            opacity={0.4 * itemOpacity}
                            roughness={0.08}
                            metalness={0.15}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                    {[-innerW / 4, innerW / 4].map((gx, i) => (
                        <mesh key={`v${i}`} position={[gx, 0, skyFrontZ + 0.006]}>
                            <boxGeometry args={[mullionT, innerH, 0.02]} />
                            {mat('#2E2E2C', { metalness: 0.3, roughness: 0.4 }, itemOpacity, itemTransparent)}
                        </mesh>
                    ))}
                    <mesh position={[0, 0, skyFrontZ + 0.006]}>
                        <boxGeometry args={[innerW, mullionT, 0.02]} />
                        {mat('#2E2E2C', { metalness: 0.3, roughness: 0.4 }, itemOpacity, itemTransparent)}
                    </mesh>
                </group>
            )
        }

        default:
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame width={frameWidth}
                        height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <group position={[0, 0, frameFrontZ]}>
                        <WindowGlass
                            width={innerW}
                            height={innerH}
                            itemOpacity={itemOpacity}
                            itemTransparent={itemTransparent}
                        />
                    </group>
                </group>
            )
    }
}