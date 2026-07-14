// components/workspace/MaterialsPanel.tsx
'use client'

import React, { useMemo, useState } from 'react'
import {
    FloorPlanState,
    FLOOR_MAT_DEFS,
    WALL_MAT_DEFS,
    FloorMaterial,
    WallMaterial,
    DOOR_STYLES,
    DoorStyle,
    ClosedShape,
} from './Tools/constants'
import { SceneConfig, RoomSceneConfig } from './FloorPlanEditor'
import { deriveClosedPolygons } from '@/lib/helpers'
import { DOOR_TEXTURE_MATERIALS, WALL_TEXTURE_MATERIALS } from './Tools/textureMaterials'

function uid() { return Math.random().toString(36).slice(2, 9) }

// ─────────────────────────────────────────────────────────────
// THEME — soft neutral surfaces, single indigo accent, generous
// radii/spacing. Deliberately restrained: the textures are the
// color, chrome should stay quiet.
// ─────────────────────────────────────────────────────────────
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

function labelize(v: string) {
    return v.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─────────────────────────────────────────────────────────────
// Swatch — a single tappable material tile. Shows a real texture
// thumbnail when available, otherwise a flat color fill.
// ─────────────────────────────────────────────────────────────
function Swatch({
    label,
    color,
    thumbnail,
    active,
    onClick,
}: {
    label: string
    color: string
    thumbnail?: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            title={label}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                minWidth: 0,
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: 14,
                    backgroundColor: color,
                    backgroundImage: thumbnail ? `url(${thumbnail})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: active ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                    boxShadow: active
                        ? `0 0 0 3px ${T.accentSoft}`
                        : '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 120ms ease, border-color 120ms ease, transform 120ms ease',
                    outline: 'none',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
                {active && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: T.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                        }}
                    >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8.5L6.2 12L13 4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}
            </div>
            <span
                style={{
                    fontSize: 11.5,
                    fontWeight: active ? 600 : 500,
                    color: active ? T.text : T.textMuted,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                }}
            >
                {label}
            </span>
        </button>
    )
}

// ─────────────────────────────────────────────────────────────
// MaterialGrid — replaces the old horizontal-scroll strip with a
// responsive wrapping grid, so far more textures are visible at
// once with no extra scroll container fighting the panel's own.
// ─────────────────────────────────────────────────────────────
interface GridItem { key: string; label: string; color: string; thumbnail?: string }

function MaterialGrid({
    icon,
    title,
    items,
    currentVal,
    onSelect,
    columns = 4,
}: {
    icon: string
    title: string
    items: GridItem[]
    currentVal: string
    onSelect: (v: string) => void
    columns?: number
}) {
    return (
        <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text, letterSpacing: 0.1 }}>{title}</span>
                <div style={{ flex: 1, height: 1, background: T.border, marginLeft: 2 }} />
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    gap: 12,
                }}
            >
                {items.map(item => (
                    <Swatch
                        key={item.key}
                        label={item.label}
                        color={item.color}
                        thumbnail={item.thumbnail}
                        active={item.key === currentVal}
                        onClick={() => onSelect(item.key)}
                    />
                ))}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// SectionHeading
// ─────────────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: T.textFaint,
                margin: '4px 2px 10px',
            }}
        >
            {children}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// CollapsibleCard — smooth chevron rotation, subtle hover state,
// summary chip showing the active materials at a glance.
// ─────────────────────────────────────────────────────────────
function CollapsibleCard({
    title,
    subtitle,
    children,
    defaultOpen = false,
}: {
    title: string
    subtitle: string
    children: React.ReactNode
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div
            style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                boxShadow: T.shadow,
                marginBottom: 10,
                overflow: 'hidden',
            }}
        >
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '13px 14px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{title}</div>
                    <div
                        style={{
                            fontSize: 11.5,
                            color: T.textFaint,
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {subtitle}
                    </div>
                </div>
                <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{
                        flexShrink: 0,
                        marginLeft: 10,
                        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 160ms ease',
                    }}
                >
                    <path d="M4 2L8 6L4 10" stroke={T.textMuted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <div style={{ padding: '2px 14px 16px' }}>
                    {children}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
interface Props {
    fp: FloorPlanState
    config: SceneConfig
    onChange: (cfg: SceneConfig) => void
    onChangeFp?: (fp: FloorPlanState) => void
}

export function MaterialsPanel({ fp, config, onChange, onChangeFp }: Props) {
    const wallItems: GridItem[] = useMemo(
        () => Object.entries(WALL_MAT_DEFS).map(([key, def]: [string, any]) => ({
            key,
            label: def.label ?? labelize(key),
            color: def.swatch ?? def.color ?? '#ccc',
            thumbnail: WALL_TEXTURE_MATERIALS[key]?.map,
        })),
        []
    )

    const floorItems: GridItem[] = useMemo(
        () => Object.entries(FLOOR_MAT_DEFS).map(([key, def]: [string, any]) => ({
            key,
            label: def.label ?? labelize(key),
            color: def.swatch ?? def.color ?? '#ccc',
            thumbnail: def.thumbnail,
        })),
        []
    )

    const doorItems: GridItem[] = useMemo(
        () => DOOR_STYLES.map(d => ({
            key: d.value,
            label: d.label,
            color: d.color,
            thumbnail: DOOR_TEXTURE_MATERIALS[d.value]?.map,
        })),
        []
    )

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

    // ── SCROLL CONTAINER ─────────────────────────────────────
    // This is the single element that owns vertical scroll for the
    // whole panel: flex column, flex:1, overflowY:auto, minHeight:0.
    // No nested scroll containers inside (grids below wrap, they
    // don't scroll horizontally), so there's exactly one scrollbar
    // and it always tracks content height correctly.
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                background: T.bg,
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
                padding: '14px 16px 32px',
                WebkitOverflowScrolling: 'touch',
            }}
        >
            {/* ── GLOBAL DEFAULT MATERIALS ─────────────────────────── */}
            <SectionHeading>Global Default Materials</SectionHeading>
            <div
                style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 16,
                    padding: '18px 16px 6px',
                    boxShadow: T.shadow,
                    marginBottom: 22,
                }}
            >
                <MaterialGrid
                    icon="🧱" title="Wall Materials"
                    items={wallItems} currentVal={config.globalWallMaterial || 'paint'}
                    onSelect={v => onChange({ ...config, globalWallMaterial: v as WallMaterial })}
                    columns={4}
                />
                <MaterialGrid
                    icon="🪵" title="Floor Materials"
                    items={floorItems} currentVal={config.globalFloorMaterial || 'plain'}
                    onSelect={v => onChange({ ...config, globalFloorMaterial: v as FloorMaterial })}
                    columns={4}
                />
                <MaterialGrid
                    icon="🚪" title="Door Style"
                    items={doorItems} currentVal={config.doorStyle}
                    onSelect={v => onChange({ ...config, doorStyle: v as DoorStyle })}
                    columns={4}
                />
            </div>

            {/* ── ROOM OVERRIDES ───────────────────────────────────── */}
            <SectionHeading>Room Overrides</SectionHeading>
            {fp.rooms.length === 0 ? (
                <div style={{ fontSize: 12.5, color: T.textFaint, padding: '10px 2px 20px' }}>
                    No rooms yet.
                </div>
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
                                <MaterialGrid
                                    icon="🧱" title="Wall" items={wallItems} currentVal={activeWall}
                                    onSelect={v => updateRoom(room.id, { wallMaterial: v as WallMaterial })}
                                    columns={4}
                                />
                                <MaterialGrid
                                    icon="🪵" title="Floor" items={floorItems} currentVal={activeFloor}
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
                            <MaterialGrid
                                icon="🧱" title="Wall" items={wallItems} currentVal={activeWall}
                                onSelect={v => updateShape(nodeIds, matchedShape, shapeLabel, { wallMaterial: v as WallMaterial })}
                                columns={4}
                            />
                            <MaterialGrid
                                icon="🪵" title="Floor" items={floorItems} currentVal={activeFloor}
                                onSelect={v => updateShape(nodeIds, matchedShape, shapeLabel, { floorMaterial: v as FloorMaterial })}
                                columns={4}
                            />
                        </CollapsibleCard>
                    )
                })
            )}
        </div>
    )
}