'use client'

// Abstracted out of the inline furniture <div> that used to live directly
// in FloorPlanEditor.tsx's JSX (see chat history). Now plugged in via
// TOOL_GROUPS' `furniture` entry as `renderFlyout`, so it opens on hover
// through GroupButton like every other tool group, instead of being a
// separate tool-driven portal.
//
// NOTE: this needs `furnitureByCategory`, `openFurnitureCats`,
// `setOpenFurnitureCats`, `selectedFurnitureType`, `setSelectedFurnitureType`,
// `CATEGORY_LABELS`, `isFurnitureNew`, `Icons` — all previously local state/
// helpers inside FloorPlanEditor.tsx. I don't have their exact declarations
// (types, where selectedFurnitureType lives, etc.) so this component takes
// them as props rather than assuming FloorPlanEditor's internals — wire the
// actual values through TOOL_GROUPS' renderFlyout call site. If you'd
// rather this component own that state itself (via a hook/context) instead
// of prop-drilling through TOOL_GROUPS, say so and I'll restructure.

import { ScrollableList } from "../ui/ScrollableList" // ADJUST PATH
import * as Icons from "lucide-react" // ADJUST if different icon lib
import { FurnitureCategory } from "./lib/constants"
import { COLOR } from "./texture/inspector-ui"

export function FurnitureFlyoutContent({
    furnitureByCategory,
    openFurnitureCats,
    setOpenFurnitureCats,
    selectedFurnitureType,
    setSelectedFurnitureType,
    categoryLabels,
    isFurnitureNew,
    onSelect, // from GroupButton's renderFlyout ctx — call after picking a type
    // if selecting furniture should also switch `tool` to 'furniture'
}: {
    furnitureByCategory: Record<string, any[]>
    openFurnitureCats: Set<FurnitureCategory>
    setOpenFurnitureCats: (updater: (prev: Set<FurnitureCategory>) => Set<FurnitureCategory>) => void
    selectedFurnitureType: string | null
    setSelectedFurnitureType: (id: string) => void
    categoryLabels: Record<FurnitureCategory, string>
    isFurnitureNew: (entry: any) => boolean
    onSelect: (tool: any) => void
}) {
    return (
        <ScrollableList maxHeight={340}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(Object.keys(furnitureByCategory) as FurnitureCategory[]).map(catId => {
                    const items = furnitureByCategory[catId]
                    if (!items || items.length === 0) return null
                    const isOpen = openFurnitureCats.has(catId)
                    return (
                        <div
                            key={catId}
                            style={{
                                borderRadius: 10,
                                border: `1px solid ${isOpen ? COLOR.accentBorder : COLOR.border}`,
                                background: isOpen ? COLOR.accentSoft : 'transparent',
                                overflow: 'hidden',
                                transition: 'border-color 150ms, background 150ms',
                            }}
                        >
                            <button
                                onClick={() => setOpenFurnitureCats(prev => {
                                    const next = new Set(prev)
                                    next.has(catId) ? next.delete(catId) : next.add(catId)
                                    return next
                                })}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 10px', background: 'transparent', border: 'none',
                                    cursor: 'pointer', textAlign: 'left',
                                }}
                            >
                                <span style={{
                                    fontSize: 13, fontWeight: 600, flex: 1, color: COLOR.text,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {categoryLabels[catId]}
                                </span>
                                <span style={{
                                    fontSize: 10.5, fontWeight: 700, color: COLOR.accent,
                                    background: COLOR.accentSoft, borderRadius: 999,
                                    padding: '1px 7px', flexShrink: 0, minWidth: 18, textAlign: 'center',
                                }}>
                                    {items.length}
                                </span>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={COLOR.textMuted} strokeWidth="2.5"
                                    style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }}>
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>

                            {isOpen && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px 8px' }}>
                                    {items.map(catalogEntry => {
                                        const id = catalogEntry.type
                                        const isNew = isFurnitureNew(catalogEntry)
                                        const Icon = (Icons as any)[catalogEntry.icon] ?? Icons.Box
                                        const selected = selectedFurnitureType === id
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => {
                                                    setSelectedFurnitureType(id)
                                                    onSelect('furniture' as any)
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    padding: '6px 8px', borderRadius: 8, border: 'none',
                                                    background: selected ? COLOR.accentSoft : 'transparent',
                                                    cursor: 'pointer', textAlign: 'left', width: '100%',
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                                                    background: selected ? COLOR.accentSoftHover : COLOR.bgSubtle,
                                                }}>
                                                    <Icon size={14} strokeWidth={1.8} color={selected ? COLOR.accent : COLOR.textMuted} />
                                                </div>
                                                <span style={{
                                                    flex: 1, fontSize: 12, fontWeight: selected ? 600 : 400,
                                                    color: selected ? COLOR.accent : COLOR.text,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {catalogEntry.label}
                                                </span>
                                                {isNew && (
                                                    <span style={{
                                                        fontSize: 9, fontWeight: 700, letterSpacing: '0.02em',
                                                        color: '#fff', background: COLOR.accent,
                                                        borderRadius: 4, padding: '2px 5px', flexShrink: 0,
                                                    }}>
                                                        NEW
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </ScrollableList>
    )
}