import React, { useMemo, useState } from 'react'
import { UniversalMaterial } from './texture/universalMaterials'
import { COLOR, EASE, RADIUS, SPACE } from './texture/inspector-ui'

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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE.xxs }}>
                        <TextureTile
                            label="Default"
                            selected={!currentId}
                            onClick={onClear}
                            theme={theme}
                            swatch={DEFAULT_SWATCH}
                            title="Use scene default"
                            previewInset={10}
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

                    {/* Category list — each category is its own bordered card:
                        icon tile, label, count pill, chevron. The active/open
                        card picks up the accent border + tint + soft ring,
                        matching the reference "Fabric" row. Cards are spaced
                        apart (not a flush list with hairline dividers) so each
                        reads as a distinct tappable row. */}
                    {showCategories && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs, marginTop: 2 }}>
                            {groups.map(([cat, matList]) => {
                                const isCollapsed = collapsed[cat] ?? true
                                const isOpen = !isCollapsed
                                return (
                                    <div
                                        key={cat}
                                        style={{
                                            borderRadius: RADIUS.md,
                                            border: `1px solid ${isOpen ? COLOR.accent : theme.border}`,
                                            background: isOpen ? COLOR.accentSoft : COLOR.bgCard,
                                            boxShadow: isOpen ? `0 0 0 3px ${COLOR.accentSoft}` : 'none',
                                            overflow: 'hidden',
                                            transition: `border-color 180ms ${EASE}, background 180ms ${EASE}, box-shadow 180ms ${EASE}`,
                                        }}
                                    >
                                        <button
                                            onClick={() => setCollapsed(c => ({ ...c, [cat]: !isCollapsed }))}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: SPACE.xs, width: '100%',
                                                background: 'transparent', border: 'none', cursor: 'pointer',
                                                padding: '10px 12px', textAlign: 'left',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 40, height: 40, borderRadius: RADIUS.md, flexShrink: 0,
                                                    background: COLOR.accentSoft, color: COLOR.accent,
                                                }}
                                            >
                                                <CategoryIcon category={cat} />
                                            </div>

                                            <span style={{ fontSize: 14, fontWeight: 600, color: COLOR.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {cat}
                                            </span>

                                            <span style={{
                                                fontSize: 12, fontWeight: 700, color: COLOR.accent,
                                                background: COLOR.accentSoft, borderRadius: 999, padding: '2px 9px',
                                                flexShrink: 0, minWidth: 20, textAlign: 'center',
                                            }}>
                                                {matList.length}
                                            </span>

                                            <svg
                                                width="11" height="11" viewBox="0 0 10 10"
                                                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: `transform 200ms ${EASE}`, flexShrink: 0 }}
                                            >
                                                <path d="M2 3 L5 7 L8 3" stroke={COLOR.textMuted} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>

                                        {isOpen && (
                                            <div
                                                style={{
                                                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE.xxs,
                                                    maxHeight: MAX_CATEGORY_HEIGHT, overflowY: 'auto',
                                                    padding: '0 12px 12px',
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

                            {groups.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 0 2px', color: COLOR.textFaint }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                        <rect x="6" y="2" width="12" height="20" rx="6" />
                                        <line x1="12" y1="7" x2="12" y2="11" />
                                    </svg>
                                    <span style={{ fontSize: 10.5, fontWeight: 500 }}>Scroll to explore materials</span>
                                </div>
                            )}
                        </div>
                    )}

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

// Simple line icons per category, in the spirit of the reference design
// (paint roller / wallpaper roll / panel / brick / tiles / etc). Falls back
// to a generic swatch-grid glyph for any category name we don't recognize,
// so new/custom categories never render blank.
function CategoryIcon({ category }: { category: string }) {
    const key = category.trim().toLowerCase()
    const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

    switch (key) {
        case 'solid':
            return (
                <svg {...common}>
                    <path d="M12 3c3.2 3.6 5.5 6.6 5.5 9.5A5.5 5.5 0 016.5 12.5C6.5 9.6 8.8 6.6 12 3z" />
                </svg>
            )
        case 'wallpaper':
            return (
                <svg {...common}>
                    <rect x="4" y="3" width="7" height="18" rx="1.5" />
                    <path d="M8 6c1.5 1.5-1.5 3 0 4.5S6.5 14 8 15.5" />
                    <path d="M14 3v18M18 3v18" />
                </svg>
            )
        case 'pvc panel':
        case 'wall_panel_pvc':
            return (
                <svg {...common}>
                    <rect x="4" y="4" width="16" height="16" rx="1.5" />
                    <line x1="9" y1="4" x2="9" y2="20" />
                    <line x1="13.5" y1="4" x2="13.5" y2="20" />
                </svg>
            )
        case 'brick':
            return (
                <svg {...common}>
                    <rect x="3" y="4" width="18" height="16" rx="1" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="3" y1="16" x2="21" y2="16" />
                    <line x1="9" y1="4" x2="9" y2="10" />
                    <line x1="15" y1="10" x2="15" y2="16" />
                    <line x1="9" y1="16" x2="9" y2="20" />
                </svg>
            )
        case 'tiles':
            return (
                <svg {...common}>
                    <path d="M12 3l3.2 3.2-3.2 3.2-3.2-3.2L12 3z" />
                    <path d="M12 14.6l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2z" />
                    <path d="M3.4 12l3.2-3.2 3.2 3.2-3.2 3.2L3.4 12z" />
                    <path d="M14.2 12l3.2-3.2 3.2 3.2-3.2 3.2-3.2-3.2z" />
                </svg>
            )
        case 'concrete':
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="8.5" />
                    <circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" />
                    <circle cx="14.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
                    <circle cx="11" cy="15" r="1.1" fill="currentColor" stroke="none" />
                    <circle cx="15.5" cy="15" r="1.1" fill="currentColor" stroke="none" />
                </svg>
            )
        case 'fabric':
            return (
                <svg {...common}>
                    <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
                    <line x1="3.5" y1="9" x2="20.5" y2="9" />
                    <line x1="3.5" y1="14.5" x2="20.5" y2="14.5" />
                    <line x1="9" y1="3.5" x2="9" y2="20.5" />
                    <line x1="14.5" y1="3.5" x2="14.5" y2="20.5" />
                </svg>
            )
        case 'marble stone':
        case 'marble':
            return (
                <svg {...common}>
                    <path d="M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4L12 2.5z" />
                    <path d="M3.5 7.4L12 12l8.5-4.6" />
                    <path d="M12 12v9.5" />
                </svg>
            )
        case 'metal':
            return (
                <svg {...common}>
                    <line x1="6" y1="3" x2="18" y2="3" />
                    <line x1="6" y1="21" x2="18" y2="21" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
            )
        case 'wood':
            return (
                <svg {...common}>
                    <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
                    <path d="M3.5 8c3 0 3 2 6 2s3-2 6-2 3 2 5 2" />
                    <path d="M3.5 14c3 0 3 2 6 2s3-2 6-2 3 2 5 2" />
                </svg>
            )
        default:
            return (
                <svg {...common}>
                    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
                    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
                    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
                    <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
                </svg>
            )
    }
}

function TextureTile({
    label, selected, onClick, onHover, swatch, thumbnail, theme, title, previewInset = 0,
}: {
    label: string
    selected: boolean
    onClick: () => void
    onHover?: () => void
    swatch: string
    thumbnail?: string
    theme: { border: string; borderStrong: string; textMuted: string }
    title: string
    // Extra padding around the swatch/thumbnail square, shrinking just the
    // preview visual while the button keeps the same grid-cell footprint as
    // every other tile. Used for the Default (checkerboard) tile, which read
    // as oversized next to real material swatches.
    previewInset?: number
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
                    background: 'transparent',
                    overflow: 'hidden',
                    padding: previewInset,
                    boxSizing: 'border-box',
                    transition: `transform 180ms ${EASE}`,
                }}
            >
                <div
                    style={{
                        width: '100%', height: '100%', borderRadius: RADIUS.sm,
                        background: thumbnail ? undefined : swatch,
                        backgroundSize: previewInset ? '10px 10px' : undefined,
                        overflow: 'hidden',
                        position: 'relative',
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
            </div>
            <span style={{ fontSize: 9, fontWeight: 400, color: '#000000', letterSpacing: '-0.01em', textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
            </span>
        </button>
    )
}