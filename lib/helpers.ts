import {
  EditorOpening,
  FloorPlanState,
  GRID_M,
  LineNode,
  LineSegment,
  PX_PER_M,
} from "@/components/workspace/Tools/constants";

export function deriveClosedPolygons(
  lineNodes: LineNode[],
  lineSegments: LineSegment[],
): string[][] {
  // Build adjacency list from all segments
  const adj = new Map<string, Set<string>>();
  for (const seg of lineSegments) {
    for (let i = 0; i < seg.nodeIds.length - 1; i++) {
      const a = seg.nodeIds[i]!,
        b = seg.nodeIds[i + 1]!;
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)!.add(b);
      adj.get(b)!.add(a);
    }
  }

  // Only consider nodes with 2+ connections (part of a potential cycle)
  const candidates = new Set(
    [...adj.entries()]
      .filter(([, neighbors]) => neighbors.size >= 2)
      .map(([id]) => id),
  );

  const foundCycles: string[][] = [];
  const usedSets: Array<Set<string>> = [];

  for (const startId of candidates) {
    // DFS to find shortest cycle starting from this node
    function dfs(path: string[]): string[] | null {
      const current = path[path.length - 1]!;
      for (const next of adj.get(current) ?? []) {
        if (next === startId && path.length >= 3) {
          return [...path]; // found cycle back to start
        }
        if (path.includes(next)) continue;
        if (!candidates.has(next)) continue;
        const result = dfs([...path, next]);
        if (result) return result;
      }
      return null;
    }

    const cycle = dfs([startId]);
    if (!cycle || cycle.length < 3) continue;

    // Check this isn't a duplicate of an already-found cycle
    const cycleSet = new Set(cycle);
    const isDuplicate = usedSets.some(
      (existing) =>
        existing.size === cycleSet.size &&
        [...existing].every((id) => cycleSet.has(id)),
    );
    if (isDuplicate) continue;

    usedSets.push(cycleSet);
    foundCycles.push(cycle);
  }

  return foundCycles;
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
