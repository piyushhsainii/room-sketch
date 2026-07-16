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

            {/* All materials, flat — no category grouping/accordion */}
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
    )
}