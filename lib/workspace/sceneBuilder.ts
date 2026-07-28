import { FloorMaterial } from "@/components/workspace/lib/constants";
import type {
  RoomDoor,
  RoomWindow,
  SceneRoom,
  WallPoint,
} from "@/types/workspace";

export interface WallSegment {
  id: string;
  roomId: string;
  start: WallPoint;
  end: WallPoint;
  direction: "north" | "south" | "east" | "west";
  length: number;
  doors: RoomDoor[];
  windows: RoomWindow[];
}

export function getWallSegments(room: SceneRoom): WallSegment[] {
  const shape = room.shape;
  if (shape.length < 2) return [];

  const bounds = getRoomBounds(room);
  const { minX, maxX, minZ, maxZ, width, depth } = bounds;

  return [
    {
      id: `${room.id}_wall_north`,
      roomId: room.id,
      start: { x: minX, z: minZ },
      end: { x: maxX, z: minZ },
      direction: "north",
      length: width,
      doors: room.doors.filter((d) => d.wall === "north"),
      windows: room.windows.filter((w) => w.wall === "north"),
    },
    {
      id: `${room.id}_wall_east`,
      roomId: room.id,
      start: { x: maxX, z: minZ },
      end: { x: maxX, z: maxZ },
      direction: "east",
      length: depth,
      doors: room.doors.filter((d) => d.wall === "east"),
      windows: room.windows.filter((w) => w.wall === "east"),
    },
    {
      id: `${room.id}_wall_south`,
      roomId: room.id,
      start: { x: minX, z: maxZ },
      end: { x: maxX, z: maxZ },
      direction: "south",
      length: width,
      doors: room.doors.filter((d) => d.wall === "south"),
      windows: room.windows.filter((w) => w.wall === "south"),
    },
    {
      id: `${room.id}_wall_west`,
      roomId: room.id,
      start: { x: minX, z: minZ },
      end: { x: minX, z: maxZ },
      direction: "west",
      length: depth,
      doors: room.doors.filter((d) => d.wall === "west"),
      windows: room.windows.filter((w) => w.wall === "west"),
    },
  ];
}

export function getRoomCenter(room: SceneRoom): WallPoint {
  const pts = room.shape;
  if (pts.length === 0) return { x: 0, z: 0 };
  let sx = 0,
    sz = 0;
  for (const p of pts) {
    sx += p.x;
    sz += p.z;
  }
  return { x: sx / pts.length, z: sz / pts.length };
}

export function getRoomBounds(room: SceneRoom): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
} {
  const pts = room.shape;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 0;
    minZ = 0;
    maxZ = 0;
  }

  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

export function getSceneBounds(rooms: SceneRoom[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
  centerX: number;
  centerZ: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const room of rooms) {
    const b = getRoomBounds(room);
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minZ = Math.min(minZ, b.minZ);
    maxZ = Math.max(maxZ, b.maxZ);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 0;
    minZ = 0;
    maxZ = 0;
  }

  const width = maxX - minX;
  const depth = maxZ - minZ;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width,
    depth,
    centerX: minX + width / 2,
    centerZ: minZ + depth / 2,
  };
}

export function getInitialCameraPosition(rooms: SceneRoom[]): {
  x: number;
  y: number;
  z: number;
} {
  const bounds = getSceneBounds(rooms);
  const maxDim = Math.max(bounds.width, bounds.depth, 1);
  return {
    x: bounds.centerX + maxDim * 0.6,
    y: maxDim * 0.85,
    z: bounds.centerZ + maxDim * 0.8,
  };
}

export function getWalkStartPosition(rooms: SceneRoom[]): {
  x: number;
  y: number;
  z: number;
} {
  // Find the first room large enough to walk in
  const walkable =
    rooms.find((r) => {
      const b = getRoomBounds(r);
      return b.width >= 1.5 && b.depth >= 1.5;
    }) ?? rooms[0];

  if (!walkable) {
    const b = getSceneBounds(rooms);
    return { x: b.centerX, y: 1.6, z: b.centerZ };
  }

  const c = getRoomCenter(walkable);
  return { x: c.x, y: 1.6, z: c.z };
}

export function getMaterialColor(
  material: SceneRoom["floor_material"],
): string {
  const colors: Record<FloorMaterial, string> = {
    plain: "#C4A882",
    "solid-white": "#F5F3EF",
    "solid-gray": "#9E9E9E",
    "solid-black": "#2A2A2A",
    "solid-beige": "#D8CBB5",
    wood: "#C4A882",
    "wood-oak": "#C8A878",
    "wood-walnut": "#4A3220",
    "wood-floor-herringbone": "#B8945F",
    marble: "#F0EDE8",
    "marble-white": "#F5F2EE",
    "marble-black": "#3A3A3A",
    "marble-onyx": "#2E2A28",
    "marble-travertine": "#E4D9C4",
    "marble-white-veined": "#F2EFEA",
    concrete: "#9E9E9E",
    "concrete-polished": "#B0AFAC",
    tiles: "#D4D0CC",
    "tile-ceramic": "#E0DCD4",
    "brick-red": "#A85C42",
    "brick-white": "#D8C8B8",
    fabric: "#B8A9C9",
    "fabric-fine-weave": "#C2B4CF",
    "carpet-plush": "#A89BB0",
    "carpet-woven": "#9C8FA6",
    plaster: "#E8E4DC",
  };
  return colors[material] ?? "#C4A882";
}

export function detectRoomType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("living") || n.includes("lounge") || n.includes("family"))
    return "living";
  if (n.includes("dining")) return "dining";
  if (n.includes("kitchen")) return "kitchen";
  if (n.includes("bedroom") || n.includes("bed") || n.includes("master"))
    return "bedroom";
  if (n.includes("office") || n.includes("study")) return "office";
  if (n.includes("bath") || n.includes("toilet") || n.includes("wc"))
    return "bathroom";
  if (
    n.includes("hall") ||
    n.includes("corridor") ||
    n.includes("entry") ||
    n.includes("foyer")
  )
    return "hallway";
  if (n.includes("stair")) return "staircase";
  if (n.includes("laundry") || n.includes("utility")) return "utility";
  return "generic";
}

export interface SceneWallSegment extends WallSegment {
  roomHeight: number;
  wallColor: string;
}

// Deduplicate walls across all rooms.
// Two wall segments are "shared" if they lie on the same line within tolerance.
// For shared walls: if either side has a door, keep that version (has the gap).
// This prevents double-wall rendering which blocks door openings.
export interface SceneWallSegment extends WallSegment {
  roomHeight: number;
  wallColor: string;
}

export function getSceneWallSegments(rooms: SceneRoom[]): SceneWallSegment[] {
  // Build all segments with room metadata
  const allSegments: SceneWallSegment[] = [];
  for (const room of rooms) {
    for (const seg of getWallSegments(room)) {
      allSegments.push({
        ...seg,
        roomHeight: room.height,
        wallColor: room.wall_color,
      });
    }
  }

  const TOL = 0.08;
  const dropped = new Set<number>();

  // For each pair, check if they are truly the SAME wall (coplanar + same span)
  // If so, drop the one WITHOUT a door. If neither has a door, drop the duplicate.
  // Only drop a segment if it has a clear match — exterior walls have no match.
  for (let i = 0; i < allSegments.length; i++) {
    if (dropped.has(i)) continue;
    const a = allSegments[i]!;
    const aIsH = a.direction === "north" || a.direction === "south";
    const aFixed = aIsH
      ? a.direction === "north"
        ? Math.min(a.start.z, a.end.z)
        : Math.max(a.start.z, a.end.z)
      : a.direction === "west"
        ? Math.min(a.start.x, a.end.x)
        : Math.max(a.start.x, a.end.x);
    const aMin = aIsH
      ? Math.min(a.start.x, a.end.x)
      : Math.min(a.start.z, a.end.z);
    const aMax = aIsH
      ? Math.max(a.start.x, a.end.x)
      : Math.max(a.start.z, a.end.z);

    for (let j = i + 1; j < allSegments.length; j++) {
      if (dropped.has(j)) continue;
      const b = allSegments[j]!;
      const bIsH = b.direction === "north" || b.direction === "south";

      // Must be same orientation
      if (aIsH !== bIsH) continue;

      const bFixed = bIsH
        ? b.direction === "north"
          ? Math.min(b.start.z, b.end.z)
          : Math.max(b.start.z, b.end.z)
        : b.direction === "west"
          ? Math.min(b.start.x, b.end.x)
          : Math.max(b.start.x, b.end.x);

      // Must be on the same axis line
      if (Math.abs(aFixed - bFixed) > TOL) continue;

      const bMin = bIsH
        ? Math.min(b.start.x, b.end.x)
        : Math.min(b.start.z, b.end.z);
      const bMax = bIsH
        ? Math.max(b.start.x, b.end.x)
        : Math.max(b.start.z, b.end.z);

      // Must have substantial overlap (>50% of the shorter wall)
      const overlapMin = Math.max(aMin, bMin);
      const overlapMax = Math.min(aMax, bMax);
      const overlap = overlapMax - overlapMin;
      const shorter = Math.min(aMax - aMin, bMax - bMin);
      if (overlap < shorter * 0.5) continue;

      // Genuine shared wall — keep the one with a door, drop the other
      if (a.doors.length > 0 && b.doors.length === 0) {
        dropped.add(j);
      } else if (b.doors.length > 0 && a.doors.length === 0) {
        dropped.add(i);
        break; // a is dropped, move to next i
      } else {
        // Neither or both have doors — keep i (first seen), drop j
        dropped.add(j);
      }
    }
  }

  return allSegments.filter((_, idx) => !dropped.has(idx));
}
