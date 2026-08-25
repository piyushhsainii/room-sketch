'use client'

import { useLayoutEffect, useRef, useState } from "react"
import { EditorTool, ToolGroup } from "../lib/constants"
import { GroupButton } from "./GroupComponent"

const CLAY = {
    canvas: "#E5E5E5",
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
}

export function Toolbar({
    tool,
    setTool,
    orientation = 'vertical',
    registerAnchor,
    toolGroups,
}: {
    tool: EditorTool
    setTool: (t: EditorTool) => void
    orientation?: 'vertical' | 'horizontal'
    registerAnchor?: (groupId: string, el: HTMLDivElement | null) => void
    toolGroups: ToolGroup[]
}) {
    const [lastUsed, setLastUsed] = useState<Record<string, EditorTool>>({})
    const containerRef = useRef<HTMLDivElement>(null)
    const buttonRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; left: number; size: number } | null>(null)

    const activeGroup = toolGroups.find(g => g.leaves.some(l => l.id === tool))

    const handleSelect = (groupId: string, leafId: EditorTool) => {
        setLastUsed(prev => ({ ...prev, [groupId]: leafId }))
        setTool(leafId)
    }

    const setButtonNode = (groupId: string) => (el: HTMLDivElement | null) => {
        buttonRefs.current[groupId] = el
        registerAnchor?.(groupId, el)
    }

    useLayoutEffect(() => {
        if (!activeGroup || !containerRef.current) { setIndicatorStyle(null); return }
        const btnEl = buttonRefs.current[activeGroup.id]
        if (!btnEl) return
        const containerRect = containerRef.current.getBoundingClientRect()
        const btnRect = btnEl.getBoundingClientRect()
        setIndicatorStyle({
            top: btnRect.top - containerRect.top,
            left: btnRect.left - containerRect.left,
            size: btnRect.width, // buttons are square (48px)
        })
    }, [tool, activeGroup, orientation])

    return (
        <div
            ref={containerRef}
            className="ra-toolbar"
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: orientation === 'vertical' ? 'column' : 'row',
                gap: 8,
                padding: 8,
                borderRadius: 20,
                background: CLAY.surface,
                boxShadow: `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`,
                fontFamily: CLAY.font,
                // Scroll when the tool list is taller than the viewport, but
                // never show a visible scrollbar track/thumb — the clay
                // panel should read as a fixed physical object, not a
                // scrollable list.
                maxHeight: orientation === 'vertical' ? 'calc(100vh - 140px)' : undefined,
                maxWidth: orientation === 'horizontal' ? 'calc(100vw - 140px)' : undefined,
                overflowY: orientation === 'vertical' ? 'auto' : 'visible',
                overflowX: orientation === 'horizontal' ? 'auto' : 'visible',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // old Edge/IE
            }}
        >
            {/* Hide the scrollbar in WebKit browsers (Chrome/Safari) and make
                every icon read as crisp, high-contrast, "popping out" clay —
                dark stroke + a soft drop shadow instead of whatever faint
                color the icon library defaults to. */}
            <style>{`
                .ra-toolbar::-webkit-scrollbar { display: none; }
                .ra-toolbar svg {
                    stroke: ${CLAY.textPrimary} !important;
                    filter: drop-shadow(0 1px 0.5px rgba(255,255,255,0.6));
                }
                .ra-toolbar svg[fill]:not([fill="none"]) {
                    fill: ${CLAY.textPrimary} !important;
                }
            `}</style>

            {/* Sliding active-tool indicator — recessed clay "pressed" square
                instead of an indigo-outlined highlight */}
            {indicatorStyle && (
                <div
                    style={{
                        position: 'absolute',
                        top: indicatorStyle.top,
                        left: indicatorStyle.left,
                        width: indicatorStyle.size,
                        height: indicatorStyle.size,
                        borderRadius: 14,
                        background: CLAY.surface,
                        border: 'none',
                        boxShadow: `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`,
                        transition: 'top 220ms cubic-bezier(0.34,1.56,0.64,1), left 220ms cubic-bezier(0.34,1.56,0.64,1)',
                        pointerEvents: 'none',
                        zIndex: 0,
                    }}
                />
            )}

            {toolGroups.map(group => (
                <div key={group.id} style={{ position: 'relative', zIndex: 1 }} ref={setButtonNode(group.id)}>
                    <GroupButton
                        group={group}
                        activeTool={tool}
                        lastUsed={lastUsed}
                        onSelect={(leafId) => handleSelect(group.id, leafId)}
                    />
                </div>
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