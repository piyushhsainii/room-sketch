import { FURNITURE_FOOTPRINTS, PlacedFurniture } from "../Tools/constants"


export function FurnitureMesh({ f }: { f: PlacedFurniture }) {
    const s = f.scale ?? 1
    const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 }

    return (
        <group position={[f.x, 0, f.z]} rotation={[0, f.rotation, 0]}>
            {f.type === 'sofa' && (
                <group>
                    {/* Base */}
                    <mesh position={[0, 0.20 * s, 0]} castShadow receiveShadow>
                        <boxGeometry args={[2.2 * s, 0.40 * s, 0.92 * s]} />
                        <meshStandardMaterial color="#C8C0B0" roughness={0.85} />
                    </mesh>
                    {/* Back */}
                    <mesh position={[0, 0.58 * s, 0.38 * s]} castShadow>
                        <boxGeometry args={[2.2 * s, 0.52 * s, 0.14 * s]} />
                        <meshStandardMaterial color="#B8B0A0" roughness={0.85} />
                    </mesh>
                    {/* Arms */}
                    <mesh position={[-1.05 * s, 0.42 * s, 0]} castShadow><boxGeometry args={[0.14 * s, 0.40 * s, 0.92 * s]} /><meshStandardMaterial color="#B0A898" roughness={0.8} /></mesh>
                    <mesh position={[1.05 * s, 0.42 * s, 0]} castShadow><boxGeometry args={[0.14 * s, 0.40 * s, 0.92 * s]} /><meshStandardMaterial color="#B0A898" roughness={0.8} /></mesh>
                    {/* Cushions */}
                    <mesh position={[-0.52 * s, 0.44 * s, -0.08 * s]} castShadow><boxGeometry args={[0.82 * s, 0.12 * s, 0.68 * s]} /><meshStandardMaterial color="#D8D0C4" roughness={0.95} /></mesh>
                    <mesh position={[0.52 * s, 0.44 * s, -0.08 * s]} castShadow><boxGeometry args={[0.82 * s, 0.12 * s, 0.68 * s]} /><meshStandardMaterial color="#D8D0C4" roughness={0.95} /></mesh>
                    {/* Legs */}
                    {([-0.95, 0.95] as number[]).flatMap(x => [-0.38, 0.38].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.05 * s, z * s]}><boxGeometry args={[0.07 * s, 0.10 * s, 0.07 * s]} /><meshStandardMaterial color="#6B5B4E" roughness={0.5} metalness={0.1} /></mesh>
                    )))}
                </group>
            )}
            {f.type === 'bed' && (
                <group>
                    {/* Frame */}
                    <mesh position={[0, 0.15 * s, 0]} castShadow receiveShadow><boxGeometry args={[1.7 * s, 0.28 * s, 2.1 * s]} /><meshStandardMaterial color="#4A3A2E" roughness={0.7} /></mesh>
                    {/* Mattress */}
                    <mesh position={[0, 0.34 * s, 0]} castShadow receiveShadow><boxGeometry args={[1.58 * s, 0.22 * s, 1.95 * s]} /><meshStandardMaterial color="#EDE8E0" roughness={0.95} /></mesh>
                    {/* Headboard */}
                    <mesh position={[0, 0.74 * s, -0.92 * s]} castShadow><boxGeometry args={[1.7 * s, 0.82 * s, 0.10 * s]} /><meshStandardMaterial color="#8A8280" roughness={0.7} /></mesh>
                    {/* Footboard */}
                    <mesh position={[0, 0.52 * s, 0.92 * s]} castShadow><boxGeometry args={[1.7 * s, 0.42 * s, 0.08 * s]} /><meshStandardMaterial color="#4A3A2E" roughness={0.7} /></mesh>
                    {/* Pillows */}
                    <mesh position={[-0.38 * s, 0.48 * s, -0.72 * s]} castShadow><boxGeometry args={[0.58 * s, 0.11 * s, 0.38 * s]} /><meshStandardMaterial color="#F0EBE4" roughness={0.9} /></mesh>
                    <mesh position={[0.38 * s, 0.48 * s, -0.72 * s]} castShadow><boxGeometry args={[0.58 * s, 0.11 * s, 0.38 * s]} /><meshStandardMaterial color="#F0EBE4" roughness={0.9} /></mesh>
                    {/* Duvet */}
                    <mesh position={[0, 0.48 * s, 0.35 * s]} castShadow><boxGeometry args={[1.52 * s, 0.10 * s, 1.15 * s]} /><meshStandardMaterial color="#E8E0D4" roughness={0.95} /></mesh>
                </group>
            )}
            {f.type === 'dining_table' && (
                <group>
                    {/* Tabletop */}
                    <mesh position={[0, 0.76 * s, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1.5 * s, 0.05 * s, 1.5 * s]} />
                        <meshStandardMaterial color="#EAE6E0" roughness={0.2} metalness={0.04} />
                    </mesh>
                    {/* Legs */}
                    {([-0.62, 0.62] as number[]).flatMap(x => [-0.62, 0.62].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.38 * s, z * s]} castShadow>
                            <boxGeometry args={[0.06 * s, 0.76 * s, 0.06 * s]} />
                            <meshStandardMaterial color="#C8B898" roughness={0.4} />
                        </mesh>
                    )))}
                </group>
            )}
            {f.type === 'desk' && (
                <group>
                    <mesh position={[0, 0.76 * s, 0]} castShadow receiveShadow><boxGeometry args={[1.4 * s, 0.04 * s, 0.7 * s]} /><meshStandardMaterial color="#C8B898" roughness={0.3} /></mesh>
                    {([-0.62, 0.62] as number[]).flatMap(x => [-0.3, 0.3].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.38 * s, z * s]} castShadow><boxGeometry args={[0.05 * s, 0.76 * s, 0.05 * s]} /><meshStandardMaterial color="#A09080" roughness={0.4} /></mesh>
                    )))}
                    {/* Monitor */}
                    <mesh position={[0, 1.08 * s, -0.22 * s]} castShadow><boxGeometry args={[0.52 * s, 0.30 * s, 0.03 * s]} /><meshStandardMaterial color="#1A1A1A" roughness={0.3} /></mesh>
                    <mesh position={[0, 0.82 * s, -0.22 * s]} castShadow><boxGeometry args={[0.08 * s, 0.12 * s, 0.08 * s]} /><meshStandardMaterial color="#2A2A2A" roughness={0.4} /></mesh>
                </group>
            )}
            {f.type === 'wardrobe' && (
                <group>
                    <mesh position={[0, 0.95 * s, 0]} castShadow receiveShadow><boxGeometry args={[1.9 * s, 1.9 * s, 0.62 * s]} /><meshStandardMaterial color="#3A2E22" roughness={0.6} /></mesh>
                    {/* Door panels */}
                    <mesh position={[-0.48 * s, 0.95 * s, 0.32 * s]}><boxGeometry args={[0.88 * s, 1.82 * s, 0.02 * s]} /><meshStandardMaterial color="#4E3C28" roughness={0.4} /></mesh>
                    <mesh position={[0.48 * s, 0.95 * s, 0.32 * s]}><boxGeometry args={[0.88 * s, 1.82 * s, 0.02 * s]} /><meshStandardMaterial color="#4E3C28" roughness={0.4} /></mesh>
                    {/* Handles */}
                    <mesh position={[-0.08 * s, 0.95 * s, 0.33 * s]}><boxGeometry args={[0.03 * s, 0.12 * s, 0.03 * s]} /><meshStandardMaterial color="#C0A870" roughness={0.2} metalness={0.6} /></mesh>
                    <mesh position={[0.08 * s, 0.95 * s, 0.33 * s]}><boxGeometry args={[0.03 * s, 0.12 * s, 0.03 * s]} /><meshStandardMaterial color="#C0A870" roughness={0.2} metalness={0.6} /></mesh>
                </group>
            )}
            {f.type === 'bathtub' && (
                <group>
                    {/* Outer shell */}
                    <mesh position={[0, 0.28 * s, 0]} castShadow receiveShadow><boxGeometry args={[0.82 * s, 0.56 * s, 1.6 * s]} /><meshStandardMaterial color="#F0EEEA" roughness={0.12} /></mesh>
                    {/* Inner hollow (water surface) */}
                    <mesh position={[0, 0.48 * s, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.60 * s, 1.38 * s]} />
                        <meshStandardMaterial color="#A8D4E0" roughness={0.04} metalness={0.05} transparent opacity={0.85} />
                    </mesh>
                    {/* Tap */}
                    <mesh position={[0, 0.62 * s, -0.72 * s]} castShadow><boxGeometry args={[0.06 * s, 0.15 * s, 0.06 * s]} /><meshStandardMaterial color="#C8C8C8" roughness={0.2} metalness={0.7} /></mesh>
                </group>
            )}
            {f.type === 'toilet' && (
                <group>
                    <mesh position={[0, 0.22 * s, 0]} castShadow receiveShadow><boxGeometry args={[0.46 * s, 0.44 * s, 0.68 * s]} /><meshStandardMaterial color="#EEEEEE" roughness={0.2} /></mesh>
                    <mesh position={[0, 0.52 * s, -0.26 * s]} castShadow><boxGeometry args={[0.38 * s, 0.24 * s, 0.18 * s]} /><meshStandardMaterial color="#E8E8E8" roughness={0.2} /></mesh>
                    {/* Seat */}
                    <mesh position={[0, 0.45 * s, 0.04 * s]}><boxGeometry args={[0.42 * s, 0.04 * s, 0.52 * s]} /><meshStandardMaterial color="#FFFFFF" roughness={0.15} /></mesh>
                </group>
            )}
            {f.type === 'plant' && (
                <group>
                    {/* Pot */}
                    <mesh position={[0, 0.14 * s, 0]} castShadow receiveShadow>
                        <cylinderGeometry args={[0.14 * s, 0.10 * s, 0.28 * s, 16]} />
                        <meshStandardMaterial color="#8B5E3C" roughness={0.7} />
                    </mesh>
                    {/* Soil */}
                    <mesh position={[0, 0.28 * s, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[0.13 * s, 16]} />
                        <meshStandardMaterial color="#3D2B1A" roughness={0.95} />
                    </mesh>
                    {/* Foliage — layered spheres */}
                    <mesh position={[0, 0.50 * s, 0]} castShadow><sphereGeometry args={[0.18 * s, 12, 12]} /><meshStandardMaterial color="#2D7A2D" roughness={0.9} /></mesh>
                    <mesh position={[-0.10 * s, 0.58 * s, 0.06 * s]} castShadow><sphereGeometry args={[0.13 * s, 10, 10]} /><meshStandardMaterial color="#3A9A3A" roughness={0.9} /></mesh>
                    <mesh position={[0.08 * s, 0.62 * s, -0.06 * s]} castShadow><sphereGeometry args={[0.11 * s, 10, 10]} /><meshStandardMaterial color="#259025" roughness={0.9} /></mesh>
                </group>
            )}
            {f.type === 'chair' && (
                <group>
                    {/* Seat */}
                    <mesh position={[0, 0.44 * s, 0]} castShadow receiveShadow><boxGeometry args={[0.50 * s, 0.05 * s, 0.50 * s]} /><meshStandardMaterial color="#C0B8A8" roughness={0.7} /></mesh>
                    {/* Back */}
                    <mesh position={[0, 0.72 * s, 0.22 * s]} castShadow><boxGeometry args={[0.50 * s, 0.52 * s, 0.05 * s]} /><meshStandardMaterial color="#B0A898" roughness={0.7} /></mesh>
                    {/* Legs */}
                    {([-0.20, 0.20] as number[]).flatMap(x => [-0.20, 0.20].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.22 * s, z * s]} castShadow><boxGeometry args={[0.04 * s, 0.44 * s, 0.04 * s]} /><meshStandardMaterial color="#8A7868" roughness={0.5} /></mesh>
                    )))}
                </group>
            )}
            {f.type === 'coffee_table' && (
                <group>
                    {/* Top */}
                    <mesh position={[0, 0.38 * s, 0]} castShadow receiveShadow><boxGeometry args={[1.2 * s, 0.05 * s, 0.65 * s]} /><meshStandardMaterial color="#EAE6E0" roughness={0.15} metalness={0.05} /></mesh>
                    {/* Shelf */}
                    <mesh position={[0, 0.18 * s, 0]} castShadow receiveShadow><boxGeometry args={[1.1 * s, 0.03 * s, 0.55 * s]} /><meshStandardMaterial color="#D8D4CC" roughness={0.3} /></mesh>
                    {/* Legs */}
                    {([-0.52, 0.52] as number[]).flatMap(x => [-0.28, 0.28].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.18 * s, z * s]} castShadow><boxGeometry args={[0.04 * s, 0.36 * s, 0.04 * s]} /><meshStandardMaterial color="#C0B090" roughness={0.3} /></mesh>
                    )))}
                </group>
            )}
            {f.type === 'single_sofa' && (
                <group>
                    {/* Base */}
                    <mesh position={[0, 0.21 * s, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.95 * s, 0.42 * s, 0.9 * s]} />
                        <meshStandardMaterial color="#AE9678" roughness={0.85} />
                    </mesh>
                    {/* Back */}
                    <mesh position={[0, 0.60 * s, 0.36 * s]} castShadow>
                        <boxGeometry args={[0.95 * s, 0.5 * s, 0.14 * s]} />
                        <meshStandardMaterial color="#9E876A" roughness={0.85} />
                    </mesh>
                    {/* Arms */}
                    <mesh position={[-0.44 * s, 0.44 * s, 0]} castShadow><boxGeometry args={[0.12 * s, 0.42 * s, 0.9 * s]} /><meshStandardMaterial color="#96826A" roughness={0.8} /></mesh>
                    <mesh position={[0.44 * s, 0.44 * s, 0]} castShadow><boxGeometry args={[0.12 * s, 0.42 * s, 0.9 * s]} /><meshStandardMaterial color="#96826A" roughness={0.8} /></mesh>
                    {/* Cushion */}
                    <mesh position={[0, 0.46 * s, -0.06 * s]} castShadow><boxGeometry args={[0.68 * s, 0.1 * s, 0.66 * s]} /><meshStandardMaterial color="#DCCFB8" roughness={0.95} /></mesh>
                    {/* Legs */}
                    {([-0.38, 0.38] as number[]).flatMap(x => [-0.38, 0.38].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.05 * s, z * s]}><boxGeometry args={[0.06 * s, 0.1 * s, 0.06 * s]} /><meshStandardMaterial color="#6B5B4E" roughness={0.5} metalness={0.1} /></mesh>
                    )))}
                </group>
            )}
            {f.type === 'lamp' && (
                <group>
                    {/* Base */}
                    <mesh position={[0, 0.02 * s, 0]} castShadow>
                        <cylinderGeometry args={[0.12 * s, 0.14 * s, 0.04 * s, 20]} />
                        <meshStandardMaterial color="#2A2A28" roughness={0.5} metalness={0.3} />
                    </mesh>
                    {/* Pole */}
                    <mesh position={[0, 0.7 * s, 0]} castShadow>
                        <cylinderGeometry args={[0.015 * s, 0.015 * s, 1.3 * s, 10]} />
                        <meshStandardMaterial color="#3A3A38" roughness={0.5} metalness={0.4} />
                    </mesh>
                    {/* Shade */}
                    <mesh position={[0, 1.42 * s, 0]} castShadow>
                        <coneGeometry args={[0.22 * s, 0.32 * s, 20, 1, true]} />
                        <meshStandardMaterial color="#F0E6D0" roughness={0.9} side={2} emissive="#FFEBC0" emissiveIntensity={0.15} />
                    </mesh>
                </group>
            )}
            {f.type === 'mirror' && (
                <group position={[0, 0.9 * s, 0]}>
                    {/* Frame */}
                    <mesh castShadow>
                        <boxGeometry args={[0.7 * s, 0.9 * s, 0.04 * s]} />
                        <meshStandardMaterial color="#D8D4CC" roughness={0.6} />
                    </mesh>
                    {/* Glass */}
                    <mesh position={[0, 0, 0.023 * s]}>
                        <boxGeometry args={[0.64 * s, 0.84 * s, 0.01 * s]} />
                        <meshStandardMaterial color="#C8DCE8" roughness={0.02} metalness={0.6} />
                    </mesh>
                </group>
            )}
            {f.type === 'kitchen_stove' && (
                <group>
                    {/* Body */}
                    <mesh position={[0, 0.45 * s, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.6 * s, 0.9 * s, 0.6 * s]} />
                        <meshStandardMaterial color="#E4E4E0" roughness={0.4} metalness={0.15} />
                    </mesh>
                    {/* Burners */}
                    {([-0.14, 0.14] as number[]).flatMap(x => [-0.14, 0.14].map(z => (
                        <mesh key={`${x}${z}`} position={[x * s, 0.905 * s, z * s]}>
                            <cylinderGeometry args={[0.09 * s, 0.09 * s, 0.01 * s, 20]} />
                            <meshStandardMaterial color="#1A1A1A" roughness={0.3} metalness={0.5} />
                        </mesh>
                    )))}
                    {/* Oven door */}
                    <mesh position={[0, 0.32 * s, 0.305 * s]}>
                        <boxGeometry args={[0.5 * s, 0.5 * s, 0.02 * s]} />
                        <meshStandardMaterial color="#B8B8B4" roughness={0.3} metalness={0.3} />
                    </mesh>
                </group>
            )}
            {f.type === 'chimney' && (
                <group position={[0, 1.5 * s, 0]}>
                    {/* Duct */}
                    <mesh castShadow>
                        <boxGeometry args={[0.45 * s, 0.55 * s, 0.25 * s]} />
                        <meshStandardMaterial color="#5A5D62" roughness={0.4} metalness={0.4} />
                    </mesh>
                    {/* Canopy */}
                    <mesh position={[0, 0.275 * s + 0.05 * s, 0]} castShadow>
                        <boxGeometry args={[0.9 * s, 0.1 * s, 0.55 * s]} />
                        <meshStandardMaterial color="#3E4044" roughness={0.35} metalness={0.5} />
                    </mesh>
                </group>
            )}
            {f.type === 'commode' && (
                <group>
                    <mesh position={[0, 0.4 * s, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.5 * s, 0.8 * s, 0.45 * s]} />
                        <meshStandardMaterial color="#EFEFEA" roughness={0.5} />
                    </mesh>
                    {/* Countertop lip */}
                    <mesh position={[0, 0.82 * s, 0]}>
                        <boxGeometry args={[0.54 * s, 0.04 * s, 0.49 * s]} />
                        <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
                    </mesh>
                    {/* Handle */}
                    <mesh position={[0, 0.4 * s, 0.226 * s]}>
                        <boxGeometry args={[0.16 * s, 0.03 * s, 0.02 * s]} />
                        <meshStandardMaterial color="#C0A870" roughness={0.2} metalness={0.6} />
                    </mesh>
                </group>
            )}
            {f.type === 'shower' && (
                <group>
                    {/* Tray */}
                    <mesh position={[0, 0.01 * s, 0]} receiveShadow>
                        <boxGeometry args={[0.9 * s, 0.02 * s, 0.9 * s]} />
                        <meshStandardMaterial color="#DCE6E8" roughness={0.15} metalness={0.05} />
                    </mesh>
                    {/* Glass panels */}
                    <mesh position={[-0.445 * s, 1.0 * s, 0]}>
                        <boxGeometry args={[0.02 * s, 2.0 * s, 0.9 * s]} />
                        <meshStandardMaterial color="#BFD8DE" transparent opacity={0.25} roughness={0.05} metalness={0.1} />
                    </mesh>
                    <mesh position={[0, 1.0 * s, -0.445 * s]}>
                        <boxGeometry args={[0.9 * s, 2.0 * s, 0.02 * s]} />
                        <meshStandardMaterial color="#BFD8DE" transparent opacity={0.25} roughness={0.05} metalness={0.1} />
                    </mesh>
                    {/* Shower head */}
                    <mesh position={[0, 1.9 * s, 0]} castShadow>
                        <cylinderGeometry args={[0.06 * s, 0.06 * s, 0.08 * s, 16]} />
                        <meshStandardMaterial color="#B9B9B4" metalness={0.6} roughness={0.3} />
                    </mesh>
                </group>
            )}
            {f.type === 'shoe_rack' && (
                <group>
                    <mesh position={[-0.43 * s, 0.425 * s, 0]}>
                        <boxGeometry args={[0.04 * s, 0.85 * s, 0.32 * s]} />
                        <meshStandardMaterial color="#6B5138" roughness={0.7} />
                    </mesh>
                    <mesh position={[0.43 * s, 0.425 * s, 0]}>
                        <boxGeometry args={[0.04 * s, 0.85 * s, 0.32 * s]} />
                        <meshStandardMaterial color="#6B5138" roughness={0.7} />
                    </mesh>
                    {[0, 1, 2].map(i => (
                        <mesh key={i} position={[0, (0.85 / 3) * (i + 0.5) * s, 0]} castShadow>
                            <boxGeometry args={[0.86 * s, 0.03 * s, 0.32 * s]} />
                            <meshStandardMaterial color="#7A5F42" roughness={0.7} />
                        </mesh>
                    ))}
                </group>
            )}
            {f.type === 'led_strip' && (
                <group>
                    {/* Mounting channel */}
                    <mesh position={[0, 2.4 * s, 0]} castShadow>
                        <boxGeometry args={[1.2 * s, 0.02 * s, 0.03 * s]} />
                        <meshStandardMaterial color="#E8E8E4" roughness={0.5} />
                    </mesh>
                    {/* Glowing strip */}
                    <mesh position={[0, 2.4 * s, 0.018 * s]}>
                        <boxGeometry args={[1.15 * s, 0.012 * s, 0.006 * s]} />
                        <meshStandardMaterial
                            color="#FFF4D6"
                            emissive="#FFEBA8"
                            emissiveIntensity={1.4}
                            roughness={0.3}
                            toneMapped={false}
                        />
                    </mesh>
                    {/* Soft glow halo — subtle backlight bloom effect */}
                    <mesh position={[0, 2.4 * s, -0.01 * s]}>
                        <boxGeometry args={[1.25 * s, 0.05 * s, 0.02 * s]} />
                        <meshStandardMaterial
                            color="#FFEBA8"
                            emissive="#FFEBA8"
                            emissiveIntensity={0.5}
                            transparent
                            opacity={0.35}
                            toneMapped={false}
                        />
                    </mesh>
                </group>
            )}

            {f.type === 'wall_panel_pvc' && (
                <group position={[0, 1.2 * s, 0]}>
                    {/* Panel body */}
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[1.2 * s, 2.4 * s, 0.025 * s]} />
                        <meshStandardMaterial color="#E4DDCF" roughness={0.35} metalness={0.02} />
                    </mesh>
                    {/* Vertical groove lines — typical fluted/slat PVC panel look */}
                    {Array.from({ length: 8 }, (_, i) => {
                        const gx = -0.52 * s + (1.04 * s / 7) * i
                        return (
                            <mesh key={i} position={[gx, 0, 0.014 * s]}>
                                <boxGeometry args={[0.012 * s, 2.36 * s, 0.006 * s]} />
                                <meshStandardMaterial color="#D2CABA" roughness={0.4} />
                            </mesh>
                        )
                    })}
                </group>
            )}

            {f.type === 'painting' && (
                <group position={[0, 1.5 * s, 0]}>
                    {/* Frame */}
                    <mesh castShadow>
                        <boxGeometry args={[0.9 * s, 0.7 * s, 0.035 * s]} />
                        <meshStandardMaterial color="#3A2E22" roughness={0.5} />
                    </mesh>
                    {/* Canvas */}
                    <mesh position={[0, 0, 0.019 * s]}>
                        <boxGeometry args={[0.8 * s, 0.6 * s, 0.008 * s]} />
                        <meshStandardMaterial color="#DCD2C0" roughness={0.85} />
                    </mesh>
                    {/* Simple abstract brushstroke blocks so it doesn't read as a blank card */}
                    <mesh position={[-0.16 * s, 0.08 * s, 0.024 * s]}>
                        <boxGeometry args={[0.28 * s, 0.22 * s, 0.004 * s]} />
                        <meshStandardMaterial color="#8B6A4E" roughness={0.9} />
                    </mesh>
                    <mesh position={[0.14 * s, -0.1 * s, 0.024 * s]}>
                        <boxGeometry args={[0.34 * s, 0.16 * s, 0.004 * s]} />
                        <meshStandardMaterial color="#6B7F6B" roughness={0.9} />
                    </mesh>
                </group>
            )}
        </group>
    )
}