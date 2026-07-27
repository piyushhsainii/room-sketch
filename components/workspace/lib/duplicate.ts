// Tools/duplicate.ts
//
// Item 13 — Duplicate a room (or line-drawn closed shape) together with
// everything spatially inside it: openings on its walls, wall decor on its
// walls, lights (wall-anchored or free), furniture within its footprint, and
// its per-room scene-config appearance (wall/floor material overrides).
//
// SCOPE: single room/shape only (see plan step 2) — multi-select furniture
// group duplication is NOT implemented here; it's blocked on item 5
// (multi-select) not existing yet (confirmed: selectedId is a single string
// throughout handleMouseDown/Move/Up, no multi-select scaffolding present).
//
// Every cloned entity gets a brand-new id via uid() — never reuses an id,
// per the documented bug history in this codebase (reused/shared ids corrupt
// hit-testing and selection for both the original and the copy).

import {
  EditorRoom,
  EditorOpening,
  PlacedWallDecor,
  ClosedShape,
  LineNode,
  LineSegment,
  FloorPlanState,
} from "./constants";
import { SceneConfig, RoomSceneConfig } from "../FloorPlanEditor";
import { deriveClosedPolygons } from "@/lib/helpers";
import { PlacedLight } from "../lights-constant";
import { PlacedFurniture } from "./furniture-constants";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Point-in-polygon (ray casting), same algorithm as hitClosedShape in
// FloorPlanEditor.tsx — kept consistent since this determines which
// furniture/lights get pulled into a line-shape duplicate.
function pointInPolygon(wx: number, wz: number, nodes: LineNode[]): boolean {
  let inside = false;
  for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
    const xi = nodes[i]!.x,
      zi = nodes[i]!.z,
      xj = nodes[j]!.x,
      zj = nodes[j]!.z;
    if (zi > wz !== zj > wz && wx < ((xj - xi) * (wz - zi)) / (zj - zi) + xi)
      inside = !inside;
  }
  return inside;
}

function furnitureCenterInBounds(
  f: PlacedFurniture,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): boolean {
  return f.x >= minX && f.x <= maxX && f.z >= minZ && f.z <= maxZ;
}

// ── Rect room duplication ────────────────────────────────────────────────

export type DuplicateResult = {
  fp: FloorPlanState;
  sceneConfig: SceneConfig;
  newRoomId: string;
};

/**
 * Duplicates a rect EditorRoom and everything spatially inside its bounds.
 * The clone is offset by (offsetX, offsetZ) in world meters — caller decides
 * the offset (e.g. "placed directly adjacent" = room.width + 0.5m to the
 * east, or wherever the user has dragged a preview to).
 */
export function duplicateRoom(
  fp: FloorPlanState,
  sceneConfig: SceneConfig,
  roomId: string,
  offsetX: number,
  offsetZ: number,
): DuplicateResult | null {
  const room = fp.rooms.find((r) => r.id === roomId);
  if (!room) return null;

  const newRoomId = uid();
  const newRoom: EditorRoom = {
    ...room,
    id: newRoomId,
    x: room.x + offsetX,
    z: room.z + offsetZ,
    label: `${room.label} Copy`,
  };

  // Openings anchored to this room — position/wall/width/height all stay
  // relative to the room, only roomId and id change.
  const roomOpenings = fp.openings.filter((o) => o.roomId === roomId);
  const newOpenings: EditorOpening[] = roomOpenings.map((o) => ({
    ...o,
    id: uid(),
    roomId: newRoomId,
  }));

  // Wall decor anchored to this room (wall-mounted, not segment-mounted —
  // rect rooms don't have segmentNodeIds-based decor).
  const roomDecor = (fp.wallDecor ?? []).filter(
    (d) => d.roomId === roomId && !d.segmentNodeIds,
  );
  const newDecor: PlacedWallDecor[] = roomDecor.map((d) => ({
    ...d,
    id: uid(),
    roomId: newRoomId,
  }));

  // Wall-anchored lights on this room's walls.
  const roomLights = (fp.lights ?? []).filter(
    (l) => l.roomId === roomId && !l.segmentNodeIds,
  );
  // Free-placed lights (ceiling/floor) whose position falls within the
  // room's bounding box — same containment rule as furniture below.
  const freeLightsInRoom = (fp.lights ?? []).filter(
    (l) =>
      l.roomId === undefined &&
      l.x !== undefined &&
      l.z !== undefined &&
      l.x >= room.x &&
      l.x <= room.x + room.width &&
      l.z >= room.z &&
      l.z <= room.z + room.depth,
  );
  const newLights: PlacedLight[] = [
    ...roomLights.map((l) => ({ ...l, id: uid(), roomId: newRoomId })),
    ...freeLightsInRoom.map((l) => ({
      ...l,
      id: uid(),
      x: (l.x ?? 0) + offsetX,
      z: (l.z ?? 0) + offsetZ,
    })),
  ];

  // Furniture whose center falls within the room's bounding box.
  const roomFurniture = (fp.furniture ?? []).filter((f) =>
    furnitureCenterInBounds(
      f,
      room.x,
      room.x + room.width,
      room.z,
      room.z + room.depth,
    ),
  );
  const newFurniture: PlacedFurniture[] = roomFurniture.map((f) => ({
    ...f,
    id: uid(),
    x: f.x + offsetX,
    z: f.z + offsetZ,
  }));

  // Per-room scene config (wall/floor material overrides) — copy under the
  // new room id, or the clone silently falls back to global defaults
  // (flagged explicitly in the plan as an easy step to miss).
  const roomCfg = sceneConfig.rooms.find((r) => r.roomId === roomId);
  const newRoomCfg: RoomSceneConfig[] = roomCfg
    ? [...sceneConfig.rooms, { ...roomCfg, roomId: newRoomId }]
    : sceneConfig.rooms;

  const newFp: FloorPlanState = {
    ...fp,
    rooms: [...fp.rooms, newRoom],
    openings: [...fp.openings, ...newOpenings],
    wallDecor: [...(fp.wallDecor ?? []), ...newDecor],
    lights: [...(fp.lights ?? []), ...newLights],
    furniture: [...(fp.furniture ?? []), ...newFurniture],
  };
  const newSceneConfig: SceneConfig = { ...sceneConfig, rooms: newRoomCfg };

  return { fp: newFp, sceneConfig: newSceneConfig, newRoomId };
}

// ── Line-drawn closed-shape duplication ─────────────────────────────────

/**
 * Duplicates a line-drawn ClosedShape and everything inside it: clones its
 * nodes (translated by offset) and the segments connecting them, openings/
 * wall decor/lights anchored to those segments, and furniture/free-lights
 * whose position falls inside the polygon (point-in-polygon, not bbox —
 * matches how this app already hit-tests closed shapes elsewhere).
 */
export function duplicateClosedShape(
  fp: FloorPlanState,
  sceneConfig: SceneConfig,
  shapeId: string,
  offsetX: number,
  offsetZ: number,
): DuplicateResult | null {
  // shape.nodeIds is the source of truth for which nodes/segments belong
  // to this shape — same lookup pattern used throughout PropsPanel/
  // MaterialsPanel (matchClosedShape by node-id-set).
  const shape = (fp.closedShapes ?? []).find((s) => s.id === shapeId);
  const derivedNodeIds =
    shape?.nodeIds ??
    deriveClosedPolygons(fp.lineNodes, fp.lineSegments).find(
      (ids) =>
        [...ids].sort().join(",") === shapeId.replace(/^unconfigured::/, ""),
    );
  if (!derivedNodeIds) return null;

  const nodeIdSet = new Set(derivedNodeIds);
  const oldNodes = fp.lineNodes.filter((n) => nodeIdSet.has(n.id));
  if (oldNodes.length < 3) return null;

  const xs = oldNodes.map((n) => n.x),
    zs = oldNodes.map((n) => n.z);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minZ = Math.min(...zs),
    maxZ = Math.max(...zs);

  // Clone nodes, id map old→new for rewiring segments/openings/decor.
  const nodeIdMap = new Map<string, string>();
  const newNodes: LineNode[] = oldNodes.map((n) => {
    const newId = uid();
    nodeIdMap.set(n.id, newId);
    return { id: newId, x: n.x + offsetX, z: n.z + offsetZ };
  });

  // Segments where every node is inside this shape's node set.
  const oldSegments = fp.lineSegments.filter((s) =>
    s.nodeIds.every((id) => nodeIdSet.has(id)),
  );
  const segIdMap = new Map<string, string>();
  const newSegments: LineSegment[] = oldSegments.map((s) => {
    const newId = uid();
    segIdMap.set(s.id, newId);
    return {
      ...s,
      id: newId,
      nodeIds: s.nodeIds.map((id) => nodeIdMap.get(id)!),
    };
  });

  // Openings anchored to any of this shape's segments.
  const shapeOpenings = fp.openings.filter((o) =>
    o.segmentNodeIds?.every((id) => nodeIdSet.has(id)),
  );
  const newOpenings: EditorOpening[] = shapeOpenings.map((o) => ({
    ...o,
    id: uid(),
    roomId: segIdMap.get(o.roomId) ?? o.roomId,
    segmentNodeIds: o.segmentNodeIds?.map((id) => nodeIdMap.get(id)!),
  }));

  // Wall decor anchored to any of this shape's segments.
  const shapeDecor = (fp.wallDecor ?? []).filter((d) =>
    d.segmentNodeIds?.every((id) => nodeIdSet.has(id)),
  );
  const newDecor: PlacedWallDecor[] = shapeDecor.map((d) => ({
    ...d,
    id: uid(),
    roomId: segIdMap.get(d.roomId) ?? d.roomId,
    segmentNodeIds: d.segmentNodeIds?.map((id) => nodeIdMap.get(id)!),
  }));

  // Lights anchored to any of this shape's segments, plus free lights
  // inside the polygon.
  const shapeLights = (fp.lights ?? []).filter((l) =>
    l.segmentNodeIds?.every((id) => nodeIdSet.has(id)),
  );
  const freeLightsInside = (fp.lights ?? []).filter(
    (l) =>
      l.segmentNodeIds === undefined &&
      l.roomId === undefined &&
      l.x !== undefined &&
      l.z !== undefined &&
      pointInPolygon(l.x, l.z, oldNodes),
  );
  const newLights: PlacedLight[] = [
    ...shapeLights.map((l) => ({
      ...l,
      id: uid(),
      segmentNodeIds: l.segmentNodeIds?.map((id) => nodeIdMap.get(id)!),
    })),
    ...freeLightsInside.map((l) => ({
      ...l,
      id: uid(),
      x: (l.x ?? 0) + offsetX,
      z: (l.z ?? 0) + offsetZ,
    })),
  ];

  // Furniture whose position falls inside the polygon (point-in-polygon,
  // matching how this app hit-tests closed shapes elsewhere — bbox
  // containment would be wrong for non-rectangular shapes).
  const shapeFurniture = (fp.furniture ?? []).filter((f) =>
    pointInPolygon(f.x, f.z, oldNodes),
  );
  const newFurniture: PlacedFurniture[] = shapeFurniture.map((f) => ({
    ...f,
    id: uid(),
    x: f.x + offsetX,
    z: f.z + offsetZ,
  }));

  // ClosedShape's own appearance fields (label/wallMaterial/floorMaterial/
  // wallOverrides) live on the ClosedShape itself, not sceneConfig.rooms —
  // copy those directly under the new node-id set.
  const newShapeNodeIds = newNodes.map((n) => n.id);
  const newClosedShape: ClosedShape = shape
    ? {
        ...shape,
        id: uid(),
        nodeIds: newShapeNodeIds,
        label: shape.label ? `${shape.label} Copy` : undefined,
      }
    : { id: uid(), nodeIds: newShapeNodeIds };

  const newFp: FloorPlanState = {
    ...fp,
    lineNodes: [...fp.lineNodes, ...newNodes],
    lineSegments: [...fp.lineSegments, ...newSegments],
    closedShapes: [...(fp.closedShapes ?? []), newClosedShape],
    openings: [...fp.openings, ...newOpenings],
    wallDecor: [...(fp.wallDecor ?? []), ...newDecor],
    lights: [...(fp.lights ?? []), ...newLights],
    furniture: [...(fp.furniture ?? []), ...newFurniture],
  };

  return { fp: newFp, sceneConfig, newRoomId: newClosedShape.id };
}

// ── Mirror / flip ────────────────────────────────────────────────────────

export type MirrorAxis = "horizontal" | "vertical"; // horizontal = flip along X (east↔west swap); vertical = flip along Z (north↔south swap)

/**
 * Mirrors a rect room's openings/wall-decor/lights/furniture within the
 * room's own bounding box. Does NOT move the room itself — call this on an
 * already-placed duplicate (or the original) to flip its contents in place,
 * per plan step 5 ("a follow-up action on the placed copy").
 */
export function mirrorRoom(
  fp: FloorPlanState,
  roomId: string,
  axis: MirrorAxis,
): FloorPlanState {
  const room = fp.rooms.find((r) => r.id === roomId);
  if (!room) return fp;

  const flipWall = (wall: "north" | "south" | "east" | "west"): typeof wall => {
    if (axis === "vertical")
      return wall === "north" ? "south" : wall === "south" ? "north" : wall;
    return wall === "east" ? "west" : wall === "west" ? "east" : wall;
  };

  const openings = fp.openings.map((o) => {
    if (o.roomId !== roomId) return o;
    const isH = o.wall === "north" || o.wall === "south";
    const wallLen = isH ? room.width : room.depth;
    // Only flip position when the flip axis actually runs along this
    // wall's length; the wall assignment itself flips on the
    // perpendicular axis (a north-wall door becomes a south-wall door
    // on vertical flip, but its position-along-the-wall is unchanged
    // since that wall's length axis wasn't mirrored).
    const shouldFlipPosition =
      (axis === "horizontal" && isH) || (axis === "vertical" && !isH);
    return {
      ...o,
      wall: flipWall(o.wall),
      position: shouldFlipPosition ? wallLen - o.position : o.position,
    };
  });

  const wallDecor = (fp.wallDecor ?? []).map((d) => {
    if (d.roomId !== roomId || !d.wall) return d;
    const isH = d.wall === "north" || d.wall === "south";
    const wallLen = isH ? room.width : room.depth;
    const shouldFlipPosition =
      (axis === "horizontal" && isH) || (axis === "vertical" && !isH);
    return {
      ...d,
      wall: flipWall(d.wall),
      position: shouldFlipPosition ? wallLen - d.position : d.position,
    };
  });

  const lights = (fp.lights ?? []).map((l) => {
    if (l.x !== undefined && l.z !== undefined) {
      // Free-placed light inside the room bbox
      if (
        l.x < room.x ||
        l.x > room.x + room.width ||
        l.z < room.z ||
        l.z > room.z + room.depth
      )
        return l;
      return {
        ...l,
        x: axis === "horizontal" ? room.x + room.width - (l.x - room.x) : l.x,
        z: axis === "vertical" ? room.z + room.depth - (l.z - room.z) : l.z,
      };
    }
    if (l.roomId !== roomId || !l.wall) return l;
    const isH = l.wall === "north" || l.wall === "south";
    const wallLen = isH ? room.width : room.depth;
    const shouldFlipPosition =
      (axis === "horizontal" && isH) || (axis === "vertical" && !isH);
    return {
      ...l,
      wall: flipWall(l.wall),
      position:
        shouldFlipPosition && l.position !== undefined
          ? wallLen - l.position
          : l.position,
    };
  });

  const furniture = (fp.furniture ?? []).map((f) => {
    if (
      !furnitureCenterInBounds(
        f,
        room.x,
        room.x + room.width,
        room.z,
        room.z + room.depth,
      )
    )
      return f;
    const mirroredX =
      axis === "horizontal" ? room.x + room.width - (f.x - room.x) : f.x;
    const mirroredZ =
      axis === "vertical" ? room.z + room.depth - (f.z - room.z) : f.z;
    // Flip rotation to match: horizontal mirror negates rotation around
    // the vertical axis equivalent (standard 2D mirror-rotation rule).
    const mirroredRotation =
      axis === "horizontal" ? -f.rotation : Math.PI - f.rotation;
    return { ...f, x: mirroredX, z: mirroredZ, rotation: mirroredRotation };
  });

  return { ...fp, openings, wallDecor, lights, furniture };
}
