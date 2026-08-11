import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { mat } from "../windows/materials";
import { WindowGlass } from "../objects/windows-glass";



const bayStoneColor = '#C9C4B6'
const bayGlassFrame = '#EDEAE2'

function approach(current: React.MutableRefObject<number>, target: number, delta: number, speed = 8) {
    const diff = target - current.current
    if (Math.abs(diff) < 0.001) current.current = target
    else current.current += diff * Math.min(1, delta * speed)
    return current.current
}

export function BayPanel({
    width, height, isDoor, hingeSign, isOpen, openAmount, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    width: number; height: number
    isDoor: boolean; hingeSign: 1 | -1
    isOpen: boolean; openAmount?: number
    interactive?: boolean; onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
}) {
    const stoneT = 0.06
    const sashT = 0.03
    const glassW = width - stoneT * 2 - sashT * 2
    const glassH = height - stoneT * 2 - sashT * 2
    const frameHalfGap = 0.02

    const panelGroupRef = useRef<THREE.Group>(null)
    const frac = useRef(0)
    const maxAngle = hingeSign * (Math.PI / 2.2)
    const target = isOpen ? (openAmount ?? 1) : 0

    useFrame((_, delta) => {
        if (!isDoor) return
        const v = approach(frac, target, delta)
        if (panelGroupRef.current) panelGroupRef.current.rotation.y = v * maxAngle
    })

    function frameFace(z: number) {
        return (
            <group position={[0, 0, z]}>
                <mesh position={[-width / 2 + stoneT / 2, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[stoneT, height, 0.05]} />
                    {mat(bayStoneColor, { roughness: 0.75 }, itemOpacity, itemTransparent)}
                </mesh>
                <mesh position={[width / 2 - stoneT / 2, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[stoneT, height, 0.05]} />
                    {mat(bayStoneColor, { roughness: 0.75 }, itemOpacity, itemTransparent)}
                </mesh>
                <mesh position={[0, height / 2 - stoneT / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[width - stoneT * 2, stoneT, 0.05]} />
                    {mat(bayStoneColor, { roughness: 0.75 }, itemOpacity, itemTransparent)}
                </mesh>
                <mesh position={[0, -height / 2 + stoneT / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[width - stoneT * 2, stoneT, 0.05]} />
                    {mat(bayStoneColor, { roughness: 0.75 }, itemOpacity, itemTransparent)}
                </mesh>
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[width - stoneT * 2, height - stoneT * 2, sashT]} />
                    {mat(bayGlassFrame, { roughness: 0.45 }, itemOpacity, itemTransparent)}
                </mesh>
            </group>
        )
    }

    const inner = (
        <>
            {frameFace(frameHalfGap)}
            {frameFace(-frameHalfGap)}

            <group position={[0, 0, 0]}>
                <WindowGlass width={glassW} height={glassH} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </group>

            {[0.2, -0.05, -0.3].map((f, i) => (
                <mesh key={i} position={[0, glassH * f, frameHalfGap + sashT / 2 + 0.018]}>
                    <boxGeometry args={[glassW * 0.98, 0.012, 0.006]} />
                    {mat(bayGlassFrame, { roughness: 0.4 }, itemOpacity, itemTransparent)}
                </mesh>
            ))}

            {isDoor && (
                <mesh position={[-hingeSign * (width / 2 - stoneT - 0.05), 0, frameHalfGap + sashT / 2 + 0.02]}>
                    <boxGeometry args={[0.015, height * 0.22, 0.015]} />
                    {mat('#8A8A82', { metalness: 0.6, roughness: 0.3 }, itemOpacity, itemTransparent)}
                </mesh>
            )}
        </>
    )

    if (!isDoor) return <group>{inner}</group>

    return (
        <group
            position={[-hingeSign * (width / 2), 0, 0]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            <group ref={panelGroupRef} position={[hingeSign * (width / 2), 0, 0]}>
                {inner}
            </group>
        </group>
    )
}

export function useBayCapGeometry(bayW: number, frontW: number, sideW: number, projectDepth: number, sideAngle: number, thickness: number, overhang: number) {
    return useMemo(() => {
        const cosA = Math.cos(sideAngle)
        const sinA = Math.sin(sideAngle)

        const leftOuterX = -frontW / 2 - sideW * cosA
        const leftOuterZ = -projectDepth + sideW * sinA
        const rightOuterX = frontW / 2 + sideW * cosA
        const rightOuterZ = -projectDepth + sideW * sinA

        const cx = 0
        const cz = 0
        function push(x: number, z: number) {
            const dx = x - cx, dz = z - cz
            const len = Math.hypot(dx, dz) || 1
            return [x + (dx / len) * overhang, z + (dz / len) * overhang] as const
        }

        const clampedLeftX = Math.min(leftOuterX, -(bayW / 2))
        const clampedRightX = Math.max(rightOuterX, bayW / 2)

        const pts = [
            push(clampedLeftX, 0),
            push(clampedLeftX, leftOuterZ),
            push(-frontW / 2, -projectDepth),
            push(frontW / 2, -projectDepth),
            push(clampedRightX, rightOuterZ),
            push(clampedRightX, 0),
        ]

        const shape = new THREE.Shape()
        shape.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
        shape.closePath()

        const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
        geo.rotateX(-Math.PI / 2)
        geo.computeVertexNormals()
        return geo
    }, [bayW, frontW, sideW, projectDepth, sideAngle, thickness, overhang])
}