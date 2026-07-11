import {
  RoomSceneConfig,
  SceneConfig,
} from "@/components/workspace/FloorPlanEditor";
import {
  ClosedShape,
  DoorStyle,
  EditorOpening,
  EditorRoom,
  FloorMaterial,
  FloorPlanState,
  LineNode,
  LineSegment,
} from "@/components/workspace/Tools/constants";
import type {
  SceneJSON,
  SceneRoom,
  RoomDoor,
  RoomWindow,
} from "@/types/workspace";

export function floorPlanStateToSceneJSON(
  fp: FloorPlanState,
  sceneConfig: SceneConfig,
): SceneJSON {
  const cfg = sceneConfig;

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

    const roomCfg = cfg.rooms.find((r) => r.roomId === room.id);

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
      floor_material:
        roomCfg?.floorMaterial ?? cfg.globalFloorMaterial ?? "plain",
      wall_material: roomCfg?.wallMaterial ?? cfg.globalWallMaterial ?? "paint",
      wall_color: roomCfg?.wallColor ?? "#FFFFFF",
      doors,
      windows,
    };
  });

  const lineRooms: SceneRoom[] = [];

  const line_nodes = (fp.lineNodes ?? []).map((n) => ({
    id: n.id,
    x: n.x,
    z: n.z,
  }));
  const line_segments = (fp.lineSegments ?? []).map((s) => ({
    id: s.id,
    node_ids: s.nodeIds,
    thickness: s.thickness,
  }));
  const closed_shapes = (fp.closedShapes ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    node_ids: s.nodeIds,
    floor_material: s.floorMaterial,
    wall_material: s.wallMaterial,
    wall_overrides: s.wallOverrides,
  }));

  return {
    rooms: [...rooms, ...lineRooms],
    furniture: [],
    door_style: cfg.doorStyle ?? ("natural" as DoorStyle),
    global_wall_material: cfg.globalWallMaterial ?? "paint",
    global_floor_material: cfg.globalFloorMaterial ?? "plain",
    line_nodes,
    line_segments,
    closed_shapes,
    extracted_at: new Date().toISOString(),
    floorplan_url: "",
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function sceneJSONToFloorPlanState(
  json: SceneJSON,
  defaultRoomHeight = 2.7,
): { fp: FloorPlanState; sceneConfig: SceneConfig } {
  const rooms: EditorRoom[] = [];
  const roomConfigs: RoomSceneConfig[] = [];
  const openings: EditorOpening[] = [];

  let lineNodes: LineNode[] = [];
  let lineSegments: LineSegment[] = [];
  let closedShapes: ClosedShape[] = [];

  let roomHeight = defaultRoomHeight;

  for (const r of json.rooms) {
    if (r.height) roomHeight = r.height;
    if (r.id.startsWith("line_")) continue; // handled below via line_nodes/line_segments now, not the flattened boxes

    const xs = r.shape.map((p) => p.x);
    const zs = r.shape.map((p) => p.z);
    const x = Math.min(...xs);
    const z = Math.min(...zs);
    const width = Math.max(...xs) - x;
    const depth = Math.max(...zs) - z;

    const roomId = uid();
    rooms.push({ id: roomId, x, z, width, depth, label: r.name });
    roomConfigs.push({
      roomId,
      wallColor: r.wall_color,
      wallMaterial: r.wall_material,
      floorMaterial: r.floor_material,
    });

    for (const d of r.doors ?? []) {
      openings.push({
        id: uid(),
        roomId,
        wall: d.wall,
        type: "door",
        variant: "door-swing-single",
        position: d.position,
        width: d.width,
        height: 2.1,
        sillHeight: 0,
        swingDirection: "inward",
      });
    }
    for (const w of r.windows ?? []) {
      openings.push({
        id: uid(),
        roomId,
        wall: w.wall,
        type: "window",
        variant: "window-fixed",
        position: w.position,
        width: w.width,
        height: w.height,
        sillHeight: w.sillHeight,
        swingDirection: "inward",
      });
    }
  }

  // Prefer real saved geometry — lossless, preserves original node/segment ids
  // so closed_shapes' node_ids references resolve correctly.
  if (json.line_nodes && json.line_segments) {
    lineNodes = json.line_nodes.map((n) => ({ id: n.id, x: n.x, z: n.z }));
    lineSegments = json.line_segments.map((s) => ({
      id: s.id,
      nodeIds: s.node_ids,
      thickness: s.thickness ?? 0.15,
      closed: false,
    }));

    closedShapes = (json.closed_shapes ?? []).map((s) => ({
      id: s.id,
      nodeIds: s.node_ids,
      label: s.label,
      floorMaterial: s.floor_material,
      wallMaterial: s.wall_material,
      wallOverrides: s.wall_overrides,
    }));
  }
  const fp: FloorPlanState = {
    rooms,
    lineNodes,
    lineSegments,
    closedShapes,
    openings,
    furniture: [],
    stairs: [],
    annotations: [],
    roomHeight,
    wallDecor: [],
  };

  const sceneConfig: SceneConfig = {
    ambientIntensity: 1.5,
    wallRoughness: 0.85,
    wallTextured: false,
    showFurniture: true,
    showLabels: true,
    fogEnabled: false,
    doorStyle: (json.door_style ?? "natural") as DoorStyle,
    globalFloorMaterial: (json.global_floor_material ??
      "plain") as FloorMaterial,
    globalWallMaterial: json.global_wall_material ?? "paint",
    rooms: roomConfigs,
  };

  return { fp, sceneConfig };
}
