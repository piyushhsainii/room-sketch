import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { EditorOpening } from "../lib/constants"
import * as THREE from 'three'
import { mat } from "../windows/materials"
import { WindowGlass } from "./windows-glass"
import { BayPanel, useBayCapGeometry } from "../hooks/useWindowGeometry"

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

const frameColor = '#EDE9E0'
const sillColor = '#DCD5C6'
const frameT = 0.045
const frameDepth = 0.08
const mullionT = 0.0

// Smoothly eases a ref toward `target`, mutating `current.current` in place
// and returning the new value. Shared by every animated sub-component below
// so "openAmount" (continuous) and "isOpen" (legacy boolean) both animate
// with the same feel.
function approach(current: React.MutableRefObject<number>, target: number, delta: number, speed = 8) {
    const diff = target - current.current
    if (Math.abs(diff) < 0.001) current.current = target
    else current.current += diff * Math.min(1, delta * speed)
    return current.current
}


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
            {/* OUTER FRAME */}
            <mesh position={[-width / 2 + t / 2, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[t, height, d]} />
                {mat(frameColor, { roughness: 0.45, metalness: 0.12 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[width / 2 - t / 2, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[t, height, d]} />
                {mat(frameColor, { roughness: 0.45, metalness: 0.12 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[0, height / 2 - t / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[innerWidth, t, d]} />
                {mat(frameColor, { roughness: 0.45, metalness: 0.12 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[0, -height / 2 + t / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[innerWidth, t, d]} />
                {mat(frameColor, { roughness: 0.45, metalness: 0.12 }, itemOpacity, itemTransparent)}
            </mesh>

            {/* INNER GLAZING BEAD */}
            <mesh position={[-innerWidth / 2 + bead / 2, 0, d / 2 - beadDepth / 2]}>
                <boxGeometry args={[bead, innerHeight, beadDepth]} />
                {mat(frameColor, { roughness: 0.38 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[innerWidth / 2 - bead / 2, 0, d / 2 - beadDepth / 2]}>
                <boxGeometry args={[bead, innerHeight, beadDepth]} />
                {mat(frameColor, { roughness: 0.38 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[0, innerHeight / 2 - bead / 2, d / 2 - beadDepth / 2]}>
                <boxGeometry args={[innerWidth - bead * 2, bead, beadDepth]} />
                {mat(frameColor, { roughness: 0.38 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[0, -innerHeight / 2 + bead / 2, d / 2 - beadDepth / 2]}>
                <boxGeometry args={[innerWidth - bead * 2, bead, beadDepth]} />
                {mat(frameColor, { roughness: 0.38 }, itemOpacity, itemTransparent)}
            </mesh>

            {/* RUBBER GASKET */}
            <mesh position={[0, 0, d / 2 - beadDepth - 0.004]}>
                <boxGeometry args={[innerWidth - bead * 2, innerHeight - bead * 2, 0.003]} />
                {mat("#222222", { roughness: 1 }, itemOpacity, itemTransparent)}
            </mesh>

            {/* EXTERIOR SILL */}
            <mesh position={[0, -height / 2 - 0.02, d * 0.33]} castShadow receiveShadow>
                <boxGeometry args={[width + 0.05, 0.04, d + 0.03]} />
                {mat(sillColor, { roughness: 0.7 }, itemOpacity, itemTransparent)}
            </mesh>

            {/* INTERIOR SILL */}
            <mesh position={[0, -height / 2 + 0.005, -d * 0.33]} castShadow receiveShadow>
                <boxGeometry args={[width - 0.02, 0.012, d * 0.55]} />
                {mat("#F3F1EC", { roughness: 0.6 }, itemOpacity, itemTransparent)}
            </mesh>
        </>
    )
}

// ── Shared flat sash — a glazed rectangle behind a thin frame, used by
// picture (static), single/double-hung (vertical slide), and sliding
// (horizontal slide). No rotation — that's Phase 2's job. ──
function FlatSash({
    width, height, x, y, z, itemOpacity, itemTransparent,
    interactive, onToggleOpen,
}: {
    width: number; height: number; x: number; y: number; z: number
    itemOpacity: number; itemTransparent: boolean
    interactive?: boolean; onToggleOpen?: () => void
}) {
    return (
        <group
            position={[x, y, z]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            <mesh>
                <boxGeometry args={[width, height, 0.03]} />
                {mat(frameColor, { roughness: 0.5 }, itemOpacity, itemTransparent)}
            </mesh>
            <group position={[0, 0, 0.02]}>
                <WindowGlass width={width * 0.86} height={height * 0.86} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </group>
        </group>
    )
}

// ── Single-hung — bottom sash slides up within its track by openAmount.
// Top sash is fixed. ──
function SingleHungSashes({
    innerW, innerH, frontZ, isOpen, openAmount, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    innerW: number; innerH: number; frontZ: number
    isOpen: boolean; openAmount?: number
    interactive?: boolean; onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
}) {
    const sashH = innerH / 2
    const travel = sashH * 0.88 // cap so the sash stays inside its own frame
    const frac = useRef(0)
    const groupRef = useRef<THREE.Group>(null)
    const target = isOpen ? (openAmount ?? 1) : 0

    useFrame((_, delta) => {
        const v = approach(frac, target, delta)
        if (groupRef.current) groupRef.current.position.y = v * travel
    })

    return (
        <>
            {/* Top sash — fixed */}
            <FlatSash width={innerW} height={sashH} x={0} y={sashH / 2} z={frontZ}
                itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            {/* Bottom sash — operable, slides up on click */}
            <group ref={groupRef} position={[0, -sashH / 2, 0]}>
                <FlatSash width={innerW} height={sashH} x={0} y={0} z={frontZ}
                    itemOpacity={itemOpacity} itemTransparent={itemTransparent}
                    interactive={interactive} onToggleOpen={onToggleOpen} />
            </group>
            {/* Meeting rail */}
            <mesh position={[0, 0, frontZ + 0.001]}>
                <boxGeometry args={[innerW, 0.02, 0.02]} />
                {mat(frameColor, { roughness: 0.5 }, itemOpacity, itemTransparent)}
            </mesh>
        </>
    )
}

// ── Double-hung — both sashes move toward each other/apart, each covering
// half of openAmount's travel so they "meet in the middle" visually. ──
function DoubleHungSashes({
    innerW, innerH, frontZ, isOpen, openAmount, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    innerW: number; innerH: number; frontZ: number
    isOpen: boolean; openAmount?: number
    interactive?: boolean; onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
}) {
    const sashH = innerH / 2
    const travel = sashH * 0.8
    const fracTop = useRef(0)
    const fracBottom = useRef(0)
    const topRef = useRef<THREE.Group>(null)
    const bottomRef = useRef<THREE.Group>(null)
    const target = isOpen ? (openAmount ?? 1) : 0

    useFrame((_, delta) => {
        const vTop = approach(fracTop, target, delta)
        const vBottom = approach(fracBottom, target, delta)
        if (topRef.current) topRef.current.position.y = -vTop * travel * 0.5
        if (bottomRef.current) bottomRef.current.position.y = vBottom * travel * 0.5
    })

    return (
        <>
            <group ref={topRef} position={[0, sashH / 2, 0]}>
                <FlatSash width={innerW} height={sashH} x={0} y={0} z={frontZ}
                    itemOpacity={itemOpacity} itemTransparent={itemTransparent}
                    interactive={interactive} onToggleOpen={onToggleOpen} />
            </group>
            <group ref={bottomRef} position={[0, -sashH / 2, 0]}>
                <FlatSash width={innerW} height={sashH} x={0} y={0} z={frontZ}
                    itemOpacity={itemOpacity} itemTransparent={itemTransparent}
                    interactive={interactive} onToggleOpen={onToggleOpen} />
            </group>
            <mesh position={[0, 0, frontZ + 0.001]}>
                <boxGeometry args={[innerW, 0.02, 0.02]} />
                {mat(frameColor, { roughness: 0.5 }, itemOpacity, itemTransparent)}
            </mesh>
        </>
    )
}

// ── Casement sash — hinged on the left edge, swings open continuously via
// openAmount instead of snapping between two fixed angles. ──
function CasementSash({
    width, height, frontZ, isOpen, openAmount, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    width: number; height: number; frontZ: number
    isOpen: boolean; openAmount?: number
    interactive?: boolean
    onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
}) {
    const groupRef = useRef<THREE.Group>(null)
    const frac = useRef(0)
    const maxAngle = -Math.PI / 2.4
    const target = isOpen ? (openAmount ?? 1) : 0

    useFrame((_, delta) => {
        const v = approach(frac, target, delta)
        if (groupRef.current) groupRef.current.rotation.y = v * maxAngle
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
                    <WindowGlass width={width * 0.85} height={height * 0.85} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                </group>
                <mesh position={[width * 0.35, 0, 0.035]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.09, 8]} />
                    {mat('#B9B9B4', { metalness: 0.6, roughness: 0.3 }, itemOpacity, itemTransparent)}
                </mesh>
            </group>
        </group>
    )
}

// ── Awning sash — hinged on the TOP edge, opens outward/downward on the
// X axis. Structurally a mirror of CasementSash but rotating around a
// horizontal pivot instead of a vertical one. ──
function AwningSash({
    width, height, frontZ, isOpen, openAmount, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    width: number; height: number; frontZ: number
    isOpen: boolean; openAmount?: number
    interactive?: boolean
    onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
}) {
    const groupRef = useRef<THREE.Group>(null)
    const frac = useRef(0)
    const maxAngle = Math.PI / 2.6 // opens outward (positive X rotation = bottom edge swings out/down)
    const target = isOpen ? (openAmount ?? 1) : 0

    useFrame((_, delta) => {
        const v = approach(frac, target, delta)
        if (groupRef.current) groupRef.current.rotation.x = v * maxAngle
    })

    return (
        <group
            ref={groupRef}
            position={[0, height / 2, frontZ]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            <group position={[0, -height / 2, 0]}>
                <mesh>
                    <boxGeometry args={[width * 0.98, height * 0.98, 0.03]} />
                    {mat(frameColor, { roughness: 0.5 }, itemOpacity, itemTransparent)}
                </mesh>
                <group position={[0, 0, 0.025]}>
                    <WindowGlass width={width * 0.85} height={height * 0.85} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                </group>
                {/* Extension arm hardware, hangs from the bottom edge */}
                <mesh position={[width * 0.3, -height * 0.42, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.006, 0.006, 0.14, 8]} />
                    {mat('#B9B9B4', { metalness: 0.6, roughness: 0.3 }, itemOpacity, itemTransparent)}
                </mesh>
            </group>
        </group>
    )
}

// ── Sliding sash — translates along local X between rest and openAmount
// fraction of its full track offset. ──
function SlidingSash({
    restX, openOffset, y, z, size, isOpen, openAmount, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    restX: number; openOffset: number; y: number; z: number
    size: [number, number, number]
    isOpen: boolean; openAmount?: number
    interactive?: boolean
    onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
}) {
    const meshRef = useRef<THREE.Group>(null)
    const frac = useRef(0)
    const target = isOpen ? (openAmount ?? 1) : 0

    useFrame((_, delta) => {
        const v = approach(frac, target, delta)
        if (meshRef.current) meshRef.current.position.x = restX + v * openOffset
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
                <boxGeometry args={[size[0], size[1], 0.03]} />
                {mat(frameColor, { roughness: 0.5 }, itemOpacity, itemTransparent)}
            </mesh>
            <group position={[0, 0, 0.02]}>
                <WindowGlass width={size[0] * 0.84} height={size[1] * 0.84} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </group>
        </group>
    )
}

export function WindowVariant3D({
    op, angle, basePos, interactive = false, onToggleOpen,
    opacity = 1, transparent = false,
}: {
    op: EditorOpening
    angle: number
    basePos: [number, number, number]
    interactive?: boolean
    onToggleOpen?: () => void
    opacity?: number
    transparent?: boolean
}) {
    const { frameWidth, frameHeight, innerW, innerH } = getFrameDimensions(op)
    // 'window-fixed' kept as the legacy synonym for picture — see Phase 0 notes.
    const variant = op.variant ?? 'window-fixed'
    const itemOpacity = opacity
    const itemTransparent = transparent || opacity < 1
    const frameFrontZ = frameDepth * 0.22
    const groupRot: [number, number, number] = [0, -angle, 0]
    const isOpen = !!op.isOpen
    const openAmount = op.openAmount

    switch (variant) {
        case 'window-fixed':
        case 'window-picture': {
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame width={frameWidth} height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <group position={[0, 0, frameFrontZ]}>
                        <WindowGlass width={innerW} height={innerH} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    </group>
                </group>
            )
        }

        case 'window-single-hung': {
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame width={frameWidth} height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <SingleHungSashes
                        innerW={innerW} innerH={innerH} frontZ={frameFrontZ}
                        isOpen={isOpen} openAmount={openAmount}
                        interactive={interactive} onToggleOpen={onToggleOpen}
                        itemOpacity={itemOpacity} itemTransparent={itemTransparent}
                    />
                </group>
            )
        }

        case 'window-double-hung': {
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame width={frameWidth} height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <DoubleHungSashes
                        innerW={innerW} innerH={innerH} frontZ={frameFrontZ}
                        isOpen={isOpen} openAmount={openAmount}
                        interactive={interactive} onToggleOpen={onToggleOpen}
                        itemOpacity={itemOpacity} itemTransparent={itemTransparent}
                    />
                </group>
            )
        }

        case 'window-casement': {
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame width={frameWidth} height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <CasementSash
                        width={innerW} height={innerH} frontZ={frameFrontZ}
                        isOpen={isOpen} openAmount={openAmount}
                        interactive={interactive} onToggleOpen={onToggleOpen}
                        itemOpacity={itemOpacity} itemTransparent={itemTransparent}
                    />
                </group>
            )
        }

        case 'window-awning': {
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame width={frameWidth} height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <AwningSash
                        width={innerW} height={innerH} frontZ={frameFrontZ}
                        isOpen={isOpen} openAmount={openAmount}
                        interactive={interactive} onToggleOpen={onToggleOpen}
                        itemOpacity={itemOpacity} itemTransparent={itemTransparent}
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
                    <OuterFrame width={frameWidth} height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <group position={[0, 0, frameFrontZ]}>
                        <WindowGlass width={innerW} height={innerH} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    </group>
                    <SlidingSash
                        restX={half / 2}
                        openOffset={paneW * 0.85}
                        y={0}
                        z={frameFrontZ + 0.015}
                        size={paneSize}
                        isOpen={isOpen} openAmount={openAmount}
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
            const doorPanelIndex: number | undefined = (op as any).bayDoorIndex
            const projectDepth = (op as any).bayProjection ?? 0.45   // ← revert to original, unsigned
            const sideAngle = Math.PI / 4

            const bayW = op.width - INSTALL_GAP * 2
            const bayH = op.height - INSTALL_GAP * 2

            const frontW = bayW * 0.62
            const sideW = bayW * 0.4
            const panelH = bayH

            const leftX = -frontW / 2 - (sideW / 2) * Math.cos(sideAngle)
            const leftZ = -projectDepth + (sideW / 2) * Math.sin(sideAngle)
            const rightX = frontW / 2 + (sideW / 2) * Math.cos(sideAngle)
            const rightZ = -projectDepth + (sideW / 2) * Math.sin(sideAngle)

            const panels = [
                { key: 'left', index: 0, width: sideW, x: leftX, z: -leftZ, rotY: -sideAngle },
                { key: 'center', index: 1, width: frontW, x: 0, z: projectDepth, rotY: 0 },
                { key: 'right', index: 2, width: sideW, x: rightX, z: -rightZ, rotY: sideAngle },
            ]

            const roofT = 0.05
            const sillT = 0.10
            const roofTopY = (bayH / 2) + 0.01
            const roofBottomY = roofTopY - roofT
            const sillBottomY = -bayH / 2

            const roofGeo = useBayCapGeometry(bayW, frontW, sideW, projectDepth, sideAngle, roofT, 0.18)
            const sillGeo = useBayCapGeometry(bayW, frontW, sideW, projectDepth, sideAngle, sillT, 0.15)

            return (
                <group position={basePos} rotation={groupRot}>
                    {panels.map(p => (
                        <group key={p.key} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]}>
                            <BayPanel
                                width={p.width}
                                height={panelH}
                                isDoor={doorPanelIndex === p.index}
                                hingeSign={p.index === 0 ? -1 : 1}
                                isOpen={isOpen}
                                openAmount={openAmount}
                                interactive={interactive}
                                onToggleOpen={onToggleOpen}
                                itemOpacity={itemOpacity}
                                itemTransparent={itemTransparent}
                            />
                        </group>
                    ))}

                    <mesh geometry={roofGeo} position={[0, roofBottomY, 0]} castShadow>
                        <meshStandardMaterial
                            color={bayRoofColor}
                            roughness={0.85}
                            opacity={itemOpacity}
                            transparent={itemTransparent}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    <mesh geometry={sillGeo} position={[0, sillBottomY - sillT, 0]} castShadow receiveShadow>
                        <meshStandardMaterial
                            color={bayStoneDark}
                            roughness={0.75}
                            opacity={itemOpacity}
                            transparent={itemTransparent}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
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
                </group>
            )
        }

        default:
            return (
                <group position={basePos} rotation={groupRot}>
                    <OuterFrame width={frameWidth} height={frameHeight} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <group position={[0, 0, frameFrontZ]}>
                        <WindowGlass width={innerW} height={innerH} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    </group>
                </group>
            )
    }
}

const bayStoneDark = '#8A857A'
const bayRoofColor = '#3A3733'
