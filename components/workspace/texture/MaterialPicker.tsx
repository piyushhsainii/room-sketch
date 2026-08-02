import React, { useMemo, useState } from 'react'
import { UniversalMaterial } from './universalMaterials'
import { COLOR, EASE, RADIUS, SPACE } from './inspector-ui'

const MAX_CATEGORY_HEIGHT = 216 // ~3 rows before internal scroll kicks in
const DEFAULT_SWATCH = 'repeating-conic-gradient(#D9D5C8 0% 25%, #FFFFFF 0% 50%) 0 0/10px 10px'

export function MaterialTexturePicker({
    items,
    currentId,
    onSelect,
    onClear,
    theme,
    label,
}: {
    items: UniversalMaterial[]
    currentId: string | undefined | null
    onSelect: (id: string) => void
    onClear: () => void
    theme: { border: string; borderStrong: string; textMuted: string }
    // Optional section label (e.g. "Floor Texture"). When provided it's rendered
    // on the same line as the search toggle, replacing the separate
    // SectionLabel + Divider that used to sit above this component.
    label?: string
}) {
    const [query, setQuery] = useState('')
    const [searchOpen, setSearchOpen] = useState(false)
    // The picker now opens on a single compact "current selection" row.
    // The full grid only mounts once the user taps that row (or the search icon).
    const [expanded, setExpanded] = useState(false)
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

    const current = items.find(m => m.id === currentId)

    const filtered = useMemo(() => {
        if (!query.trim()) return items
        const q = query.trim().toLowerCase()
        return items.filter(m => m.label.toLowerCase().includes(q))
    }, [items, query])

    const groups = useMemo(() => {
        const map = new Map<string, UniversalMaterial[]>()
        for (const m of filtered) {
            const cat = (m as any).category || 'Miscellaneous'
            if (!map.has(cat)) map.set(cat, [])
            map.get(cat)!.push(m)
        }
        return Array.from(map.entries())
    }, [filtered])

    const showCategories = items.length > 12 // small palettes (e.g. door/outdoor) skip the grouping UI

    const openSearch = () => {
        setSearchOpen(true)
        setExpanded(true)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
            {/* Header row: label + click-to-expand search, ALWAYS on a single line.
                justify-content: space-between anchors the label left / control right
                regardless of whether label is present, so this can't wrap onto two rows. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.xs, minHeight: 26 }}>
                {label && !searchOpen && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'uppercase', color: COLOR.textMuted, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {label}
                    </span>
                )}
                {searchOpen ? (
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onBlur={() => { if (!query.trim()) setSearchOpen(false) }}
                        placeholder={label ? `Search ${label.toLowerCase()}…` : 'Search textures…'}
                        style={{
                            height: 26, borderRadius: RADIUS.sm, flex: 1,
                            border: `1px solid ${theme.borderStrong}`,
                            background: COLOR.bgCard, color: COLOR.text, fontSize: 12,
                            padding: '0 8px', outline: 'none', minWidth: 0,
                        }}
                    />
                ) : (
                    <button
                        onClick={openSearch}
                        title="Search textures"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, borderRadius: RADIUS.sm, border: 'none',
                            background: 'transparent', cursor: 'pointer', color: COLOR.textMuted,
                            flexShrink: 0, marginLeft: 'auto',
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="7" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Compact single-row summary of the current selection. Tap to expand the full grid. */}
            <button
                onClick={() => setExpanded(e => !e)}
                style={{
                    display: 'flex', alignItems: 'center', gap: SPACE.xs, width: '100%',
                    padding: '2px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <div
                    style={{
                        width: 40, height: 40, borderRadius: RADIUS.md, overflow: 'hidden', flexShrink: 0,
                        background: current?.thumbnail ? undefined : (current?.swatch ?? DEFAULT_SWATCH),
                    }}
                >
                    {current?.thumbnail && (
                        <img src={current.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                </div>
                <span style={{ fontSize: 12.5, color: COLOR.text, fontWeight: 500, flex: 1 }}>
                    {current?.label ?? 'Default'}
                </span>
                <svg
                    width="10" height="10" viewBox="0 0 10 10"
                    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: `transform 200ms ${EASE}`, flexShrink: 0 }}
                >
                    <path d="M2 3 L5 7 L8 3" stroke={COLOR.textMuted} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {expanded && (
                <>
                    {/* Default / clear tile, always visible above the groups.
                        CSS grid (not flex-wrap) so a lone tile — or any
                        under-filled row — keeps the same column width as a
                        full row instead of stretching to fill the space. */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 80px)', gap: SPACE.xxs }}>
                        <TextureTile
                            label="Default"
                            selected={!currentId}
                            onClick={onClear}
                            theme={theme}
                            swatch={DEFAULT_SWATCH}
                            title="Use scene default"
                        />
                        {!showCategories && filtered.map(m => (
                            <TextureTile
                                key={m.id}
                                label={m.label}
                                selected={currentId === m.id}
                                onClick={() => onSelect(m.id)}
                                onHover={() => prefetch(m)}
                                swatch={m.swatch}
                                thumbnail={m.thumbnail}
                                theme={theme}
                                title={m.label}
                            />
                        ))}
                    </div>

                    {showCategories && groups.map(([cat, matList]) => {
                        const isCollapsed = collapsed[cat] ?? true
                        return (
                            <div key={cat} style={{ borderTop: `1px solid ${theme.border}`, paddingTop: SPACE.xxs }}>
                                <button
                                    onClick={() => setCollapsed(c => ({ ...c, [cat]: !isCollapsed }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        padding: '4px 2px', color: COLOR.textMuted,
                                    }}
                                >
                                    <svg
                                        width="10" height="10" viewBox="0 0 10 10"
                                        style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: `transform 200ms ${EASE}`, flexShrink: 0 }}
                                    >
                                        <path d="M2 3 L5 7 L8 3" stroke={COLOR.textMuted} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
                                        {cat}
                                    </span>
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, color: COLOR.textFaint,
                                        background: COLOR.bgSubtle, borderRadius: 999, padding: '1px 7px', marginLeft: 2,
                                    }}>
                                        {matList.length}
                                    </span>
                                </button>

                                {!isCollapsed && (
                                    <div
                                        style={{
                                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 80px)', gap: SPACE.xxs,
                                            maxHeight: MAX_CATEGORY_HEIGHT, overflowY: 'auto',
                                            padding: 0,
                                        }}
                                    >
                                        {matList.map(m => (
                                            <TextureTile
                                                key={m.id}
                                                label={m.label}
                                                selected={currentId === m.id}
                                                onClick={() => onSelect(m.id)}
                                                onHover={() => prefetch(m)}
                                                swatch={m.swatch}
                                                thumbnail={m.thumbnail}
                                                theme={theme}
                                                title={m.label}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {showCategories && groups.length === 0 && (
                        <div style={{ fontSize: 11.5, color: COLOR.textFaint, padding: '8px 2px' }}>
                            No textures match "{query}"
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// Hover-prefetch: with thumbnails lazy-loaded in the tile itself, this makes
// select-on-first-click feel instant for the item the user is about to pick,
// without forcing everything to load upfront.
function prefetch(m: UniversalMaterial) {
    if (m.textureUrl) {
        const img = new Image()
        img.src = m.textureUrl
    }
}

function TextureTile({
    label, selected, onClick, onHover, swatch, thumbnail, theme, title,
}: {
    label: string
    selected: boolean
    onClick: () => void
    onHover?: () => void
    swatch: string
    thumbnail?: string
    theme: { border: string; borderStrong: string; textMuted: string }
    title: string
}) {
    return (
        <button
            onClick={onClick}
            onMouseEnter={onHover}
            title={title}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                // Fills its CSS grid cell (grid columns are fixed-size and shared
                // across every row — see the grid containers below — so this no
                // longer needs its own width logic or a flex-basis to avoid
                // stretching on under-filled rows).
                width: '100%',
                padding: '4px 2px', borderRadius: RADIUS.md, cursor: 'pointer',
                border: selected ? `2px solid ${COLOR.accent}` : 'none',
                background: selected ? COLOR.accentSoft : 'transparent',
                boxShadow: selected ? `0 0 0 3px ${COLOR.accentSoft}` : 'none',
                transition: `border-color 180ms ${EASE}, box-shadow 180ms ${EASE}, transform 180ms ${EASE}`,
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%', aspectRatio: '1 / 1', borderRadius: RADIUS.sm,
                    // No more white card background/border behind the preview —
                    // the swatch or thumbnail now fills the tile directly.
                    background: thumbnail ? undefined : swatch,
                    overflow: 'hidden',
                    transition: `transform 180ms ${EASE}`,
                }}
            >
                {/* NOTE: m.thumbnail currently equals the full-res textureUrl for every
                    registry entry with a real texture (see thumbnailFromDef in
                    textureCategorize.ts — there's no lighter preview asset yet).
                    loading="lazy" defers fetch until the tile is in/near the viewport,
                    but any tile that *is* visible still pulls the full-res file.
                    Generating real thumbnail-sized previews is a separate follow-up. */}
                {thumbnail && (
                    <img
                        src={thumbnail}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                )}
            </div>
            <span style={{ fontSize: 9, fontWeight: 400, color: '#000000', letterSpacing: '-0.01em', textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
            </span>
        </button>
    )
}