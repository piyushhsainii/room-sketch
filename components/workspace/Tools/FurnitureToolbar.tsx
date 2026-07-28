import React from 'react'
import * as Icons from 'lucide-react'
import {
    getFurnitureByCategory,
    isFurnitureNew,
    FurnitureCategory,
} from '../lib/constants'
import { FurnitureType } from '../lib/furniture-constants'

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

export function FurnitureToolbar({
    onSelect,
}: {
    onSelect: (type: FurnitureType) => void
}) {
    const grouped = React.useMemo(() => getFurnitureByCategory(), [])

    return (
        <div className="flex flex-col gap-4 p-3 overflow-y-auto">
            {(Object.keys(grouped) as FurnitureCategory[]).map((cat) => (
                <div key={cat}>
                    <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                        {CATEGORY_LABELS[cat]}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {grouped[cat].map((item) => {
                            const Icon = (Icons as any)[item.icon] ?? Icons.Box
                            const isNew = isFurnitureNew(item)
                            return (
                                <button
                                    key={item.type}
                                    onClick={() => onSelect(item.type)}
                                    className="relative flex flex-col items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 py-3 px-2 transition-colors"
                                >
                                    {isNew && (
                                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-blue-500 text-white text-[10px] leading-none px-1.5 py-1 font-semibold shadow-sm">
                                            New
                                        </span>
                                    )}
                                    <Icon className="w-5 h-5 text-neutral-700" />
                                    <span className="text-xs text-neutral-600 text-center leading-tight">
                                        {item.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}