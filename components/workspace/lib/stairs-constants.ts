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

  // ── L/U flight step counts ──
  // Per-flight step count overrides for L-Stairs and U-Stairs. `steps`
  // above still applies to Straight and Spiral; these are separate because
  // an L/U stair has two independent runs that can each need a different
  // count. Optional — falls back to LStairs'/UStairs' existing
  // auto-computed count (based on rise) when omitted, same as `steps` does.
  steps1?: number; // flight 1 (lower run) step count
  steps2?: number; // flight 2 (upper run) step count

  // ── L-Stairs flight/landing sizing ──
  // Optional overrides for the shared width of both flights + the landing,
  // and the landing slab's thickness. Falls back to LStairs' internal
  // defaults (derived from width/depth) when omitted.
  flightWidth?: number;
  landingThickness?: number;

  // ── U-Stairs center wall ──
  // Toggles the solid dividing wall between the two U-Stairs flights.
  // Defaults to true (matches current always-on behavior) when omitted,
  // so existing saves render exactly as before.
  showCenterWall?: boolean;

  // ── Tread style ──
  // Primary config going forward, same pattern as `railing`/`skirt`:
  // optional so in-memory objects built before migration runs don't fail
  // type checks; always read through resolveTreadConfig()/DEFAULT_TREAD
  // rather than assuming this is populated.
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
