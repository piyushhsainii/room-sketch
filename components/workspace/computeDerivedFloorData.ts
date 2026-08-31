// lib/workspace/computeDerivedFloorData.ts
import type { FloorPlanState } from "@/components/workspace/lib/constants";
import { deriveClosedPolygons } from "@/lib/helpers";

export function computeDerivedFloorData(fp: FloorPlanState) {
  const closedPolygons = deriveClosedPolygons(fp.lineNodes, fp.lineSegments);

  const openingsByRoom = new Map<string, FloorPlanState["openings"]>();
  const openingsBySegment = new Map<string, FloorPlanState["openings"]>();
  for (const o of fp.openings) {
    if (o.roomId) {
      const list = openingsByRoom.get(o.roomId) ?? [];
      list.push(o);
      openingsByRoom.set(o.roomId, list);
    }
    if (o.segmentNodeIds && o.segmentNodeIds.length === 2) {
      const seg = fp.lineSegments.find(
        (s) =>
          s.nodeIds.includes(o.segmentNodeIds![0]) &&
          s.nodeIds.includes(o.segmentNodeIds![1]),
      );
      if (seg) {
        const list = openingsBySegment.get(seg.id) ?? [];
        list.push(o);
        openingsBySegment.set(seg.id, list);
      }
    }
  }

  const shapesIndex = new Map(
    (fp.closedShapes ?? []).map((s) => [[...s.nodeIds].sort().join(","), s]),
  );
  const nodesById = new Map(fp.lineNodes.map((n) => [n.id, n]));
  const roomsById = new Map(fp.rooms.map((r) => [r.id, r]));

  return {
    closedPolygons,
    openingsByRoom,
    openingsBySegment,
    shapesIndex,
    nodesById,
    roomsById,
  };
}
