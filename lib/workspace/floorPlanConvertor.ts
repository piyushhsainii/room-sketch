import { FloorPlanState } from "@/components/workspace/Tools/constants";
import type {
  SceneJSON,
  SceneRoom,
  RoomDoor,
  RoomWindow,
} from "@/types/workspace";

function getFloorMaterial(name: string): SceneRoom["floor_material"] {
  const n = name.toLowerCase();
  if (
    n.includes("bath") ||
    n.includes("kitchen") ||
    n.includes("hall") ||
    n.includes("wc")
  )
    return "tile";
  return "hardwood";
}

function getWallColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("living")) return "#E8E0D4";
  if (n.includes("bedroom")) return "#EAE8F0";
  if (n.includes("kitchen")) return "#ECEAE5";
  if (n.includes("bath")) return "#E5ECEA";
  if (n.includes("hall")) return "#E8E6E0";
  if (n.includes("dining")) return "#EAE4D8";
  return "#EAE8E4";
}

export function floorPlanStateToSceneJSON(fp: FloorPlanState): SceneJSON {
  const rooms: SceneRoom[] = fp.rooms.map((room, idx) => {
    const roomOpenings = fp.openings.filter((o) => o.roomId === room.id);
    const doors: RoomDoor[] = roomOpenings
      .filter((o) => o.type === "door")
      .map((o) => ({
        wall: o.wall,
        position: o.position,
        width: o.width,
      }));
    const windows: RoomWindow[] = roomOpenings
      .filter((o) => o.type === "window")
      .map((o) => ({
        wall: o.wall,
        position: o.position,
        width: o.width,
        height: o.height,
        sillHeight: o.sillHeight,
      }));

    return {
      id: `room_${idx + 1}`,
      name: room.label,
      shape: [
        { x: room.x, z: room.z },
        { x: room.x + room.width, z: room.z },
        { x: room.x + room.width, z: room.z + room.depth },
        { x: room.x, z: room.z + room.depth },
      ],
      height: fp.roomHeight,
      floor_material: getFloorMaterial(room.label),
      wall_color: getWallColor(room.label),
      doors,
      windows,
    };
  });
  const lineRooms: SceneRoom[] = [];
  for (const seg of fp.lineSegments ?? []) {
    const nodes = seg.nodeIds
      .map((nid) => fp.lineNodes.find((n) => n.id === nid))
      .filter(Boolean) as Array<{ x: number; z: number }>;

    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i]!;
      const b = nodes[i + 1]!;
      const dx = b.x - a.x,
        dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.1) continue;

      const angle = Math.atan2(dz, dx);
      const cx = (a.x + b.x) / 2;
      const cz = (a.z + b.z) / 2;
      const T = seg.thickness ?? 0.15;

      // Axis-aligned bounding box of the wall segment
      const minX = Math.min(a.x, b.x) - (Math.abs(Math.sin(angle)) * T) / 2;
      const minZ = Math.min(a.z, b.z) - (Math.abs(Math.cos(angle)) * T) / 2;
      const width = Math.abs(dx) + Math.abs(Math.sin(angle)) * T;
      const depth = Math.abs(dz) + Math.abs(Math.cos(angle)) * T;

      lineRooms.push({
        id: `line_${seg.id}_${i}`,
        name: "Wall",
        shape: [
          { x: minX, z: minZ },
          { x: minX + width, z: minZ },
          { x: minX + width, z: minZ + depth },
          { x: minX, z: minZ + depth },
        ],
        height: fp.roomHeight,
        floor_material: "concrete",
        wall_color: "#8B7B6B",
        doors: [],
        windows: [],
      });
    }
  }
  return {
    rooms: [...rooms, ...lineRooms],
    furniture: [],
    extracted_at: new Date().toISOString(),
    floorplan_url: "",
  };
}
