import React, { useState } from 'react'
import * as Icons from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import {
    getFurnitureByCategory,
    isFurnitureNew,
    FurnitureCategory,
} from '../lib/constants'
import { getPreviewUrl } from '../mesh/furniture-model-registry'

const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
    seating: 'Seating',
    tables: 'Tables',
    bedroom: 'Bedroom',
    kitchen: 'Kitchen',
    bathroom: 'Bathroom',
    storage: 'Storage',
    decor: 'Decor',
    lighting: 'Lighting',
    wall: 'Wall',
}

function FurnitureThumb({ type, icon }: { type: string; icon: string }) {
    const previewUrl = getPreviewUrl(type)
    const Icon = (Icons as any)[icon] ?? Icons.Box

    if (previewUrl) {
        return (
            <img
                src={previewUrl}
                alt=""
                className="w-9 h-9 rounded-md object-cover shrink-0 bg-neutral-100"
                loading="lazy"
                onError={(e) => {
                    ; (e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
            />
        )
    }
    return (
        <div className="w-9 h-9 rounded-md bg-neutral-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-neutral-500" />
        </div>
    )
}

function CategorySection({
    cat,
    items,
    onSelect,
    defaultOpen,
}: {
    cat: FurnitureCategory
    items: ReturnType<typeof getFurnitureByCategory>[FurnitureCategory]
    onSelect: (type: string) => void
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(!!defaultOpen)

    return (
        <div className="border-b border-neutral-200 last:border-b-0">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-2 px-1 py-3.5 text-left"
            >
                <ChevronDown
                    className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${open ? '' : '-rotate-90'
                        }`}
                />
                <span className="text-[13px] font-semibold text-neutral-700 tracking-wide uppercase">
                    {CATEGORY_LABELS[cat]}
                </span>
                <span className="text-[13px] text-neutral-400">{items.length}</span>
            </button>

            {open && (
                <div className="pb-3 flex flex-col gap-1">
                    {items.map((item) => {
                        const isNew = isFurnitureNew(item)
                        return (
                            <button
                                key={item.type}
                                onClick={() => onSelect(item.type)}
                                className="group relative w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-neutral-100 transition-colors"
                            >
                                <FurnitureThumb type={item.type} icon={item.icon} />
                                <span className="text-sm text-neutral-700">
                                    {item.label}
                                </span>
                                {isNew && (
                                    <span className="ml-auto rounded-full bg-neutral-800 text-white text-[10px] leading-none px-2 py-1 font-semibold">
                                        New
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export function FurnitureToolbar({
    onSelect,
}: {
    onSelect: (type: string) => void
}) {
    const grouped = React.useMemo(() => getFurnitureByCategory(), [])
    const categories = Object.keys(grouped) as FurnitureCategory[]

    return (
        <div className="flex flex-col px-3 bg-[#f5f4f0] overflow-y-auto">
            {categories.map((cat, i) => (
                <CategorySection
                    key={cat}
                    cat={cat}
                    items={grouped[cat]}
                    onSelect={onSelect}
                    defaultOpen={i === 0}
                />
            ))}
        </div>
    )
}