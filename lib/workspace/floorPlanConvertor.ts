// ─────────────────────────────────────────────────────────────────────────
// `SceneFloorJSON` defined HERE, not just described — a previous version of
// this file used it as a type annotation without ever declaring it, which
// doesn't compile ("Cannot find name 'SceneFloorJSON'"). Defining it locally
// means this file compiles standalone regardless of whether your shared
// SceneJSON type has been updated yet.
//
// Structural typing means this doesn't have to be nominally "the same"
// type as anything in your types file — as long as the shape matches,
// TypeScript treats them as compatible. So the ONLY change actually
// required in your SceneJSON type definition is adding the new optional
// fields below; you do not need to import this exact type:
//
//   export type SceneJSON = {
//     // ...all existing fields, unchanged...
//     floors?: SceneFloorJSON[];   // <- if you want to reuse this exact
//                                  //    type, import it from this file:
//                                  //    import type { SceneFloorJSON } from '@/lib/workspace/floorPlanConvertor'
//     active_floor_id?: string;
//     view_mode?: "single" | "stacked" | "stacked-full";
//     show_underlay?: boolean;
//     roof?: RoofConfig;
//   };
//
// Top-level `rooms`/`furniture`/`lights`/etc. stay mandatory on SceneJSON for
// back-compat with any old reader that doesn't know about `floors` — when we
// write a multi-floor payload we mirror the active floor's data into those
// top-level fields too (see `projectFloorPlanToSceneJSON` below).
// ─────────────────────────────────────────────────────────────────────────

// ADJUST PATH if DEFAULT_ROOF lives elsewhere — this matches where your
// earlier-shown migrateToMultiFloor.ts appears to reference it from.
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
  RoomWindow,
  SceneJSON,
  SceneOutdoorObject,
  SceneRoom,
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

// Local widened type — lets this file compile even before `SceneJSON`
// itself has been updated with the `floors`/`active_floor_id`/etc. fields.
// Once your shared SceneJSON type has them for real, this becomes a no-op
// and can be removed (or left — it's harmless either way).
type SceneJSONWithFloors = SceneJSON & {
  floors?: SceneFloorJSON[];
  active_floor_id?: string;
  view_mode?: ProjectFloorPlan["viewMode"];
  show_underlay?: boolean;
  roof?: ProjectFloorPlan["roof"];
};

// What `convertSingleFloorJSON` actually reads — deliberately narrower than
// full `SceneJSON` so both a legacy top-level payload (SceneJSON) and a
// single entry from `floors[]` (SceneFloorJSON, which omits extracted_at/
// floorplan_url/floors/etc.) can both be passed in without a cast.
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

// ── Shared conversion core, extracted so single-floor and multi-floor ─────
// serialization can't drift out of sync with each other.

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
  }));
  const closed_shapes = (fp.closedShapes ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    node_ids: s.nodeIds,
    floor_material: s.floorMaterial,
    wall_material: s.wallMaterial,
    wall_overrides: s.wallOverrides,
  }));

  // BUG FIX: was serializing `l.roomId` (the internal editor uid) directly.
  // On load, `sceneJSONToFloorPlanState`'s `roomIdReverseMap` is keyed by the
  // *serialized* room id ("room_1", not the uid), so the lookup always
  // missed and every light silently lost its room association on a
  // save → share → load round trip. Route it through `roomIdMap` (built
  // above, from the same rooms this light array belongs to) so the id
  // written out actually matches what the reverse map expects.
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
    ground_material: cfg.groundMaterial,
    saved_views: fp.savedViews?.map((v) => ({
      id: v.id,
      label: v.label,
      position: v.position,
      target: v.target,
    })),
  };
}

// ── Single-floor save (legacy path / non-multi-floor projects) ────────────

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

// ── Multi-floor save ────────────────────────────────────────────────────
// `sceneConfig.rooms`/`sceneConfig.lights` are expected to be the MERGED
// union across all floors (see `sceneJSONToFloorPlanState` below) — each
// room/light id is globally unique (uid()'d per floor at load time), so
// `floorStateToSceneFields` looking them up out of the merged cfg per-floor
// still resolves correctly without needing to pre-split cfg per floor.

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

  // Mirror the active floor's fields into the legacy top-level shape too,
  // so any older reader that doesn't know about `floors` yet still gets a
  // sane (if single-floor) result instead of an empty scene.
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

// ── Deserialize back into editor state ─────────────────────────────────

export function sceneJSONToFloorPlanState(
  jsonInput: SceneJSON,
  defaultRoomHeight = 2.7,
): {
  fp: FloorPlanState;
  sceneConfig: SceneConfig;
  projectFloorPlan: ProjectFloorPlan;
} {
  const json = jsonInput as SceneJSONWithFloors;

  // ── Multi-floor payload ──────────────────────────────────────────────
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

    // Merge per-floor sceneConfig.rooms/.lights across ALL floors — see
    // prior fix note. Each floor's room/light ids are globally unique
    // (freshly uid()'d per convertSingleFloorJSON call), so this union is
    // safe and lets Scene3D resolve materials/lights correctly for every
    // floor, not just whichever one happens to be active.
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

  // ── Legacy single-floor payload ──────────────────────────────────────
  const { fp, sceneConfig } = convertSingleFloorJSON(json, defaultRoomHeight);
  const projectFloorPlan = migrateToMultiFloor(fp);

  return { fp, sceneConfig, projectFloorPlan };
}

// Per-floor conversion, unchanged logic from before — used for both the
// legacy single-floor payload and each entry in a multi-floor `floors[]`.
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
    // Now correctly resolves — see the matching fix in
    // `floorStateToSceneFields` that routes room_id through `roomIdMap`
    // instead of writing out the raw internal uid.
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
