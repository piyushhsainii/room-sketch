import {
  DoorMaterial,
  DoorStyle,
  FloorMaterial,
  WallMaterial,
} from "@/components/workspace/Tools/constants";

export interface WallPoint {
  x: number;
  z: number;
}

export type RoomDoor = {
  wall: "north" | "south" | "east" | "west";
  position: number;
  width: number;
  material?: DoorMaterial; // ← new: per-door override, undefined = use global door_style
};

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
  floor_material: FloorMaterial;
  wall_material: WallMaterial; // NEW — required, mirrors floor_material's pattern
  wall_color: string; // hex color string
  doors: RoomDoor[];
  windows: RoomWindow[];
}

export type SceneJSON = {
  rooms: SceneRoom[];
  furniture: unknown[];
  door_style?: DoorStyle;
  global_wall_material?: WallMaterial;
  global_floor_material?: FloorMaterial;
  closed_shapes?: {
    id: string;
    label?: string;
    node_ids: string[]; // references into a saved node list, see below
    floor_material?: FloorMaterial;
    wall_material?: WallMaterial;
    wall_overrides?: Record<
      string,
      { color?: string; material?: WallMaterial }
    >;
  }[];
  line_nodes?: { id: string; x: number; z: number }[]; // NEW — needed so closed_shapes.node_ids resolve to something real on reload
  line_segments?: { id: string; node_ids: string[]; thickness?: number }[]; // NEW — replaces the flattened-box approach for round-tripping
  extracted_at: string;
  floorplan_url: string;
};

export type CameraMode = "orbit" | "walk" | "topdown";

export type WorkspaceStatus =
  | "idle"
  | "extracting"
  | "building"
  | "ready"
  | "error";

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

// export type DoorStyle =
//   | "wood_oak"
//   | "wood_dark"
//   | "wood_white"
//   | "glass_frosted"
//   | "glass_clear"
//   | "metal_steel"
//   | "panel_white";

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
  doorStyle: "glass_clear", // ← add this
};
