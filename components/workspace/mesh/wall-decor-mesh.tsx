import * as THREE from 'three'
import { PlacedWallDecor } from "../Tools/constants"

export function WallDecorMesh({ decor, angle, basePos }: {
    decor: PlacedWallDecor
    angle: number
    basePos: [number, number, number]
}) {
    const groupRot: [number, number, number] = [0, -angle, 0]
    const rawWidth = Number.isFinite(decor.width) && decor.width > 0 ? decor.width : 1
    const scale = Number.isFinite(decor.scale) && (decor.scale ?? 0) > 0 ? decor.scale! : 1
    const w = rawWidth * scale

    switch (decor.type) {
        case 'led_strip': {
            const stripH = 0.04
            const stripD = 0.03
            return (
                <group position={basePos} rotation={groupRot}>
                    {/* Emissive glowing strip */}
                    <mesh position={[0, 0, stripD / 2 + 0.002]}>
                        <boxGeometry args={[w * 0.96, stripH * 0.55, 0.008]} />
                        <meshStandardMaterial
                            color="#FFE5A8"
                            emissive="#FFD98A"
                            emissiveIntensity={2.2}
                            roughness={0.3}
                            toneMapped={false}
                        />
                    </mesh>
                    {/* Soft glow halo — transparent additive-ish plane */}
                    <mesh position={[0, -0.06, 0.01]} rotation={[0, 0, 0]}>
                        <planeGeometry args={[w * 1.15, 0.22]} />
                        <meshStandardMaterial
                            color="#FFD98A"
                            emissive="#FFD98A"
                            emissiveIntensity={0.9}
                            transparent
                            opacity={0.18}
                            depthWrite={false}
                            toneMapped={false}
                        />
                    </mesh>
                    <pointLight
                        position={[0, -0.05, 0.05]}
                        color="#FFD98A"
                        intensity={0.35}
                        distance={1.8}
                        decay={2}
                    />
                </group>
            )
        }

        case 'wall_panel_pvc': {
            const h = 1.4 * (decor.scale ?? 1)
            const panelT = 0.025
            const grooveCount = Math.max(3, Math.round(w * 4))
            const grooves: React.ReactNode[] = []
            for (let i = 1; i < grooveCount; i++) {
                const gx = -w / 2 + (w / grooveCount) * i
                grooves.push(
                    <mesh key={i} position={[gx, 0, panelT / 2 + 0.001]}>
                        <boxGeometry args={[0.006, h * 0.96, 0.006]} />
                        <meshStandardMaterial color="#C9C4B8" roughness={0.5} />
                    </mesh>
                )
            }
            return (
                <group position={basePos} rotation={groupRot}>
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[w, h, panelT]} />
                        <meshStandardMaterial color="#E4DDCF" roughness={0.55} />
                    </mesh>
                    {grooves}
                </group>
            )
        }

        case 'led_tv': {
            const h = w * 0.58 // roughly 16:9-ish proportions relative to width
            const bodyT = 0.035
            const bezelT = 0.012

            return (
                <group position={basePos} rotation={groupRot}>
                    {/* Slim body/back panel */}
                    <mesh castShadow>
                        <boxGeometry args={[w, h, bodyT]} />
                        <meshStandardMaterial color="#1A1A1E" roughness={0.4} metalness={0.3} />
                    </mesh>
                    {/* Screen — glossy black, slightly recessed with thin bezel */}
                    <mesh position={[0, 0, bodyT / 2 + 0.003]}>
                        <boxGeometry args={[w - bezelT * 2, h - bezelT * 2, 0.006]} />
                        <meshStandardMaterial color="#050506" roughness={0.08} metalness={0.1} />
                    </mesh>
                    {/* Faint screen reflection highlight */}
                    <mesh position={[-w * 0.18, h * 0.15, bodyT / 2 + 0.008]}>
                        <planeGeometry args={[w * 0.3, h * 0.5]} />
                        <meshStandardMaterial
                            color="#8AA0C8"
                            transparent
                            opacity={0.06}
                            depthWrite={false}
                            roughness={0.1}
                        />
                    </mesh>
                    {/* Small standby LED */}
                    <mesh position={[w * 0.46, -h * 0.44, bodyT / 2 + 0.008]}>
                        <circleGeometry args={[0.006, 12]} />
                        <meshStandardMaterial color="#4ADE80" emissive="#4ADE80" emissiveIntensity={1.5} toneMapped={false} />
                    </mesh>
                    {/* Wall mount bracket, small, centered behind */}
                    <mesh position={[0, 0, -bodyT / 2 - 0.01]}>
                        <boxGeometry args={[w * 0.25, h * 0.3, 0.02]} />
                        <meshStandardMaterial color="#2A2A2E" roughness={0.6} metalness={0.4} />
                    </mesh>
                </group>
            )
        }

        case 'painting':
        default: {
            const h = 0.7 * (decor.scale ?? 1)
            const frameT = 0.04
            const frameW = 0.035 // NEW — visible frame border width, distinct from canvas inset
            const canvasInset = 0.05

            return (
                <group position={basePos} rotation={groupRot}>
                    {/* Outer frame — slightly deeper, warm wood tone */}
                    <mesh castShadow>
                        <boxGeometry args={[w, h, frameT]} />
                        <meshStandardMaterial color="#4A3C2C" roughness={0.5} metalness={0.05} />
                    </mesh>
                    {/* NEW — inner frame lip/molding detail, thin raised edge just inside the outer frame */}
                    <mesh position={[0, 0, frameT / 2 + 0.001]}>
                        <boxGeometry args={[w - frameW, h - frameW, 0.006]} />
                        <meshStandardMaterial color="#6B5842" roughness={0.4} metalness={0.1} />
                    </mesh>
                    {/* Canvas */}
                    <mesh position={[0, 0, frameT / 2 + 0.008]}>
                        <boxGeometry args={[w - canvasInset * 2, h - canvasInset * 2, 0.008]} />
                        <meshStandardMaterial color="#F2EDE4" roughness={0.85} />
                    </mesh>
                    {/* Abstract color blocks */}
                    <mesh position={[-w * 0.15, h * 0.12, frameT / 2 + 0.018]}>
                        <boxGeometry args={[w * 0.35, h * 0.4, 0.004]} />
                        <meshStandardMaterial color="#C97B5F" roughness={0.9} />
                    </mesh>
                    <mesh position={[w * 0.18, -h * 0.15, frameT / 2 + 0.018]}>
                        <boxGeometry args={[w * 0.4, h * 0.3, 0.004]} />
                        <meshStandardMaterial color="#6B8F7A" roughness={0.9} />
                    </mesh>
                    <mesh position={[w * 0.05, h * 0.25, frameT / 2 + 0.02]}>
                        <circleGeometry args={[h * 0.14, 20]} />
                        <meshStandardMaterial color="#D9B166" roughness={0.9} side={THREE.DoubleSide} />
                    </mesh>
                    {/* NEW — thin accent line detail across canvas for extra visual interest */}
                    <mesh position={[0, -h * 0.32, frameT / 2 + 0.02]}>
                        <boxGeometry args={[w - canvasInset * 2 - 0.04, 0.008, 0.003]} />
                        <meshStandardMaterial color="#2A2A2A" roughness={0.7} />
                    </mesh>
                    {/* NEW — small picture-hanging wire hint at top */}
                    <mesh position={[0, h / 2 + 0.015, -frameT / 4]} rotation={[0, 0, 0]}>
                        <torusGeometry args={[0.04, 0.003, 8, 16, Math.PI]} />
                        <meshStandardMaterial color="#8A8A8A" metalness={0.6} roughness={0.3} />
                    </mesh>
                </group>
            )
        }
    }
}