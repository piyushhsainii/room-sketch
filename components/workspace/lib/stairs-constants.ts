export type StairsType =
  | "stairs-straight"
  | "stairs-l"
  | "stairs-u"
  | "stairs-spiral"
  | "stairs-ramp"
  | "elevator";

// UI-facing simplified group for the Straight/Curved/Spiral toggle in the
// props panel — L and U both present as "Curved" there without collapsing
// the underlying data model.
export type StairsTypeGroup = "straight" | "curved" | "spiral" | "other";

export const STAIRS_TYPE_GROUP: Record<StairsType, StairsTypeGroup> = {
  "stairs-straight": "straight",
  "stairs-l": "curved",
  "stairs-u": "curved",
  "stairs-spiral": "spiral",
  "stairs-ramp": "other",
  elevator: "other",
};

export type RailingStyle =
  | "baluster" // current default — vertical baluster posts, matches Railing3D/stairsMesh today
  | "glass" // solid glass panel between posts, metal/black cap rail
  | "cable" // horizontal tensioned cables between posts
  | "solid"; // solid knee-wall / stringer-height panel, no visible posts

export const RAILING_STYLE_LABELS: Record<RailingStyle, string> = {
  baluster: "Baluster",
  glass: "Glass Panel",
  cable: "Cable",
  solid: "Solid Wall",
};

export type StairsOpeningMode = "none" | "destination";

export type PlacedStairs = {
  id: string;
  type: StairsType;
  x: number; // world metres, top-left anchor
  z: number;
  width: number; // footprint
  depth: number;
  rotation: number; // radians
  anchorSegmentId?: string;
  // ── Geometry ──
  rise?: number; // total vertical height in meters; defaults to roomHeight
  steps?: number; // step count; defaults to stairsMesh's existing auto-calc
  // ── Railing ──
  railingEnabled?: boolean; // defaults to true (current behavior always drew railings)
  railingStyle?: RailingStyle; // defaults to 'baluster'
  railingColor?: string; // defaults to the current hardcoded RAILING_COLOR ('#6B5B4E')
  railingHeight?: number; // defaults to 0.9 (matches Railing3D's current railHeight)
  openingMode?: StairsOpeningMode; // defaults to 'destination'
  autoCutout?: boolean; // defaults to true
  openingOffset?: number; // defaults to 0.5
  fromLevel?: string;
  toLevel?: string;
  materialId?: string;
  // NEW — closed/solid spiral style: fills the vertical gap between
  filledRisers?: boolean;
};

export const STAIRS_LABELS: Record<StairsType, string> = {
  "stairs-straight": "Straight Stairs",
  "stairs-l": "L-Shaped Stairs",
  "stairs-u": "U-Shaped Stairs",
  "stairs-spiral": "Spiral Stairs",
  "stairs-ramp": "Ramp",
  elevator: "Elevator",
};
