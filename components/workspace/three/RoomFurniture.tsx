'use client'

import { detectRoomType, getRoomBounds, getRoomCenter } from '@/lib/workspace/sceneBuilder'
import type { SceneRoom } from '@/types/workspace'

type Props = { room: SceneRoom }

function Box({
    pos, size, color, roughness = 0.8, metalness = 0.0,
}: {
    pos: [number, number, number]; size: [number, number, number]
    color: string; roughness?: number; metalness?: number
}) {
    return (
        <mesh position={pos} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
    )
}

function Cyl({ pos, r, h, color, roughness = 0.8 }: {
    pos: [number, number, number]; r: number; h: number; color: string; roughness?: number
}) {
    return (
        <mesh position={pos} castShadow receiveShadow>
            <cylinderGeometry args={[r, r, h, 16]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={0} />
        </mesh>
    )
}

function Sphere({ pos, r, color, roughness = 0.9 }: {
    pos: [number, number, number]; r: number; color: string; roughness?: number
}) {
    return (
        <mesh position={pos} castShadow receiveShadow>
            <sphereGeometry args={[r, 12, 12]} />
            <meshStandardMaterial color={color} roughness={roughness} />
        </mesh>
    )
}

function Rug({ pos, w, d, color }: {
    pos: [number, number, number]; w: number; d: number; color: string
}) {
    return (
        <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[w, d]} />
            <meshStandardMaterial color={color} roughness={0.98} />
        </mesh>
    )
}

// ── Staircase ─────────────────────────────────────────────────────────────────

function StaircaseFurniture({ bounds }: { bounds: ReturnType<typeof getRoomBounds> }) {
    const { minX, maxX, minZ, maxZ, width, depth } = bounds
    const stepCount = 12
    const stepH = 0.18   // riser height
    const stepD = depth / stepCount  // tread depth
    const stepW = width * 0.85

    // Stairs run north→south (minZ → maxZ), rising from y=0 to full height
    const startX = minX + (width - stepW) / 2

    const steps = Array.from({ length: stepCount }, (_, i) => {
        const y = (i + 1) * stepH
        const z = minZ + i * stepD + stepD / 2
        return { y, z, i }
    })

    // Side stringers
    const totalH = stepCount * stepH

    return (
        <group>
            {/* Steps */}
            {steps.map(({ y, z, i }) => (
                <group key={`step_${i}`}>
                    {/* Tread */}
                    <Box
                        pos={[startX + stepW / 2, y - stepH / 2 + 0.02, z]}
                        size={[stepW, 0.04, stepD - 0.01]}
                        color="#D8CEBC"
                        roughness={0.55}
                    />
                    {/* Riser */}
                    <Box
                        pos={[startX + stepW / 2, y - stepH / 2, z - stepD / 2 + 0.01]}
                        size={[stepW, stepH - 0.04, 0.03]}
                        color="#C8BEA8"
                        roughness={0.7}
                    />
                </group>
            ))}

            {/* Left stringer */}
            <Box
                pos={[startX + 0.04, totalH / 2, (minZ + maxZ) / 2]}
                size={[0.08, totalH + 0.08, depth]}
                color="#B8A888"
                roughness={0.6}
            />
            {/* Right stringer */}
            <Box
                pos={[startX + stepW - 0.04, totalH / 2, (minZ + maxZ) / 2]}
                size={[0.08, totalH + 0.08, depth]}
                color="#B8A888"
                roughness={0.6}
            />

            {/* Handrail left */}
            <Box
                pos={[startX + 0.04, totalH + 0.45, (minZ + maxZ) / 2]}
                size={[0.06, 0.06, depth + 0.2]}
                color="#8B7355"
                roughness={0.4}
                metalness={0.1}
            />
            {/* Handrail right */}
            <Box
                pos={[startX + stepW - 0.04, totalH + 0.45, (minZ + maxZ) / 2]}
                size={[0.06, 0.06, depth + 0.2]}
                color="#8B7355"
                roughness={0.4}
                metalness={0.1}
            />

            {/* Balusters — every other step */}
            {steps.filter((_, i) => i % 2 === 0).map(({ z, i }) => (
                <group key={`bal_${i}`}>
                    <Box
                        pos={[startX + 0.04, (i + 1) * stepH * 0.5 + 0.2, z]}
                        size={[0.04, (i + 1) * stepH + 0.4, 0.04]}
                        color="#C0B090"
                        roughness={0.5}
                    />
                    <Box
                        pos={[startX + stepW - 0.04, (i + 1) * stepH * 0.5 + 0.2, z]}
                        size={[0.04, (i + 1) * stepH + 0.4, 0.04]}
                        color="#C0B090"
                        roughness={0.5}
                    />
                </group>
            ))}
        </group>
    )
}

// ── Living — updated to light/modern palette matching the floor plan ──────────

function LivingFurniture({ cx, cz }: { cx: number; cz: number }) {
    return (
        <group>
            {/* Sofa — light warm grey like the floor plan */}
            <Box pos={[cx, 0.22, cz + 0.9]} size={[2.2, 0.42, 0.92]} color="#C8C0B0" />
            <Box pos={[cx, 0.56, cz + 1.30]} size={[2.2, 0.50, 0.14]} color="#B8B0A0" />
            <Box pos={[cx - 1.05, 0.42, cz + 0.9]} size={[0.14, 0.42, 0.92]} color="#B8B0A0" />
            <Box pos={[cx + 1.05, 0.42, cz + 0.9]} size={[0.14, 0.42, 0.92]} color="#B8B0A0" />
            {/* Cushions */}
            <Box pos={[cx - 0.45, 0.46, cz + 0.80]} size={[0.72, 0.10, 0.62]} color="#D4CCC0" roughness={0.9} />
            <Box pos={[cx + 0.45, 0.46, cz + 0.80]} size={[0.72, 0.10, 0.62]} color="#D4CCC0" roughness={0.9} />

            {/* Marble coffee table */}
            <Box pos={[cx, 0.36, cz - 0.05]} size={[1.2, 0.05, 0.65]} color="#EAE6E0" roughness={0.15} metalness={0.05} />
            <Box pos={[cx - 0.52, 0.18, cz - 0.05]} size={[0.05, 0.36, 0.05]} color="#D0CBC2" />
            <Box pos={[cx + 0.52, 0.18, cz - 0.05]} size={[0.05, 0.36, 0.05]} color="#D0CBC2" />
            <Box pos={[cx - 0.52, 0.18, cz + 0.22]} size={[0.05, 0.36, 0.05]} color="#D0CBC2" />
            <Box pos={[cx + 0.52, 0.18, cz + 0.22]} size={[0.05, 0.36, 0.05]} color="#D0CBC2" />

            {/* Armchair */}
            <Box pos={[cx + 1.4, 0.22, cz - 0.1]} size={[0.80, 0.42, 0.80]} color="#B8B0A2" />
            <Box pos={[cx + 1.4, 0.52, cz + 0.30]} size={[0.80, 0.48, 0.12]} color="#A8A098" />

            {/* TV unit — dark walnut */}
            <Box pos={[cx - 0.2, 0.20, cz - 1.4]} size={[1.8, 0.40, 0.42]} color="#3A2E22" />
            <Box pos={[cx - 0.2, 0.68, cz - 1.43]} size={[1.4, 0.72, 0.05]} color="#0D0D0D" roughness={0.04} />

            {/* Plant */}
            <Cyl pos={[cx - 1.6, 0.22, cz - 1.1]} r={0.14} h={0.44} color="#5C4A2A" />
            <Sphere pos={[cx - 1.6, 0.60, cz - 1.1]} r={0.26} color="#4A8A3A" roughness={0.9} />

            {/* Area rug — large grey */}
            <Rug pos={[cx, 0.003, cz + 0.35]} w={2.6} d={2.0} color="#B0A898" />
        </group>
    )
}

// ── Dining — round table like the floor plan ──────────────────────────────────

function DiningFurniture({ cx, cz }: { cx: number; cz: number }) {
    return (
        <group>
            {/* Round marble table */}
            <mesh position={[cx, 0.38, cz]} castShadow receiveShadow>
                <cylinderGeometry args={[0.75, 0.75, 0.05, 32]} />
                <meshStandardMaterial color="#EAE6E0" roughness={0.15} metalness={0.05} />
            </mesh>
            {/* Table pedestal */}
            <Cyl pos={[cx, 0.19, cz]} r={0.08} h={0.38} color="#C8C0B0" roughness={0.3} />

            {/* 6 chairs around round table */}
            {Array.from({ length: 6 }, (_, i) => {
                const angle = (i / 6) * Math.PI * 2
                const r = 1.0
                const cx2 = cx + Math.sin(angle) * r
                const cz2 = cz + Math.cos(angle) * r
                const rotY = -angle
                return (
                    <group key={`dc_${i}`} position={[cx2, 0, cz2]} rotation={[0, rotY, 0]}>
                        <Box pos={[0, 0.22, 0]} size={[0.44, 0.04, 0.44]} color="#C0B8A8" />
                        <Box pos={[0, 0.52, 0.22]} size={[0.44, 0.52, 0.05]} color="#B0A898" />
                        <Box pos={[-0.18, 0.11, -0.18]} size={[0.04, 0.22, 0.04]} color="#A09080" />
                        <Box pos={[+0.18, 0.11, -0.18]} size={[0.04, 0.22, 0.04]} color="#A09080" />
                        <Box pos={[-0.18, 0.11, +0.18]} size={[0.04, 0.22, 0.04]} color="#A09080" />
                        <Box pos={[+0.18, 0.11, +0.18]} size={[0.04, 0.22, 0.04]} color="#A09080" />
                    </group>
                )
            })}

            {/* Plant */}
            <Cyl pos={[cx + 1.4, 0.22, cz - 0.8]} r={0.13} h={0.44} color="#5C4A2A" />
            <Sphere pos={[cx + 1.4, 0.60, cz - 0.8]} r={0.24} color="#4A8A3A" roughness={0.9} />

            {/* Rug */}
            <Rug pos={[cx, 0.003, cz]} w={2.4} d={2.4} color="#A89880" />
        </group>
    )
}

// ── Kitchen — island style like the floor plan ────────────────────────────────

function KitchenFurniture({ cx, cz, bounds }: {
    cx: number; cz: number; bounds: ReturnType<typeof getRoomBounds>
}) {
    const { minX, maxX, minZ, maxZ, width, depth } = bounds
    const cH = 0.92
    const cD = 0.62

    return (
        <group>
            {/* North wall cabinets */}
            <Box pos={[cx, cH / 2, minZ + cD / 2 + 0.08]} size={[width - 0.18, cH, cD]} color="#D8D0C4" roughness={0.3} />
            {/* Marble countertop */}
            <Box pos={[cx, cH + 0.03, minZ + cD / 2 + 0.08]} size={[width - 0.18, 0.05, cD]} color="#EAE6E0" roughness={0.15} metalness={0.04} />

            {/* Island */}
            <Box pos={[cx, cH / 2, cz + 0.2]} size={[1.4, cH, 0.8]} color="#C8C0B0" roughness={0.3} />
            <Box pos={[cx, cH + 0.03, cz + 0.2]} size={[1.4, 0.05, 0.8]} color="#EAE6E0" roughness={0.15} metalness={0.04} />

            {/* Island bar stools */}
            {([-0.45, 0.45] as number[]).map((ox, i) => (
                <group key={`stool_${i}`}>
                    <Box pos={[cx + ox, 0.55, cz + 0.8]} size={[0.36, 0.06, 0.36]} color="#C0B8A8" />
                    <Cyl pos={[cx + ox, 0.28, cz + 0.8]} r={0.04} h={0.55} color="#A0A0A0" roughness={0.3} />
                </group>
            ))}

            {/* Upper cabinets */}
            <Box pos={[cx, 1.78, minZ + 0.22]} size={[width - 0.25, 0.58, 0.32]} color="#D0C8BC" roughness={0.3} />

            {/* Sink in island */}
            <Box pos={[cx + 0.25, cH + 0.05, cz + 0.2]} size={[0.5, 0.07, 0.36]} color="#B0B0B0" roughness={0.2} metalness={0.4} />

            {/* Fridge */}
            <Box pos={[maxX - 0.36, 0.95, minZ + 0.36]} size={[0.68, 1.9, 0.68]} color="#D8D8D8" roughness={0.22} metalness={0.2} />
        </group>
    )
}

// ── Bedroom — matches floor plan ──────────────────────────────────────────────

function BedroomFurniture({ cx, cz, bounds }: {
    cx: number; cz: number; bounds: ReturnType<typeof getRoomBounds>
}) {
    const { minZ } = bounds
    return (
        <group>
            {/* Bed frame */}
            <Box pos={[cx, 0.14, cz + 0.35]} size={[1.7, 0.28, 2.1]} color="#4A3A2E" />
            {/* Mattress */}
            <Box pos={[cx, 0.33, cz + 0.35]} size={[1.58, 0.20, 1.95]} color="#EDE8E0" roughness={0.95} />
            {/* Headboard — upholstered grey */}
            <Box pos={[cx, 0.72, cz - 0.65]} size={[1.7, 0.80, 0.12]} color="#8A8280" />
            {/* Pillows */}
            <Box pos={[cx - 0.38, 0.48, cz - 0.52]} size={[0.58, 0.12, 0.40]} color="#F0EBE4" roughness={0.9} />
            <Box pos={[cx + 0.38, 0.48, cz - 0.52]} size={[0.58, 0.12, 0.40]} color="#F0EBE4" roughness={0.9} />
            {/* Duvet */}
            <Box pos={[cx, 0.46, cz + 0.62]} size={[1.52, 0.10, 1.18]} color="#E8E0D4" roughness={0.95} />

            {/* Bedside tables — light oak */}
            <Box pos={[cx - 1.08, 0.30, cz - 0.45]} size={[0.50, 0.60, 0.44]} color="#C8B898" />
            <Box pos={[cx + 1.08, 0.30, cz - 0.45]} size={[0.50, 0.60, 0.44]} color="#C8B898" />
            {/* Lamps */}
            <Cyl pos={[cx - 1.08, 0.68, cz - 0.45]} r={0.09} h={0.30} color="#D8C8A8" roughness={0.5} />
            <Cyl pos={[cx + 1.08, 0.68, cz - 0.45]} r={0.09} h={0.30} color="#D8C8A8" roughness={0.5} />
            <Sphere pos={[cx - 1.08, 0.88, cz - 0.45]} r={0.12} color="#FFE8C0" roughness={0.4} />
            <Sphere pos={[cx + 1.08, 0.88, cz - 0.45]} r={0.12} color="#FFE8C0" roughness={0.4} />

            {/* Wardrobe — dark walnut like floor plan */}
            <Box pos={[cx, 0.95, minZ + 0.36]} size={[1.9, 1.9, 0.62]} color="#3A2E22" />
            <Box pos={[cx - 0.47, 0.95, minZ + 0.68]} size={[0.02, 1.6, 0.02]} color="#5C4A38" />

            {/* Rug — grey like floor plan */}
            <Rug pos={[cx, 0.003, cz + 0.9]} w={1.9} d={1.35} color="#A8A098" />
        </group>
    )
}

// ── Bathroom ──────────────────────────────────────────────────────────────────

function BathroomFurniture({ cx, cz, bounds }: {
    cx: number; cz: number; bounds: ReturnType<typeof getRoomBounds>
}) {
    const { minX, maxX, minZ, maxZ } = bounds
    const tubW = 0.82, tubH = 0.56, tubD = 1.6
    const tubX = minX + 0.55
    const waterY = tubH - 0.08

    return (
        <group>
            {/* Freestanding tub — like the floor plan (centered, oval-ish) */}
            <Box pos={[tubX, tubH / 2, cz]} size={[tubW, tubH, tubD]} color="#F5F3EE" roughness={0.12} />
            <mesh position={[tubX, waterY, cz]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[tubW - 0.2, tubD - 0.22]} />
                <meshStandardMaterial color="#A8D8E8" roughness={0.02} metalness={0.08} transparent opacity={0.88} />
            </mesh>

            {/* Shower enclosure — glass panels */}
            <Box pos={[maxX - 0.9, 1.0, cz + 0.8]} size={[0.03, 2.0, 1.4]} color="#C8D8E4" roughness={0.05} metalness={0.1} />
            <Box pos={[maxX - 0.22, 1.0, cz + 0.1]} size={[1.36, 2.0, 0.03]} color="#C8D8E4" roughness={0.05} metalness={0.1} />

            {/* Vanity — wall-mounted like floor plan */}
            <Box pos={[cx + 0.5, 0.82, maxZ - 0.28]} size={[1.2, 0.10, 0.50]} color="#EAE6E0" roughness={0.2} metalness={0.06} />
            <Box pos={[cx + 0.5, 0.42, maxZ - 0.28]} size={[1.2, 0.84, 0.50]} color="#D8D4CC" roughness={0.3} />
            {/* Double sink */}
            <Box pos={[cx + 0.1, 0.88, maxZ - 0.27]} size={[0.38, 0.08, 0.36]} color="#C0C0C0" roughness={0.15} metalness={0.3} />
            <Box pos={[cx + 0.9, 0.88, maxZ - 0.27]} size={[0.38, 0.08, 0.36]} color="#C0C0C0" roughness={0.15} metalness={0.3} />
            {/* Mirror */}
            <Box pos={[cx + 0.5, 1.42, maxZ - 0.06]} size={[1.1, 0.70, 0.03]} color="#C8D8E0" roughness={0.04} metalness={0.15} />

            {/* Toilet */}
            <Box pos={[maxX - 0.30, 0.22, minZ + 0.40]} size={[0.46, 0.44, 0.68]} color="#EEEEEE" roughness={0.2} />
            <Box pos={[maxX - 0.30, 0.52, minZ + 0.14]} size={[0.38, 0.24, 0.18]} color="#E8E8E8" roughness={0.2} />
        </group>
    )
}

// ── Closet ────────────────────────────────────────────────────────────────────

function ClosetFurniture({ bounds }: { bounds: ReturnType<typeof getRoomBounds> }) {
    const { minX, maxX, minZ, maxZ, width, depth } = bounds
    return (
        <group>
            {/* Full-width wardrobe along north wall */}
            <Box pos={[(minX + maxX) / 2, 0.95, minZ + 0.32]} size={[width - 0.1, 1.9, 0.58]} color="#3A2E22" />
            {/* Wardrobe doors */}
            {Array.from({ length: Math.floor(width / 0.6) }, (_, i) => (
                <Box
                    key={`wd_${i}`}
                    pos={[minX + 0.3 + i * 0.6, 0.95, minZ + 0.62]}
                    size={[0.58, 1.88, 0.02]}
                    color="#C8B898"
                    roughness={0.3}
                />
            ))}
            {/* Shoe shelf along south wall */}
            <Box pos={[(minX + maxX) / 2, 0.25, maxZ - 0.22]} size={[width - 0.1, 0.50, 0.40]} color="#4A3828" />
            <Box pos={[(minX + maxX) / 2, 0.52, maxZ - 0.22]} size={[width - 0.1, 0.04, 0.40]} color="#6A5040" />
        </group>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function RoomFurniture({ room }: Props) {
    const bounds = getRoomBounds(room)
    const center = getRoomCenter(room)
    const type = detectRoomType(room.name)

    if (bounds.width < 1.2 || bounds.depth < 1.2) return null

    const { x: cx, z: cz } = center

    switch (type) {
        case 'living': return <LivingFurniture cx={cx} cz={cz} />
        case 'dining': return <DiningFurniture cx={cx} cz={cz} />
        case 'kitchen': return <KitchenFurniture cx={cx} cz={cz} bounds={bounds} />
        case 'bedroom': return <BedroomFurniture cx={cx} cz={cz} bounds={bounds} />
        case 'bathroom': return <BathroomFurniture cx={cx} cz={cz} bounds={bounds} />
        case 'staircase': return <StaircaseFurniture bounds={bounds} />
        case 'hallway': return null
        case 'utility': return null
        default:
            // Closet detected via name
            if (room.name.toLowerCase().includes('closet')) {
                return <ClosetFurniture bounds={bounds} />
            }
            return null
    }
}