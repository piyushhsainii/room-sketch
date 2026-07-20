'use client'

import { useCallback, useRef, useState } from 'react'

import type { RoomConfig, SceneRoom, WorkspaceConfig } from '@/types/workspace'
import { DEFAULT_WORKSPACE_CONFIG } from '@/types/workspace'
import { DOOR_STYLES, DoorStyle, FloorMaterial } from './lib/constants'

type Props = {
    projectId: string
    rooms: SceneRoom[]
    config: WorkspaceConfig
    onConfigChange: (config: WorkspaceConfig) => void
}

const FLOOR_MATERIALS: { value: FloorMaterial; label: string; color: string }[] = [
    { value: 'marble', label: 'Marble', color: '#EDE9E4' },
    { value: 'concrete', label: 'Concrete', color: '#9C9C9C' },
    { value: 'brick-red', label: 'Concrete', color: '#9C9C9C' },
    { value: 'brick-white', label: 'Concrete', color: '#9C9C9C' },
    { value: 'concrete', label: 'Concrete', color: '#9C9C9C' },
    { value: 'fabric', label: 'Concrete', color: '#9C9C9C' },
    { value: 'marble', label: 'Concrete', color: '#9C9C9C' },
    { value: 'marble-black', label: 'Concrete', color: '#9C9C9C' },
    { value: 'marble-white', label: 'Concrete', color: '#9C9C9C' },
    { value: 'plain', label: 'Concrete', color: '#9C9C9C' },
    { value: 'plaster', label: 'Concrete', color: '#9C9C9C' },
    { value: 'solid-beige', label: 'Concrete', color: '#9C9C9C' },
    { value: 'solid-black', label: 'Concrete', color: '#9C9C9C' },
    { value: 'solid-gray', label: 'Concrete', color: '#9C9C9C' },
    { value: 'solid-white', label: 'Concrete', color: '#9C9C9C' },
    { value: 'tile-ceramic', label: 'Concrete', color: '#9C9C9C' },
    { value: 'tiles', label: 'Concrete', color: '#9C9C9C' },
    { value: 'wood', label: 'Concrete', color: '#9C9C9C' },
    { value: 'wood-oak', label: 'Concrete', color: '#9C9C9C' },
    { value: 'wood-walnut', label: 'Concrete', color: '#9C9C9C' },
]

const WALL_PRESETS = [
    { label: 'Warm White', color: '#F5F0E8' },
    { label: 'Cream', color: '#EAE6DF' },
    { label: 'Warm Beige', color: '#D4B896' },
    { label: 'Warm Brown', color: '#6B4E35' },
    { label: 'Dark Walnut', color: '#3A2E22' },
    { label: 'Slate Grey', color: '#8A8A8A' },
    { label: 'Sage Green', color: '#8FAF8A' },
    { label: 'Navy', color: '#2C3E6B' },
    { label: 'Terracotta', color: '#C4714A' },
    { label: 'Blush', color: '#D4A0A0' },
    { label: 'Teal', color: '#4A9E9E' },
    { label: 'Charcoal', color: '#2C2C2C' },
]


function getRoomConfig(config: WorkspaceConfig, roomId: string, room: SceneRoom): RoomConfig {
    return config.rooms.find(r => r.roomId === roomId) ?? {
        roomId,
        wallColor: room.wall_color,
        floorMaterial: room.floor_material,
    }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(148,163,184,0.5)',
            marginBottom: 8,
        }}>
            {children}
        </div>
    )
}

function ColorGrid({
    selected,
    onChange,
}: {
    selected: string
    onChange: (color: string) => void
}) {
    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 5,
                marginBottom: 8,
            }}>
                {WALL_PRESETS.map(p => (
                    <button
                        key={p.color}
                        type="button"
                        title={p.label}
                        onClick={() => onChange(p.color)}
                        style={{
                            height: 26,
                            borderRadius: 5,
                            border: selected === p.color
                                ? '2px solid rgba(99,102,241,1)'
                                : '1px solid rgba(255,255,255,0.08)',
                            background: p.color,
                            cursor: 'pointer',
                            transition: 'transform 100ms, border 100ms',
                            transform: selected === p.color ? 'scale(1.08)' : 'scale(1)',
                            boxShadow: selected === p.color
                                ? '0 0 0 3px rgba(99,102,241,0.25)'
                                : 'none',
                        }}
                    />
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                    type="color"
                    value={selected}
                    onChange={e => onChange(e.target.value)}
                    style={{
                        width: 32,
                        height: 28,
                        padding: 2,
                        borderRadius: 5,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'transparent',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                />
                <code style={{
                    fontSize: 11,
                    color: 'rgba(165,168,255,0.85)',
                    background: 'rgba(99,102,241,0.1)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    letterSpacing: '0.05em',
                }}>
                    {selected.toUpperCase()}
                </code>
                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', marginLeft: 'auto' }}>
                    custom
                </span>
            </div>
        </div>
    )
}

function FloorMaterialPicker({
    selected,
    onChange,
}: {
    selected: FloorMaterial
    onChange: (m: FloorMaterial) => void
}) {
    return (
        <div style={{ display: 'flex', gap: 5 }}>
            {FLOOR_MATERIALS.map(m => (
                <button
                    key={m.value}
                    type="button"
                    title={m.label}
                    onClick={() => onChange(m.value)}
                    style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 7,
                        border: selected === m.value
                            ? '2px solid rgba(99,102,241,0.9)'
                            : '1px solid rgba(255,255,255,0.08)',
                        background: m.color,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 120ms',
                        boxShadow: selected === m.value
                            ? '0 0 0 3px rgba(99,102,241,0.2)'
                            : 'none',
                        transform: selected === m.value ? 'translateY(-1px)' : 'none',
                    }}
                >
                    {selected === m.value && (
                        <span style={{
                            position: 'absolute',
                            top: 2,
                            right: 3,
                            fontSize: 9,
                            color: 'white',
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                        }}>✓</span>
                    )}
                    <span style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        fontSize: 8,
                        fontWeight: 600,
                        textAlign: 'center',
                        padding: '2px 0',
                        background: 'rgba(0,0,0,0.45)',
                        color: 'rgba(255,255,255,0.9)',
                        borderRadius: '0 0 5px 5px',
                        letterSpacing: '0.03em',
                    }}>
                        {m.label}
                    </span>
                </button>
            ))}
        </div>
    )
}

function Toggle({
    label,
    emoji,
    value,
    onChange,
}: {
    label: string
    emoji: string
    value: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            style={{
                width: '100%',
                height: 36,
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.12)',
                background: value ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                color: value ? 'rgba(165,168,255,0.95)' : 'rgba(148,163,184,0.65)',
                fontSize: 12,
                fontWeight: value ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 150ms',
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span>{emoji}</span>
                <span>{label}</span>
            </span>
            {/* Toggle switch */}
            <span style={{
                width: 34,
                height: 18,
                borderRadius: 99,
                background: value ? 'rgba(99,102,241,0.85)' : 'rgba(148,163,184,0.25)',
                position: 'relative',
                transition: 'background 200ms',
                flexShrink: 0,
            }}>
                <span style={{
                    position: 'absolute',
                    top: 3,
                    left: value ? 17 : 3,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 200ms',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
            </span>
        </button>
    )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function WorkspaceConfigPanel({ projectId, rooms, config, onConfigChange }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [savedState, setSavedState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [activeTab, setActiveTab] = useState<'rooms' | 'scene'>('rooms')
    const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id ?? '')
    const [applyToAll, setApplyToAll] = useState(false)
    const saveTimer = useRef<number | null>(null)

    const updateRoomConfig = useCallback((
        roomId: string,
        patch: Partial<RoomConfig>,
        allRooms = false
    ) => {
        let updatedRooms: RoomConfig[]

        if (allRooms) {
            // Apply to every room
            updatedRooms = rooms.map(room => {
                const existing = config.rooms.find(r => r.roomId === room.id)
                const base: RoomConfig = existing ?? {
                    roomId: room.id,
                    wallColor: room.wall_color,
                    floorMaterial: room.floor_material,
                }
                return { ...base, ...patch }
            })
        } else {
            const room = rooms.find(r => r.id === roomId)
            if (!room) return
            const base: RoomConfig = config.rooms.find(r => r.roomId === roomId) ?? {
                roomId,
                wallColor: room.wall_color,
                floorMaterial: room.floor_material,
            }
            const patched = { ...base, ...patch }
            updatedRooms = config.rooms.some(r => r.roomId === roomId)
                ? config.rooms.map(r => r.roomId === roomId ? patched : r)
                : [...config.rooms, patched]
        }

        onConfigChange({ ...config, rooms: updatedRooms })
        setSavedState('idle')
    }, [config, rooms, onConfigChange])

    const updateScene = useCallback((patch: Partial<WorkspaceConfig>) => {
        onConfigChange({ ...config, ...patch })
        setSavedState('idle')
    }, [config, onConfigChange])

    const handleSave = useCallback(async () => {
        setSavedState('saving')
        try {
            const res = await fetch('/api/workspace/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId, config }),
            })
            if (!res.ok) {
                const body = await res.json() as { error?: string }
                throw new Error(body.error ?? 'Save failed')
            }
            setSavedState('saved')
            if (saveTimer.current) window.clearTimeout(saveTimer.current)
            saveTimer.current = window.setTimeout(() => setSavedState('idle'), 2500)
        } catch {
            setSavedState('error')
            if (saveTimer.current) window.clearTimeout(saveTimer.current)
            saveTimer.current = window.setTimeout(() => setSavedState('idle'), 3000)
        }
    }, [projectId, config])

    const selectedRoom = rooms.find(r => r.id === selectedRoomId)
    const selectedRoomCfg = selectedRoom
        ? getRoomConfig(config, selectedRoomId, selectedRoom)
        : null

    // ── Trigger button ──────────────────────────────────────────────────────────
    const triggerButton = (
        <button
            type="button"
            onClick={() => setIsOpen(v => !v)}
            style={{
                position: 'absolute',
                bottom: 200,
                left: 16,
                zIndex: 16,
                height: 30,
                padding: '0 11px',
                borderRadius: 7,
                border: isOpen
                    ? '1px solid rgba(99,102,241,0.5)'
                    : '1px solid rgba(148,163,184,0.18)',
                background: isOpen
                    ? 'rgba(99,102,241,0.18)'
                    : 'rgba(12,10,8,0.72)',
                backdropFilter: 'blur(12px)',
                color: isOpen
                    ? 'rgba(165,168,255,0.95)'
                    : 'rgba(148,163,184,0.75)',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 180ms ease',
                whiteSpace: 'nowrap',
            }}
        >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2" />
            </svg>
            {isOpen ? 'Close Config' : 'Edit Workspace'}
        </button>
    )

    if (!isOpen) return triggerButton

    return (
        <>
            {triggerButton}

            {/* Panel */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 232,   // sits just above trigger button
                    left: 16,
                    zIndex: 15,
                    width: 300,
                    maxHeight: 460,
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(10,9,7,0.92)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '12px 16px 0',
                    background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                    }}>
                        <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'rgba(226,232,240,0.9)',
                            letterSpacing: '0.02em',
                        }}>
                            Scene Configuration
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            style={{
                                width: 22, height: 22,
                                borderRadius: 5,
                                border: 'none',
                                background: 'rgba(255,255,255,0.06)',
                                color: 'rgba(148,163,184,0.6)',
                                fontSize: 14,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 150ms',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        >
                            ×
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: 2,
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 8,
                        padding: 3,
                        marginBottom: 0,
                    }}>
                        {(['rooms', 'scene'] as const).map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    flex: 1,
                                    height: 28,
                                    borderRadius: 6,
                                    border: 'none',
                                    background: activeTab === tab
                                        ? 'rgba(99,102,241,0.75)'
                                        : 'transparent',
                                    color: activeTab === tab
                                        ? 'white'
                                        : 'rgba(148,163,184,0.65)',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 150ms',
                                    letterSpacing: '0.03em',
                                }}
                            >
                                {tab === 'rooms' ? '🏠  Rooms' : '✨  Scene'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable body */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '14px 16px',
                    scrollbarWidth: 'none',
                }}>

                    {/* ── ROOMS TAB ───────────────────────────────────────────────────── */}
                    {activeTab === 'rooms' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {/* Room selector */}
                            <div>
                                <SectionLabel>Select Room</SectionLabel>
                                <select
                                    value={selectedRoomId}
                                    onChange={e => setSelectedRoomId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: 34,
                                        borderRadius: 7,
                                        border: '1px solid rgba(148,163,184,0.15)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'rgba(226,232,240,0.9)',
                                        fontSize: 12,
                                        padding: '0 10px',
                                        cursor: 'pointer',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(148,163,184,0.6)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 10px center',
                                        paddingRight: 30,
                                        outline: 'none',
                                    }}
                                >
                                    {rooms.map(r => (
                                        <option
                                            key={r.id}
                                            value={r.id}
                                            style={{ background: '#1a1814', color: 'rgba(226,232,240,0.9)' }}
                                        >
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Apply to all toggle */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '7px 10px',
                                borderRadius: 7,
                                background: applyToAll
                                    ? 'rgba(99,102,241,0.1)'
                                    : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${applyToAll ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                cursor: 'pointer',
                                transition: 'all 150ms',
                            }}
                                onClick={() => setApplyToAll(v => !v)}
                            >
                                <span style={{
                                    width: 28, height: 16,
                                    borderRadius: 99,
                                    background: applyToAll ? 'rgba(99,102,241,0.85)' : 'rgba(148,163,184,0.25)',
                                    position: 'relative',
                                    transition: 'background 200ms',
                                    flexShrink: 0,
                                }}>
                                    <span style={{
                                        position: 'absolute', top: 2,
                                        left: applyToAll ? 13 : 2,
                                        width: 12, height: 12,
                                        borderRadius: '50%',
                                        background: 'white',
                                        transition: 'left 200ms',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                    }} />
                                </span>
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: applyToAll ? 'rgba(165,168,255,0.9)' : 'rgba(148,163,184,0.6)',
                                }}>
                                    Apply changes to all rooms
                                </span>
                            </div>

                            {selectedRoom && selectedRoomCfg && (
                                <>
                                    {/* Wall color */}
                                    <div>
                                        <SectionLabel>Wall Color</SectionLabel>
                                        <ColorGrid
                                            selected={selectedRoomCfg.wallColor}
                                            onChange={color =>
                                                updateRoomConfig(selectedRoomId, { wallColor: color }, applyToAll)
                                            }
                                        />
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                                    {/* Floor material */}
                                    <div>
                                        <SectionLabel>Floor Material</SectionLabel>
                                        <FloorMaterialPicker
                                            selected={selectedRoomCfg.floorMaterial}
                                            onChange={m =>
                                                updateRoomConfig(selectedRoomId, { floorMaterial: m }, applyToAll)
                                            }
                                        />
                                    </div>
                                    {/* Door Style */}
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                                    <div>
                                        <SectionLabel>Door Style</SectionLabel>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 6,
                                        }}>
                                            {DOOR_STYLES.map(d => (
                                                <button
                                                    key={d.value}
                                                    type="button"
                                                    onClick={() => {
                                                        onConfigChange({ ...config, doorStyle: d.value })
                                                        setSavedState('idle')
                                                    }}
                                                    style={{
                                                        height: 40,
                                                        borderRadius: 7,
                                                        border: config.doorStyle === d.value
                                                            ? '1.5px solid rgba(99,102,241,0.85)'
                                                            : '1px solid rgba(255,255,255,0.08)',
                                                        background: config.doorStyle === d.value
                                                            ? 'rgba(99,102,241,0.12)'
                                                            : 'rgba(255,255,255,0.03)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '0 10px',
                                                        transition: 'all 130ms',
                                                        boxShadow: config.doorStyle === d.value
                                                            ? '0 0 0 3px rgba(99,102,241,0.15)'
                                                            : 'none',
                                                    }}
                                                >
                                                    {/* Color swatch */}
                                                    <span style={{
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: 4,
                                                        background: d.color,
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        flexShrink: 0,
                                                        ...(d.color ? { opacity: 0.5 } : {}),
                                                    }} />
                                                    <span style={{
                                                        fontSize: 11,
                                                        fontWeight: config.doorStyle === d.value ? 600 : 400,
                                                        color: config.doorStyle === d.value
                                                            ? 'rgba(165,168,255,0.95)'
                                                            : 'rgba(148,163,184,0.75)',
                                                        textAlign: 'left',
                                                        lineHeight: 1.2,
                                                    }}>
                                                        {d.label}
                                                    </span>
                                                    {config.doorStyle === d.value && (
                                                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(99,102,241,0.9)' }}>✓</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── SCENE TAB ───────────────────────────────────────────────────── */}
                    {activeTab === 'scene' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                            {/* Ambient light slider */}
                            <div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 6,
                                }}>
                                    <SectionLabel>Ambient Light</SectionLabel>
                                    <code style={{
                                        fontSize: 11,
                                        color: 'rgba(165,168,255,0.85)',
                                        background: 'rgba(99,102,241,0.1)',
                                        padding: '1px 5px',
                                        borderRadius: 3,
                                    }}>
                                        {config.ambientIntensity.toFixed(1)}
                                    </code>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="range"
                                        min={0.5} max={4.0} step={0.1}
                                        value={config.ambientIntensity}
                                        onChange={e => updateScene({ ambientIntensity: parseFloat(e.target.value) })}
                                        style={{
                                            width: '100%',
                                            accentColor: 'rgba(99,102,241,0.9)',
                                            cursor: 'pointer',
                                            height: 4,
                                        }}
                                    />
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: 9,
                                        color: 'rgba(148,163,184,0.4)',
                                        marginTop: 2,
                                    }}>
                                        <span>dim</span><span>bright</span>
                                    </div>
                                </div>
                            </div>

                            {/* Wall roughness slider */}
                            <div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 6,
                                }}>
                                    <SectionLabel>Wall Roughness</SectionLabel>
                                    <code style={{
                                        fontSize: 11,
                                        color: 'rgba(165,168,255,0.85)',
                                        background: 'rgba(99,102,241,0.1)',
                                        padding: '1px 5px',
                                        borderRadius: 3,
                                    }}>
                                        {config.wallRoughness.toFixed(2)}
                                    </code>
                                </div>
                                <input
                                    type="range"
                                    min={0.1} max={1.0} step={0.05}
                                    value={config.wallRoughness}
                                    onChange={e => updateScene({ wallRoughness: parseFloat(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        accentColor: 'rgba(99,102,241,0.9)',
                                        cursor: 'pointer',
                                    }}
                                />
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: 9,
                                    color: 'rgba(148,163,184,0.4)',
                                    marginTop: 2,
                                }}>
                                    <span>glossy</span><span>matte</span>
                                </div>
                            </div>

                            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                            {/* Toggles */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <Toggle
                                    label="Show Furniture"
                                    emoji="🛋"
                                    value={config.showFurniture}
                                    onChange={v => updateScene({ showFurniture: v })}
                                />
                                <Toggle
                                    label="Show Room Labels"
                                    emoji="🏷"
                                    value={config.showLabels}
                                    onChange={v => updateScene({ showLabels: v })}
                                />
                                <Toggle
                                    label="Atmospheric Fog"
                                    emoji="🌫"
                                    value={config.fogEnabled}
                                    onChange={v => updateScene({ fogEnabled: v })}
                                />
                            </div>

                            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                            {/* Reset */}
                            <button
                                type="button"
                                onClick={() => {
                                    onConfigChange({ ...DEFAULT_WORKSPACE_CONFIG, rooms: config.rooms })
                                    setSavedState('idle')
                                }}
                                style={{
                                    height: 30,
                                    borderRadius: 7,
                                    border: '1px solid rgba(148,163,184,0.15)',
                                    background: 'transparent',
                                    color: 'rgba(148,163,184,0.55)',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    transition: 'all 150ms',
                                    letterSpacing: '0.02em',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(148,163,184,0.15)')}
                            >
                                Reset scene to defaults
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.2)',
                }}>
                    {savedState === 'error' && (
                        <div style={{
                            fontSize: 11,
                            color: 'rgba(248,113,113,0.9)',
                            marginBottom: 8,
                            textAlign: 'center',
                        }}>
                            ⚠ Failed to save. Please try again.
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={savedState === 'saving'}
                        style={{
                            width: '100%',
                            height: 36,
                            borderRadius: 8,
                            border: 'none',
                            background: savedState === 'saved'
                                ? 'rgba(34,197,94,0.75)'
                                : savedState === 'error'
                                    ? 'rgba(239,68,68,0.75)'
                                    : 'rgba(99,102,241,0.85)',
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: savedState === 'saving' ? 'wait' : 'pointer',
                            transition: 'background 300ms',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 7,
                            letterSpacing: '0.03em',
                            boxShadow: savedState === 'idle'
                                ? '0 2px 8px rgba(99,102,241,0.3)'
                                : 'none',
                        }}
                    >
                        {savedState === 'saving' && <>⏳ Saving...</>}
                        {savedState === 'saved' && <>✓ Saved successfully</>}
                        {savedState === 'error' && <>✗ Save failed — retry</>}
                        {savedState === 'idle' && (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                Save Configuration
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    )
}