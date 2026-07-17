import React from 'react'
import { UniversalMaterial } from './universalMaterials'

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
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {/* Default tile */}
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

            {/* All materials, flat — no category grouping/accordion.
                FIX: previously this rendered every card's thumbnail as a CSS
                backgroundImage, which the browser fetches immediately and
                unconditionally on mount — with ~30 wall + ~30 floor entries
                mounting simultaneously whenever a room is selected (including
                on initial load, when a room is restored from saved config),
                that meant ~60 full-resolution texture requests fired at once.
                Swapping to a real <img loading="lazy"> lets the browser defer
                fetching until each card is actually near the viewport, so a
                picker with many entries no longer front-loads every texture.
                NOTE: m.thumbnail currently equals the full-res textureUrl for
                every registry entry with a real texture (see
                thumbnailFromDef in textureCategorize.ts — there's no lighter
                preview asset yet). loading="lazy" reduces the initial burst
                to roughly what's in/near the viewport, but any thumbnail that
                *is* visible still pulls the full 1K file. Generating actual
                thumbnail-sized preview images is a separate follow-up. */}
            {items.map(m => (
                <button
                    key={m.id}
                    onClick={() => onSelect(m.id)}
                    onMouseEnter={() => {
                        // Re-added hover-prefetch: with thumbnails now lazy,
                        // this is what makes select-on-first-click feel
                        // instant again for the item the user is about to
                        // pick, without forcing everything to load upfront.
                        if (m.textureUrl) {
                            const img = new Image()
                            img.src = m.textureUrl
                        }
                    }}
                    title={m.label}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        width: 52, padding: '6px 2px', borderRadius: 8, cursor: 'pointer',
                        border: currentId === m.id ? '2px solid #6366F1' : `1px solid ${theme.borderStrong}`,
                        background: currentId === m.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: 28, height: 28, borderRadius: 6,
                            backgroundColor: m.swatch,
                            overflow: 'hidden',
                            border: `1px solid ${theme.borderStrong}`,
                        }}
                    >
                        {m.thumbnail && (
                            <img
                                src={m.thumbnail}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                style={{
                                    position: 'absolute', inset: 0,
                                    width: '100%', height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        )}
                    </div>
                    <span style={{ fontSize: 8.5, color: theme.textMuted, textAlign: 'center', lineHeight: 1.15 }}>
                        {m.label}
                    </span>
                </button>
            ))}
        </div>
    )
}