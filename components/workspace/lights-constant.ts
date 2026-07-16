// Add alongside PlacedWallDecor etc.
export type LightFixtureType =
  | "wall_sconce"
  | "ceiling_pendant"
  | "ceiling_recessed"
  | "floor_lamp";

export type PlacedLight = {
  id: string;
  type: LightFixtureType;
  // Wall-anchored placement (wall_sconce) — same dual room-wall/line-wall
  // pattern as PlacedWallDecor
  roomId?: string;
  wall?: "north" | "south" | "east" | "west";
  position?: number;
  segmentNodeIds?: string[];
  segmentT?: number;
  // Free placement (ceiling_pendant / ceiling_recessed / floor_lamp)
  x?: number;
  z?: number;
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
};

export const LIGHT_FIXTURE_LABELS: Record<LightFixtureType, string> = {
  wall_sconce: "Wall Sconce",
  ceiling_pendant: "Pendant Light",
  ceiling_recessed: "Recessed Light",
  floor_lamp: "Floor Lamp",
};

export type SceneLight = {
  id: string;
  type: "wall_sconce" | "ceiling_pendant" | "ceiling_recessed" | "floor_lamp";
  room_id?: string;
  wall?: "north" | "south" | "east" | "west";
  position?: number;
  segment_node_ids?: string[];
  segment_t?: number;
  // Free placement
  x?: number;
  z?: number;
  height_offset: number;
  color: string;
  intensity: number;
  cast_shadow: boolean;
  scale: number;
  facing_inward?: boolean;
};
