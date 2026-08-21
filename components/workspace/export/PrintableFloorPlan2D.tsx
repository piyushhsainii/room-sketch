// components/workspace/export/PrintableFloorPlan2D.tsx
import React from 'react'
import { EditorOpening, FloorPlanState, LineNode } from '../lib/constants'
import { deriveClosedPolygons, getSegmentOpeningWorldPos, polygonAreaM2 } from '@/lib/helpers'
import { OUTDOOR_OBJECT_LABELS } from '../lib/outdoor-constants'
import { STAIRS_LABELS } from '../lib/stairs-constants'
import { FURNITURE_LABELS, getFurnitureFootprint } from '../lib/furniture-constants'


// Standard architectural print scales — denominator is "1 unit on paper = N
// units in reality". 100 means 1:100.
export const PRINT_SCALES = [50, 100, 150, 200] as const
export type PrintScale = typeof PRINT_SCALES[number]

// Physical page sizes in mm, used only to pick a sane default scale
// automatically — the actual SVG is unitless/scalable, not locked to a page.
const PAGE_SIZES_MM: Record<'A4' | 'A3' | 'Letter', { w: number; h: number }> = {
    A4: { w: 297, h: 210 },
    A3: { w: 420, h: 297 },
    Letter: { w: 279, h: 216 },
}

interface Props {
    fp: FloorPlanState
    scale: PrintScale
    paperSize: 'A4' | 'A3' | 'Letter'
    projectName?: string
    floorLabel?: string
    showFurniture?: boolean
    showLabels?: boolean
}

// Picks the smallest of the standard scales that fits the plan's bounding
// box onto the chosen paper with margin, so "auto" mode doesn't require the
// user to guess.
export function pickAutoScale(fp: FloorPlanState, paperSize: 'A4' | 'A3' | 'Letter'): PrintScale {
    const bounds = computeBoundsM(fp)
    const spanM = Math.max(bounds.w, bounds.d)
    const page = PAGE_SIZES_MM[paperSize]
    const usableMm = Math.min(page.w, page.h) - 40 // 20mm margin each side
    for (const s of PRINT_SCALES) {
        if ((spanM * 1000) / s <= usableMm) return s
    }
    return PRINT_SCALES[PRINT_SCALES.length - 1]!
}

function computeBoundsM(fp: FloorPlanState) {
    const xs: number[] = [], zs: number[] = []
    for (const r of fp.rooms) { xs.push(r.x, r.x + r.width); zs.push(r.z, r.z + r.depth) }
    for (const n of fp.lineNodes ?? []) { xs.push(n.x); zs.push(n.z) }
    for (const f of fp.furniture ?? []) { xs.push(f.x); zs.push(f.z) }
    for (const s of fp.stairs ?? []) { xs.push(s.x, s.x + s.width); zs.push(s.z, s.z + s.depth) }
    for (const o of fp.outdoorObjects ?? []) { xs.push(o.x); zs.push(o.z) }
    if (xs.length === 0) return { minX: 0, minZ: 0, w: 1, d: 1 }
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minZ = Math.min(...zs), maxZ = Math.max(...zs)
    return { minX, minZ, w: maxX - minX, d: maxZ - minZ }
}

// mm-per-meter at the given print scale (1:scale means 1000mm real = 1000/scale mm on paper)
function mmPerM(scale: PrintScale) { return 1000 / scale }

/**
 * Static, non-interactive SVG floor plan for print/export. No editor state
 * (pan/zoom/selection/hover) is read here — everything is derived purely
 * from `fp` and the chosen scale, per the plan's requirement that this be a
 * separate rendering target rather than a stripped-down draw2D.
 */
export function PrintableFloorPlan2D({ fp, scale, paperSize, floorLabel, projectName, showFurniture = true, showLabels = true }: Props) {
    const bounds = computeBoundsM(fp)
    const mmPerMeter = mmPerM(scale)
    const margin = 20 // mm
    const titleBlockH = 24 // mm, reserved at bottom

    const widthMm = bounds.w * mmPerMeter + margin * 2
    const heightMm = bounds.d * mmPerMeter + margin * 2 + titleBlockH

    // world (m) -> svg (mm), offset so the plan's bounding box starts at margin
    const px = (xM: number) => (xM - bounds.minX) * mmPerMeter + margin
    const py = (zM: number) => (zM - bounds.minZ) * mmPerMeter + margin

    const wallStrokeMm = 0.15 * mmPerMeter // matches editor's 0.15m wall thickness

    return (
        <svg
            viewBox={`0 0 ${widthMm} ${heightMm}`}
            width={`${widthMm}mm`}
            height={`${heightMm}mm`}
            xmlns="http://www.w3.org/2000/svg"
            style={{ background: '#FFFFFF' }}
        >
            {/* ── Room walls + area labels ─────────────────────────────── */}
            {fp.rooms.map(room => {
                const x = px(room.x), y = py(room.z)
                const w = room.width * mmPerMeter, d = room.depth * mmPerMeter
                const areaM2 = room.width * room.depth
                return (
                    <g key={room.id}>
                        <rect x={x} y={y} width={w} height={d} fill="none" stroke="#000000" strokeWidth={wallStrokeMm} />
                        <text x={x + w / 2} y={y + d / 2 - 2} textAnchor="middle" fontSize={3} fontFamily="system-ui" fill="#000">
                            {room.label}
                        </text>
                        <text x={x + w / 2} y={y + d / 2 + 3} textAnchor="middle" fontSize={2.4} fontFamily="system-ui" fill="#444">
                            {areaM2.toFixed(1)} m²
                        </text>
                        {/* Dimension lines — width (top) and depth (left), offset
                            outside the wall, matching draw2D's ${lenM}m label pattern
                            but always-on rather than only while drawing. */}
                        <DimensionLine x1={x} y1={y - 6} x2={x + w} y2={y - 6} label={`${room.width.toFixed(2)}m`} />
                        <DimensionLine x1={x - 6} y1={y} x2={x - 6} y2={y + d} label={`${room.depth.toFixed(2)}m`} vertical />
                    </g>
                )
            })}

            {/* ── Line-wall segments (reusing the same length-label logic
                  draw2D uses during drawing, now rendered unconditionally) ── */}
            {(fp.lineSegments ?? []).map(seg => {
                const nodes = seg.nodeIds.map(id => fp.lineNodes.find(n => n.id === id)).filter(Boolean) as LineNode[]
                if (nodes.length < 2) return null
                return (
                    <g key={seg.id}>
                        <polyline
                            points={nodes.map(n => `${px(n.x)},${py(n.z)}`).join(' ')}
                            fill="none" stroke="#000000" strokeWidth={wallStrokeMm} strokeLinecap="round" strokeLinejoin="round"
                        />
                        {nodes.slice(0, -1).map((a, i) => {
                            const b = nodes[i + 1]!
                            const lenM = Math.hypot(b.x - a.x, b.z - a.z)
                            const midX = (px(a.x) + px(b.x)) / 2, midY = (py(a.z) + py(b.z)) / 2
                            const angleDeg = (Math.atan2(py(b.z) - py(a.z), px(b.x) - px(a.x)) * 180) / Math.PI
                            return (
                                <text
                                    key={i}
                                    x={midX} y={midY - 2}
                                    textAnchor="middle" fontSize={2.4} fontFamily="system-ui" fill="#000"
                                    transform={`rotate(${angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg}, ${midX}, ${midY})`}
                                >
                                    {lenM.toFixed(2)}m
                                </text>
                            )
                        })}
                    </g>
                )
            })}

            {/* ── Closed line-shapes — area only, no width/depth (irregular
                  polygons don't have a single "width x depth"), using the
                  exported shoelace helper rather than reimplementing it ── */}
            {deriveClosedPolygons(fp.lineNodes, fp.lineSegments).map((nodeIds, i) => {
                const nodes = nodeIds.map(id => fp.lineNodes.find(n => n.id === id)).filter(Boolean) as LineNode[]
                if (nodes.length < 3) return null
                const areaM2 = polygonAreaM2(nodeIds, fp.lineNodes)
                const cxM = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
                const czM = nodes.reduce((s, n) => s + n.z, 0) / nodes.length
                const shape = fp.closedShapes?.find(s => s.nodeIds.length === nodeIds.length && s.nodeIds.every(id => nodeIds.includes(id)))
                return (
                    <g key={i}>
                        <polygon
                            points={nodes.map(n => `${px(n.x)},${py(n.z)}`).join(' ')}
                            fill="none" stroke="#000000" strokeWidth={wallStrokeMm}
                        />
                        <text x={px(cxM)} y={py(czM)} textAnchor="middle" fontSize={2.4} fontFamily="system-ui" fill="#444">
                            {(shape?.label ?? 'Area')} — {areaM2.toFixed(1)} m²
                        </text>
                    </g>
                )
            })}

            {/* ── Openings (doors/windows/railings/generic openings) ──────
                  Real symbols now: door gets a leaf line + swing arc
                  (direction driven by EditorOpening.swingDirection), window
                  gets a double tick line across the gap, railing gets a
                  hatch line, plain 'opening' stays gap-only. Previously
                  this only ever drew the white erasure line despite the
                  old comment claiming a swing arc existed — no symbol was
                  actually implemented, which is why doors never appeared. */}
            {fp.openings.filter(o => !o.segmentNodeIds).map(op => {
                const room = fp.rooms.find(r => r.id === op.roomId)
                if (!room) return null
                const opStart = op.position - op.width / 2
                let x1: number, y1: number, x2: number, y2: number
                if (op.wall === 'north') { x1 = px(room.x + opStart); y1 = py(room.z); x2 = px(room.x + opStart + op.width); y2 = y1 }
                else if (op.wall === 'south') { x1 = px(room.x + opStart); y1 = py(room.z + room.depth); x2 = px(room.x + opStart + op.width); y2 = y1 }
                else if (op.wall === 'west') { x1 = px(room.x); y1 = py(room.z + opStart); x2 = x1; y2 = py(room.z + opStart + op.width) }
                else { x1 = px(room.x + room.width); y1 = py(room.z + opStart); x2 = x1; y2 = py(room.z + opStart + op.width) }
                return <OpeningSymbol key={op.id} x1={x1} y1={y1} x2={x2} y2={y2} wallStrokeMm={wallStrokeMm} opType={op.type} swingDirection={op.swingDirection} />
            })}
            {fp.openings.filter(o => o.segmentNodeIds).map(op => {
                const pos = getSegmentOpeningWorldPos(op, fp.lineNodes)
                if (!pos) return null
                const hw = op.width / 2
                const nx = Math.cos(pos.angle), nz = Math.sin(pos.angle)
                const x1 = px(pos.wx - nx * hw), y1 = py(pos.wz - nz * hw)
                const x2 = px(pos.wx + nx * hw), y2 = py(pos.wz + nz * hw)
                return <OpeningSymbol key={op.id} x1={x1} y1={y1} x2={x2} y2={y2} wallStrokeMm={wallStrokeMm} opType={op.type} swingDirection={op.swingDirection} />
            })}

            {/* ── Furniture ─────────────────────────────────────────────── */}
            {showFurniture && (fp.furniture ?? []).map(f => {
                const fpDef = getFurnitureFootprint(f.type, undefined);
                const wMm = fpDef.w * mmPerMeter, dMm = fpDef.d * mmPerMeter
                const cxMm = px(f.x), cyMm = py(f.z)
                const angleDeg = (f.rotation * 180) / Math.PI
                // Counter-rotate the label so it stays upright/readable even
                // when the furniture itself is rotated ~180° — previously
                // the label rotated WITH the box, so e.g. "D.Bed" mirrored
                // into "pəq.Q" for any item facing "backwards".
                const textCorrection = angleDeg > 90 || angleDeg < -90 ? 180 : 0
                return (
                    <g key={f.id} transform={`translate(${cxMm},${cyMm}) rotate(${angleDeg})`}>
                        <rect x={-wMm / 2} y={-dMm / 2} width={wMm} height={dMm}
                            fill="none" stroke="#000" strokeWidth={0.2} />
                        {showLabels && (
                            <g transform={`rotate(${textCorrection})`}>
                                <text textAnchor="middle" dominantBaseline="middle" fontSize={2}
                                    fontFamily="system-ui" fill="#000">
                                    {FURNITURE_LABELS[f.type] ?? f.type}
                                </text>
                            </g>
                        )}
                    </g>
                )
            })}

            {/* ── Stairs ────────────────────────────────────────────────── */}
            {showFurniture && (fp.stairs ?? []).map(s => {
                const x = px(s.x), y = py(s.z), wMm = s.width * mmPerMeter, dMm = s.depth * mmPerMeter
                const angleDeg = (s.rotation * 180) / Math.PI
                const textCorrection = angleDeg > 90 || angleDeg < -90 ? 180 : 0
                return (
                    <g key={s.id} transform={`translate(${x + wMm / 2},${y + dMm / 2}) rotate(${angleDeg})`}>
                        <rect x={-wMm / 2} y={-dMm / 2} width={wMm} height={dMm} fill="none" stroke="#000" strokeWidth={0.2} />
                        {showLabels && (
                            <g transform={`rotate(${textCorrection})`}>
                                <text y={dMm / 2 + 4} textAnchor="middle" fontSize={2} fontFamily="system-ui" fill="#000">
                                    {STAIRS_LABELS[s.type]}
                                </text>
                            </g>
                        )}
                    </g>
                )
            })}

            {/* ── Outdoor objects ───────────────────────────────────────── */}
            {showFurniture && (fp.outdoorObjects ?? []).map(o => {
                const x = px(o.x), y = py(o.z)
                return (
                    <g key={o.id}>
                        <circle cx={x} cy={y} r={1.5} fill="none" stroke="#000" strokeWidth={0.2} />
                        {showLabels && (
                            <text x={x} y={y + 5} textAnchor="middle" fontSize={2} fontFamily="system-ui" fill="#000">
                                {OUTDOOR_OBJECT_LABELS[o.type]}
                            </text>
                        )}
                    </g>
                )
            })}

            {/* ── Annotations ───────────────────────────────────────────── */}
            {showLabels && (fp.annotations ?? []).map(ann => ann.text && (
                <text key={ann.id} x={px(ann.x)} y={py(ann.z)} textAnchor="middle"
                    fontSize={2.4} fontFamily="system-ui" fill="#000">
                    {ann.text}
                </text>
            ))}

            {/* ── North arrow (fixed orientation, no real compass logic) ── */}
            <g transform={`translate(${widthMm - margin - 8}, ${margin + 8})`}>
                <line x1={0} y1={6} x2={0} y2={-6} stroke="#000" strokeWidth={0.4} />
                <polygon points="0,-8 -2,-3 2,-3" fill="#000" />
                <text x={0} y={12} textAnchor="middle" fontSize={2.6} fontFamily="system-ui" fill="#000">N</text>
            </g>

            {/* ── Title block ──────────────────────────────────────────── */}
            <g transform={`translate(0, ${heightMm - titleBlockH})`}>
                <rect x={0} y={0} width={widthMm} height={titleBlockH} fill="none" stroke="#000" strokeWidth={0.4} />

                {/* Branding mark — small square + wordmark, left of the title text.
                    Swap the rect/text below for an actual logo <image> if you have
                    one; this is a placeholder brand block sized to sit inline with
                    the title. */}
                <rect x={margin} y={3} width={6} height={6} rx={1.2} fill="#000" />
                <text x={margin + 9} y={8} fontSize={3} fontWeight={700} fontFamily="system-ui" fill="#000">
                    Room Sketch
                </text>

                <text x={margin} y={16} fontSize={4} fontWeight={700} fontFamily="system-ui" fill="#000">
                    {projectName ?? 'Floor Plan'}
                </text>
                {floorLabel && (
                    <text x={margin} y={21.5} fontSize={2.6} fontFamily="system-ui" fill="#444">
                        {floorLabel}
                    </text>
                )}
                <text x={widthMm - margin} y={21.5} textAnchor="end" fontSize={2.6} fontFamily="system-ui" fill="#444">
                    Scale 1:{scale} · {new Date().toLocaleDateString()}
                </text>
            </g>
        </svg>
    )
}

/**
 * Draws the actual opening symbol across a gap already erased in the wall
 * stroke. `x1,y1 -> x2,y2` is the opening's span in SVG-space; the wall
 * normal is derived from that span's direction and flipped by
 * `swingDirection` (EditorOpening has no explicit hinge-side field, only
 * in/out — the hinge itself is fixed at the (x1,y1) end here, which is
 * fine for a print-doc symbol).
 */
function OpeningSymbol({
    x1, y1, x2, y2, wallStrokeMm, opType, swingDirection,
}: {
    x1: number; y1: number; x2: number; y2: number
    wallStrokeMm: number
    opType: EditorOpening['type']
    swingDirection?: EditorOpening['swingDirection']
}) {
    const widthPx = Math.hypot(x2 - x1, y2 - y1)
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const swingSign = swingDirection === 'outward' ? -1 : 1
    const nx = -Math.sin(angle) * swingSign, nz = Math.cos(angle) * swingSign

    const gap = (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeWidth={wallStrokeMm + 0.4} />
    )

    if (opType === 'opening') {
        return <g>{gap}</g>
    }

    if (opType === 'window') {
        const off = wallStrokeMm * 0.5
        return (
            <g>
                {gap}
                <line x1={x1 + nx * off} y1={y1 + nz * off} x2={x2 + nx * off} y2={y2 + nz * off} stroke="#000" strokeWidth={0.2} />
                <line x1={x1 - nx * off} y1={y1 - nz * off} x2={x2 - nx * off} y2={y2 - nz * off} stroke="#000" strokeWidth={0.2} />
            </g>
        )
    }

    if (opType === 'railing') {
        const off = wallStrokeMm * 0.5
        const ticks = Math.max(2, Math.round(widthPx / 3))
        return (
            <g>
                {gap}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={0.25} />
                {Array.from({ length: ticks + 1 }).map((_, i) => {
                    const t = i / ticks
                    const cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t
                    return (
                        <line key={i}
                            x1={cx - nx * off} y1={cy - nz * off}
                            x2={cx + nx * off} y2={cy + nz * off}
                            stroke="#000" strokeWidth={0.2}
                        />
                    )
                })}
            </g>
        )
    }

    // door: leaf line perpendicular to the wall at the hinge end, plus a
    // quarter-circle swing arc back to the opposite end.
    const leafEndX = x1 + nx * widthPx
    const leafEndZ = y1 + nz * widthPx
    const largeArc = 0
    const sweep = swingSign > 0 ? 1 : 0
    const arcPath = `M ${leafEndX} ${leafEndZ} A ${widthPx} ${widthPx} 0 ${largeArc} ${sweep} ${x2} ${y2}`

    return (
        <g>
            {gap}
            <line x1={x1} y1={y1} x2={leafEndX} y2={leafEndZ} stroke="#000" strokeWidth={0.25} />
            <path d={arcPath} fill="none" stroke="#000" strokeWidth={0.15} strokeDasharray="0.6,0.6" />
        </g>
    )
}

function DimensionLine({ x1, y1, x2, y2, label, vertical = false }: { x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean }) {
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2
    return (
        <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#666" strokeWidth={0.25} />
            {/* tick marks at each end */}
            <line x1={x1} y1={y1 - (vertical ? 0 : 1.2)} x2={x1} y2={y1 + (vertical ? 0 : 1.2)} stroke="#666" strokeWidth={0.25} />
            <line x1={x2} y1={y2 - (vertical ? 0 : 1.2)} x2={x2} y2={y2 + (vertical ? 0 : 1.2)} stroke="#666" strokeWidth={0.25} />
            {vertical && (
                <>
                    <line x1={x1 - 1.2} y1={y1} x2={x1 + 1.2} y2={y1} stroke="#666" strokeWidth={0.25} />
                    <line x1={x2 - 1.2} y1={y2} x2={x2 + 1.2} y2={y2} stroke="#666" strokeWidth={0.25} />
                </>
            )}
            <text
                x={midX} y={vertical ? midY : midY - 1.5}
                textAnchor="middle" fontSize={2} fontFamily="system-ui" fill="#666"
                transform={vertical ? `rotate(-90, ${midX}, ${midY})` : undefined}
            >
                {label}
            </text>
        </g>
    )
}