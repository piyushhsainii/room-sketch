"use client";
import { CameraView } from "@/components/workspace/lib/camera";
import {
  ClosedShape,
  EditorOpening,
  EditorRoom,
  FloorPlanState,
  GRID_M,
  LineNode,
  LineSegment,
  OPENING_VARIANT_LABELS,
  PX_PER_M,
  STAIRS_LABELS,
  WallMaterial,
} from "@/components/workspace/lib/constants";
import {
  FURNITURE_LABELS,
  getFurnitureFootprint,
} from "@/components/workspace/lib/furniture-constants";
import { PlacedStairs } from "@/components/workspace/lib/stairs-constants";
import { useCallback, useRef } from "react";

// export function deriveClosedPolygons(
//   lineNodes: LineNode[],
//   lineSegments: LineSegment[],
// ): string[][] {
//   const nodeMap = new Map(lineNodes.map((n) => [n.id, n]));

//   // Undirected adjacency (unique neighbor ids per node)
//   const adj = new Map<string, Set<string>>();
//   for (const seg of lineSegments) {
//     for (let i = 0; i < seg.nodeIds.length - 1; i++) {
//       const a = seg.nodeIds[i]!,
//         b = seg.nodeIds[i + 1]!;
//       if (a === b) continue;
//       if (!nodeMap.has(a) || !nodeMap.has(b)) continue;
//       if (!adj.has(a)) adj.set(a, new Set());
//       if (!adj.has(b)) adj.set(b, new Set());
//       adj.get(a)!.add(b);
//       adj.get(b)!.add(a);
//     }
//   }

//   if (adj.size === 0) return [];

//   // Sort each vertex's neighbors by angle around it (ascending, CCW)
//   const sortedNeighbors = new Map<string, string[]>();
//   for (const [id, neighbors] of adj) {
//     const p = nodeMap.get(id)!;
//     const list = [...neighbors];
//     list.sort((a, b) => {
//       const pa = nodeMap.get(a)!,
//         pb = nodeMap.get(b)!;
//       const angleA = Math.atan2(pa.z - p.z, pa.x - p.x);
//       const angleB = Math.atan2(pb.z - p.z, pb.x - p.x);
//       return angleA - angleB;
//     });
//     sortedNeighbors.set(id, list);
//   }

//   function nextInFace(u: string, v: string): string {
//     const list = sortedNeighbors.get(v)!;
//     const idx = list.indexOf(u);
//     // Previous entry in the CCW-sorted list = next edge clockwise —
//     // traces the face lying to the right of directed edge u->v.
//     const prevIdx = (idx - 1 + list.length) % list.length;
//     return list[prevIdx]!;
//   }

//   const visitedDirected = new Set<string>();
//   const rawFaces: string[][] = [];

//   for (const [a, neighbors] of adj) {
//     for (const b of neighbors) {
//       const startKey = `${a}->${b}`;
//       if (visitedDirected.has(startKey)) continue;

//       const face: string[] = [a];
//       let u = a,
//         v = b;
//       let steps = 0;
//       const maxSteps = lineNodes.length * 4 + 8; // generous safety cap

//       while (steps++ < maxSteps) {
//         const key = `${u}->${v}`;
//         if (visitedDirected.has(key)) break;
//         visitedDirected.add(key);
//         face.push(v);
//         const w = nextInFace(u, v);
//         u = v;
//         v = w;
//         if (u === a && v === b) break;
//       }

//       if (face.length >= 4) {
//         face.pop(); // drop duplicate closing node (== face[0])
//         rawFaces.push(face);
//       }
//     }
//   }

//   function signedArea(ids: string[]): number {
//     let a = 0;
//     for (let i = 0; i < ids.length; i++) {
//       const p1 = nodeMap.get(ids[i]!)!,
//         p2 = nodeMap.get(ids[(i + 1) % ids.length]!)!;
//       a += p1.x * p2.z - p2.x * p1.z;
//     }
//     return a / 2;
//   }

//   // Dedup faces that are the same node set traced from different
//   // starting directed edges.
//   const seenKeys = new Set<string>();
//   const uniqueFaces: { ids: string[]; area: number }[] = [];
//   for (const f of rawFaces) {
//     const key = [...f].sort().join(",");
//     if (seenKeys.has(key)) continue;
//     seenKeys.add(key);
//     uniqueFaces.push({ ids: f, area: Math.abs(signedArea(f)) });
//   }

//   if (uniqueFaces.length === 0) return [];

//   // Drop the single largest-area face — the outer/unbounded boundary of
//   // the wall network — keeping every genuinely enclosed sub-region,
//   // including ones created by a partition wall.
//   uniqueFaces.sort((a, b) => b.area - a.area);
//   const interiorFaces = uniqueFaces.slice(1).filter((f) => f.area > 0.05);

//   return interiorFaces.map((f) => f.ids);
// }

// ── Planar face traversal ───────────────────────────────────────────────
// Replaces the previous per-node "shortest cycle" DFS heuristic, which
// worked for a single simple loop but had no way to correctly decompose a
// graph where a partition/chord segment splits one enclosed area into two
// (or more) faces sharing edges — that heuristic could return the outer
// boundary instead of the sub-rooms, miss one sub-room, or return
// duplicates, depending on which node's DFS ran first and what it found.
//
// This instead does a standard planar straight-line graph face walk:
// 1. Sort each vertex's incident edges by angle.
// 2. For each directed edge (u -> v), the next edge of the SAME face is
//    the neighbor of v immediately clockwise from u in that sorted order
//    (this is the classic "next half-edge" rule used in DCEL/winged-edge
//    planar subdivision algorithms).
// 3. Walking this rule traces every bounded face exactly once per
//    direction, plus the single unbounded outer face.
// 4. The outer face is identified as the one with the largest area and
//    dropped.
//
// Known limitation: the "drop the single largest face" step assumes one
// connected wall network. If a floor plan has multiple disconnected
// line-wall loops, only one candidate outer face is dropped in total —
// this could incorrectly drop a legitimate large room if it happens to be
// the biggest. Flagging this now rather than silently over-building
// multi-component outer-face detection before confirming it's needed in
// practice.

let _lastLineNodes: LineNode[] | null = null;
let _lastLineSegments: LineSegment[] | null = null;
let _cachedFaces: string[][] | null = null;

export function deriveClosedPolygons(
  lineNodes: LineNode[],
  lineSegments: LineSegment[],
): string[][] {
  if (
    lineNodes === _lastLineNodes &&
    lineSegments === _lastLineSegments &&
    _cachedFaces
  ) {
    return _cachedFaces;
  }

  const nodeMap = new Map(lineNodes.map((n) => [n.id, n]));

  const adj = new Map<string, Set<string>>();
  for (const seg of lineSegments) {
    for (let i = 0; i < seg.nodeIds.length - 1; i++) {
      const a = seg.nodeIds[i]!,
        b = seg.nodeIds[i + 1]!;
      if (a === b) continue;
      if (!nodeMap.has(a) || !nodeMap.has(b)) continue;
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)!.add(b);
      adj.get(b)!.add(a);
    }
  }

  if (adj.size === 0) {
    _lastLineNodes = lineNodes;
    _lastLineSegments = lineSegments;
    _cachedFaces = [];
    return _cachedFaces;
  }

  const sortedNeighbors = new Map<string, string[]>();
  for (const [id, neighbors] of adj) {
    const p = nodeMap.get(id)!;
    const list = [...neighbors];
    list.sort((a, b) => {
      const pa = nodeMap.get(a)!,
        pb = nodeMap.get(b)!;
      const angleA = Math.atan2(pa.z - p.z, pa.x - p.x);
      const angleB = Math.atan2(pb.z - p.z, pb.x - p.x);
      return angleA - angleB;
    });
    sortedNeighbors.set(id, list);
  }

  function nextInFace(u: string, v: string): string {
    const list = sortedNeighbors.get(v)!;
    const idx = list.indexOf(u);
    const prevIdx = (idx - 1 + list.length) % list.length;
    return list[prevIdx]!;
  }

  const visitedDirected = new Set<string>();
  const rawFaces: string[][] = [];

  for (const [a, neighbors] of adj) {
    for (const b of neighbors) {
      const startKey = `${a}->${b}`;
      if (visitedDirected.has(startKey)) continue;

      const face: string[] = [a];
      let u = a,
        v = b;
      let steps = 0;
      let closed = false; // NEW — only true if the trace genuinely wraps back to its own start edge
      const maxSteps = lineNodes.length * 4 + 8;

      while (steps++ < maxSteps) {
        const key = `${u}->${v}`;
        if (visitedDirected.has(key)) {
          // We ran into an edge already consumed by another trace.
          // Only a real closure if it's specifically our own start edge —
          // anything else means this trace wandered into unrelated
          // geometry (classic dangling-T-junction symptom) and must be discarded.
          if (key === startKey) closed = true;
          break;
        }
        visitedDirected.add(key);
        face.push(v);
        const w = nextInFace(u, v);
        u = v;
        v = w;
        if (u === a && v === b) {
          closed = true;
          break;
        }
      }

      // Previously: `if (face.length >= 4)` — pushed incomplete/wandering
      // traces too. Now require BOTH a proper closure AND enough nodes.
      if (closed && face.length >= 4) {
        face.pop();
        rawFaces.push(face);
      }
    }
  }

  function signedArea(ids: string[]): number {
    let a = 0;
    for (let i = 0; i < ids.length; i++) {
      const p1 = nodeMap.get(ids[i]!)!,
        p2 = nodeMap.get(ids[(i + 1) % ids.length]!)!;
      a += p1.x * p2.z - p2.x * p1.z;
    }
    return a / 2;
  }

  const seenKeys = new Set<string>();
  const uniqueFaces: { ids: string[]; signedArea: number }[] = [];
  for (const f of rawFaces) {
    const key = [...f].sort().join(",");
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    uniqueFaces.push({ ids: f, signedArea: signedArea(f) });
  }

  if (uniqueFaces.length === 0) {
    _lastLineNodes = lineNodes;
    _lastLineSegments = lineSegments;
    _cachedFaces = [];
    return _cachedFaces;
  }

  // ── Determine each connected component's outer boundary face and ──────
  // exclude only that one, keeping every other face (regardless of sign)
  // as an interior room/sub-area. This replaces the old global
  // positive-vs-negative-count heuristic, which broke as soon as a
  // partition or extra sub-area shifted the count balance.
  const parent = new Map<string, string>();
  function find(x: string): string {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  }
  function union(a: string, b: string) {
    const ra = find(a),
      rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  for (const id of adj.keys()) parent.set(id, id);
  for (const [a, neighbors] of adj) {
    for (const b of neighbors) union(a, b);
  }

  const facesByComponent = new Map<string, typeof uniqueFaces>();
  for (const f of uniqueFaces) {
    const compId = find(f.ids[0]!);
    if (!facesByComponent.has(compId)) facesByComponent.set(compId, []);
    facesByComponent.get(compId)!.push(f);
  }

  const interiorFaces: typeof uniqueFaces = [];
  for (const faces of facesByComponent.values()) {
    if (faces.length === 1) {
      // A lone face with nothing else in its component IS the room itself
      // (e.g. a single unpartitioned room) — keep it.
      interiorFaces.push(...faces);
      continue;
    }
    let outerIdx = 0;
    let maxAbs = Math.abs(faces[0]!.signedArea);
    for (let i = 1; i < faces.length; i++) {
      const a = Math.abs(faces[i]!.signedArea);
      if (a > maxAbs) {
        maxAbs = a;
        outerIdx = i;
      }
    }
    faces.forEach((f, i) => {
      if (i !== outerIdx) interiorFaces.push(f);
    });
  }

  const result = interiorFaces.map((f) => f.ids);
  _lastLineNodes = lineNodes;
  _lastLineSegments = lineSegments;
  _cachedFaces = result;
  return result;
}

// lib/helpers.ts (or wherever insertNodeIntoShapesOnSplit lives)

const SPLICE_EPS = 0.05; // meters — matches the project's existing tolerance conventions

function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = bx - ax,
    dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-9) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/**
 * Given a new node that was just placed (e.g. as the start/end of a new
 * wall), check every OTHER segment for an edge that this node lies on
 * top of but is not already an endpoint of, and splice it in.
 *
 * MUST be called any time a new node/wall is created, at the same call
 * site that already calls insertNodeIntoShapesOnSplit — this is the
 * lineSegments-side counterpart that was missing, which is why T-junction
 * corners silently fail to register as real graph connections.
 */
export function spliceNodeIntoIntersectingSegments(
  lineSegments: LineSegment[],
  lineNodes: LineNode[],
  newNodeId: string,
): LineSegment[] {
  const nodeMap = new Map(lineNodes.map((n) => [n.id, n]));
  const newNode = nodeMap.get(newNodeId);
  if (!newNode) return lineSegments;

  return lineSegments.map((seg) => {
    const ids = seg.nodeIds;
    // Already an endpoint somewhere on this segment — nothing to splice.
    if (ids.includes(newNodeId)) return seg;

    for (let i = 0; i < ids.length - 1; i++) {
      const a = nodeMap.get(ids[i]!);
      const b = nodeMap.get(ids[i + 1]!);
      if (!a || !b) continue;

      const d = distToSegment(newNode.x, newNode.z, a.x, a.z, b.x, b.z);
      if (d < SPLICE_EPS) {
        const next = [...ids];
        next.splice(i + 1, 0, newNodeId);
        return { ...seg, nodeIds: next };
      }
    }
    return seg;
  });
}

export const T_BASE = "/textures";

export const WALL_TEX = {
  normal: `${T_BASE}/Plaster001_1K-JPG_NormalGL.jpg`,
  rough: `${T_BASE}/Plaster001_1K-JPG_Roughness.jpg`,
};

export const DOOR_TEX_OAK = {
  map: `${T_BASE}/Wood049_1K-JPG_Color.jpg`,
  normal: `${T_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
  rough: `${T_BASE}/Wood049_1K-JPG_Roughness.jpg`,
};

export const FLOOR_TEX: Record<
  string,
  {
    map: string;
    normal: string;
    rough: string;
    repeat: number;
    roughness: number;
    metalness: number;
  }
> = {
  wood: {
    map: `${T_BASE}/Wood049_1K-JPG_Color.jpg`,
    normal: `${T_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
    rough: `${T_BASE}/Wood049_1K-JPG_Roughness.jpg`,
    repeat: 3,
    roughness: 0.72,
    metalness: 0.0,
  },
  marble: {
    map: `${T_BASE}/Marble022_1K-JPG_Color.jpg`,
    normal: `${T_BASE}/Marble022_1K-JPG_NormalGL.jpg`,
    rough: `${T_BASE}/Marble022_1K-JPG_Roughness.jpg`,
    repeat: 1.5,
    roughness: 0.18,
    metalness: 0.04,
  },
  concrete: {
    map: `${T_BASE}/Concrete025_1K-JPG_Color.jpg`,
    normal: `${T_BASE}/Concrete025_1K-JPG_NormalGL.jpg`,
    rough: `${T_BASE}/Concrete025_1K-JPG_Roughness.jpg`,
    repeat: 2,
    roughness: 0.92,
    metalness: 0.0,
  },
  tiles: {
    map: `${T_BASE}/Tiles101_1K-JPG_Color.jpg`,
    normal: `${T_BASE}/Tiles101_1K-JPG_NormalGL.jpg`,
    rough: `${T_BASE}/Tiles101_Roughness.jpg`,
    repeat: 2,
    roughness: 0.3,
    metalness: 0.04,
  },
  fabric: {
    map: `${T_BASE}/Fabric049_1K-JPG_Color.jpg`,
    normal: `${T_BASE}/Fabric049_1K-JPG_NormalGL.jpg`,
    rough: `${T_BASE}/Fabric049_1K-JPG_Roughness.jpg`,
    repeat: 4,
    roughness: 0.97,
    metalness: 0.0,
  },
  plaster: {
    map: `${T_BASE}/Plaster001_1K-JPG_Color.jpg`,
    normal: `${T_BASE}/Plaster001_1K-JPG_NormalGL.jpg`,
    rough: `${T_BASE}/Plaster001_1K-JPG_Roughness.jpg`,
    repeat: 2,
    roughness: 0.88,
    metalness: 0.0,
  },
};

export function snapM(v: number) {
  return Math.round(v / GRID_M) * GRID_M;
}

export function snapFurniture(v: number) {
  return Math.round(v / 0.1) * 0.1;
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// export function tryConvertClosedLineShape(
//   fp: FloorPlanState,
//   newSegId: string,
// ): FloorPlanState {
//   const adj = new Map<string, string[]>();
//   for (const seg of fp.lineSegments) {
//     for (let i = 0; i < seg.nodeIds.length - 1; i++) {
//       const a = seg.nodeIds[i]!,
//         b = seg.nodeIds[i + 1]!;
//       if (!adj.has(a)) adj.set(a, []);
//       if (!adj.has(b)) adj.set(b, []);
//       adj.get(a)!.push(b);
//       adj.get(b)!.push(a);
//     }
//   }

//   const newSeg = fp.lineSegments.find((s) => s.id === newSegId);
//   if (!newSeg || newSeg.nodeIds.length < 2) return fp;

//   const startId = newSeg.nodeIds[0]!;
//   const endId = newSeg.nodeIds[newSeg.nodeIds.length - 1]!;

//   function findPath(
//     from: string,
//     to: string,
//     visited: Set<string>,
//   ): string[] | null {
//     if (from === to) return [from];
//     visited.add(from);
//     for (const next of adj.get(from) ?? []) {
//       if (visited.has(next)) continue;
//       if (from === endId && next === startId) continue;
//       if (from === startId && next === endId) continue;
//       const path = findPath(next, to, visited);
//       if (path) return [from, ...path];
//     }
//     return null;
//   }

//   const path = findPath(endId, startId, new Set());
//   if (!path || path.length < 3) return fp;

//   // Deduplicate — old code put startId at index 0 AND at end of path, causing 4-node triangles
//   const cycleNodeIds = [...new Set([startId, ...path])];
//   if (cycleNodeIds.length < 3) return fp;

//   const cycleNodes = cycleNodeIds
//     .map((id) => fp.lineNodes.find((n) => n.id === id))
//     .filter(Boolean) as LineNode[];
//   if (cycleNodes.length < 3) return fp;

//   // Only deduplicate against existing closedShapes, never create a room
//   const cycleSet = new Set(cycleNodeIds);
//   const alreadyExists = (fp.closedShapes ?? []).some(
//     (s) =>
//       s.nodeIds.length === cycleNodeIds.length &&
//       s.nodeIds.every((id) => cycleSet.has(id)),
//   );
//   if (alreadyExists) return fp;

//   return {
//     ...fp,
//     closedShapes: [
//       ...(fp.closedShapes ?? []),
//       {
//         id: uid(),
//         nodeIds: cycleNodeIds,
//         label: `Area ${(fp.closedShapes ?? []).length + 1}`,
//         color: "#FFFFFF",
//       },
//     ],
//   };
// }

export function tryConvertClosedLineShape(
  fp: FloorPlanState,
  newSegId?: string,
): FloorPlanState {
  const polygons = deriveClosedPolygons(fp.lineNodes, fp.lineSegments);
  const existing = fp.closedShapes ?? [];

  const newShapes: ClosedShape[] = [];
  for (const nodeIds of polygons) {
    if (nodeIds.length < 3) continue;
    const idSet = new Set(nodeIds);
    const alreadyExists = existing.some(
      (s) =>
        s.nodeIds.length === nodeIds.length &&
        s.nodeIds.every((id) => idSet.has(id)),
    );
    if (alreadyExists) continue;
    newShapes.push({
      id: uid(),
      nodeIds,
      label: `Area ${existing.length + newShapes.length + 1}`,
      color: "#FFFFFF",
    });
  }

  if (newShapes.length === 0) return fp;
  return { ...fp, closedShapes: [...existing, ...newShapes] };
}

export function toWorld(canvasPx: number, panPx: number, zoom: number) {
  return (canvasPx - panPx) / (PX_PER_M * zoom);
}
export function toCanvas(worldM: number, panPx: number, zoom: number) {
  return worldM * PX_PER_M * zoom + panPx;
}

export function getSegmentOpeningWorldPos(
  op: EditorOpening,
  nodes: LineNode[],
): { wx: number; wz: number; angle: number } | null {
  if (!op.segmentNodeIds || op.segmentT === undefined) return null;
  const a = nodes.find((n) => n.id === op.segmentNodeIds![0]);
  const b = nodes.find((n) => n.id === op.segmentNodeIds![1]);
  if (!a || !b) return null;
  const t = op.segmentT;
  const wx = a.x + (b.x - a.x) * t;
  const wz = a.z + (b.z - a.z) * t;
  const angle = Math.atan2(b.z - a.z, b.x - a.x);
  return { wx, wz, angle };
}

export function polygonAreaM2(
  nodeIds: string[],
  lineNodes: LineNode[],
): number {
  const nodeMap = new Map(lineNodes.map((n) => [n.id, n]));
  const pts = nodeIds
    .map((id) => nodeMap.get(id))
    .filter(Boolean) as LineNode[];
  if (pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i]!,
      p2 = pts[(i + 1) % pts.length]!;
    a += p1.x * p2.z - p2.x * p1.z;
  }
  return Math.abs(a / 2);
}

export function labelForHover(id: string, fp: FloorPlanState): string {
  if (id.includes("::wall::")) {
    const wall = id.split("::wall::")[1];
    return `Wall (${wall})`;
  }
  const op = fp.openings.find((o) => o.id === id);
  if (op) return OPENING_VARIANT_LABELS[op.variant ?? op.type] ?? op.type;
  const room = fp.rooms.find((r) => r.id === id);
  if (room) return room.label;
  const f = (fp.furniture ?? []).find((x) => x.id === id);
  if (f) return FURNITURE_LABELS[f.type];
  const s = (fp.stairs ?? []).find((x) => x.id === id);
  if (s) return STAIRS_LABELS[s.type];
  if (fp.lineSegments.some((sg) => sg.id === id)) return "Wall segment";
  return "";
}

export function roomContainsPoint(room: EditorRoom, wx: number, wz: number) {
  return (
    wx >= room.x &&
    wx <= room.x + room.width &&
    wz >= room.z &&
    wz <= room.z + room.depth
  );
}

export function getWallHit(
  room: EditorRoom,
  wx: number,
  wz: number,
  thresholdM: number,
): "north" | "south" | "east" | "west" | null {
  const d = {
    north: Math.abs(wz - room.z),
    south: Math.abs(wz - (room.z + room.depth)),
    west: Math.abs(wx - room.x),
    east: Math.abs(wx - (room.x + room.width)),
  };
  const min = Math.min(d.north, d.south, d.west, d.east);
  if (min > thresholdM) return null;
  return Object.entries(d).find(([, v]) => v === min)![0] as
    | "north"
    | "south"
    | "east"
    | "west";
}

// Group nodes into connected components so multi-building/disconnected
// wall graphs are handled correctly, not just a single blob.
const parent = new Map<string, string>();
function find(x: string): string {
  while (parent.get(x) !== x) {
    parent.set(x, parent.get(parent.get(x)!)!);
    x = parent.get(x)!;
  }
  return x;
}
function union(a: string, b: string) {
  const ra = find(a),
    rb = find(b);
  if (ra !== rb) parent.set(ra, rb);
}

export function repairDisconnectedNodes(
  fp: FloorPlanState,
  tolerance = 0.05,
): FloorPlanState {
  let nodes = [...fp.lineNodes];
  let segments = fp.lineSegments.map((s) => ({
    ...s,
    nodeIds: [...s.nodeIds],
  }));

  // ── Pass 1: merge near-duplicate coincident nodes ──────────────────────
  const idRemap = new Map<string, string>(); // dropped id -> surviving id
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (!a || idRemap.has(a.id)) continue;
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      if (!b || idRemap.has(b.id)) continue;
      if (Math.hypot(a.x - b.x, a.z - b.z) < tolerance) {
        idRemap.set(b.id, a.id);
      }
    }
  }

  if (idRemap.size > 0) {
    nodes = nodes.filter((n) => !idRemap.has(n.id));
    segments = segments.map((s) => ({
      ...s,
      nodeIds: s.nodeIds.map((id) => idRemap.get(id) ?? id),
    }));
    // A merge can create a degenerate segment (consecutive duplicate ids,
    // e.g. a 2-node wall whose two endpoints just became the same node) —
    // drop those, and collapse any other consecutive duplicates in-place.
    segments = segments
      .map((s) => ({
        ...s,
        nodeIds: s.nodeIds.filter(
          (id, idx) => idx === 0 || id !== s.nodeIds[idx - 1],
        ),
      }))
      .filter((s) => s.nodeIds.length >= 2);
  }

  // ── Pass 2: split any segment whose span a node now sits on ────────────
  // (handles the case where a node was already correctly de-duplicated in
  // pass 1 for one wall, but still floats mid-span on a DIFFERENT wall —
  // e.g. the partition's far end lands on the boundary wall it's meant to
  // connect to.)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function pointOnSegment(
    px: number,
    pz: number,
    ax: number,
    az: number,
    bx: number,
    bz: number,
  ) {
    const dx = bx - ax,
      dz = bz - az;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-9) return null;
    const t = ((px - ax) * dx + (pz - az) * dz) / len2;
    if (t <= 0.001 || t >= 0.999) return null; // at/beyond an endpoint, not a true mid-span hit
    const projX = ax + t * dx,
      projZ = az + t * dz;
    const dist = Math.hypot(px - projX, pz - projZ);
    return dist < tolerance ? t : null;
  }

  let changed = true;
  let guard = 0;
  while (changed && guard++ < 200) {
    changed = false;
    outer: for (const node of nodes) {
      for (let si = 0; si < segments.length; si++) {
        const seg = segments[si]!;
        for (let k = 0; k < seg.nodeIds.length - 1; k++) {
          const aId = seg.nodeIds[k]!,
            bId = seg.nodeIds[k + 1]!;
          if (aId === node.id || bId === node.id) continue;
          const a = nodeMap.get(aId),
            b = nodeMap.get(bId);
          if (!a || !b) continue;
          const t = pointOnSegment(node.x, node.z, a.x, a.z, b.x, b.z);
          if (t !== null) {
            // Split: replace [..., aId, bId, ...] with [..., aId, node.id, bId, ...]
            const newNodeIds = [...seg.nodeIds];
            newNodeIds.splice(k + 1, 0, node.id);
            segments[si] = { ...seg, nodeIds: newNodeIds };
            changed = true;
            break outer;
          }
        }
      }
    }
  }

  return { ...fp, lineNodes: nodes, lineSegments: segments };
}

// lib/helpers.ts
export type WorldBBox = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function bboxForEntity(
  fp: FloorPlanState,
  id: string,
): WorldBBox | null {
  const room = fp.rooms.find((r) => r.id === id);
  if (room)
    return {
      minX: room.x,
      maxX: room.x + room.width,
      minZ: room.z,
      maxZ: room.z + room.depth,
    };

  const node = fp.lineNodes.find((n) => n.id === id);
  if (node) return { minX: node.x, maxX: node.x, minZ: node.z, maxZ: node.z };

  const seg = fp.lineSegments.find((s) => s.id === id);
  if (seg) {
    const nodes = seg.nodeIds
      .map((nid) => fp.lineNodes.find((n) => n.id === nid))
      .filter(Boolean) as LineNode[];
    if (nodes.length === 0) return null;
    const xs = nodes.map((n) => n.x),
      zs = nodes.map((n) => n.z);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  }

  const shape = (fp.closedShapes ?? []).find((s) => s.id === id);
  if (shape) {
    const nodes = shape.nodeIds
      .map((nid) => fp.lineNodes.find((n) => n.id === nid))
      .filter(Boolean) as LineNode[];
    if (nodes.length === 0) return null;
    const xs = nodes.map((n) => n.x),
      zs = nodes.map((n) => n.z);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  }

  const f = (fp.furniture ?? []).find((f) => f.id === id);
  if (f) {
    const fp2 = getFurnitureFootprint(f.type, undefined);
    const hw = (fp2.w * (f.scale ?? 1)) / 2,
      hd = (fp2.d * (f.scale ?? 1)) / 2;
    // axis-aligned bbox of the rotated footprint — conservative (uses the
    // rotated corner extents), consistent with "fully inside" being the
    // stricter, safer default per Plan 4 Step 4.
    const corners = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ];
    const cosR = Math.cos(f.rotation),
      sinR = Math.sin(f.rotation);
    const xs = corners.map(([lx, lz]) => f.x + lx * cosR - lz * sinR);
    const zs = corners.map(([lx, lz]) => f.z + lx * sinR + lz * cosR);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  }

  const st = (fp.stairs ?? []).find((s) => s.id === id);
  if (st) {
    const cx = st.x + st.width / 2,
      cz = st.z + st.depth / 2;
    const hw = st.width / 2,
      hd = st.depth / 2;
    const corners = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ];
    const cosR = Math.cos(st.rotation),
      sinR = Math.sin(st.rotation);
    const xs = corners.map(([lx, lz]) => cx + lx * cosR - lz * sinR);
    const zs = corners.map(([lx, lz]) => cz + lx * sinR + lz * cosR);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  }

  const l = (fp.lights ?? []).find((l) => l.id === id);
  if (l && l.x !== undefined && l.z !== undefined)
    return { minX: l.x, maxX: l.x, minZ: l.z, maxZ: l.z };

  const o = (fp.outdoorObjects ?? []).find((o) => o.id === id);
  if (o) return { minX: o.x, maxX: o.x, minZ: o.z, maxZ: o.z };

  const ann = (fp.annotations ?? []).find((a) => a.id === id);
  if (ann) return { minX: ann.x, maxX: ann.x, minZ: ann.z, maxZ: ann.z };

  // wall-anchored decor/openings/lights intentionally excluded — Plan 4
  // scopes marquee-select to freestanding + line/room entities; wall
  // items stay single-click-select only (see note at bottom).
  return null;
}

export function bboxFullyInside(
  b: WorldBBox,
  rx: [number, number],
  rz: [number, number],
): boolean {
  const [rminX, rmaxX] = rx,
    [rminZ, rmaxZ] = rz;
  return (
    b.minX >= rminX && b.maxX <= rmaxX && b.minZ >= rminZ && b.maxZ <= rmaxZ
  );
}

export function computeTopDownView(
  fp: FloorPlanState,
  aspect: number,
  fovDegrees: number,
): CameraView {
  const xs: number[] = [];
  const zs: number[] = [];

  fp.rooms.forEach((r) => {
    xs.push(r.x, r.x + r.width);
    zs.push(r.z, r.z + r.depth);
  });
  fp.lineNodes.forEach((n) => {
    xs.push(n.x);
    zs.push(n.z);
  });

  if (xs.length === 0 || zs.length === 0) {
    return {
      id: "snapshot-top-down",
      label: "Snapshot Top View",
      position: [0, 20, 0],
      target: [0, 0, 0],
      isPreset: false,
    };
  }

  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minZ = Math.min(...zs),
    maxZ = Math.max(...zs);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const spanX = Math.max(maxX - minX, 2);
  const spanZ = Math.max(maxZ - minZ, 2);

  // Camera looking straight down: visible half-height at distance d is d * tan(fov/2).
  // Visible half-width is half-height * aspect (aspect = viewport width/height).
  // Solve for the half-height needed to fit BOTH spans, then back out distance.
  const fovRad = (fovDegrees * Math.PI) / 180;
  const halfHeightNeeded = Math.max(spanZ / 2, spanX / (2 * aspect));
  const PADDING = 1.15; // 15% margin so walls aren't flush against the frame edge
  const height = (halfHeightNeeded / Math.tan(fovRad / 2)) * PADDING;

  return {
    id: "snapshot-top-down",
    label: "Snapshot Top View",
    position: [centerX, height, centerZ + 0.001],
    target: [centerX, 0, centerZ],
    isPreset: false,
  };
}

// Shared by both the floorplan canvas draw loop AND the palette thumbnails,
// so palette icons never drift out of sync with what actually gets placed.
export function drawStairIcon(
  ctx: CanvasRenderingContext2D,
  type: PlacedStairs["type"],
  sw: number,
  sd: number,
) {
  const treadStroke = "rgba(120,110,95,0.85)";
  ctx.strokeStyle = treadStroke;
  ctx.lineWidth = 1;

  if (type === "elevator") {
    ctx.beginPath();
    ctx.moveTo(-sw / 2, 0);
    ctx.lineTo(sw / 2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -sd / 2);
    ctx.lineTo(0, sd / 2);
    ctx.stroke();
  } else if (type === "stairs-spiral") {
    const r = Math.min(sw, sd) / 2 - 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    const spokeCount = 12;
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
  } else if (type === "stairs-l") {
    const flightW = Math.min(sw, sd) * 0.42;
    const steps1 = 5;
    for (let i = 1; i < steps1; i++) {
      const yy = -sd / 2 + ((sd - flightW) / steps1) * i;
      ctx.beginPath();
      ctx.moveTo(-sw / 2, yy);
      ctx.lineTo(-sw / 2 + flightW, yy);
      ctx.stroke();
    }
    const steps2 = 5;
    for (let i = 1; i < steps2; i++) {
      const xx =
        -sw / 2 + flightW + ((sw / 2 - (-sw / 2 + flightW)) / steps2) * i;
      ctx.beginPath();
      ctx.moveTo(xx, -sd / 2);
      ctx.lineTo(xx, -sd / 2 + flightW);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.rect(-sw / 2, -sd / 2, flightW, flightW);
    ctx.stroke();
  } else if (type === "stairs-u") {
    const runW = (sw - 0.2 * (sw / 2)) / 2;
    const landingD = sd * 0.25;
    const steps1 = 5;
    for (let i = 1; i < steps1; i++) {
      const yy = -sd / 2 + ((sd - landingD) / steps1) * i;
      ctx.beginPath();
      ctx.moveTo(-sw / 2, yy);
      ctx.lineTo(-sw / 2 + runW, yy);
      ctx.stroke();
    }
    const steps2 = 5;
    for (let i = 1; i < steps2; i++) {
      const yy = -sd / 2 + ((sd - landingD) / steps2) * i;
      ctx.beginPath();
      ctx.moveTo(sw / 2 - runW, yy);
      ctx.lineTo(sw / 2, yy);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.rect(-sw / 2, sd / 2 - landingD, sw, landingD);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -sd / 2);
    ctx.lineTo(0, sd / 2 - landingD);
    ctx.stroke();
  } else if (type === "stairs-ramp") {
    const hatchCount = 6;
    for (let i = 0; i <= hatchCount; i++) {
      const yy = -sd / 2 + (sd / hatchCount) * i;
      ctx.beginPath();
      ctx.moveTo(-sw / 2, yy);
      ctx.lineTo(-sw / 2 + sw * 0.3, yy - sd * 0.06);
      ctx.stroke();
    }
  } else {
    // stairs-straight
    const steps = 6;
    for (let i = 1; i < steps; i++) {
      const yy = -sd / 2 + (sd / steps) * i;
      ctx.beginPath();
      ctx.moveTo(-sw / 2, yy);
      ctx.lineTo(sw / 2, yy);
      ctx.stroke();
    }
  }
}

// lib/helpers.ts
export function getFloorContentBounds(
  state: FloorPlanState,
): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
  const xs: number[] = [];
  const zs: number[] = [];

  state.rooms.forEach((r) => {
    xs.push(r.x, r.x + r.width);
    zs.push(r.z, r.z + r.depth);
  });
  state.lineNodes.forEach((n) => {
    xs.push(n.x);
    zs.push(n.z);
  });
  state.stairs.forEach((s) => {
    xs.push(s.x);
    zs.push(s.z);
  });
  state.furniture.forEach((f) => {
    xs.push(f.x);
    zs.push(f.z);
  });
  state.outdoorObjects.forEach((o) => {
    xs.push(o.x);
    zs.push(o.z);
  });
  state.lights.forEach((l) => {
    // wall/segment-anchored lights don't carry x/z directly — skip, they're bounded by their wall anyway
    if (
      !l.wall &&
      !l.segmentNodeIds &&
      typeof l.x === "number" &&
      typeof l.z === "number"
    ) {
      xs.push(l.x);
      zs.push(l.z);
    }
  });

  if (xs.length === 0) return null;
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

type WallSideOverridePatch = { material?: WallMaterial; color?: string };

function edgeKeyPair(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function applyShapeExteriorMaterial(
  fp: FloorPlanState,
  targetShapeId: string, // NEW — pass shape.id so this matches the
  // same identity applyShapeWallTexture's
  // interior branch already uses.
  targetNodeIds: string[],
  patch: WallSideOverridePatch,
): FloorPlanState {
  const allPolys = deriveClosedPolygons(fp.lineNodes, fp.lineSegments);
  const targetKey = [...targetNodeIds].sort().join(",");
  const targetPoly =
    allPolys.find((p) => [...p].sort().join(",") === targetKey) ??
    targetNodeIds;

  const edgeToPolys = new Map<string, number[]>();
  allPolys.forEach((poly, idx) => {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!,
        b = poly[(i + 1) % poly.length]!;
      const k = edgeKeyPair(a, b);
      if (!edgeToPolys.has(k)) edgeToPolys.set(k, []);
      edgeToPolys.get(k)!.push(idx);
    }
  });

  function findPieceForEdge(a: string, b: string) {
    for (const seg of fp.lineSegments) {
      for (let i = 0; i < seg.nodeIds.length - 1; i++) {
        const sa = seg.nodeIds[i]!,
          sb = seg.nodeIds[i + 1]!;
        if ((sa === a && sb === b) || (sa === b && sb === a))
          return { seg, pieceIndex: i };
      }
    }
    return null;
  }

  let nextShapes = [...(fp.closedShapes ?? [])];
  let hasTrueExteriorPiece = false;

  for (let i = 0; i < targetPoly.length; i++) {
    const a = targetPoly[i]!,
      b = targetPoly[(i + 1) % targetPoly.length]!;
    const owners = edgeToPolys.get(edgeKeyPair(a, b)) ?? [];
    const neighborIdx = owners.find(
      (idx) => [...allPolys[idx]!].sort().join(",") !== targetKey,
    );
    const piece = findPieceForEdge(a, b);
    if (!piece) continue;
    const pieceKey = `${piece.seg.id}_${piece.pieceIndex}`;

    if (neighborIdx === undefined) {
      hasTrueExteriorPiece = true;
      continue;
    }

    const neighborPoly = allPolys[neighborIdx]!;
    const neighborKey = [...neighborPoly].sort().join(",");
    const neighborShape = nextShapes.find(
      (sh) => [...sh.nodeIds].sort().join(",") === neighborKey,
    );

    const neighborAlreadySet =
      !!neighborShape?.wallOverrides?.[pieceKey]?.material ||
      !!neighborShape?.wallMaterial;

    if (neighborAlreadySet) continue;

    if (neighborShape) {
      nextShapes = nextShapes.map((sh) =>
        sh === neighborShape
          ? {
              ...sh,
              wallOverrides: {
                ...(sh.wallOverrides ?? {}),
                [pieceKey]: {
                  ...(sh.wallOverrides?.[pieceKey] ?? {}),
                  ...patch,
                },
              },
            }
          : sh,
      );
    } else {
      nextShapes.push({
        id: crypto.randomUUID(),
        nodeIds: neighborPoly,
        label: undefined,
        wallOverrides: { [pieceKey]: { ...patch } },
      });
    }
  }

  if (hasTrueExteriorPiece) {
    // CHANGED — match by id first (same identity the interior branch of
    // applyShapeWallTexture uses via shape.id), falling back to the
    // nodeIds-derived key only if no shape with that id exists yet. This
    // is what stops a duplicate ClosedShape row from being created when
    // "Interior" and "Exterior" are set on the same area — previously
    // this branch only ever matched by nodeIds key, which could miss the
    // shape the interior branch had just written (or would write) under
    // shape.id, producing two rows: one with wallMaterial, one with
    // exteriorWallMaterial, and the renderer picking whichever it found
    // first for a given wall piece.
    const target =
      nextShapes.find((sh) => sh.id === targetShapeId) ??
      nextShapes.find((sh) => [...sh.nodeIds].sort().join(",") === targetKey);

    if (target) {
      nextShapes = nextShapes.map((sh) =>
        sh === target
          ? {
              ...sh,
              exteriorWallMaterial: patch.material,
              exteriorWallColor: patch.color,
            }
          : sh,
      );
    } else {
      nextShapes.push({
        id: targetShapeId, // CHANGED — reuse the real shape id instead of
        nodeIds: targetPoly, // crypto.randomUUID(), so a later interior edit
        label: undefined, // on the same shape.id (via applyShapeWallTexture)
        exteriorWallMaterial: patch.material, // finds and patches THIS row
        exteriorWallColor: patch.color, // instead of creating a third one.
      });
    }
  }

  return { ...fp, closedShapes: nextShapes };
}

export function segmentsForShape(
  shape: ClosedShape,
  allSegments: LineSegment[],
): LineSegment[] {
  const boundaryPairs = new Set<string>();
  for (let i = 0; i < shape.nodeIds.length; i++) {
    const a = shape.nodeIds[i]!;
    const b = shape.nodeIds[(i + 1) % shape.nodeIds.length]!;
    boundaryPairs.add([a, b].sort().join("|"));
  }
  return allSegments.filter((seg) => {
    if (seg.nodeIds.length !== 2) return false; // skip multi-node chains, or handle separately if needed
    const key = [seg.nodeIds[0], seg.nodeIds[1]].sort().join("|");
    return boundaryPairs.has(key);
  });
}

// hooks/useClickVsDrag.ts

// Hook version — for component-top-level use (e.g. furnitureMesh.tsx)
export function useClickVsDrag(onRealClick: (e: any) => void, threshold = 5) {
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = useCallback((e: any) => {
    downPos.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onPointerUp = useCallback(
    (e: any) => {
      const d = downPos.current;
      downPos.current = null;
      if (!d) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < threshold)
        onRealClick(e);
    },
    [onRealClick, threshold],
  );
  return { onPointerDown, onPointerUp };
}

// Factory version — for use inside .map()/loops where hooks aren't allowed.
// Safe because R3F pointer events don't trigger React re-renders on their
// own, so the closure variable survives from pointerdown to pointerup
// within a single render pass.
export function makeClickVsDragHandlers(
  onRealClick: (e: any) => void,
  threshold = 5,
) {
  let downPos: { x: number; y: number } | null = null;
  return {
    onPointerDown: (e: any) => {
      downPos = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: any) => {
      const d = downPos;
      downPos = null;
      if (!d) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < threshold)
        onRealClick(e);
    },
  };
}
