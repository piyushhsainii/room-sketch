import { useState } from "react";
import { FloorPlanState, FURNITURE_LABELS, OPENING_VARIANT_LABELS, STAIRS_LABELS, WALL_DECOR_LABELS } from "../lib/constants";
import { OUTDOOR_OBJECT_LABELS } from "../lib/outdoor-constants"
import { THEME } from "../FloorPlanEditor";

type SceneGraphEntry = { id: string; label: string; sub?: string }

function buildSceneGraph(fp: FloorPlanState) {
    const rooms: SceneGraphEntry[] = fp.rooms.map(r => ({ id: r.id, label: r.label, sub: `${r.width.toFixed(1)}×${r.depth.toFixed(1)}m` }))

    const roomWalls: SceneGraphEntry[] = fp.rooms.flatMap(r =>
        (['north', 'south', 'east', 'west'] as const).map(w => ({
            id: `${r.id}::wall::${w}`,
            label: `${r.label} — ${w[0].toUpperCase()}${w.slice(1)} wall`,
        }))
    )
    const lineWalls: SceneGraphEntry[] = fp.lineSegments.map((s, i) => ({ id: s.id, label: `Line wall ${i + 1}`, sub: `${s.nodeIds.length} nodes` }))
    const walls = [...roomWalls, ...lineWalls]

    const doors: SceneGraphEntry[] = fp.openings.filter(o => o.type === 'door').map((o, i) => ({
        id: o.id, label: OPENING_VARIANT_LABELS[o.variant ?? o.type] ?? 'Door', sub: `${o.width.toFixed(1)}m`,
    }))
    const windows: SceneGraphEntry[] = fp.openings.filter(o => o.type === 'window').map((o, i) => ({
        id: o.id, label: OPENING_VARIANT_LABELS[o.variant ?? o.type] ?? 'Window', sub: `${o.width.toFixed(1)}m`,
    }))
    const passages: SceneGraphEntry[] = fp.openings.filter(o => o.type === 'opening').map((o, i) => ({
        id: o.id, label: OPENING_VARIANT_LABELS[o.variant ?? o.type] ?? 'Opening', sub: `${o.width.toFixed(1)}m`,
    }))

    const furniture: SceneGraphEntry[] = (fp.furniture ?? []).map(f => ({
        id: f.id, label: FURNITURE_LABELS[f.type] ?? f.type,
    }))
    const stairs: SceneGraphEntry[] = (fp.stairs ?? []).map(s => ({
        id: s.id, label: STAIRS_LABELS[s.type] ?? s.type,
    }))

    const wallDecor: SceneGraphEntry[] = (fp.wallDecor ?? []).map(d => ({
        id: d.id, label: WALL_DECOR_LABELS[d.type],
    }))

    const lights: SceneGraphEntry[] = (fp.lights ?? []).map(l => ({
        id: l.id,
        label: LIGHT_FIXTURE_LABELS[l.type],
        sub: l.type === 'string_lights' ? `${(l.pathNodeIds ?? []).length} pts` : undefined,
    }))

    // NEW — same gap for outdoor objects (crosswalk/dustbin/bench/mailbox
    // and now the bollard light).
    const outdoorObjects: SceneGraphEntry[] = (fp.outdoorObjects ?? []).map(o => ({
        id: o.id, label: OUTDOOR_OBJECT_LABELS[o.type],
    }))

    const annotations: SceneGraphEntry[] = (fp.annotations ?? []).filter(a => a.text).map(a => ({ id: a.id, label: a.text }))

    return [
        { key: 'furniture', label: 'Furniture', entries: furniture },
        { key: 'stairs', label: 'Stairs / Elevators', entries: stairs },
        { key: 'walls', label: 'Walls', entries: walls },
        { key: 'doors', label: 'Doors', entries: doors },
        { key: 'windows', label: 'Windows', entries: windows },
        { key: 'openings', label: 'Openings', entries: passages },
        { key: 'rooms', label: 'Rooms', entries: rooms },
        { key: 'lights', label: 'Lights', entries: lights },
        { key: 'outdoor', label: 'Outdoor Objects', entries: outdoorObjects },
        { key: 'annotations', label: 'Labels', entries: annotations },
        { key: 'walldecor', label: 'Wall Decor', entries: wallDecor },
    ]
}

import { ScrollableList } from "../../ui/ScrollableList"
import { LIGHT_FIXTURE_LABELS } from "../lights-constant";

export function SceneGraphPanel({ fp, selectedId, onSelect }: {
    fp: FloorPlanState
    selectedId: string | null
    onSelect: (id: string) => void
}) {
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})  // ← closed by default
    const groups = buildSceneGraph(fp)

    return (
        <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(100,116,139,0.6)', padding: '2px 6px 6px' }}>SCENE GRAPH</div>
            <ScrollableList maxHeight={320}>
                {groups.map(g => (
                    <div key={g.key}>
                        <button
                            onClick={() => setOpenGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                                height: 30, padding: '0 6px', background: 'transparent', border: 'none',
                                cursor: 'pointer', borderRadius: 6, color: THEME.text, fontSize: 12, fontWeight: 600,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                                style={{ transform: openGroups[g.key] ? 'rotate(90deg)' : 'none', transition: 'transform 120ms', flexShrink: 0 }}>
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                            <span style={{ flex: 1, textAlign: 'left' }}>{g.label}</span>
                            <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.6)', fontWeight: 400 }}>{g.entries.length}</span>
                        </button>
                        {openGroups[g.key] && g.entries.map(entry => (
                            <button
                                key={entry.id}
                                onClick={() => onSelect(entry.id)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                                    height: 26, padding: '0 6px 0 26px', background: selectedId === entry.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                                    border: 'none', cursor: 'pointer', borderRadius: 6,
                                    color: selectedId === entry.id ? THEME.accent : 'rgba(71,85,105,0.85)', fontSize: 11.5,
                                }}
                                onMouseEnter={e => { if (selectedId !== entry.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
                                onMouseLeave={e => { if (selectedId !== entry.id) e.currentTarget.style.background = 'transparent' }}
                            >
                                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label}</span>
                                {entry.sub && <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.5)', flexShrink: 0 }}>{entry.sub}</span>}
                            </button>
                        ))}
                        {openGroups[g.key] && g.entries.length === 0 && (
                            <div style={{ padding: '4px 6px 6px 26px', fontSize: 10.5, color: 'rgba(100,116,139,0.4)' }}>None yet</div>
                        )}
                    </div>
                ))}
            </ScrollableList>
        </div>
    )
}