import { ICONS, ToolGroup } from "./constants";

export const TOOL_GROUPS: ToolGroup[] = [
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
    leaves: [
      {
        id: "furniture",
        label: "Place Furniture",
        key: "F",
        icon: ICONS.furniture,
      },
    ],
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
    ],
  },
];
