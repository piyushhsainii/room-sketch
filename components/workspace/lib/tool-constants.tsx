import * as React from "react"
import * as Icons from "lucide-react" // adjust to your actual icon lib import if different
import { CATEGORY_LABELS, FurnitureType } from "./furniture-constants" // adjust path

import { EditorTool, FurnitureCatalogEntry, FurnitureCategory, ICONS, ToolGroup } from "./constants"
import { PresetsPanel } from "@/components/ui/PresetPanel"
import { THEME } from "../FloorPlanEditor"
import { ScrollableList } from "@/components/ui/ScrollableList"
import { RoomTemplate, WallPreset } from "./presets"

export interface ToolGroupsContext {
  furnitureByCategory: Record<FurnitureCategory, FurnitureCatalogEntry[]>
  openFurnitureCats: Set<FurnitureCategory>
  setOpenFurnitureCats: React.Dispatch<React.SetStateAction<Set<FurnitureCategory>>>
  selectedFurnitureType: FurnitureType | null
  setSelectedFurnitureType: (id: FurnitureType) => void
  isFurnitureNew: (entry: FurnitureCatalogEntry) => boolean
  armedWallPresetId: string | null
  armedTemplateId: string | null
  armWallPreset: (preset: WallPreset) => void
  armRoomTemplate: (template: RoomTemplate) => void
}

export function getToolGroups(ctx: ToolGroupsContext): ToolGroup[] {
  return [
    {
      id: "presets",
      label: "Room Presets",
      flyoutWidth: 280,
      leaves: [{ id: "presets", label: "Room Presets", icon: ICONS.presets }],
      renderFlyout: () => (
        <PresetsPanel
          armedWallPresetId={ctx.armedWallPresetId}
          armedTemplateId={ctx.armedTemplateId}
          onSelectWallPreset={ctx.armWallPreset}
          onSelectRoomTemplate={ctx.armRoomTemplate}
        />
      ),
    },
    {
      id: "select",
      label: "Select",
      leaves: [
        { id: "select", label: "Select / Move", key: "V", icon: ICONS.select },
      ],
    },
    {
      id: "pan",
      label: "Pan",
      leaves: [{ id: "pan", label: "Pan Canvas", key: "H", icon: ICONS.pan }],
    },

    {
      id: "draw",
      label: "Draw Walls",
      leaves: [
        { id: "room", label: "Draw Room", key: "R", icon: ICONS.room },
        { id: "pencil", label: "Freeform", key: "P", icon: ICONS.pencil },
        { id: "line", label: "Line Wall", key: "L", icon: ICONS.line },
        { id: "bend", label: "Bend Wall", key: "B", icon: ICONS.bend },
      ],
    },

    {
      id: "doors",
      label: "Doors",
      leaves: [
        {
          id: "door-swing-single",
          label: "Single Swing Door",
          key: "D",
          icon: ICONS["door-swing-single"],
        },
        {
          id: "door-swing-double",
          label: "Double Swing Door",
          icon: ICONS["door-swing-double"],
        },
        {
          id: "door-sliding",
          label: "Sliding Door",
          icon: ICONS["door-sliding"],
        },
        { id: "door-pocket", label: "Pocket Door", icon: ICONS["door-pocket"] },
        {
          id: "door-folding",
          label: "Bi-fold Door",
          icon: ICONS["door-folding"],
        },
        { id: "door-garage", label: "Garage Door", icon: ICONS["door-garage"] },
        {
          id: "door-sliding-panorama",
          label: "Door Sliding Double",
          icon: ICONS["door-sliding-panorama"],
        },
      ],
    },

    {
      id: "windows",
      label: "Windows",
      leaves: [
        {
          id: "window-fixed",
          label: "Fixed Window",
          key: "N",
          icon: ICONS["window-fixed"],
        },
        {
          id: "window-sliding",
          label: "Sliding Window",
          icon: ICONS["window-sliding"],
        },
        {
          id: "window-casement",
          label: "Casement Window",
          icon: ICONS["window-casement"],
        },
        { id: "window-bay", label: "Bay Window", icon: ICONS["window-bay"] },
        {
          id: "window-skylight",
          label: "Skylight",
          icon: ICONS["window-skylight"],
        },
      ],
    },

    {
      id: "openings",
      label: "Openings",
      leaves: [
        {
          id: "opening-archway",
          label: "Archway",
          icon: ICONS["opening-archway"],
        },
        {
          id: "opening-passage",
          label: "Open Passage",
          icon: ICONS["opening-passage"],
        },
        {
          id: "railing-partial",
          label: "Partial Railing",
          icon: ICONS["railing-partial"],

          /* or pick/add an appropriate icon */
        },
      ],
    },

    {
      id: "vertical",
      label: "Stairs & Vertical",
      leaves: [
        {
          id: "stairs-straight",
          label: "Straight Stairs",
          key: "S",
          icon: ICONS["stairs-straight"],
        },
        { id: "stairs-l", label: "L-Shaped Stairs", icon: ICONS["stairs-l"] },
        { id: "stairs-u", label: "U-Shaped Stairs", icon: ICONS["stairs-u"] },
        {
          id: "stairs-spiral",
          label: "Spiral Stairs",
          icon: ICONS["stairs-spiral"],
        },
        { id: "stairs-ramp", label: "Ramp", icon: ICONS["stairs-ramp"] },
        { id: "elevator", label: "Elevator", icon: ICONS.elevator },
      ],
    },

    {
      id: "annotate",
      label: "Annotate",
      leaves: [
        { id: "annotate", label: "Add Label", key: "A", icon: ICONS.annotate },
      ],
    },
    {
      id: "furniture",
      label: "Furniture",
      flyoutWidth: 280,
      leaves: [
        {
          id: "furniture",
          label: "Place Furniture",
          key: "F",
          icon: ICONS.furniture,
        },
      ],
      renderFlyout: () => (
        <div style={{ padding: "8px" }}>
          <ScrollableList maxHeight={340}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(Object.keys(ctx.furnitureByCategory) as FurnitureCategory[]).map((catId) => {
                const items = ctx.furnitureByCategory[catId]
                if (!items || items.length === 0) return null
                const isOpen = ctx.openFurnitureCats.has(catId)
                return (
                  <div
                    key={catId}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${isOpen ? THEME.accent : THEME.border}`,
                      background: isOpen ? "rgba(99,102,241,0.06)" : "transparent",
                      overflow: "hidden",
                      transition: "border-color 150ms, background 150ms",
                    }}
                  >
                    <button
                      onClick={() =>
                        ctx.setOpenFurnitureCats((prev) => {
                          const next = new Set(prev)
                          next.has(catId) ? next.delete(catId) : next.add(catId)
                          return next
                        })
                      }
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", background: "transparent", border: "none",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{
                        fontSize: 13, fontWeight: 600, flex: 1, color: THEME.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {CATEGORY_LABELS[catId]}
                      </span>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: THEME.accent,
                        background: "rgba(99,102,241,0.12)", borderRadius: 999,
                        padding: "1px 7px", flexShrink: 0, minWidth: 18, textAlign: "center",
                      }}>
                        {items.length}
                      </span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={THEME.textMuted} strokeWidth="2.5"
                        style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 150ms", flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px 8px" }}>
                        {items.map((catalogEntry) => {
                          const id = catalogEntry.type
                          const isNew = ctx.isFurnitureNew(catalogEntry)
                          const Icon = (Icons as any)[catalogEntry.icon] ?? Icons.Box
                          const selected = ctx.selectedFurnitureType === id
                          return (
                            <button
                              key={id}
                              onClick={() => ctx.setSelectedFurnitureType(id)}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "6px 8px", borderRadius: 8, border: "none",
                                background: selected ? "rgba(99,102,241,0.1)" : "transparent",
                                cursor: "pointer", textAlign: "left", width: "100%",
                              }}
                            >
                              <div style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                                background: selected ? "rgba(99,102,241,0.14)" : THEME.bgCanvas,
                              }}>
                                <Icon size={14} strokeWidth={1.8} color={selected ? THEME.accent : THEME.textMuted} />
                              </div>
                              <span style={{
                                flex: 1, fontSize: 12, fontWeight: selected ? 600 : 400,
                                color: selected ? THEME.accent : THEME.text,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {catalogEntry.label}
                              </span>
                              {isNew && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, letterSpacing: "0.02em",
                                  color: "#fff", background: THEME.accent,
                                  borderRadius: 4, padding: "2px 5px", flexShrink: 0,
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
        </div>
      ),
    },
    {
      id: "delete",
      label: "Delete",
      leaves: [{ id: "delete", label: "Delete", key: "⌫", icon: ICONS.delete }],
    },
    {
      id: "wall-decor",
      label: "Wall Decor",
      leaves: [
        {
          id: "wall-decor-led",
          label: "LED Strip",
          icon: ICONS["wall-decor-led"],
        },
        {
          id: "wall-decor-pvc",
          label: "PVC Wall Panel",
          icon: ICONS["wall-decor-pvc"],
        },
        {
          id: "wall-decor-painting",
          label: "Painting",
          icon: ICONS["wall-decor-painting"],
        },
        { id: "led_tv", label: "Led TV", icon: ICONS["bend"] },
      ],
    },
    {
      id: "lights",
      label: "Lights",
      leaves: [
        {
          id: "light-wall-sconce",
          label: "Wall Sconce",
          icon: ICONS["light-wall-sconce"],
        },
        {
          id: "light-ceiling-pendant",
          label: "Pendant Light",
          icon: ICONS["light-ceiling-pendant"],
        },
        {
          id: "light-ceiling-recessed",
          label: "Recessed Light",
          icon: ICONS["light-ceiling-recessed"],
        },
        {
          id: "light-floor-lamp",
          label: "Floor Lamp",
          icon: ICONS["light-floor-lamp"],
        },
        {
          id: "light-track",
          label: "Track Lighting",
          icon: ICONS["light-track"],
        },
        {
          id: "light-chandelier",
          label: "Chandelier",
          icon: ICONS["light-chandelier"],
        },
        {
          id: "light-shelf-strip",
          label: "Shelf Strip",
          icon: ICONS["light-shelf-strip"],
        },
        {
          id: "light-spotlight",
          label: "Spotlight",
          icon: ICONS["light-spotlight"],
        },
        {
          id: "light-string",
          label: "String Lights",
          icon: ICONS["light-string"],
        },
      ],
    },
    {
      id: "outdoor",
      label: "Outdoor",
      leaves: [
        {
          id: "outdoor-crosswalk",
          label: "Crosswalk",
          icon: ICONS["outdoor-crosswalk"],
        },
        {
          id: "outdoor-dustbin",
          label: "Dustbin",
          icon: ICONS["outdoor-dustbin"],
        },
        { id: "outdoor-bench", label: "Bench", icon: ICONS["outdoor-bench"] },
        {
          id: "outdoor-mailbox",
          label: "Mailbox",
          icon: ICONS["outdoor-mailbox"],
        },
        {
          id: "light-outdoor-bollard",
          label: "Bollard Light",
          icon: ICONS["light-outdoor-bollard"],
        },
      ],
    },
  ]
}