import {
  RailingConfig,
  SkirtConfig,
  TreadConfig,
} from "../objects/stair-config";

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
  | "baluster" // fallback-branch default, vertical square posts
  | "cable" // fallback-branch, tighter post spacing, thin metal infill
  | "glass" // transmissive glass panel
  | "criss-cross" // diagonal X-brace infill
  | "solid-panel"; // opaque solid panel

export const RAILING_STYLE_LABELS: Record<RailingStyle, string> = {
  baluster: "Baluster",
  cable: "Cable",
  glass: "Glass Panel",
  "criss-cross": "Criss-Cross",
  "solid-panel": "Solid Panel",
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
  steps1?: number; // flight 1 (lower run) step count
  steps2?: number; // flight 2 (upper run) step count
  flightWidth?: number;
  landingThickness?: number;
  showCenterWall?: boolean;
  tread?: TreadConfig;

  // ── Railing / Skirt ──
  // Primary config going forward. Optional (not required) so in-memory
  // objects built before migration runs don't fail type checks; always
  // read through resolveRailingSkirt()/DEFAULT_RAILING/DEFAULT_SKIRT
  // rather than assuming these are populated.
  railing?: RailingConfig;
  skirt?: SkirtConfig;

  // ── Legacy railing fields — DEPRECATED ──
  // Kept only so migrateStairRailingSkirt() has something to read when
  // backfilling `railing` on stairs saved before this change. Do not
  // write to these going forward; new code should only touch `railing`.
  /** @deprecated use railing.enabled */
  railingEnabled?: boolean;
  /** @deprecated use railing.style */
  railingStyle?: RailingStyle;
  /** @deprecated use railing.color */
  railingColor?: string;
  /** @deprecated use railing.height */
  railingHeight?: number;

  openingMode?: StairsOpeningMode; // defaults to 'destination'
  autoCutout?: boolean; // defaults to true
  openingOffset?: number; // defaults to 0.5
  fromLevel?: string;
  toLevel?: string;
  materialId?: string;

  // Closed/solid spiral style: fills the vertical gap between treads
  // @deprecated use tread.mode === 'closed' (still read as a fallback by
  // SpiralStairs' `isClosed` check, so existing saves keep working)
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

export // For a given floor `f` and stair `s`, does s cut a hole in f's slab?
function stairCutsFloor(
  s: PlacedStairs,
  floorId: string,
): "floor-above" | "ceiling-below" | null {
  if (s.openingMode === "none" || s.autoCutout === false) return null;
  // openingMode defaults to 'destination' when undefined — treat as on
  if (s.toLevel === floorId) return "ceiling-below"; // the hole you fall through, viewed from above
  if (s.fromLevel === floorId) return "floor-above"; // the hole in the floor the stair sits on
  return null;
}

export type Point = { x: number; z: number };

export function stairCutoutFootprint(s: PlacedStairs): Point[] {
  const m = s.openingOffset ?? 0.5;
  const w = s.width + m * 2,
    d = s.depth + m * 2;
  const cx = s.x + s.width / 2,
    cz = s.z + s.depth / 2;
  const corners = [
    { x: -w / 2, z: -d / 2 },
    { x: w / 2, z: -d / 2 },
    { x: w / 2, z: d / 2 },
    { x: -w / 2, z: d / 2 },
  ];
  const cos = Math.cos(s.rotation),
    sin = Math.sin(s.rotation);
  return corners.map((p) => ({
    x: cx + p.x * cos - p.z * sin,
    z: cz + p.x * sin + p.z * cos,
  }));
}
