'use client'

import { useState } from "react"
import { EditorTool, TOOL_GROUPS } from "./constants"
import { GroupButton } from "./GroupComponent"

export function Toolbar({
    tool,
    setTool,
    orientation = 'vertical',
    registerAnchor, // NEW
}: {
    tool: EditorTool
    setTool: (t: EditorTool) => void
    orientation?: 'vertical' | 'horizontal'
    registerAnchor?: (groupId: string, el: HTMLDivElement | null) => void // NEW
}) {
    const [lastUsed, setLastUsed] = useState<Record<string, EditorTool>>({})

    const handleSelect = (groupId: string, leafId: EditorTool) => {
        setLastUsed(prev => ({ ...prev, [groupId]: leafId }))
        setTool(leafId)
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: orientation === 'vertical' ? 'column' : 'row',
            gap: 6,
        }}>
            {TOOL_GROUPS.map(group => (
                <GroupButton
                    key={group.id}
                    group={group}
                    activeTool={tool}
                    lastUsed={lastUsed}
                    onSelect={(leafId) => handleSelect(group.id, leafId)}
                    registerAnchor={registerAnchor}
                />
            ))}
        </div>
    )
}