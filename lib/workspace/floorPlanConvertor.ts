// ─────────────────────────────────────────────────────────────────────────
// CHANGES IN THIS PASS (see chat for full rationale):
//
// 1. `ClosedShape.cutout` now round-trips through `closed_shapes[].cutout`.
// 2. `LineSegment.wallType` now round-trips through `line_segments[].wall_type`.
// 3. Railings now round-trip. Two anchor kinds exist on `EditorOpening`
//    (room-wall via `roomId`+`wall`, OR line-wall via `segmentNodeIds`+
//    `segmentT`) — previously ONLY room-anchored doors/windows were ever
//    serialized (`fp.openings.filter(o => o.roomId === room.id)`), so
//    line-wall-anchored openings of ANY type (door/window/railing) were
//    silently dropped. Fixed generically:
//      - room-anchored openings still nest under their room as before
//        (`doors`/`windows`/`railings` arrays on each `SceneRoom`)
//      - segment-anchored openings (no roomId) now serialize to a new
//        top-level `segment_openings[]` array on the scene JSON, keyed by
//        `segment_node_ids`/`segment_t` instead of `roomId`+`wall`.
//    This fixes railings AND closes the pre-existing door/window-on-
//    line-wall gap in the same pass.
//
// REQUIRED type additions elsewhere (not in this file):
//
//   // types/workspace.ts
//   export type RoomRailing = {
//     wall: "north" | "south" | "east" | "west";
//     position: number;
//     width: number;
//     railing_style?: string;
//     railing_height?: number;
//     railing_post_spacing?: number;
//     railing_width_dim?: number;
//     railing_color?: string;
//     railing_solid_above?: boolean;
//     railing_wall_start?: number;
//   };
//
//   export interface SceneRoom {
//     // ...existing fields...
//     railings?: RoomRailing[];
//   }
//
//   // A segment-anchored opening (door/window/railing on a line-drawn
//   // wall, not a rectangular room wall). Mirrors EditorOpening's
//   // segment-anchor fields + the union of door/window/railing fields.
//   export type SceneSegmentOpening = {
//     id: string;
//     type: "door" | "window" | "opening" | "railing";
//     segment_node_ids: string[];
//     segment_t: number;
//     width: number;
//     height: number;
//     sill_height?: number;
//     material?: DoorMaterial;
//     railing_style?: string;
//     railing_height?: number;
//     railing_post_spacing?: number;
//     railing_width_dim?: number;
//     railing_color?: string;
//     railing_solid_above?: boolean;
//     railing_wall_start?: number;
//   };
//
//   export type SceneJSON = {
//     // ...existing fields...
//     segment_openings?: SceneSegmentOpening[];
//   };
//
//   // components/workspace/lib/constants.ts
//   export type ClosedShape = {
//     // ...existing fields...
//     cutout?: { enabled: boolean; toLevel?: string; openingOffset?: number };
//   };
//   export type LineSegment = {
//     // ...existing fields...
//     wallType?: WallType;
//   };
// ─────────────────────────────────────────────────────────────────────────

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
} from "@/components/workspace/lib/constants";
import {
  DEFAULT_ROOF,
  Floor,
  ProjectFloorPlan,
} from "@/components/workspace/lib/floor-data";
import { migrateToMultiFloor } from "@/components/workspace/lib/migrateToMultiFloor";
import {
  PlacedLight,
  SceneLight,
} from "@/components/workspace/lights-constant";
import { normalizeDoorMaterialOverride } from "@/components/workspace/mesh/door-style-migration";
import {
  RoomDoor,
  RoomRailing,
  RoomWindow,
  SceneJSON,
  SceneOutdoorObject,
  SceneRoom,
  SceneSegmentOpening,
} from "@/types/workspace";
import { uid } from "../helpers";
import { PlacedFurniture } from "@/components/workspace/lib/furniture-constants";
import { PlacedStairs } from "@/components/workspace/lib/stairs-constants";
import { PlacedOutdoorObject } from "@/components/workspace/lib/outdoor-constants";

export type SceneFloorJSON = SceneFloorContent & {
  id: string;
  label: string;
  order: number;
  elevation: number;
  visible: boolean;
};

type SceneJSONWithFloors = SceneJSON & {
  floors?: SceneFloorJSON[];
  active_floor_id?: string;
  view_mode?: ProjectFloorPlan["viewMode"];
  show_underlay?: boolean;
  roof?: ProjectFloorPlan["roof"];
};

type SceneFloorContent = Omit<
  SceneJSON,
  | "floors"
  | "active_floor_id"
  | "view_mode"
  | "show_underlay"
  | "roof"
  | "extracted_at"
  | "floorplan_url"
>;

// ── Shared conversion core ────────────────────────────────────────────────

function floorStateToSceneFields(
  fp: FloorPlanState,
  cfg: SceneConfig,
): Omit<
  SceneJSON,
  | "floors"
  | "active_floor_id"
  | "view_mode"
  | "show_underlay"
  | "roof"
  | "extracted_at"
  | "floorplan_url"
> {
  const roomIdMap = new Map<string, string>();

  const rooms: SceneRoom[] = fp.rooms.map((room, idx) => {
    const serializedRoomId = `room_${idx + 1}`;
    roomIdMap.set(room.id, serializedRoomId);

    // Only room-anchored openings (segmentNodeIds unset) belong here.
    // Segment-anchored openings are collected separately, once, below —
    // see `segment_openings`.
    const roomOpenings = fp.openings.filter(
      (o) => o.roomId === room.id && !o.segmentNodeIds,
    );

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
    const railings: RoomRailing[] = roomOpenings
      .filter((o) => o.type === "railing")
      .map((o) => ({
        wall: o.wall,
        position: o.position,
        width: o.width,
        railing_style: o.railingStyle,
        railing_height: o.railingHeight,
        railing_post_spacing: o.railingPostSpacing,
        railing_width_dim: o.railingWidthDim,
        railing_color: o.railingColor,
        railing_solid_above: o.railingSolidAbove,
        railing_wall_start: o.railingWallStart,
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
      railings,
    };
  });

  // Segment-anchored openings — any door/window/railing NOT tied to a room
  // (i.e. placed on a line-drawn wall). Previously dropped entirely for
  // every opening type; now captured once, independent of the rooms loop.
  const segment_openings: SceneSegmentOpening[] = fp.openings
    .filter((o) => !!o.segmentNodeIds)
    .map((o) => ({
      id: o.id,
      type: o.type,
      segment_node_ids: o.segmentNodeIds!,
      segment_t: o.segmentT ?? 0,
      width: o.width,
      height: o.height,
      sill_height: o.sillHeight,
      material: o.material,
      railing_style: o.railingStyle,
      railing_height: o.railingHeight,
      railing_post_spacing: o.railingPostSpacing,
      railing_width_dim: o.railingWidthDim,
      railing_color: o.railingColor,
      railing_solid_above: o.railingSolidAbove,
      railing_wall_start: o.railingWallStart,
    }));

  const line_nodes = (fp.lineNodes ?? []).map((n) => ({
    id: n.id,
    x: n.x,
    z: n.z,
  }));
  const line_segments = (fp.lineSegments ?? []).map((s) => ({
    id: s.id,
    node_ids: s.nodeIds,
    thickness: s.thickness,
    height: s.height,
    wall_type: s.wallType,
  }));
  const closed_shapes = (fp.closedShapes ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    node_ids: s.nodeIds,
    floor_material: s.floorMaterial,
    wall_material: s.wallMaterial,
    wall_overrides: s.wallOverrides,
    cutout: s.cutout,
  }));

  const lights: SceneLight[] = (fp.lights ?? []).map((l) => ({
    id: l.id,
    type: l.type,
    room_id: l.roomId ? roomIdMap.get(l.roomId) : undefined,
    wall: l.wall,
    position: l.position,
    segment_node_ids: l.segmentNodeIds,
    segment_t: l.segmentT,
    x: l.x,
    z: l.z,
    width: l.width,
    aim_rotation: l.aimRotation,
    aim_tilt: l.aimTilt,
    path_node_ids: l.pathNodeIds,
    bulb_count: l.bulbCount,
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
    rooms,
    furniture,
    stairs: stairs ?? [],
    lights: lights ?? [],
    door_style: cfg.doorStyle ?? ("glass_clear" as DoorStyle),
    global_wall_material: cfg.globalWallMaterial ?? "paint",
    global_floor_material: cfg.globalFloorMaterial ?? "plain",
    line_nodes,
    line_segments,
    closed_shapes,
    outdoor_objects,
    segment_openings,
    ground_material: cfg.groundMaterial,
    saved_views: fp.savedViews?.map((v) => ({
      id: v.id,
      label: v.label,
      position: v.position,
      target: v.target,
    })),
  };
}

// ── Single-floor save ──────────────────────────────────────────────────

export function floorPlanStateToSceneJSON(
  fp: FloorPlanState,
  sceneConfig: SceneConfig,
): SceneJSON {
  return {
    ...floorStateToSceneFields(fp, sceneConfig),
    extracted_at: new Date().toISOString(),
    floorplan_url: "",
  };
}

// ── Multi-floor save ─────────────────────────────────────────────────────

export function projectFloorPlanToSceneJSON(
  projectFloorPlan: ProjectFloorPlan,
  sceneConfig: SceneConfig,
): SceneJSONWithFloors {
  const sortedFloors = [...projectFloorPlan.floors].sort(
    (a, b) => a.order - b.order,
  );

  const floors: SceneFloorJSON[] = sortedFloors.map((floor) => ({
    id: floor.id,
    label: floor.label,
    order: floor.order,
    elevation: floor.elevation,
    visible: floor.visible,
    ...floorStateToSceneFields(floor.state, sceneConfig),
  }));

  const activeFloor =
    sortedFloors.find((f) => f.id === projectFloorPlan.activeFloorId) ??
    sortedFloors[0];

  const emptyFp: FloorPlanState = {
    rooms: [],
    lineNodes: [],
    lineSegments: [],
    closedShapes: [],
    openings: [],
    furniture: [],
    stairs: [],
    annotations: [],
    roomHeight: 2.7,
    wallDecor: [],
    lights: [],
    outdoorObjects: [],
    savedViews: [],
  };
  const activeFields = floorStateToSceneFields(
    activeFloor?.state ?? emptyFp,
    sceneConfig,
  );

  return {
    ...activeFields,
    floors,
    active_floor_id: projectFloorPlan.activeFloorId,
    view_mode: projectFloorPlan.viewMode,
    show_underlay: projectFloorPlan.showUnderlay,
    roof: projectFloorPlan.roof,
    extracted_at: new Date().toISOString(),
    floorplan_url: "",
  };
}

// ── Deserialize back into editor state ───────────────────────────────────

export function sceneJSONToFloorPlanState(
  jsonInput: SceneJSON,
  defaultRoomHeight = 2.7,
): {
  fp: FloorPlanState;
  sceneConfig: SceneConfig;
  projectFloorPlan: ProjectFloorPlan;
} {
  const json = jsonInput as SceneJSONWithFloors;

  if (json.floors && json.floors.length > 0) {
    const convertedFloors = json.floors
      .map((floorJson) => ({
        meta: floorJson,
        converted: convertSingleFloorJSON(floorJson, defaultRoomHeight),
      }))
      .sort((a, b) => a.meta.order - b.meta.order);

    const floors: Floor[] = convertedFloors.map(({ meta, converted }) => ({
      id: meta.id,
      label: meta.label,
      order: meta.order,
      elevation: meta.elevation,
      visible: meta.visible ?? true,
      state: converted.fp,
    }));

    const projectFloorPlan: ProjectFloorPlan = {
      floors,
      activeFloorId: json.active_floor_id ?? floors[0]?.id ?? "",
      viewMode: json.view_mode ?? "single",
      showUnderlay: json.show_underlay ?? false,
      roof: json.roof ?? DEFAULT_ROOF,
    };

    const activeFloor =
      floors.find((f) => f.id === projectFloorPlan.activeFloorId) ?? floors[0];
    const activeConverted = convertedFloors.find(
      (f) => f.meta.id === activeFloor.id,
    )!.converted;

    const mergedRoomConfigs: RoomSceneConfig[] = convertedFloors.flatMap(
      (f) => f.converted.sceneConfig.rooms,
    );
    const mergedLights: PlacedLight[] = convertedFloors.flatMap(
      (f) => f.converted.sceneConfig.lights,
    );

    const sceneConfig: SceneConfig = {
      ...activeConverted.sceneConfig,
      rooms: mergedRoomConfigs,
      lights: mergedLights,
    };

    return {
      fp: activeFloor.state,
      sceneConfig,
      projectFloorPlan,
    };
  }

  const { fp, sceneConfig } = convertSingleFloorJSON(json, defaultRoomHeight);
  const projectFloorPlan = migrateToMultiFloor(fp);

  return { fp, sceneConfig, projectFloorPlan };
}

function convertSingleFloorJSON(
  json: SceneFloorContent,
  defaultRoomHeight: number,
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
    // NEW — was missing entirely, so room-anchored railings never
    // survived a save/load round trip.
    for (const rl of r.railings ?? []) {
      openings.push({
        id: uid(),
        roomId,
        wall: rl.wall,
        type: "railing",
        variant: "railing",
        position: rl.position,
        width: rl.width,
        height: rl.railing_height ?? 0.9,
        sillHeight: 0,
        swingDirection: "inward",
        railingStyle: rl.railing_style as EditorOpening["railingStyle"],
        railingHeight: rl.railing_height,
        railingPostSpacing: rl.railing_post_spacing,
        railingWidthDim: rl.railing_width_dim,
        railingColor: rl.railing_color,
        railingSolidAbove: rl.railing_solid_above,
        railingWallStart: rl.railing_wall_start,
      });
    }
  }

  // NEW — segment-anchored openings (door/window/railing placed on a
  // line-drawn wall, not a rectangular room). These have no `roomId`.
  for (const so of json.segment_openings ?? []) {
    openings.push({
      id: so.id,
      roomId: "",
      wall: "north", // unused for segment-anchored openings; kept for type shape only
      type: so.type,
      variant: so.type === "railing" ? "railing" : `${so.type}-fixed`,
      position: 0, // unused — segmentT is the real placement value
      width: so.width,
      height: so.height,
      sillHeight: so.sill_height ?? 0,
      swingDirection: "inward",
      segmentNodeIds: so.segment_node_ids,
      segmentT: so.segment_t,
      material: normalizeDoorMaterialOverride(so.material),
      railingStyle: so.railing_style as EditorOpening["railingStyle"],
      railingHeight: so.railing_height,
      railingPostSpacing: so.railing_post_spacing,
      railingWidthDim: so.railing_width_dim,
      railingColor: so.railing_color,
      railingSolidAbove: so.railing_solid_above,
      railingWallStart: so.railing_wall_start,
    });
  }

  if (json.line_nodes && json.line_segments) {
    lineNodes = json.line_nodes.map((n) => ({ id: n.id, x: n.x, z: n.z }));
    lineSegments = json.line_segments.map((s) => ({
      id: s.id,
      nodeIds: s.node_ids,
      thickness: s.thickness ?? 0.15,
      closed: false,
      height: s.height,
      wallType: s.wall_type,
    }));
    closedShapes = (json.closed_shapes ?? []).map((s) => ({
      id: s.id,
      nodeIds: s.node_ids,
      label: s.label,
      floorMaterial: s.floor_material,
      wallMaterial: s.wall_material,
      wallOverrides: s.wall_overrides,
      cutout: s.cutout,
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
    width: l.width,
    aimRotation: l.aim_rotation,
    aimTilt: l.aim_tilt,
    pathNodeIds: l.path_node_ids,
    bulbCount: l.bulb_count,
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
    groundMaterial: json.ground_material,
    rooms: roomConfigs,
    lights,
  };

  return { fp, sceneConfig };
}
