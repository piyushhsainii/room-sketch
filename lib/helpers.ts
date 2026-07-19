import {
  EditorOpening,
  FloorPlanState,
  GRID_M,
  LineNode,
  LineSegment,
  PX_PER_M,
} from "@/components/workspace/Tools/constants";

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

export function deriveClosedPolygons(
  lineNodes: LineNode[],
  lineSegments: LineSegment[],
): string[][] {
  const nodeMap = new Map(lineNodes.map((n) => [n.id, n]));

  // Undirected adjacency (unique neighbor ids per node)
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

  if (adj.size === 0) return [];

  // Sort each vertex's neighbors by angle around it (ascending, CCW)
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
    // Previous entry in the CCW-sorted list = next edge clockwise —
    // traces the face lying to the right of directed edge u->v.
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
      const maxSteps = lineNodes.length * 4 + 8; // generous safety cap

      while (steps++ < maxSteps) {
        const key = `${u}->${v}`;
        if (visitedDirected.has(key)) break;
        visitedDirected.add(key);
        face.push(v);
        const w = nextInFace(u, v);
        u = v;
        v = w;
        if (u === a && v === b) break;
      }

      if (face.length >= 4) {
        face.pop(); // drop duplicate closing node (== face[0])
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

  // Dedup faces that are the same node set traced from different
  // starting directed edges.
  const seenKeys = new Set<string>();
  const uniqueFaces: { ids: string[]; signedArea: number }[] = [];
  for (const f of rawFaces) {
    const key = [...f].sort().join(",");
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    uniqueFaces.push({ ids: f, signedArea: signedArea(f) });
  }

  if (uniqueFaces.length === 0) return [];

  const positive = uniqueFaces.filter((f) => f.signedArea > 0.05);
  const negative = uniqueFaces.filter((f) => f.signedArea < -0.05);
  const interiorFaces =
    positive.length >= negative.length ? positive : negative;
  console.log("[deriveClosedPolygons]", {
    totalFacesFound: uniqueFaces.length,
    signs: uniqueFaces.map((f) => ({
      count: f.ids.length,
      signedArea: f.signedArea.toFixed(2),
    })),
    interiorCount: interiorFaces.length,
  });
  return interiorFaces.map((f) => f.ids);
  return interiorFaces.map((f) => f.ids);
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

export function tryConvertClosedLineShape(
  fp: FloorPlanState,
  newSegId: string,
): FloorPlanState {
  const adj = new Map<string, string[]>();
  for (const seg of fp.lineSegments) {
    for (let i = 0; i < seg.nodeIds.length - 1; i++) {
      const a = seg.nodeIds[i]!,
        b = seg.nodeIds[i + 1]!;
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
  }

  const newSeg = fp.lineSegments.find((s) => s.id === newSegId);
  if (!newSeg || newSeg.nodeIds.length < 2) return fp;

  const startId = newSeg.nodeIds[0]!;
  const endId = newSeg.nodeIds[newSeg.nodeIds.length - 1]!;

  function findPath(
    from: string,
    to: string,
    visited: Set<string>,
  ): string[] | null {
    if (from === to) return [from];
    visited.add(from);
    for (const next of adj.get(from) ?? []) {
      if (visited.has(next)) continue;
      if (from === endId && next === startId) continue;
      if (from === startId && next === endId) continue;
      const path = findPath(next, to, visited);
      if (path) return [from, ...path];
    }
    return null;
  }

  const path = findPath(endId, startId, new Set());
  if (!path || path.length < 3) return fp;

  // Deduplicate — old code put startId at index 0 AND at end of path, causing 4-node triangles
  const cycleNodeIds = [...new Set([startId, ...path])];
  if (cycleNodeIds.length < 3) return fp;

  const cycleNodes = cycleNodeIds
    .map((id) => fp.lineNodes.find((n) => n.id === id))
    .filter(Boolean) as LineNode[];
  if (cycleNodes.length < 3) return fp;

  // Only deduplicate against existing closedShapes, never create a room
  const cycleSet = new Set(cycleNodeIds);
  const alreadyExists = (fp.closedShapes ?? []).some(
    (s) =>
      s.nodeIds.length === cycleNodeIds.length &&
      s.nodeIds.every((id) => cycleSet.has(id)),
  );
  if (alreadyExists) return fp;

  return {
    ...fp,
    closedShapes: [
      ...(fp.closedShapes ?? []),
      {
        id: uid(),
        nodeIds: cycleNodeIds,
        label: `Area ${(fp.closedShapes ?? []).length + 1}`,
        color: "#FFFFFF",
      },
    ],
  };
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
