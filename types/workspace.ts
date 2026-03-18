export interface WallPoint {
  x: number;
  z: number;
}

export interface RoomDoor {
  wall: "north" | "south" | "east" | "west";
  position: number; // meters from left end of that wall
  width: number; // meters
}

export interface RoomWindow {
  wall: "north" | "south" | "east" | "west";
  position: number; // meters from left end of that wall
  width: number; // meters
  height: number; // meters, default 1.2
  sillHeight: number; // meters from floor, default 0.9
}

export interface SceneRoom {
  id: string;
  name: string;
  shape: WallPoint[]; // polygon points in meters, clockwise
  height: number; // ceiling height in meters, default 2.7
  floor_material: "hardwood" | "tile" | "carpet" | "concrete" | "marble";
  wall_color: string; // hex color string
  doors: RoomDoor[];
  windows: RoomWindow[];
}

export interface SceneJSON {
  rooms: SceneRoom[];
  furniture: []; // empty in Phase 1
  extracted_at: string;
  floorplan_url: string;
}

export type CameraMode = "orbit" | "walk" | "topdown";

export type WorkspaceStatus =
  | "idle"
  | "extracting"
  | "building"
  | "ready"
  | "error";

// ── Workspace config ──────────────────────────────────────────────────────────

export type FloorMaterial =
  | "hardwood"
  | "marble"
  | "tile"
  | "carpet"
  | "concrete";

export interface RoomConfig {
  roomId: string;
  wallColor: string;
  floorMaterial: FloorMaterial;
}

export interface WorkspaceConfig {
  rooms: RoomConfig[];
  ambientIntensity: number; // 0.5 – 4.0
  wallRoughness: number; // 0.1 – 1.0
  showFurniture: boolean;
  showLabels: boolean;
  fogEnabled: boolean;
}

export type DoorStyle =
  | "wood_oak"
  | "wood_dark"
  | "wood_white"
  | "glass_frosted"
  | "glass_clear"
  | "metal_steel"
  | "panel_white";

export interface WorkspaceConfig {
  rooms: RoomConfig[];
  ambientIntensity: number;
  wallRoughness: number;
  showFurniture: boolean;
  showLabels: boolean;
  fogEnabled: boolean;
  doorStyle: DoorStyle; // ← add this
}

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  rooms: [],
  ambientIntensity: 1.5,
  wallRoughness: 0.82,
  showFurniture: true,
  showLabels: true,
  fogEnabled: true,
  doorStyle: "wood_oak", // ← add this
};
