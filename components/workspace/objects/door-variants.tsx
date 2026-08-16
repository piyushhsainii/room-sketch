import * as THREE from 'three'
import { DoorMat } from './doormat' // adjust path if different
import { EditorOpening } from '../lib/constants';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AluminumMat, GlassConfig, PanoramaGlassFace } from './doors/door-glass';


export const T = 0.045 // panel thickness

// Central material helper — every plain (non-glass) mesh in this file goes
// through this so item-level ghosting (opacity < 1) is applied consistently.
export function m(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}, itemOpacity = 1, itemTransparent = false) {
    return <meshStandardMaterial color={color} {...extra} opacity={itemOpacity} transparent={itemTransparent || !!extra.transparent} />
}

// ── Door knob (lever + rosette + rod), hoisted so it doesn't get torn down
// and rebuilt every time the owning DoorVariant3D re-renders. ──
function DoorKnob({ zSide, hingeSign, itemOpacity, itemTransparent }: {
    zSide: 1 | -1; hingeSign: 1 | -1; itemOpacity: number; itemTransparent: boolean
}) {
    const rosetteZ = zSide * (T / 2 + 0.003)
    const rodLen = 0.045
    const rodZ = zSide * (T / 2 + rodLen / 2)
    const leverZ = zSide * (T / 2 + rodLen)
    const leverX = -hingeSign * 0.06
    const capX = -hingeSign * 0.115
    return (
        <group>
            <mesh position={[0, 0, rosetteZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.028, 0.028, 0.006, 16]} />
                {m('#C9C9C2', { metalness: 0.7, roughness: 0.25 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[0, 0, rodZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.011, 0.011, rodLen, 12]} />
                {m('#B9B9B4', { metalness: 0.6, roughness: 0.3 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[leverX, -0.012, leverZ]} rotation={[0.3, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.009, 0.009, 0.12, 12]} />
                {m('#B9B9B4', { metalness: 0.65, roughness: 0.28 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[capX, -0.03, leverZ]} castShadow>
                <sphereGeometry args={[0.009, 10, 10]} />
                {m('#B9B9B4', { metalness: 0.65, roughness: 0.28 }, itemOpacity, itemTransparent)}
            </mesh>
        </group>
    )
}

function DoorPull({ zSide, width, itemOpacity, itemTransparent }: {
    zSide: 1 | -1; width: number; itemOpacity: number; itemTransparent: boolean
}) {
    const x = width / 2 - 0.08
    const z = zSide * (T / 2 + 0.012)
    return (
        <group>
            <mesh position={[x, 0, z]} castShadow>
                <boxGeometry args={[0.022, 0.22, 0.02]} />
                {m('#B9B9B4', { metalness: 0.65, roughness: 0.28 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[x, 0.09, zSide * (T / 2 + 0.006)]} castShadow>
                <boxGeometry args={[0.022, 0.022, 0.012]} />
                {m('#B9B9B4', { metalness: 0.65, roughness: 0.28 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[x, -0.09, zSide * (T / 2 + 0.006)]} castShadow>
                <boxGeometry args={[0.022, 0.022, 0.012]} />
                {m('#B9B9B4', { metalness: 0.65, roughness: 0.28 }, itemOpacity, itemTransparent)}
            </mesh>
        </group>
    )
}

function DoorHinges({ width, height, hingeSign, itemOpacity, itemTransparent }: {
    width: number; height: number; hingeSign: 1 | -1; itemOpacity: number; itemTransparent: boolean
}) {
    const inset = Math.min(0.05, width * 0.05)
    const hingeX = -hingeSign * (width / 2 - inset)
    const knuckleR = 0.009
    const positions = [0.85, 0.5, 0.15].map(f => (f - 0.5) * height * 0.9)
    return (
        <group>
            {positions.map((y, i) => (
                <group key={i} position={[hingeX, y, 0]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.01, 0.14, 0.07]} />
                        {m('#B9B9B4', { metalness: 0.6, roughness: 0.35 }, itemOpacity, itemTransparent)}
                    </mesh>
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[-hingeSign * 0.008, 0, 0]} castShadow>
                        <cylinderGeometry args={[knuckleR, knuckleR, 0.15, 10]} />
                        {m('#A8A8A2', { metalness: 0.7, roughness: 0.25 }, itemOpacity, itemTransparent)}
                    </mesh>
                </group>
            ))}
        </group>
    )
}

function PanelMolding({ width, height, zSide, itemOpacity, itemTransparent }: {
    width: number; height: number; zSide: 1 | -1; itemOpacity: number; itemTransparent: boolean
}) {
    const margin = Math.min(0.09, width * 0.14, height * 0.06)
    if (width - margin * 2 < 0.15 || height - margin * 2 < 0.3) return null
    const mw = width - margin * 2
    const mh = height - margin * 2
    const midY = height * 0.42
    const upperH = mh - midY
    const lowerH = midY - 0.06
    const frameZ = zSide * (T / 2 + 0.0015)
    const bar = 0.02
    const moldOpacity = 0.35 * itemOpacity

    function rect(w: number, h: number, cy: number, key: string) {
        return (
            <group key={key} position={[0, cy, frameZ]}>
                <mesh position={[0, h / 2 - bar / 2, 0]}><boxGeometry args={[w, bar, 0.003]} /><meshStandardMaterial color="#00000022" transparent opacity={moldOpacity} roughness={0.9} /></mesh>
                <mesh position={[0, -h / 2 + bar / 2, 0]}><boxGeometry args={[w, bar, 0.003]} /><meshStandardMaterial color="#00000022" transparent opacity={moldOpacity} roughness={0.9} /></mesh>
                <mesh position={[-w / 2 + bar / 2, 0, 0]}><boxGeometry args={[bar, h, 0.003]} /><meshStandardMaterial color="#00000022" transparent opacity={moldOpacity} roughness={0.9} /></mesh>
                <mesh position={[w / 2 - bar / 2, 0, 0]}><boxGeometry args={[bar, h, 0.003]} /><meshStandardMaterial color="#00000022" transparent opacity={moldOpacity} roughness={0.9} /></mesh>
            </group>
        )
    }

    const lowerCenterY = margin + lowerH / 2 - height / 2
    const upperCenterY = margin + lowerH + 0.06 + upperH / 2 - height / 2
    return (
        <group>
            {rect(mw, upperH, upperCenterY, 'upper')}
            {rect(mw, lowerH, lowerCenterY, 'lower')}
        </group>
    )
}

function GlassGrid({ width, height, cols = 3, rows = 5, bottomRail = 0.12, itemOpacity, itemTransparent }: {
    width: number; height: number; cols?: number; rows?: number; bottomRail?: number
    itemOpacity: number; itemTransparent: boolean
}) {
    const margin = 0.07
    const glassW = width - margin * 2
    const glassH = height - margin * 2 - bottomRail
    const glassCenterY = bottomRail / 2 + margin / 2 - 0.03
    return (
        <group>
            {[1, -1].map(z => (
                <mesh key={`pane${z}`} position={[0, glassCenterY, z * (T / 2 + 0.001)]}>
                    <boxGeometry args={[glassW, glassH, 0.006]} />
                    <meshPhysicalMaterial color="#dfeaf0" transparent opacity={0.3 * itemOpacity} roughness={0.04} transmission={0.65} />
                </mesh>
            ))}
            {[1, -1].map(zSide => {
                const gz = zSide * (T / 2 + 0.0015)
                const bars: React.ReactNode[] = []
                for (let c = 1; c < cols; c++) {
                    const x = -glassW / 2 + (glassW / cols) * c
                    bars.push(
                        <mesh key={`v${zSide}${c}`} position={[x, glassCenterY, gz]}>
                            <boxGeometry args={[0.018, glassH, 0.008]} />
                            {m('#f4f2ec', { roughness: 0.5 }, itemOpacity, itemTransparent)}
                        </mesh>
                    )
                }
                for (let r = 1; r < rows; r++) {
                    const y = glassCenterY - glassH / 2 + (glassH / rows) * r
                    bars.push(
                        <mesh key={`h${zSide}${r}`} position={[0, y, gz]}>
                            <boxGeometry args={[glassW, 0.018, 0.008]} />
                            {m('#f4f2ec', { roughness: 0.5 }, itemOpacity, itemTransparent)}
                        </mesh>
                    )
                }
                bars.push(
                    <mesh key={`frame${zSide}`} position={[0, glassCenterY, gz]}>
                        <boxGeometry args={[glassW + 0.02, 0.02, 0.008]} />
                        {m('#f4f2ec', { roughness: 0.5 }, itemOpacity, itemTransparent)}
                    </mesh>,
                    <mesh key={`frame2${zSide}`} position={[0, glassCenterY, gz]}>
                        <boxGeometry args={[0.02, glassH + 0.02, 0.008]} />
                        {m('#f4f2ec', { roughness: 0.5 }, itemOpacity, itemTransparent)}
                    </mesh>
                )
                return <group key={zSide}>{bars}</group>
            })}
            {bottomRail > 0.02 && [1, -1].map(z => (
                <mesh key={`rail${z}`} position={[0, -height / 2 + bottomRail / 2 + margin * 0.4, z * (T / 2 + 0.001)]}>
                    <boxGeometry args={[width - margin * 1.2, bottomRail, 0.006]} />
                    <meshStandardMaterial color="#00000018" transparent opacity={0.3 * itemOpacity} roughness={0.9} />
                </mesh>
            ))}
        </group>
    )
}

function PivotPins({ height, pivotX, itemOpacity, itemTransparent }: {
    height: number; pivotX: number; itemOpacity: number; itemTransparent: boolean
}) {
    return (
        <group>
            <mesh position={[pivotX, 0.01, 0]} castShadow>
                <cylinderGeometry args={[0.014, 0.014, 0.03, 12]} />
                {m('#A8A8A2', { metalness: 0.75, roughness: 0.2 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[pivotX, height - 0.01, 0]} castShadow>
                <cylinderGeometry args={[0.014, 0.014, 0.03, 12]} />
                {m('#A8A8A2', { metalness: 0.75, roughness: 0.2 }, itemOpacity, itemTransparent)}
            </mesh>
        </group>
    )
}

// ── Face variants (what's rendered on the swinging/pivoting panel) ──

type FaceProps = {
    width: number; height: number; hingeSign: 1 | -1
    resolvedStyle: string; itemOpacity: number; itemTransparent: boolean
}

function DoorFace({ width, height, hingeSign, resolvedStyle, itemOpacity, itemTransparent }: FaceProps) {
    const inset = Math.min(0.06, width * 0.08)
    const knobX = hingeSign * (width / 2 - inset - 0.03)
    return (
        <group>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, T]} />
                <DoorMat style={resolvedStyle} />
            </mesh>
            <PanelMolding width={width} height={height} zSide={1} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            <PanelMolding width={width} height={height} zSide={-1} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            <group position={[knobX, 0, 0]}>
                <DoorKnob zSide={1} hingeSign={hingeSign} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                <DoorKnob zSide={-1} hingeSign={hingeSign} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </group>
            <DoorHinges width={width} height={height} hingeSign={hingeSign} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            <mesh position={[0, -height / 2 + 0.09, T / 2 + 0.0015]}>
                <boxGeometry args={[width - inset, 0.16, 0.002]} />
                {m('#8f8f88', { metalness: 0.5, roughness: 0.4 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[0, -height / 2 + 0.09, -T / 2 - 0.0015]}>
                <boxGeometry args={[width - inset, 0.16, 0.002]} />
                {m('#8f8f88', { metalness: 0.5, roughness: 0.4 }, itemOpacity, itemTransparent)}
            </mesh>
        </group>
    )
}

function FrenchFace({ width, height, hingeSign, resolvedStyle, itemOpacity, itemTransparent }: FaceProps) {
    return (
        <group>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, T]} />
                <DoorMat style={resolvedStyle} />
            </mesh>
            <GlassGrid width={width} height={height} cols={3} rows={5} bottomRail={0.12} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            <group position={[hingeSign * (width / 2 - 0.08), 0, 0]}>
                <DoorPull zSide={1} width={0} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                <DoorPull zSide={-1} width={0} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </group>
            <DoorHinges width={width} height={height} hingeSign={hingeSign} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
        </group>
    )
}

function ArchedGlassFace({ width, height, hingeSign, resolvedStyle, itemOpacity, itemTransparent }: FaceProps) {
    return (
        <group>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, T]} />
                <DoorMat style={resolvedStyle} />
            </mesh>
            <GlassGrid width={width} height={height * 0.92} cols={2} rows={4} bottomRail={0.12} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            <group position={[hingeSign * (width / 2 - 0.08), 0, 0]}>
                <DoorPull zSide={1} width={0} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                <DoorPull zSide={-1} width={0} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </group>
            <DoorHinges width={width} height={height} hingeSign={hingeSign} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
        </group>
    )
}

function PivotFace({ width, height, hingeSign, resolvedStyle, itemOpacity, itemTransparent }: FaceProps) {
    const inset = Math.min(0.06, width * 0.08)
    const knobX = hingeSign * (width / 2 - inset - 0.03)
    return (
        <group>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, T]} />
                <DoorMat style={resolvedStyle} />
            </mesh>
            <PanelMolding width={width} height={height} zSide={1} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            <PanelMolding width={width} height={height} zSide={-1} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            <group position={[knobX, 0, 0]}>
                <DoorKnob zSide={1} hingeSign={hingeSign} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                <DoorKnob zSide={-1} hingeSign={hingeSign} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            </group>
        </group>
    )
}

// ── Frames (static, non-panel geometry around the opening) ──

function DoorFrame({ width, height, basePos, angle, itemOpacity, itemTransparent }: {
    width: number; height: number; basePos: [number, number, number]; angle: number
    itemOpacity: number; itemTransparent: boolean
}) {
    const jambW = 0.05
    const jambD = T + 0.02
    const floorPos: [number, number, number] = [basePos[0], basePos[1] - height / 2, basePos[2]]
    return (
        <group position={floorPos} rotation={[0, -angle, 0]}>
            <mesh position={[-width / 2 - jambW / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[jambW, height + jambW, jambD]} />
                {m('#e8e5df', { roughness: 0.6 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[width / 2 + jambW / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[jambW, height + jambW, jambD]} />
                {m('#e8e5df', { roughness: 0.6 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[0, height + jambW / 2, 0]} castShadow>
                <boxGeometry args={[width + jambW * 2, jambW, jambD]} />
                {m('#e8e5df', { roughness: 0.6 }, itemOpacity, itemTransparent)}
            </mesh>
        </group>
    )
}

function SlidingSideJambs({ width, height, basePos, angle, itemOpacity, itemTransparent }: {
    width: number; height: number; basePos: [number, number, number]; angle: number
    itemOpacity: number; itemTransparent: boolean
}) {
    const jambW = 0.05
    const jambD = T + 0.02
    const floorPos: [number, number, number] = [basePos[0], 0, basePos[2]]
    return (
        <group position={floorPos} rotation={[0, -angle, 0]}>
            <mesh position={[-width / 2 - jambW / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[jambW, height, jambD]} />
                {m('#e8e5df', { roughness: 0.6 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[width / 2 + jambW / 2, height / 2, 0]} castShadow>
                <boxGeometry args={[jambW, height, jambD]} />
                {m('#e8e5df', { roughness: 0.6 }, itemOpacity, itemTransparent)}
            </mesh>
        </group>
    )
}

function ArchedFrame({ width, height, basePos, angle, itemOpacity, itemTransparent }: {
    width: number; height: number; basePos: [number, number, number]; angle: number
    itemOpacity: number; itemTransparent: boolean
}) {
    const jambW = 0.05
    const jambD = T + 0.02
    const archHeight = 0.28
    const floorPos: [number, number, number] = [basePos[0], 0, basePos[2]]
    const segs = 10
    return (
        <group position={floorPos} rotation={[0, -angle, 0]}>
            <mesh position={[-width / 2 - jambW / 2, (height - archHeight) / 2, 0]} castShadow>
                <boxGeometry args={[jambW, height - archHeight + jambW, jambD]} />
                {m('#e8e5df', { roughness: 0.6 }, itemOpacity, itemTransparent)}
            </mesh>
            <mesh position={[width / 2 + jambW / 2, (height - archHeight) / 2, 0]} castShadow>
                <boxGeometry args={[jambW, height - archHeight + jambW, jambD]} />
                {m('#e8e5df', { roughness: 0.6 }, itemOpacity, itemTransparent)}
            </mesh>
            {Array.from({ length: segs }).map((_, i) => {
                const t = i / (segs - 1)
                const x = -width / 2 + t * width
                const y = height - archHeight + Math.sin(t * Math.PI) * archHeight
                return (
                    <mesh key={i} position={[x, y, 0]} castShadow>
                        <boxGeometry args={[width / segs + 0.01, jambW, jambD]} />
                        {m('#e8e5df', { roughness: 0.6 }, itemOpacity, itemTransparent)}
                    </mesh>
                )
            })}
        </group>
    )
}

export function DoorVariant3D({
    op, angle, basePos, doorStyle, interactive = false, onToggleOpen,
    opacity = 1, transparent = false,   // NEW
}: {
    op: EditorOpening
    angle: number
    basePos: [number, number, number]
    doorStyle: string
    interactive?: boolean
    onToggleOpen?: (openingId: string) => void
    opacity?: number
    transparent?: boolean
}) {
    const resolvedStyle = op.material ?? doorStyle
    const inward = op.swingDirection !== 'outward'
    const swingSign: 1 | -1 = inward ? 1 : -1
    const variant = op.variant ?? 'door-swing-single'
    const dirX = Math.cos(angle), dirZ = Math.sin(angle)
    const perpX = -dirZ, perpZ = dirX
    const baseHingeSign: 1 | -1 = (op as any).flipped ? 1 : -1
    const itemOpacity = opacity
    const itemTransparent = transparent || opacity < 1
    const isOpen = !!op.isOpen

    function swingingPanel(
        hingeSign: 1 | -1, panelWidth: number, centerOffset: number, key: string,
        closedRestAngle: number, fullyOpenAngle: number,
        FaceComponent: (p: FaceProps) => React.ReactElement = DoorFace,
        pivotInset = 0,
    ) {
        const hingeAlong = centerOffset - hingeSign * (panelWidth / 2 - pivotInset)

        return (
            <SwingHinge
                key={key}
                hingeAlong={hingeAlong}
                hingeSign={hingeSign}
                panelWidth={panelWidth}
                basePos={basePos}
                dirX={dirX} dirZ={dirZ} perpX={perpX} perpZ={perpZ}
                angle={angle}
                closedRestAngle={closedRestAngle}
                fullyOpenAngle={fullyOpenAngle}
                isOpen={!!op.isOpen}
                interactive={interactive}
                onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}
                pivotInset={pivotInset}
            >
                <FaceComponent width={panelWidth} height={op.height} hingeSign={hingeSign}
                    resolvedStyle={resolvedStyle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                {pivotInset > 0 && (
                    <PivotPins height={op.height} pivotX={-hingeSign * (panelWidth / 2 - pivotInset)}
                        itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                )}
            </SwingHinge>
        )
    }

    switch (variant) {
        case 'door-swing-double': {
            const half = op.width / 2
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 0.85 * swingSign
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    {swingingPanel(1, half, -half / 2, 'doorL', restAngle, openAngle)}
                    {swingingPanel(-1, half, half / 2, 'doorR', -restAngle, -openAngle)}
                </group>
            )
        }
        case 'door-swing-double-french': {
            const half = op.width / 2
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 0.85 * swingSign
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    {swingingPanel(1, half, -half / 2, 'doorFrL', restAngle, openAngle, FrenchFace)}
                    {swingingPanel(-1, half, half / 2, 'doorFrR', -restAngle, -openAngle, FrenchFace)}
                </group>
            )
        }
        case 'door-swing-double-arched': {
            const half = op.width / 2
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 0.85 * swingSign
            return (
                <group>
                    <ArchedFrame width={op.width} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    {swingingPanel(1, half, -half / 2, 'doorArL', restAngle, openAngle, ArchedGlassFace)}
                    {swingingPanel(-1, half, half / 2, 'doorArR', -restAngle, -openAngle, ArchedGlassFace)}
                </group>
            )
        }
        case 'door-pivot': {
            const pivotInset = Math.min(0.16, op.width * 0.14)
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 1.05 * swingSign
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    {swingingPanel(baseHingeSign, op.width, 0, 'doorPivot', restAngle, openAngle, PivotFace, pivotInset)}
                </group>
            )
        }
        case 'door-folding-single': {
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <FoldingDoor width={op.width} height={op.height} panelCount={2} foldAngleMax={Math.PI / 6}
                        basePos={basePos} angle={angle} dirX={dirX} dirZ={dirZ} perpX={perpX} perpZ={perpZ} swingSign={swingSign}
                        resolvedStyle={resolvedStyle} isOpen={isOpen} interactive={interactive}
                        onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}
                        itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                </group>
            )
        }
        case 'door-sliding-quad': const panelCount = (op as any).panelCount ?? 4
            const slidingIndices: number[] = (op as any).slidingPanels ?? [panelCount - 1]
            const glassConfig: GlassConfig = (op as any).glass ?? { finish: 'clear' }

            const panelW = op.width / panelCount
            const panels = Array.from({ length: panelCount }, (_, i) => i)

            return (
                <group>
                    <SlidingSideJambs width={op.width} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />

                    <group position={basePos} rotation={[0, -angle, 0]}>
                        <mesh position={[0, op.height + 0.025, 0]}>
                            <boxGeometry args={[op.width + 0.1, 0.05, 0.09]} />
                            <AluminumMat itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                        </mesh>
                        <mesh position={[0, 0.015, 0]}>
                            <boxGeometry args={[op.width + 0.1, 0.03, 0.09]} />
                            <AluminumMat itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                        </mesh>
                    </group>

                    {panels.map((i) => {
                        const centerOffset = -op.width / 2 + panelW * (i + 0.5)
                        const isSliding = slidingIndices.includes(i)

                        if (!isSliding) {
                            const pos: [number, number, number] = [
                                basePos[0] + dirX * centerOffset,
                                basePos[1],
                                basePos[2] + dirZ * centerOffset,
                            ]
                            return (
                                <group key={`fixed${i}`} position={pos} rotation={[0, -angle, 0]}>
                                    <PanoramaGlassFace width={panelW} height={op.height} glass={glassConfig} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                                </group>
                            )
                        }

                        const slideDir = i === 0 ? -1 : 1
                        const openOffset = centerOffset + slideDir * panelW * 0.92
                        return (
                            <SlidingLeaf key={`slide${i}`} basePos={basePos} dirX={dirX} dirZ={dirZ} angle={angle}
                                centerOffset={centerOffset} panelWidth={panelW} openOffset={openOffset}
                                isOpen={isOpen} interactive={interactive}
                                onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}>
                                <PanoramaGlassFace width={panelW} height={op.height} glass={glassConfig} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                            </SlidingLeaf>
                        )
                    })}
                </group>
            )
        case 'door-sliding-panorama': {
            const effectiveWidth = op.width   // bumped from 1.15 — tune further if still too narrow
            const panelCount = (op as any).panelCount ?? 2
            const slidingIndices: number[] = (op as any).slidingPanels ?? [panelCount - 1]
            const glassConfig: GlassConfig = (op as any).glass ?? { finish: 'clear' }
            const invertGlassSide = !!(op as any).invertGlassSide
            const secondaryGlass: GlassConfig = (op as any).glassSecondary ?? glassConfig

            const PANEL_GAP = Math.max(0.015, effectiveWidth * 0.008)  // ← ADD THIS — declared once, before panelW
            const panelW = (effectiveWidth - PANEL_GAP * (panelCount - 1)) / panelCount   // ← REPLACE old panelW line with this
            const panels = Array.from({ length: panelCount }, (_, i) => i)

            return (
                <group>
                    <SlidingSideJambs width={effectiveWidth} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />

                    <group position={basePos} rotation={[0, -angle, 0]}>
                        <mesh position={[0, op.height / 2 + 0.025, 0]}>
                            <boxGeometry args={[effectiveWidth + 0.1, 0.05, 0.09]} />
                            <AluminumMat itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                        </mesh>
                        <mesh position={[0, -op.height / 2 + 0.015, 0]}>
                            <boxGeometry args={[effectiveWidth + 0.1, 0.03, 0.09]} />
                            <AluminumMat itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                        </mesh>
                    </group>

                    {panels.map((i) => {
                        const centerOffset = -effectiveWidth / 2 + panelW / 2 + i * (panelW + PANEL_GAP)   // ← REPLACES old centerOffset line, INSIDE the map callback
                        const isSliding = slidingIndices.includes(i)
                        const isLeftHalf = i < panelCount / 2
                        const useSecondary = invertGlassSide ? isLeftHalf : !isLeftHalf
                        const panelGlass = useSecondary ? secondaryGlass : glassConfig

                        if (!isSliding) {
                            const pos: [number, number, number] = [
                                basePos[0] + dirX * centerOffset,
                                basePos[1],
                                basePos[2] + dirZ * centerOffset,
                            ]
                            return (
                                <group key={`fixed${i}`} position={pos} rotation={[0, -angle, 0]}>
                                    <PanoramaGlassFace width={panelW} height={op.height} glass={panelGlass}
                                        itemOpacity={itemOpacity} itemTransparent={itemTransparent} showHandle={false} />
                                </group>
                            )
                        }

                        const fixedIndices = panels.filter(p => !slidingIndices.includes(p))
                        const nearestFixed = fixedIndices.length
                            ? fixedIndices.reduce((a, b) => Math.abs(a - i) < Math.abs(b - i) ? a : b)
                            : (i === 0 ? panelCount - 1 : 0)
                        const slideDir = nearestFixed > i ? 1 : -1
                        const openOffset = slideDir * panelW * 1.0

                        return (
                            <SlidingLeaf key={`slide${i}`}
                                basePos={basePos}
                                dirX={dirX} dirZ={dirZ} angle={angle}
                                centerOffset={centerOffset} panelWidth={panelW} openOffset={openOffset}
                                isOpen={isOpen} interactive={interactive}
                                onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}>
                                <PanoramaGlassFace width={panelW} height={op.height} glass={panelGlass}
                                    itemOpacity={itemOpacity} itemTransparent={itemTransparent} showHandle={true} />
                            </SlidingLeaf>
                        )
                    })}
                </group>
            )
        }
        case 'door-pocket': {
            const slideFrac = variant === 'door-pocket' ? 0.88 : 0.5
            const offset = op.width * slideFrac
            const visibleWidth = variant === 'door-pocket' ? op.width * (1 - slideFrac) + 0.06 : op.width
            const pos: [number, number, number] = [
                basePos[0] + dirX * offset,
                basePos[1],
                basePos[2] + dirZ * offset,
            ]
            return (
                <group>
                    <SlidingSideJambs width={op.width} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <group position={basePos} rotation={[0, -angle, 0]}>
                        <mesh position={[0, op.height + 0.03, 0]}>
                            <boxGeometry args={[op.width + 0.1, 0.04, 0.08]} />
                            {m('#9a9a94', { metalness: 0.55, roughness: 0.4 }, itemOpacity, itemTransparent)}
                        </mesh>
                    </group>
                    <group position={pos} rotation={[0, -angle, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[visibleWidth, op.height, T]} />
                            <DoorMat style={resolvedStyle} />
                        </mesh>
                        <PanelMolding width={visibleWidth} height={op.height} zSide={1} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                        <PanelMolding width={visibleWidth} height={op.height} zSide={-1} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                        <mesh position={[visibleWidth / 2 - 0.08, 0, T / 2 + 0.006]}>
                            <boxGeometry args={[0.02, 0.16, 0.012]} />
                            {m('#B9B9B4', { metalness: 0.6, roughness: 0.3 }, itemOpacity, itemTransparent)}
                        </mesh>
                        <mesh position={[visibleWidth / 2 - 0.08, 0, -T / 2 - 0.006]}>
                            <boxGeometry args={[0.02, 0.16, 0.012]} />
                            {m('#B9B9B4', { metalness: 0.6, roughness: 0.3 }, itemOpacity, itemTransparent)}
                        </mesh>
                    </group>
                </group>
            )
        }
        case 'door-sliding-double': {
            const half = op.width / 2
            return (
                <group>
                    <SlidingSideJambs width={op.width} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    <group position={basePos} rotation={[0, -angle, 0]}>
                        <mesh position={[0, op.height + 0.03, 0]}>
                            <boxGeometry args={[op.width + 0.14, 0.04, 0.1]} />
                            {m('#9a9a94', { metalness: 0.55, roughness: 0.4 }, itemOpacity, itemTransparent)}
                        </mesh>
                    </group>
                    <SlidingLeaf basePos={basePos} dirX={dirX} dirZ={dirZ} angle={angle}
                        centerOffset={-half / 2} panelWidth={half} openOffset={-half * 0.85}
                        isOpen={isOpen} interactive={interactive}
                        onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}>
                        <SlidingGlassFace width={half} height={op.height} hingeSign={1} resolvedStyle={resolvedStyle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    </SlidingLeaf>
                    <SlidingLeaf basePos={basePos} dirX={dirX} dirZ={dirZ} angle={angle}
                        centerOffset={half / 2} panelWidth={half} openOffset={half * 0.85}
                        isOpen={isOpen} interactive={interactive}
                        onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}>
                        <SlidingGlassFace width={half} height={op.height} hingeSign={-1} resolvedStyle={resolvedStyle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    </SlidingLeaf>
                </group>
            )
        }
        case 'door-folding': {
            return (
                <FoldingDoor width={op.width} height={op.height} panelCount={4} foldAngleMax={Math.PI / 8}
                    basePos={basePos} angle={angle} dirX={dirX} dirZ={dirZ} perpX={perpX} perpZ={perpZ} swingSign={swingSign}
                    resolvedStyle={resolvedStyle} isOpen={isOpen} interactive={interactive}
                    onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}
                    itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            )
        }
        case 'door-folding-french': {
            return (
                <FoldingDoor width={op.width} height={op.height} panelCount={4} foldAngleMax={Math.PI / 8} glazed
                    basePos={basePos} angle={angle} dirX={dirX} dirZ={dirZ} perpX={perpX} perpZ={perpZ} swingSign={swingSign}
                    resolvedStyle={resolvedStyle} isOpen={isOpen} interactive={interactive}
                    onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}
                    itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
            )
        }
        case 'door-garage': {
            const trackPositions: [number, number][] = [[-op.width / 2 - 0.02, 1], [op.width / 2 + 0.02, 1]]
            return (
                <group>
                    <AnimatedGarageDoor width={op.width} height={op.height} basePos={basePos} angle={angle}
                        resolvedStyle={resolvedStyle} isOpen={isOpen} interactive={interactive}
                        onToggleOpen={onToggleOpen ? () => onToggleOpen(op.id) : undefined}
                        itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    {trackPositions.map(([x], i) => (
                        <group key={`track${i}`} position={[basePos[0] + dirX * x, 0, basePos[2] + dirZ * x]} rotation={[0, -angle, 0]}>
                            <mesh position={[0, op.height / 2, 0]}>
                                <boxGeometry args={[0.03, op.height, 0.05]} />
                                {m('#9a9a94', { metalness: 0.5, roughness: 0.4 }, itemOpacity, itemTransparent)}
                            </mesh>
                        </group>
                    ))}
                </group>
            )
        }
        case 'door-swing-single':
        default: {
            const restAngle = (Math.PI / 40) * swingSign
            const openAngle = (Math.PI / 2) * 0.85 * swingSign
            return (
                <group>
                    <DoorFrame width={op.width} height={op.height} basePos={basePos} angle={angle} itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    {swingingPanel(baseHingeSign, op.width, 0, 'doorSingle', restAngle, openAngle)}
                </group>
            )
        }
    }
}

function SwingHinge({
    hingeAlong, hingeSign, panelWidth, basePos, dirX, dirZ, perpX, perpZ, angle,
    closedRestAngle, fullyOpenAngle, isOpen, interactive, onToggleOpen, pivotInset = 0,
    children,
}: {
    hingeAlong: number
    hingeSign: 1 | -1
    panelWidth: number
    basePos: [number, number, number]
    dirX: number; dirZ: number; perpX: number; perpZ: number
    angle: number
    closedRestAngle: number
    fullyOpenAngle: number
    isOpen: boolean
    interactive?: boolean
    onToggleOpen?: () => void
    pivotInset?: number
    children: React.ReactNode
}) {
    const groupRef = useRef<THREE.Group>(null)
    const currentAngle = useRef(closedRestAngle)

    useFrame((_, delta) => {
        const target = isOpen ? fullyOpenAngle : closedRestAngle
        const diff = target - currentAngle.current
        if (Math.abs(diff) < 0.001) currentAngle.current = target
        else currentAngle.current += diff * Math.min(1, delta * 8)
        if (groupRef.current) groupRef.current.rotation.y = -angle + currentAngle.current
    })

    // Hinge point sits along the wall direction (dirX/dirZ), offset from
    // basePos by hingeAlong — same coordinate convention as everywhere else
    // in this file (basePos + dir * offset).
    const hingeWorldPos: [number, number, number] = [
        basePos[0] + dirX * hingeAlong,
        basePos[1],
        basePos[2] + dirZ * hingeAlong,
    ]

    // Panel's own center sits offset from the hinge pivot by half its width
    // (minus pivotInset for pivot-style doors), on the hinge-opposite side.
    const panelLocalX = hingeSign * (panelWidth / 2 - pivotInset)

    return (
        <group
            ref={groupRef}
            position={hingeWorldPos}
            rotation={[0, -angle + closedRestAngle, 0]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            <group position={[panelLocalX, 0, 0]}>
                {children}
            </group>
        </group>
    )
}

// ── SlidingLeaf — translates a leaf along the wall direction between its
// rest position (centerOffset) and open position (centerOffset + openOffset).
// Same reconstruction caveat as SwingHinge above. ──
function SlidingLeaf({
    basePos, dirX, dirZ, angle, centerOffset, panelWidth, openOffset,
    isOpen, interactive, onToggleOpen, children,
}: {
    basePos: [number, number, number]
    dirX: number; dirZ: number; angle: number
    centerOffset: number
    panelWidth: number
    openOffset: number
    isOpen: boolean
    interactive?: boolean
    onToggleOpen?: () => void
    children: React.ReactNode
}) {
    const groupRef = useRef<THREE.Group>(null)
    const currentOffset = useRef(centerOffset)

    useFrame((_, delta) => {
        const target = isOpen ? centerOffset + openOffset : centerOffset
        const diff = target - currentOffset.current
        if (Math.abs(diff) < 0.001) currentOffset.current = target
        else currentOffset.current += diff * Math.min(1, delta * 8)
        if (groupRef.current) {
            groupRef.current.position.set(
                basePos[0] + dirX * currentOffset.current,
                basePos[1],
                basePos[2] + dirZ * currentOffset.current,
            )
        }
    })

    return (
        <group
            ref={groupRef}
            position={[basePos[0] + dirX * centerOffset, basePos[1], basePos[2] + dirZ * centerOffset]}
            rotation={[0, -angle, 0]}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            {children}
        </group>
    )
}


// ── Folding/bifold door — animates panelCount leaves between flat (closed)
// and accordion-folded (open) via a shared frac ref eased through useFrame. ──
function FoldingDoor({
    width, height, panelCount, foldAngleMax, glazed = false,
    basePos, angle, dirX, dirZ, perpX, perpZ, swingSign,
    resolvedStyle, isOpen, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    width: number; height: number; panelCount: number; foldAngleMax: number; glazed?: boolean
    basePos: [number, number, number]; angle: number
    dirX: number; dirZ: number; perpX: number; perpZ: number; swingSign: 1 | -1
    resolvedStyle: string; isOpen: boolean
    interactive?: boolean; onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
}) {
    const groupRefs = useRef<(THREE.Group | null)[]>([])
    const frac = useRef(0)
    const panelW = width / panelCount

    useFrame((_, delta) => {
        const target = isOpen ? 1 : 0
        const speed = 9
        const diff = target - frac.current
        frac.current = Math.abs(diff) < 0.001 ? target : frac.current + diff * Math.min(1, delta * speed)
        for (let i = 0; i < panelCount; i++) {
            const g = groupRefs.current[i]
            if (!g) continue
            const angleFold = (i % 2 === 0 ? 1 : -1) * foldAngleMax * swingSign * frac.current
            const centerOffset = -width / 2 + panelW * (i + 0.5)
            const perp = Math.abs(Math.sin(angleFold)) * (panelW / 2)
            g.position.set(
                basePos[0] + dirX * centerOffset + perpX * perp,
                basePos[1],
                basePos[2] + dirZ * centerOffset + perpZ * perp,
            )
            g.rotation.set(0, -angle + angleFold, 0)
        }
    })

    return (
        <group
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            {Array.from({ length: panelCount }).map((_, i) => (
                <group key={i} ref={el => { groupRefs.current[i] = el }}>
                    <mesh castShadow>
                        <boxGeometry args={[panelW * 0.96, height, T]} />
                        <DoorMat style={resolvedStyle} />
                    </mesh>
                    {glazed && (
                        <GlassGrid width={panelW * 0.96} height={height} cols={1} rows={5} bottomRail={0.1}
                            itemOpacity={itemOpacity} itemTransparent={itemTransparent} />
                    )}
                    <mesh position={[panelW * 0.96 / 2 - 0.006, 0, T / 2 + 0.001]}>
                        <boxGeometry args={[0.008, height * 0.92, 0.002]} />
                        <meshStandardMaterial color="#00000030" transparent opacity={0.4 * itemOpacity} />
                    </mesh>
                </group>
            ))}
        </group>
    )
}

// ── Garage door — animates a slatted panel lifting up into the head. ──
function AnimatedGarageDoor({
    width, height, basePos, angle, resolvedStyle, isOpen, interactive, onToggleOpen,
    itemOpacity, itemTransparent,
}: {
    width: number; height: number; basePos: [number, number, number]; angle: number
    resolvedStyle: string; isOpen: boolean
    interactive?: boolean; onToggleOpen?: () => void
    itemOpacity: number; itemTransparent: boolean
}) {
    const groupRef = useRef<THREE.Group>(null)
    const frac = useRef(0)
    const slats = 5
    const slatH = Math.min(0.5, height * 0.4) / slats

    useFrame((_, delta) => {
        const target = isOpen ? 1 : 0
        const speed = 6
        const diff = target - frac.current
        frac.current = Math.abs(diff) < 0.001 ? target : frac.current + diff * Math.min(1, delta * speed)
        if (groupRef.current) {
            groupRef.current.position.y = frac.current * height * 0.92
        }
    })

    return (
        <group
            ref={groupRef}
            onClick={interactive && onToggleOpen ? (e: any) => { e.stopPropagation(); onToggleOpen() } : undefined}
            onPointerOver={interactive && onToggleOpen ? () => { document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={interactive && onToggleOpen ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
            {Array.from({ length: slats }).map((_, i) => {
                const sillY = basePos[1] - height / 2
                const y = sillY + height - slatH * (i + 0.5) - 0.02
                return (
                    <group key={`slat${i}`} position={[basePos[0], y, basePos[2]]} rotation={[0, -angle, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[width * 0.98, slatH * 0.85, T]} />
                            <DoorMat style={resolvedStyle} />
                        </mesh>
                        <mesh position={[0, -slatH * 0.85 / 2 - 0.004, T / 2 + 0.001]}>
                            <boxGeometry args={[width * 0.98, 0.006, 0.002]} />
                            <meshStandardMaterial color="#00000040" transparent opacity={0.45 * itemOpacity} />
                        </mesh>
                    </group>
                )
            })}
        </group>
    )
}

// ── Sliding-glass door face — used by door-sliding-double. Large single
// pane with a thin perimeter frame, distinct from FrenchFace's mullion grid. ──
function SlidingGlassFace({ width, height, hingeSign, resolvedStyle, itemOpacity, itemTransparent }: FaceProps) {
    const margin = 0.06
    const glassW = width - margin * 2
    const glassH = height - margin * 2
    return (
        <group>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, T]} />
                <DoorMat style={resolvedStyle} />
            </mesh>
            {[1, -1].map(z => (
                <mesh key={z} position={[0, 0, z * (T / 2 + 0.001)]}>
                    <boxGeometry args={[glassW, glassH, 0.006]} />
                    <meshPhysicalMaterial color="#dfeaf0" transparent opacity={0.28 * itemOpacity} roughness={0.03} transmission={0.7} />
                </mesh>
            ))}
            {[1, -1].map(z => (
                <mesh key={`pull${z}`} position={[-hingeSign * (width / 2 - 0.07), 0, z * (T / 2 + 0.012)]} castShadow>
                    <boxGeometry args={[0.022, 0.22, 0.02]} />
                    {m('#B9B9B4', { metalness: 0.65, roughness: 0.28 }, itemOpacity, itemTransparent)}
                </mesh>
            ))}
        </group>
    )
}