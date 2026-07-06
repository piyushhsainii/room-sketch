import { LineNode, LineSegment } from "@/components/workspace/Tools/constants";

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
