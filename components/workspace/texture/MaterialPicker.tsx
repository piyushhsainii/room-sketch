import React, { useEffect, useMemo, useState } from 'react'
import { UniversalMaterial } from './universalMaterials'
import { COLOR, EASE, RADIUS, SPACE } from './inspector-ui'

const MAX_CATEGORY_HEIGHT = 216 // ~3 rows before internal scroll kicks in

const SCROLLBAR_STYLE_ID = 'inspector-themed-scrollbar'

/** Injects a themed thin/rounded scrollbar once per document. Firefox gets
 *  scrollbar-color/-width via the class; WebKit gets the ::-webkit-scrollbar
 *  rules, which can only be defined in a real stylesheet, not inline styles. */
function useThemedScrollbar() {
    useEffect(() => {
        if (document.getElementById(SCROLLBAR_STYLE_ID)) return
        const style = document.createElement('style')
        style.id = SCROLLBAR_STYLE_ID
        style.textContent = `
            .inspector-scroll {
                scrollbar-width: thin;
                scrollbar-color: ${COLOR.borderStrong} transparent;
            }
            .inspector-scroll::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            .inspector-scroll::-webkit-scrollbar-track {
                background: transparent;
            }
            .inspector-scroll::-webkit-scrollbar-thumb {
                background-color: transparent;
                border-radius: 999px;
                transition: background-color 150ms ${EASE};
            }
            .inspector-scroll:hover::-webkit-scrollbar-thumb {
                background-color: ${COLOR.borderStrong};
            }
            .inspector-scroll::-webkit-scrollbar-thumb:hover {
                background-color: ${COLOR.accent};
            }
        `
        document.head.appendChild(style)
    }, [])
}

export function MaterialTexturePicker({
    items,
    currentId,
    onSelect,
    onClear,
    theme,
}: {
    items: UniversalMaterial[]
    currentId: string | undefined | null
    onSelect: (id: string) => void
    onClear: () => void
    theme: { border: string; borderStrong: string; textMuted: string }
}) {
    const [query, setQuery] = useState('')
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
            {showCategories && (
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search textures…"
                    style={{
                        height: 32, borderRadius: RADIUS.sm, width: '100%',
                        border: `1px solid ${theme.borderStrong}`,
                        background: COLOR.bgCard, color: COLOR.text, fontSize: 12.5,
                        padding: '0 10px', outline: 'none',
                    }}
                />
            )}

            {/* Default / clear tile, always visible above the groups */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.xxs }}>
                <TextureTile
                    label="Default"
                    selected={!currentId}
                    onClick={onClear}
                    theme={theme}
                    swatch="repeating-conic-gradient(#D9D5C8 0% 25%, #FFFFFF 0% 50%) 0 0/10px 10px"
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
                const isCollapsed = collapsed[cat] ?? false
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
                            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
                                    display: 'flex', flexWrap: 'wrap', gap: SPACE.xxs,
                                    maxHeight: MAX_CATEGORY_HEIGHT, overflowY: 'auto',
                                    padding: '4px 2px',
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
        </div>
    )
}

// Re-added hover-prefetch: with thumbnails lazy-loaded in the tile itself,
// this is what makes select-on-first-click feel instant again for the item
// the user is about to pick, without forcing everything to load upfront.
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
                width: 60, padding: '6px 4px', borderRadius: RADIUS.md, cursor: 'pointer',
                border: selected ? `2px solid ${COLOR.accent}` : `1px solid ${theme.borderStrong}`,
                background: selected ? COLOR.accentSoft : COLOR.bgCard,
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
                    width: 36, height: 36, borderRadius: RADIUS.sm,
                    backgroundColor: swatch,
                    background: thumbnail ? undefined : swatch,
                    overflow: 'hidden',
                    border: `1px solid ${theme.borderStrong}`,
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
            <span style={{ fontSize: 9, color: theme.textMuted, textAlign: 'center', lineHeight: 1.2, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
            </span>
        </button>
    )
}