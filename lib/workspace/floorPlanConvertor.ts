import {
  RoomSceneConfig,
  SceneConfig,
} from "@/components/workspace/FloorPlanEditor";
import {
  PlacedLight,
  SceneLight,
} from "@/components/workspace/lights-constant";
import {
  ClosedShape,
  DoorStyle,
  EditorOpening,
  EditorRoom,
  FloorMaterial,
  FloorPlanState,
  LineNode,
  LineSegment,
} from "@/components/workspace/lib/constants";

import { PlacedOutdoorObject } from "@/components/workspace/lib/outdoor-constants";
import type {
  SceneJSON,
  SceneRoom,
  RoomDoor,
  RoomWindow,
  SceneOutdoorObject,
} from "@/types/workspace";
import { normalizeDoorMaterialOverride } from "@/components/workspace/mesh/door-style-migration";
import { PlacedFurniture } from "@/components/workspace/lib/furniture-constants";
import { PlacedStairs } from "@/components/workspace/lib/stairs-constants";

export function floorPlanStateToSceneJSON(
  fp: FloorPlanState,
  sceneConfig: SceneConfig,
): SceneJSON {
  const cfg = sceneConfig;

  const roomIdMap = new Map<string, string>();

  const rooms: SceneRoom[] = fp.rooms.map((room, idx) => {
    const serializedRoomId = `room_${idx + 1}`;
    roomIdMap.set(room.id, serializedRoomId);

    const roomOpenings = fp.openings.filter((o) => o.roomId === room.id);
    const doors: RoomDoor[] = roomOpenings
      .filter((o) => o.type === "door")
      .map((o) => ({
        wall: o.wall,
        position: o.position,
        width: o.width,
        material: o.material,
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
    const line_segments = (fp.lineSegments ?? []).map((s) => ({
      id: s.id,
      node_ids: s.nodeIds,
      thickness: s.thickness,
      height: s.height,
    }));

    const roomCfg = cfg.rooms.find((r) => r.roomId === room.id);

    return {
      id: serializedRoomId,
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

  const lights: SceneLight[] = (fp.lights ?? []).map((l) => ({
    id: l.id,
    type: l.type,
    room_id: l.roomId,
    wall: l.wall,
    position: l.position,
    segment_node_ids: l.segmentNodeIds,
    segment_t: l.segmentT,
    x: l.x,
    z: l.z,
    width: l.width, // NEW — shelf_strip
    aim_rotation: l.aimRotation, // NEW — spotlight
    aim_tilt: l.aimTilt, // NEW — spotlight
    path_node_ids: l.pathNodeIds, // NEW — string_lights
    bulb_count: l.bulbCount, // NEW — string_lights
    height_offset: l.heightOffset,
    color: l.color,
    intensity: l.intensity,
    cast_shadow: l.castShadow,
    scale: l.scale,
    facing_inward: l.facingInward,
  }));

  const furniture = (fp.furniture ?? []).map((f) => ({
    id: f.id,
    type: f.type,
    x: f.x,
    z: f.z,
    rotation: f.rotation,
    scale: f.scale,
    material_id: f.materialId,
  }));

  const stairs = (fp.stairs ?? []).map((s) => ({
    id: s.id,
    type: s.type,
    x: s.x,
    z: s.z,
    width: s.width,
    depth: s.depth,
    rotation: s.rotation,
  }));

  const outdoor_objects: SceneOutdoorObject[] = (fp.outdoorObjects ?? []).map(
    (o) => ({
      id: o.id,
      type: o.type,
      x: o.x,
      z: o.z,
      rotation: o.rotation,
      scale: o.scale,
      material_id: o.materialId,
    }),
  );

  return {
    rooms: [...rooms, ...lineRooms],
    furniture: furniture,
    stairs: stairs ?? [],
    lights: lights ?? [],
    door_style: cfg.doorStyle ?? ("glass_clear" as DoorStyle),
    global_wall_material: cfg.globalWallMaterial ?? "paint",
    global_floor_material: cfg.globalFloorMaterial ?? "plain",
    line_nodes,
    line_segments,
    closed_shapes,
    extracted_at: new Date().toISOString(),
    floorplan_url: "",
    outdoor_objects: outdoor_objects,
    ground_material: cfg.groundMaterial,
    saved_views: fp.savedViews?.map((v) => ({
      id: v.id,
      label: v.label,
      position: v.position,
      target: v.target,
    })),
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
  const roomIdReverseMap = new Map<string, string>();

  let lineNodes: LineNode[] = [];
  let lineSegments: LineSegment[] = [];
  let closedShapes: ClosedShape[] = [];

  let roomHeight = defaultRoomHeight;

  for (const r of json.rooms) {
    if (r.height) roomHeight = r.height;
    if (r.id.startsWith("line_")) continue;

    const xs = r.shape.map((p) => p.x);
    const zs = r.shape.map((p) => p.z);
    const x = Math.min(...xs);
    const z = Math.min(...zs);
    const width = Math.max(...xs) - x;
    const depth = Math.max(...zs) - z;

    const roomId = uid();
    roomIdReverseMap.set(r.id, roomId);

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
        material: normalizeDoorMaterialOverride(d.material),
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

  if (json.line_nodes && json.line_segments) {
    lineNodes = json.line_nodes.map((n) => ({ id: n.id, x: n.x, z: n.z }));
    lineSegments = json.line_segments.map((s) => ({
      id: s.id,
      nodeIds: s.node_ids,
      thickness: s.thickness ?? 0.15,
      closed: false,
      height: s.height,
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

  const lights: PlacedLight[] = (json.lights ?? []).map((l) => ({
    id: l.id,
    type: l.type,
    roomId: l.room_id ? roomIdReverseMap.get(l.room_id) : undefined,
    wall: l.wall,
    position: l.position,
    segmentNodeIds: l.segment_node_ids,
    segmentT: l.segment_t,
    x: l.x,
    z: l.z,
    width: l.width, // NEW
    aimRotation: l.aim_rotation, // NEW
    aimTilt: l.aim_tilt, // NEW
    pathNodeIds: l.path_node_ids, // NEW
    bulbCount: l.bulb_count, // NEW
    heightOffset: l.height_offset,
    color: l.color,
    intensity: l.intensity,
    castShadow: l.cast_shadow,
    scale: l.scale,
    facingInward: l.facing_inward ?? true,
  }));

  const furniture: PlacedFurniture[] = (json.furniture ?? []).map((f) => ({
    id: f.id,
    type: f.type,
    x: f.x,
    z: f.z,
    rotation: f.rotation,
    scale: f.scale,
    materialId: f.materialId,
  }));

  const stairs: PlacedStairs[] = (json.stairs ?? []).map((s) => ({
    id: s.id,
    type: s.type,
    x: s.x,
    z: s.z,
    width: s.width,
    depth: s.depth,
    rotation: s.rotation,
  }));

  const outdoorObjects: PlacedOutdoorObject[] = (
    json.outdoor_objects ?? []
  ).map((o) => ({
    id: o.id,
    type: o.type,
    x: o.x,
    z: o.z,
    rotation: o.rotation,
    scale: o.scale,
    materialId: o.material_id,
  }));

  const fp: FloorPlanState = {
    rooms,
    lineNodes,
    lineSegments,
    closedShapes,
    openings,
    furniture,
    stairs,
    annotations: [],
    roomHeight,
    wallDecor: [],
    lights,
    outdoorObjects,
    savedViews: (json.saved_views ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      position: v.position,
      target: v.target,
    })),
  };

  const sceneConfig: SceneConfig = {
    ambientIntensity: 1.5,
    wallRoughness: 0.85,
    wallTextured: false,
    showFurniture: true,
    showLabels: true,
    fogEnabled: false,
    doorStyle: (json.door_style ?? "glass_clear") as DoorStyle,
    globalFloorMaterial: (json.global_floor_material ??
      "plain") as FloorMaterial,
    globalWallMaterial: json.global_wall_material ?? "paint",
    groundMaterial: json.ground_material, // NEW
    rooms: roomConfigs,
    lights,
  };

  return { fp, sceneConfig };
}
