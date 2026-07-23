// Add alongside PlacedWallDecor etc.
export type LightFixtureType =
  | "wall_sconce"
  | "ceiling_pendant"
  | "ceiling_recessed"
  | "floor_lamp"
  | "track_lighting" // NEW — ceiling, linear rail, multiple heads
  | "chandelier" // NEW — ceiling, ornate, multiple bulb points
  | "shelf_strip" // NEW — wall-anchored, strip-length like led_strip decor
  | "spotlight" // NEW — wall or ceiling, directional/aimed
  | "string_lights" // NEW — path-based, many weak bulbs
  | "outdoor_bollard";

export type PlacedLight = {
  id: string;
  type: LightFixtureType;

  // Wall-anchored placement (wall_sconce, shelf_strip, spotlight-on-wall)
  roomId?: string;
  wall?: "north" | "south" | "east" | "west";
  position?: number;
  segmentNodeIds?: string[];
  segmentT?: number;

  // Free placement (ceiling_pendant / ceiling_recessed / floor_lamp /
  // track_lighting / chandelier / outdoor_bollard / spotlight-on-ceiling)
  x?: number;
  z?: number;

  // NEW — strip-length items (shelf_strip). Mirrors PlacedWallDecor's width
  // field; reuses the exact same wall/segment position resolution as
  // wall decor rather than inventing new geometry math.
  width?: number;

  // NEW — spotlight aim, rotation-based per the plan's decision (matches
  // furniture.rotation handling already in PropsPanel — a simple radians
  // value, no second draggable point needed)
  aimRotation?: number; // yaw, radians
  aimTilt?: number; // NEW — pitch downward/upward, radians, small range

  // NEW — string lights path. A list of node ids it threads through,
  // reusing lineNodes the same way lineSegments do, rather than a bespoke
  // point list. bulbCount controls visual density independent of path length.
  pathNodeIds?: string[];
  bulbCount?: number;

  heightOffset: number;
  color: string;
  intensity: number;
  castShadow: boolean;
  scale: number;
  facingInward?: boolean;
};

export const LIGHT_FIXTURE_DEFAULTS: Record<
  LightFixtureType,
  { color: string; intensity: number; heightOffset: number }
> = {
  wall_sconce: { color: "#FFF4E0", intensity: 2.5, heightOffset: 1.6 },
  ceiling_pendant: { color: "#FFF8F0", intensity: 3.5, heightOffset: 2.4 },
  ceiling_recessed: { color: "#FFFFFF", intensity: 2.0, heightOffset: 2.6 },
  floor_lamp: { color: "#FFE8C4", intensity: 2.8, heightOffset: 0 },
  track_lighting: { color: "#FFF8F0", intensity: 3.0, heightOffset: 2.6 },
  chandelier: { color: "#FFEBC4", intensity: 4.5, heightOffset: 2.3 },
  shelf_strip: { color: "#FFE5A8", intensity: 1.2, heightOffset: 2.0 },
  spotlight: { color: "#FFFDF5", intensity: 4.0, heightOffset: 2.5 },
  string_lights: { color: "#FFD98A", intensity: 0.6, heightOffset: 2.0 }, // shared light — see mesh notes
  outdoor_bollard: { color: "#FFE0B0", intensity: 1.8, heightOffset: 0.6 },
};

export const LIGHT_FIXTURE_LABELS: Record<LightFixtureType, string> = {
  wall_sconce: "Wall Sconce",
  ceiling_pendant: "Pendant Light",
  ceiling_recessed: "Recessed Light",
  floor_lamp: "Floor Lamp",
  track_lighting: "Track Lighting",
  chandelier: "Chandelier",
  shelf_strip: "Shelf/Cabinet Strip",
  spotlight: "Spotlight",
  string_lights: "String Lights",
  outdoor_bollard: "Bollard Light",
};

export type SceneLight = {
  id: string;
  type: LightFixtureType;
  room_id?: string;
  wall?: "north" | "south" | "east" | "west";
  position?: number;
  segment_node_ids?: string[];
  segment_t?: number;
  x?: number;
  z?: number;
  width?: number;
  aim_rotation?: number;
  aim_tilt?: number;
  path_node_ids?: string[];
  bulb_count?: number;
  height_offset: number;
  color: string;
  intensity: number;
  cast_shadow: boolean;
  scale: number;
  facing_inward?: boolean;
};

export const LIGHT_PLACEMENT_KIND: Record<
  LightFixtureType,
  "wall-point" | "free-point" | "wall-strip" | "path"
> = {
  wall_sconce: "wall-point",
  spotlight: "wall-point", // can also free-place on ceiling — handled as free-point variant, see tool handler
  ceiling_pendant: "free-point",
  ceiling_recessed: "free-point",
  floor_lamp: "free-point",
  track_lighting: "free-point",
  chandelier: "free-point",
  outdoor_bollard: "free-point",
  shelf_strip: "wall-strip",
  string_lights: "path",
};
