// lights-drag-utils.ts

import { EditorOpening, FloorPlanState, LineNode } from "./constants";

export type WallPlacementCandidate = {
  segmentNodeIds?: [string, string];
  segmentT?: number;
  roomId?: string;
  wall?: "north" | "south" | "east" | "west";
  position?: number;
  px: number; // resolved world x
  pz: number; // resolved world z
  angle: number; // wall direction, radians
};

const SNAP_MAX_DIST = 0.6;

function closestPointOnSegment(
  wx: number,
  wz: number,
  a: LineNode,
  b: LineNode,
) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  if (len2 === 0) return null;
  const t = Math.max(
    0,
    Math.min(1, ((wx - a.x) * dx + (wz - a.z) * dz) / len2),
  );
  const px = a.x + t * dx,
    pz = a.z + t * dz;
  const dist = Math.hypot(wx - px, wz - pz);
  return { t, px, pz, dist, angle: Math.atan2(dz, dx) };
}

export function findNearestWallPoint(
  wx: number,
  wz: number,
  fp: FloorPlanState,
): WallPlacementCandidate | null {
  let best: WallPlacementCandidate | null = null;
  let bestDist = SNAP_MAX_DIST;

  // New-style line segments
  for (const seg of fp.lineSegments ?? []) {
    const nodes = seg.nodeIds
      .map((id) => fp.lineNodes.find((n) => n.id === id))
      .filter(Boolean) as LineNode[];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i]!,
        b = nodes[i + 1]!;
      const hit = closestPointOnSegment(wx, wz, a, b);
      if (hit && hit.dist < bestDist) {
        bestDist = hit.dist;
        best = {
          segmentNodeIds: [a.id, b.id],
          segmentT: hit.t,
          px: hit.px,
          pz: hit.pz,
          angle: hit.angle,
        };
      }
    }
  }

  // Legacy rectangular room walls
  for (const room of fp.rooms ?? []) {
    const walls: Array<{
      name: "north" | "south" | "east" | "west";
      a: [number, number];
      b: [number, number];
    }> = [
      { name: "north", a: [room.x, room.z], b: [room.x + room.width, room.z] },
      {
        name: "south",
        a: [room.x, room.z + room.depth],
        b: [room.x + room.width, room.z + room.depth],
      },
      { name: "west", a: [room.x, room.z], b: [room.x, room.z + room.depth] },
      {
        name: "east",
        a: [room.x + room.width, room.z],
        b: [room.x + room.width, room.z + room.depth],
      },
    ];
    for (const w of walls) {
      const a: LineNode = { id: "", x: w.a[0], z: w.a[1] };
      const b: LineNode = { id: "", x: w.b[0], z: w.b[1] };
      const hit = closestPointOnSegment(wx, wz, a, b);
      if (hit && hit.dist < bestDist) {
        bestDist = hit.dist;
        const isH = w.name === "north" || w.name === "south";
        best = {
          roomId: room.id,
          wall: w.name,
          position: isH ? hit.px - room.x : hit.pz - room.z,
          px: hit.px,
          pz: hit.pz,
          angle: hit.angle,
        };
      }
    }
  }

  return best;
}

export type PlacementValidity =
  | { valid: true; onDoorHeader?: EditorOpening; heightOffset?: number }
  | { valid: false };

/**
 * Checks a candidate wall point against openings on that same wall/segment.
 * - Inside a door's header zone (above the door, within its width) -> valid,
 *   with a suggested heightOffset that puts the light in the header band.
 * - Overlapping a door body or a window -> invalid.
 * - Anywhere else on solid wall -> valid.
 */
export function checkPlacementValidity(
  cand: WallPlacementCandidate,
  fp: FloorPlanState,
  roomHeight: number,
): PlacementValidity {
  const openings = (fp.openings ?? []).filter((op) => {
    if (cand.segmentNodeIds) {
      return (
        op.segmentNodeIds?.[0] === cand.segmentNodeIds[0] &&
        op.segmentNodeIds?.[1] === cand.segmentNodeIds[1]
      );
    }
    return op.roomId === cand.roomId && op.wall === cand.wall;
  });

  // Resolve candidate's linear position along the wall in the same units
  // openings use (op.position for room walls, op.segmentT * len for segments).
  let candLinear: number;
  let segLen = 0;
  if (cand.segmentNodeIds) {
    const a = fp.lineNodes.find((n) => n.id === cand.segmentNodeIds![0]);
    const b = fp.lineNodes.find((n) => n.id === cand.segmentNodeIds![1]);
    if (!a || !b) return { valid: true };
    segLen = Math.hypot(b.x - a.x, b.z - a.z);
    candLinear = (cand.segmentT ?? 0) * segLen;
  } else {
    candLinear = cand.position ?? 0;
  }

  for (const op of openings) {
    const opLinear = cand.segmentNodeIds
      ? (op.segmentT ?? 0) * segLen
      : op.position;
    const halfW = op.width / 2;
    const withinX = Math.abs(candLinear - opLinear) <= halfW;

    if (!withinX) continue;

    if (op.type === "door") {
      const headerH = roomHeight - op.height;
      if (headerH > 0.1) {
        // Valid — mount in the header band above the door.
        return {
          valid: true,
          onDoorHeader: op,
          heightOffset: op.height + headerH / 2,
        };
      }
      return { valid: false }; // door reaches ceiling, no header room
    }

    // Window or plain opening body under full wall span — invalid.
    return { valid: false };
  }

  return { valid: true };
}
