'use client'

import { useState } from "react"
import { EditorTool } from "../lib/constants"
import { GroupButton } from "./GroupComponent"
import { TOOL_GROUPS } from "../lib/tool-constants"

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


export const DOOR_WINDOW_CURSOR = 'cell'

export const TOOL_CURSORS: Record<EditorTool, string> = {
    select: 'default',
    pan: 'grab',
    room: 'crosshair',
    pencil: 'crosshair',
    line: 'crosshair',
    bend: 'crosshair',
    'door-swing-single': DOOR_WINDOW_CURSOR,
    'door-swing-double': DOOR_WINDOW_CURSOR,
    'door-sliding': DOOR_WINDOW_CURSOR,
    'door-sliding-panorama': DOOR_WINDOW_CURSOR,   // NEW — 4-panel telescoping slider
    'door-pocket': DOOR_WINDOW_CURSOR,
    'door-folding': DOOR_WINDOW_CURSOR,
    'door-garage': DOOR_WINDOW_CURSOR,
    'window-fixed': DOOR_WINDOW_CURSOR,
    'window-sliding': DOOR_WINDOW_CURSOR,
    'window-casement': DOOR_WINDOW_CURSOR,
    'window-bay': DOOR_WINDOW_CURSOR,
    'window-skylight': DOOR_WINDOW_CURSOR,
    'opening-archway': DOOR_WINDOW_CURSOR,
    'opening-passage': DOOR_WINDOW_CURSOR,
    'railing-partial': DOOR_WINDOW_CURSOR,
    'stairs-straight': 'crosshair',
    'stairs-l': 'crosshair',
    'stairs-u': 'crosshair',
    'stairs-spiral': 'crosshair',
    'stairs-ramp': 'crosshair',
    elevator: 'crosshair',
    delete: 'not-allowed',
    annotate: 'crosshair',
    furniture: 'copy',
    'wall-decor-led': DOOR_WINDOW_CURSOR,
    'wall-decor-pvc': DOOR_WINDOW_CURSOR,
    'wall-decor-painting': DOOR_WINDOW_CURSOR,
    'light-ceiling-pendant': 'default',
    'light-ceiling-recessed': 'default',
    'light-floor-lamp': 'default',
    'light-wall-sconce': 'default',
    'outdoor-crosswalk': 'crosshair',
    'outdoor-dustbin': 'crosshair',
    'outdoor-bench': 'crosshair',
    'outdoor-mailbox': 'crosshair',
    'light-track': 'default',
    'light-chandelier': 'default',
    'light-shelf-strip': DOOR_WINDOW_CURSOR,
    'light-spotlight': 'default',
    'light-string': 'crosshair',
    'light-outdoor-bollard': 'default',
    led_tv: 'default',
    presets: 'default',           // NEW — opens a panel, doesn't draw on canvas
    'template-place': 'copy',     // NEW — armed placement, mirrors 'furniture' behavior
}
