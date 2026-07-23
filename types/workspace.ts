import {
  DoorMaterial,
  DoorStyle,
  FloorMaterial,
  PlacedStairs,
  WallMaterial,
} from "@/components/workspace/lib/constants";
import { PlacedFurniture } from "@/components/workspace/lib/furniture-constants";
import { SceneLight } from "@/components/workspace/lights-constant";

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

export type SceneOutdoorObject = {
  id: string;
  type: "crosswalk" | "dustbin" | "bench" | "mailbox";
  x: number;
  z: number;
  rotation: number;
  scale: number;
  material_id?: string;
};

export type SceneJSON = {
  rooms: SceneRoom[];
  furniture: PlacedFurniture[];
  door_style?: DoorStyle;
  stairs: PlacedStairs[];
  global_wall_material?: WallMaterial;
  global_floor_material?: FloorMaterial;
  closed_shapes?: {
    id: string;
    label?: string;
    node_ids: string[];
    floor_material?: FloorMaterial;
    wall_material?: WallMaterial;
    wall_overrides?: Record<
      string,
      { color?: string; material?: WallMaterial }
    >;
  }[];
  line_nodes?: { id: string; x: number; z: number }[];
  line_segments?: { id: string; node_ids: string[]; thickness?: number }[];
  lights?: SceneLight[]; // was an inline literal locked to the old 4 types
  outdoor_objects: SceneOutdoorObject[]; // NEW
  saved_views?: {
    id: string;
    label: string;
    position: [number, number, number];
    target: [number, number, number];
  }[];
  ground_material?: string;
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
