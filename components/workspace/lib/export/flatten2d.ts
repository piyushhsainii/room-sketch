// lib/export/flatten2d.ts
//
// STEP 1 (memoize polygon derivation) + STEP 6 (shared 2D flatten step).
//
// `deriveClosedPolygons()` in lib/helpers.ts already has its own internal
// memo cache (see the `_lastLineNodes` / `_cachedFaces` module-level cache
// added there). This file adds the second half of Step 1: a single
// memoized "flatten fp into exportable 2D primitives" function that
// FloorPlanEditor.tsx calls once per meaningful `fp` change, and passes
// the *same* result into draw2D, the DXF exporter, and the SVG exporter —
// so all three read from one place instead of each re-walking
// FloorPlanState independently (the exact "logic forked across files"
// problem Plan 3 calls out).

import {
  FloorPlanState,
  EditorOpening,
  LineNode,
  LineSegment,
  ClosedShape,
} from "@/components/workspace/lib/constants";
import { deriveClosedPolygons } from "@/lib/helpers";

export type FlatWallSegmentPiece = {
  id: string; // `${segmentId}::piece::${index}`
  segmentId: string;
  a: { x: number; z: number };
  b: { x: number; z: number };
  thickness: number;
  wallType: "solid" | "railing" | "open";
  height: number; // effective height (per-segment override or roomHeight)
};

export type FlatOpening = {
  id: string;
  kind: "door" | "window" | "opening";
  variant?: string;
  width: number;
  height: number;
  wx: number; // world x
  wz: number; // world z
  angle: number; // radians, wall direction at that point
  segmentId?: string; // owning line segment, if segment-anchored
};

export type FlatLabel = {
  id: string;
  text: string;
  x: number;
  z: number;
  kind: "room" | "area" | "annotation";
};

export type FlatWallDecor = {
  id: string;
  label: string;
  x: number;
  z: number;
  angle: number;
  width: number;
};

export type FlatLightPoint = {
  id: string;
  label: string;
  x: number;
  z: number;
};

export type FlatPlan2D = {
  closedPolygons: string[][]; // node-id loops, from deriveClosedPolygons
  polygonPoints: { x: number; z: number }[][]; // resolved world coords, parallel to closedPolygons
  wallPieces: FlatWallSegmentPiece[];
  openings: FlatOpening[];
  labels: FlatLabel[];
  wallDecor: FlatWallDecor[];
  lights: FlatLightPoint[];
  roomRects: {
    id: string;
    label: string;
    x: number;
    z: number;
    width: number;
    depth: number;
  }[];
};

// ── Step 1: memoization keyed on fp reference ──────────────────────────
// FloorPlanState is treated as immutable/replaced-on-change elsewhere in
// this codebase (see the React state pattern in FloorPlanEditor), so a
// reference-equality cache is sufficient and avoids a deep-compare cost.
let _lastFp: FloorPlanState | null = null;
let _lastFlat: FlatPlan2D | null = null;

export function deriveFlatPlan2D(fp: FloorPlanState): FlatPlan2D {
  if (fp === _lastFp && _lastFlat) return _lastFlat;

  const closedPolygons = deriveClosedPolygons(fp.lineNodes, fp.lineSegments);
  const nodeMap = new Map(fp.lineNodes.map((n) => [n.id, n]));

  const polygonPoints = closedPolygons.map((ids) =>
    ids
      .map((id) => nodeMap.get(id))
      .filter(Boolean)
      .map((n) => ({ x: n!.x, z: n!.z })),
  );

  // ── Wall pieces (line segments broken into a-b pairs) ──────────────────
  const wallPieces: FlatWallSegmentPiece[] = [];
  for (const seg of fp.lineSegments ?? []) {
    const nodes = seg.nodeIds
      .map((nid) => nodeMap.get(nid))
      .filter(Boolean) as LineNode[];
    const effH = seg.height ?? fp.roomHeight;
    for (let i = 0; i < nodes.length - 1; i++) {
      wallPieces.push({
        id: `${seg.id}::piece::${i}`,
        segmentId: seg.id,
        a: { x: nodes[i]!.x, z: nodes[i]!.z },
        b: { x: nodes[i + 1]!.x, z: nodes[i + 1]!.z },
        thickness: seg.thickness ?? 0.15,
        wallType: (seg.wallType ?? "solid") as "solid" | "railing" | "open",
        height: effH,
      });
    }
  }

  // ── Room boundary walls (rectangular rooms), flattened the same way ────
  for (const room of fp.rooms ?? []) {
    const corners: [number, number][] = [
      [room.x, room.z],
      [room.x + room.width, room.z],
      [room.x + room.width, room.z + room.depth],
      [room.x, room.z + room.depth],
    ];
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!,
        b = corners[(i + 1) % 4]!;
      wallPieces.push({
        id: `${room.id}::wall::${i}`,
        segmentId: room.id,
        a: { x: a[0], z: a[1] },
        b: { x: b[0], z: b[1] },
        thickness: 0.15,
        wallType: "solid",
        height: fp.roomHeight,
      });
    }
  }

  // ── Openings, resolved to world position + angle ────────────────────────
  const openings: FlatOpening[] = [];
  for (const op of fp.openings ?? []) {
    if (op.segmentNodeIds && op.segmentT !== undefined) {
      const a = nodeMap.get(op.segmentNodeIds[0]!);
      const b = nodeMap.get(op.segmentNodeIds[1]!);
      if (!a || !b) continue;
      const t = op.segmentT;
      openings.push({
        id: op.id,
        kind: op.type,
        variant: op.variant,
        width: op.width,
        height: op.height,
        wx: a.x + (b.x - a.x) * t,
        wz: a.z + (b.z - a.z) * t,
        angle: Math.atan2(b.z - a.z, b.x - a.x),
        segmentId: fp.lineSegments.find(
          (s) => s.nodeIds.includes(a.id) && s.nodeIds.includes(b.id),
        )?.id,
      });
    } else if (op.roomId && op.wall) {
      const room = fp.rooms.find((r) => r.id === op.roomId);
      if (!room) continue;
      let wx = 0,
        wz = 0,
        angle = 0;
      if (op.wall === "north") {
        wx = room.x + op.position;
        wz = room.z;
        angle = 0;
      } else if (op.wall === "south") {
        wx = room.x + op.position;
        wz = room.z + room.depth;
        angle = 0;
      } else if (op.wall === "west") {
        wx = room.x;
        wz = room.z + op.position;
        angle = Math.PI / 2;
      } else {
        wx = room.x + room.width;
        wz = room.z + op.position;
        angle = Math.PI / 2;
      }
      openings.push({
        id: op.id,
        kind: op.type,
        variant: op.variant,
        width: op.width,
        height: op.height,
        wx,
        wz,
        angle,
      });
    }
  }

  // ── Labels: rooms, closed-shape areas, annotations ──────────────────────
  const labels: FlatLabel[] = [];
  for (const room of fp.rooms ?? []) {
    labels.push({
      id: room.id,
      text: room.label,
      x: room.x + room.width / 2,
      z: room.z + room.depth / 2,
      kind: "room",
    });
  }
  const shapesIndex = new Map<string, ClosedShape>(
    (fp.closedShapes ?? []).map((s) => [[...s.nodeIds].sort().join(","), s]),
  );
  closedPolygons.forEach((ids, i) => {
    const key = [...ids].sort().join(",");
    const shape = shapesIndex.get(key);
    const pts = polygonPoints[i]!;
    if (pts.length < 3) return;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    labels.push({
      id: shape?.id ?? `area_${i}`,
      text: shape?.label ?? "Area",
      x: cx,
      z: cz,
      kind: "area",
    });
  });
  for (const ann of fp.annotations ?? []) {
    if (!ann.text) continue;
    labels.push({
      id: ann.id,
      text: ann.text,
      x: ann.x,
      z: ann.z,
      kind: "annotation",
    });
  }

  // ── Wall decor ───────────────────────────────────────────────────────────
  const wallDecor: FlatWallDecor[] = [];
  for (const d of fp.wallDecor ?? []) {
    let dx: number, dz: number, angle: number;
    if (d.segmentNodeIds) {
      const a = nodeMap.get(d.segmentNodeIds[0]!);
      const b = nodeMap.get(d.segmentNodeIds[1]!);
      if (!a || !b) continue;
      const t = d.segmentT ?? 0;
      dx = a.x + (b.x - a.x) * t;
      dz = a.z + (b.z - a.z) * t;
      angle = Math.atan2(b.z - a.z, b.x - a.x);
    } else {
      const room = fp.rooms.find((r) => r.id === d.roomId);
      if (!room || !d.wall) continue;
      if (d.wall === "north") {
        dx = room.x + d.position;
        dz = room.z;
        angle = 0;
      } else if (d.wall === "south") {
        dx = room.x + d.position;
        dz = room.z + room.depth;
        angle = 0;
      } else if (d.wall === "west") {
        dx = room.x;
        dz = room.z + d.position;
        angle = Math.PI / 2;
      } else {
        dx = room.x + room.width;
        dz = room.z + d.position;
        angle = Math.PI / 2;
      }
    }
    wallDecor.push({
      id: d.id,
      label: d.type,
      x: dx,
      z: dz,
      angle,
      width: d.width ?? 0.5,
    });
  }

  // ── Lights (only those with a resolvable point position — string_lights
  // is a path, not a point, and is intentionally left out of this flat
  // point list; exporters that care about it should read fp.lights directly) ──
  const lights: FlatLightPoint[] = [];
  for (const l of fp.lights ?? []) {
    if (l.x !== undefined && l.z !== undefined) {
      lights.push({ id: l.id, label: l.type, x: l.x, z: l.z });
    } else if (l.segmentNodeIds && l.segmentT !== undefined) {
      const a = nodeMap.get(l.segmentNodeIds[0]!);
      const b = nodeMap.get(l.segmentNodeIds[1]!);
      if (!a || !b) continue;
      const t = l.segmentT;
      lights.push({
        id: l.id,
        label: l.type,
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
      });
    }
  }

  const roomRects = (fp.rooms ?? []).map((r) => ({
    id: r.id,
    label: r.label,
    x: r.x,
    z: r.z,
    width: r.width,
    depth: r.depth,
  }));

  const result: FlatPlan2D = {
    closedPolygons,
    polygonPoints,
    wallPieces,
    openings,
    labels,
    wallDecor,
    lights,
    roomRects,
  };

  _lastFp = fp;
  _lastFlat = result;
  return result;
}
