import React, { useState } from 'react'
import { CATEGORY_META, MaterialCategory } from './textureCategorize'
import { UniversalMaterial } from './universalMaterials'

/**
 * Generic material/texture picker used anywhere in the props panel where a
 * selected object (room, wall, wall segment, door, furniture) needs a
 * material override. Groups the given items by category with collapsible
 * sub-sections, and always includes a "Default" tile that clears the
 * override (falls back to whatever the scene-wide/global default is).
 */
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
    const grouped = React.useMemo(() => {
        const map = new Map<MaterialCategory, UniversalMaterial[]>()
        for (const item of items) {
            if (!map.has(item.category)) map.set(item.category, [])
            map.get(item.category)!.push(item)
        }
        return Array.from(map.entries()).sort(
            (a, b) => CATEGORY_META[a[0]].order - CATEGORY_META[b[0]].order
        )
    }, [items])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Default tile — always visible, not nested in a category */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                <button
                    onClick={onClear}
                    title="Use scene default"
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        width: 52, padding: '6px 2px', borderRadius: 8, cursor: 'pointer',
                        border: !currentId ? '2px solid #6366F1' : `1px solid ${theme.borderStrong}`,
                        background: !currentId ? 'rgba(99,102,241,0.08)' : 'transparent',
                    }}
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: 'repeating-conic-gradient(#D4D4D4 0% 25%, #FFFFFF 0% 50%) 0 0/10px 10px',
                        border: `1px solid ${theme.borderStrong}`,
                    }} />
                    <span style={{ fontSize: 8.5, color: theme.textMuted, textAlign: 'center', lineHeight: 1.15 }}>
                        Default
                    </span>
                </button>
            </div>

            {grouped.map(([cat, catItems]) => (
                <CategorySection
                    key={cat}
                    category={cat}
                    items={catItems}
                    currentId={currentId}
                    onSelect={onSelect}
                    theme={theme}
                    defaultOpen={catItems.some(i => i.id === currentId)}
                />
            ))}
        </div>
    )
}

function CategorySection({
    category, items, currentId, onSelect, theme, defaultOpen,
}: {
    category: MaterialCategory
    items: UniversalMaterial[]
    currentId: string | undefined | null
    onSelect: (id: string) => void
    theme: { border: string; borderStrong: string; textMuted: string }
    defaultOpen: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    const meta = CATEGORY_META[category]
    const hasActive = items.some(i => i.id === currentId)

    return (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 6 }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '2px 0 6px', fontFamily: 'inherit', textAlign: 'left',
                }}
            >
                <span style={{ fontSize: 11 }}>{meta.icon}</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: theme.textMuted, flex: 1 }}>
                    {meta.label}
                </span>
                <span style={{ fontSize: 9.5, color: theme.textMuted }}>{items.length}</span>
                {hasActive && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366F1' }} />
                )}
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
                    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}>
                    <path d="M4 2L8 6L4 10" stroke={theme.textMuted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 8 }}>
                    {items.map(m => (
                        <button
                            key={m.id}
                            onClick={() => onSelect(m.id)}
                            title={m.label}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                width: 52, padding: '6px 2px', borderRadius: 8, cursor: 'pointer',
                                border: currentId === m.id ? '2px solid #6366F1' : `1px solid ${theme.borderStrong}`,
                                background: currentId === m.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                            }}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 6,
                                backgroundColor: m.swatch,
                                backgroundImage: m.thumbnail ? `url(${m.thumbnail})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                border: `1px solid ${theme.borderStrong}`,
                            }} />
                            <span style={{ fontSize: 8.5, color: theme.textMuted, textAlign: 'center', lineHeight: 1.15 }}>
                                {m.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}