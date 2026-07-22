// components/workspace/MaterialsPanel.tsx
'use client'

import React, { useMemo, useState } from 'react'
import {
    FloorPlanState,
    FloorMaterial,
    WallMaterial,
    DoorStyle,
    ClosedShape,
    LineNode,
} from './lib/constants'
import { SceneConfig, RoomSceneConfig } from './FloorPlanEditor'
import { deriveClosedPolygons } from '@/lib/helpers'
import { ScrollableList } from '../ui/ScrollableList'
import { labelize } from './MaterialPicker'
import { getMaterialsByCategory, MaterialCategory, MaterialDomain } from './texture/materials-registry'

function uid() { return Math.random().toString(36).slice(2, 9) }

const T = {
    bg: '#F5F5F7',
    card: '#FFFFFF',
    border: '#E6E6EA',
    borderStrong: '#D8D8DE',
    text: '#1D1D1F',
    textMuted: '#6E6E76',
    textFaint: '#9A9AA2',
    accent: '#5B5BF0',
    accentSoft: '#EEEEFD',
    shadow: '0 1px 2px rgba(0,0,0,0.04), 0 1px 8px rgba(0,0,0,0.03)',
    shadowRaised: '0 4px 16px rgba(0,0,0,0.08)',
}

const CATEGORY_META: Record<MaterialCategory, { label: string; icon: string; order: number }> = {
    fabric: { label: 'Fabric', icon: '🧵', order: 0 },
    wood: { label: 'Wood', icon: '🪵', order: 1 },
    'marble-stone': { label: 'Marble & Stone', icon: '🗿', order: 2 },
    brick: { label: 'Brick', icon: '🧱', order: 3 },
    tile: { label: 'Tile', icon: '◻️', order: 4 },
    concrete: { label: 'Concrete', icon: '🪨', order: 5 },
    metal: { label: 'Metal', icon: '⚙️', order: 6 },
    wallpaper: { label: 'Wallpaper', icon: '🖼️', order: 7 },
    'pvc-panel': { label: 'PVC Panel', icon: '🪟', order: 8 },
    glass: { label: 'Glass', icon: '🔷', order: 9 },
    solid: { label: 'Solid Colors', icon: '🎨', order: 10 },
    leather: { label: 'Leather', icon: '', order: 11 },
    outdoor: { label: 'Outdoor', icon: '', order: 11 }
}

function Swatch({
    label, color, thumbnail, active, onClick, onPrefetch,
}: {
    label: string
    color: string
    thumbnail?: string
    active: boolean
    onClick: () => void
    onPrefetch?: () => void
}) {
    return (
        <button
            onClick={onClick}
            onMouseEnter={onPrefetch}
            title={label}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: 'inherit', minWidth: 0,
            }}
        >
            <div
                style={{
                    position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 14,
                    backgroundColor: color,
                    backgroundImage: thumbnail ? `url(${thumbnail})` : undefined,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    border: active ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                    boxShadow: active ? `0 0 0 3px ${T.accentSoft}` : '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 120ms ease, border-color 120ms ease, transform 120ms ease',
                    outline: 'none',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
                {active && (
                    <div style={{
                        position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%',
                        background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8.5L6.2 12L13 4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}
            </div>
            <span style={{
                fontSize: 11.5, fontWeight: active ? 600 : 500, color: active ? T.text : T.textMuted,
                textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis', maxWidth: '100%',
            }}>
                {label}
            </span>
        </button>
    )
}

function SwatchGrid({ items, currentVal, onSelect, columns = 4 }: {
    items: { key: string; def: any }[]
    currentVal: string
    onSelect: (v: string) => void
    columns?: number
}) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 12 }}>
            {items.map(({ key, def }) => (
                <Swatch
                    key={key}
                    label={def.label ?? labelize(key)}
                    color={def.color ?? '#ccc'}
                    thumbnail={def.textureUrl}
                    active={key === currentVal}
                    onClick={() => onSelect(key)}
                    onPrefetch={() => { if (def.textureUrl) new Image().src = def.textureUrl }}
                />
            ))}
        </div>
    )
}

// ── Category sub-accordion — genuinely filters to just that category's
// items now (this was the bug: previously every expanded category rendered
// the SAME full unfiltered item list regardless of which one was clicked).
function CategoryRow({
    category, items, currentVal, onSelect, defaultOpen, columns,
}: {
    category: MaterialCategory
    items: { key: string; def: any }[]
    currentVal: string
    onSelect: (v: string) => void
    defaultOpen: boolean
    columns: number
}) {
    const [open, setOpen] = useState(defaultOpen)
    const meta = CATEGORY_META[category] ?? { label: labelize(category), icon: '📦', order: 999 }
    const hasActive = items.some(i => i.key === currentVal)

    return (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, marginTop: 10 }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '2px 0 10px', fontFamily: 'inherit', textAlign: 'left',
                }}
            >
                <span style={{ fontSize: 13 }}>{meta.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, flex: 1 }}>{meta.label}</span>
                <span style={{ fontSize: 10.5, color: T.textFaint }}>{items.length}</span>
                {hasActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, marginLeft: 2 }} />}
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
                    style={{ marginLeft: 2, transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}>
                    <path d="M4 2L8 6L4 10" stroke={T.textMuted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                // Scroll containment MUST use ScrollableList, not overflowY
                // directly — raw overflow doesn't work here because the 2D
                // canvas's native wheel listener hijacks scroll events
                // inside floating panels (documented app-wide constraint).
                <ScrollableList maxHeight={260}>
                    <div style={{ paddingBottom: 4 }}>
                        <SwatchGrid items={items} currentVal={currentVal} onSelect={onSelect} columns={columns} />
                    </div>
                </ScrollableList>
            )}
        </div>
    )
}

// ── Top-level material-domain accordion (Wall Materials / Floor Materials /
// Door Style). Collapsed by default so the Global Default Materials card
// doesn't render every category of every domain expanded at once.
function CategorizedMaterialGrid({
    icon, title, domain, currentVal, onSelect, columns = 4, defaultOpen = false,
}: {
    icon: string
    title: string
    domain: MaterialDomain
    currentVal: string
    onSelect: (v: string) => void
    columns?: number
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    const grouped = useMemo(() => getMaterialsByCategory(domain), [domain])
    const sortedCategories = useMemo(
        () => (Object.keys(grouped) as MaterialCategory[]).sort(
            (a, b) => (CATEGORY_META[a]?.order ?? 999) - (CATEGORY_META[b]?.order ?? 999)
        ),
        [grouped]
    )
    const activeLabel = useMemo(() => {
        for (const cat of sortedCategories) {
            const match = grouped[cat].find(i => i.key === currentVal)
            if (match) return match.def.label ?? labelize(match.key)
        }
        return labelize(currentVal)
    }, [sortedCategories, grouped, currentVal])

    return (
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 4 }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '14px 0', fontFamily: 'inherit', textAlign: 'left',
                }}
            >
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: 0.1 }}>{title}</span>
                <span style={{
                    fontSize: 11.5, color: T.textFaint, flex: 1, textAlign: 'right',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 8,
                }}>
                    {activeLabel}
                </span>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
                    style={{ marginLeft: 2, flexShrink: 0, transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}>
                    <path d="M4 2L8 6L4 10" stroke={T.textMuted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <div style={{ paddingBottom: 12 }}>
                    {sortedCategories.map((cat, idx) => {
                        const catItems = grouped[cat] // ← genuinely just this category's items
                        return (
                            <CategoryRow
                                key={cat}
                                category={cat}
                                items={catItems}
                                currentVal={currentVal}
                                onSelect={onSelect}
                                columns={columns}
                                defaultOpen={catItems.some(i => i.key === currentVal) || idx === 0}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: T.textFaint, margin: '4px 2px 10px' }}>
            {children}
        </div>
    )
}

function CollapsibleCard({
    title, subtitle, children, defaultOpen = false,
}: {
    title: string
    subtitle: string
    children: React.ReactNode
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: T.shadow, marginBottom: 10, overflow: 'hidden' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{title}</div>
                    <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subtitle}
                    </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{ flexShrink: 0, marginLeft: 10, transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }}>
                    <path d="M4 2L8 6L4 10" stroke={T.textMuted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && <div style={{ padding: '2px 14px 16px' }}>{children}</div>}
        </div>
    )
}

interface Props {
    fp: FloorPlanState
    config: SceneConfig
    onChange: (cfg: SceneConfig) => void
    onChangeFp?: (fp: FloorPlanState) => void
}

export function MaterialsPanel({ fp, config, onChange, onChangeFp }: Props) {
    const updateRoom = (roomId: string, changes: Partial<RoomSceneConfig>) => {
        const existing = config.rooms.find(r => r.roomId === roomId) ?? { roomId }
        const updated = { ...existing, ...changes }
        const newRooms = [...config.rooms.filter(r => r.roomId !== roomId), updated]
        onChange({ ...config, rooms: newRooms })
    }

    const derivedPolygons = useMemo(
        () => deriveClosedPolygons(fp.lineNodes, fp.lineSegments),
        [fp.lineNodes, fp.lineSegments]
    )

    const updateShape = (nodeIds: string[], matchedShape: ClosedShape | undefined, shapeLabel: string, patch: Partial<ClosedShape>) => {
        if (!onChangeFp) return
        let shapes = [...(fp.closedShapes ?? [])]
        if (matchedShape) {
            shapes = shapes.map(s => s.id === matchedShape.id ? { ...s, ...patch } : s)
        } else {
            shapes.push({ id: uid(), nodeIds: [...nodeIds], label: shapeLabel, color: '#8B7B6B', ...patch })
        }
        onChangeFp({ ...fp, closedShapes: shapes })
    }

    return (

        <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ScrollableList maxHeight={1200}>
                <div
                    style={{
                        background: T.bg,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
                        padding: '14px 16px 32px',
                    }}
                >
                    {/* ── GLOBAL DEFAULT MATERIALS ─────────────────────────── */}
                    <SectionHeading>Global Default Materials</SectionHeading>
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '4px 16px 6px', boxShadow: T.shadow, marginBottom: 22 }}>
                        <CategorizedMaterialGrid
                            icon="🧱" title="Wall Materials" domain="wall"
                            currentVal={config.globalWallMaterial || 'paint'}
                            onSelect={v => onChange({ ...config, globalWallMaterial: v as WallMaterial })}
                            columns={4}
                            defaultOpen
                        />
                        <CategorizedMaterialGrid
                            icon="🪵" title="Floor Materials" domain="floor"
                            currentVal={config.globalFloorMaterial || 'plain'}
                            onSelect={v => onChange({ ...config, globalFloorMaterial: v as FloorMaterial })}
                            columns={4}
                        />
                        <CategorizedMaterialGrid
                            icon="🚪" title="Door Style" domain="door"
                            currentVal={config.doorStyle}
                            onSelect={v => onChange({ ...config, doorStyle: v as DoorStyle })}
                            columns={4}
                        />
                    </div>

                    {/* ── ROOM OVERRIDES ───────────────────────────────────── */}
                    <SectionHeading>Room Overrides</SectionHeading>
                    {fp.rooms.length === 0 ? (
                        <div style={{ fontSize: 12.5, color: T.textFaint, padding: '10px 2px 20px' }}>No rooms yet.</div>
                    ) : (
                        <div style={{ marginBottom: 22 }}>
                            {fp.rooms.map(room => {
                                const roomOverride = config.rooms.find(r => r.roomId === room.id)
                                const activeWall = roomOverride?.wallMaterial || config.globalWallMaterial || 'paint'
                                const activeFloor = roomOverride?.floorMaterial || config.globalFloorMaterial || 'plain'
                                const hasOverride = Boolean(roomOverride?.wallMaterial || roomOverride?.floorMaterial)

                                return (
                                    <CollapsibleCard
                                        key={room.id}
                                        title={room.label || 'Unnamed Room'}
                                        subtitle={hasOverride ? `${labelize(activeWall)} · ${labelize(activeFloor)}` : 'Using global defaults'}
                                    >
                                        <CategorizedMaterialGrid
                                            icon="🧱" title="Wall" domain="wall" currentVal={activeWall}
                                            onSelect={v => updateRoom(room.id, { wallMaterial: v as WallMaterial })}
                                            columns={4}
                                        />
                                        <CategorizedMaterialGrid
                                            icon="🪵" title="Floor" domain="floor" currentVal={activeFloor}
                                            onSelect={v => updateRoom(room.id, { floorMaterial: v as FloorMaterial })}
                                            columns={4}
                                        />
                                    </CollapsibleCard>
                                )
                            })}
                        </div>
                    )}

                    {/* ── AREA OVERRIDES ───────────────────────────────────── */}
                    <SectionHeading>Area Overrides</SectionHeading>
                    {derivedPolygons.length === 0 ? (
                        <div style={{ fontSize: 12.5, color: T.textFaint, padding: '10px 2px' }}>
                            No closed areas detected. Connect line walls to form an enclosed shape.
                        </div>
                    ) : (
                        derivedPolygons.map((nodeIds, idx) => {
                            const nodeIdSet = new Set(nodeIds)
                            const matchedShape = (fp.closedShapes ?? []).find(s =>
                                s.nodeIds.length === nodeIds.length && s.nodeIds.every(id => nodeIdSet.has(id))
                            )
                            const shapeLabel = matchedShape?.label ?? `Area ${idx + 1}`
                            const activeWall = matchedShape?.wallMaterial || config.globalWallMaterial || 'paint'
                            const activeFloor = matchedShape?.floorMaterial || config.globalFloorMaterial || 'plain'
                            const hasOverride = Boolean(matchedShape?.wallMaterial || matchedShape?.floorMaterial)

                            return (
                                <CollapsibleCard
                                    key={idx}
                                    title={shapeLabel}
                                    subtitle={hasOverride ? `${labelize(activeWall)} · ${labelize(activeFloor)}` : 'Using global defaults'}
                                >
                                    <CategorizedMaterialGrid
                                        icon="🧱" title="Wall" domain="wall" currentVal={activeWall}
                                        onSelect={v => updateShape(nodeIds, matchedShape, shapeLabel, { wallMaterial: v as WallMaterial })}
                                        columns={4}
                                    />
                                    <CategorizedMaterialGrid
                                        icon="🪵" title="Floor" domain="floor" currentVal={activeFloor}
                                        onSelect={v => updateShape(nodeIds, matchedShape, shapeLabel, { floorMaterial: v as FloorMaterial })}
                                        columns={4}
                                    />
                                </CollapsibleCard>
                            )
                        })
                    )}
                </div>
            </ScrollableList>
        </div>
    )
}


export function matchClosedShape(
    nodeIds: string[],
    lineNodes: LineNode[],
    closedShapes: ClosedShape[],
): ClosedShape | undefined {
    const nodeIdSet = new Set(nodeIds)

    const exact = closedShapes.find(s =>
        s.nodeIds.length === nodeIds.length && s.nodeIds.every(id => nodeIdSet.has(id))
    )
    if (exact) return exact

    const nodeMap = new Map(lineNodes.map(n => [n.id, n]))
    const pts = nodeIds.map(id => nodeMap.get(id)).filter(Boolean) as LineNode[]
    if (pts.length < 3) return undefined

    const centroidAndArea = (points: LineNode[]) => {
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length
        const cz = points.reduce((s, p) => s + p.z, 0) / points.length
        let area = 0
        for (let i = 0; i < points.length; i++) {
            const a = points[i]!, b = points[(i + 1) % points.length]!
            area += a.x * b.z - b.x * a.z
        }
        return { cx, cz, area: Math.abs(area) / 2 }
    }

    const target = centroidAndArea(pts)

    let best: ClosedShape | undefined
    let bestScore = Infinity
    for (const s of closedShapes) {
        const sPts = s.nodeIds.map(id => nodeMap.get(id)).filter(Boolean) as LineNode[]
        if (sPts.length < 3) continue
        const candidate = centroidAndArea(sPts)

        const centroidDist = Math.hypot(target.cx - candidate.cx, target.cz - candidate.cz)
        const areaDiff = Math.abs(target.area - candidate.area)

        // Both centroid and area must be close — a room that genuinely
        // moved or resized a lot shouldn't silently inherit another
        // room's saved material. Tolerances are deliberately tight
        // (0.5m centroid drift, 10% area difference or 0.5m² absolute,
        // whichever is larger) since this is meant to catch incidental
        // node-id churn, not real geometry changes.
        if (centroidDist < 0.5 && areaDiff < Math.max(0.5, target.area * 0.1)) {
            const score = centroidDist + areaDiff
            if (score < bestScore) { bestScore = score; best = s }
        }
    }
    return best
}