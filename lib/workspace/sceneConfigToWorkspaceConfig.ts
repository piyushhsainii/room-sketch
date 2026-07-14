import type { SceneConfig } from "@/components/workspace/FloorPlanEditor";
import { DoorStyle } from "@/components/workspace/Tools/constants";
import type { WorkspaceConfig, RoomConfig } from "@/types/workspace";

const DEFAULT_WALL_COLOR = "#FFFFFF";
const DEFAULT_FLOOR_MATERIAL = "plain"; // matches FloorMaterial's plain/default value used elsewhere

export function sceneConfigToWorkspaceConfig(
  cfg: SceneConfig,
): WorkspaceConfig {
  const rooms: RoomConfig[] = cfg.rooms.map((r) => ({
    roomId: r.roomId,
    wallColor: r.wallColor ?? DEFAULT_WALL_COLOR,
    floorMaterial:
      r.floorMaterial ?? cfg.globalFloorMaterial ?? DEFAULT_FLOOR_MATERIAL,
  }));

  return {
    rooms,
    ambientIntensity: cfg.ambientIntensity,
    wallRoughness: cfg.wallRoughness,
    showFurniture: cfg.showFurniture,
    showLabels: cfg.showLabels,
    fogEnabled: cfg.fogEnabled,
    doorStyle: cfg.doorStyle, // ← plain passthrough now that both use DoorMaterial
  };
}
