// lib/useFurnitureCollisions.ts
//
// Live overlap detection, driven from handleMouseMove while a furniture
// piece is being dragged. Visual-warning-only (per design doc step 1):
// this never blocks or reverts a drag, it just returns the set of ids that
// should render with a red outline/tint this frame.

import { useRef, useCallback } from "react";
import {
  FloorPlanState,
  FURNITURE_FOOTPRINTS,
  LineNode,
} from "../lib/constants";
import {
  furnitureIntersectsWallSegment,
  furnitureToRect,
  RotRect,
  rotRectsOverlap,
} from "../lib/collision";

const COLLISION_EXEMPT: Set<string> = new Set([
  // Matches the highlightH === 0 wall-mounted group already established in
  // FurnitureMesh.tsx — these render flat against a wall and are never
  // meaningfully "in the way" of floor furniture.
  "led_strip",
  "wall_panel_pvc",
  "painting",
  "mirror",
  // 'rug', // uncomment / add once a rug type exists — isFloorCovering
]);

export function useFurnitureCollisions() {
  // Cache of ids currently flagged as overlapping, so the caller can diff
  // against last frame and only trigger a redraw when the set changes.
  const overlappingRef = useRef<Set<string>>(new Set());

  /**
   * Call this on every handleMouseMove while furnitureDragRef.current is set.
   * Returns the updated set of overlapping ids (includes both the dragged
   * piece and whatever it's overlapping with).
   */
  const checkCollisions = useCallback(
    (
      fp: FloorPlanState,
      draggedId: string,
      proposedX: number,
      proposedZ: number,
    ): Set<string> => {
      const next = new Set<string>();

      const draggedFurniture = (fp.furniture ?? []).find(
        (f) => f.id === draggedId,
      );
      const draggedStairs = !draggedFurniture
        ? (fp.stairs ?? []).find((s) => s.id === draggedId)
        : undefined;
      if (!draggedFurniture && !draggedStairs) {
        overlappingRef.current = next;
        return next;
      }

      let dragRect: RotRect;
      if (draggedFurniture) {
        if (COLLISION_EXEMPT.has(draggedFurniture.type)) {
          overlappingRef.current = next;
          return next;
        }
        const footprint = FURNITURE_FOOTPRINTS[draggedFurniture.type] ?? {
          w: 1,
          d: 1,
        };
        dragRect = furnitureToRect(
          proposedX,
          proposedZ,
          draggedFurniture.rotation,
          footprint,
          draggedFurniture.scale ?? 1,
        );
      } else {
        // Stairs footprint comes from its own width/depth fields, not
        // FURNITURE_FOOTPRINTS — same shape as the wall-vs-stairs rect
        // built further down for the "other" stairs pieces.
        dragRect = furnitureToRect(
          proposedX,
          proposedZ,
          draggedStairs!.rotation,
          { w: draggedStairs!.width, d: draggedStairs!.depth },
        );
      }

      // Coarse spatial pre-filter (step 4): skip the SAT test entirely for
      // pieces whose bounding circle can't possibly reach the dragged
      // piece. Cheap distance check, avoids running full SAT against every
      // piece in the plan on every mousemove pixel.
      const dragRadius = Math.hypot(dragRect.hw, dragRect.hd);
      const PREFILTER_MARGIN = 3; // meters — generous, just needs to be >= largest possible piece radius

      for (const f of fp.furniture ?? []) {
        if (f.id === draggedId) continue;
        if (COLLISION_EXEMPT.has(f.type)) continue;

        const dx = f.x - proposedX,
          dz = f.z - proposedZ;
        if (Math.hypot(dx, dz) > dragRadius + PREFILTER_MARGIN) continue;

        const fp2 = FURNITURE_FOOTPRINTS[f.type] ?? { w: 1, d: 1 };
        const rect = furnitureToRect(f.x, f.z, f.rotation, fp2, f.scale ?? 1);
        if (rotRectsOverlap(dragRect, rect)) {
          next.add(draggedId);
          next.add(f.id);
        }
      }

      for (const s of fp.stairs ?? []) {
        if (s.id === draggedId) continue;
        const rect = furnitureToRect(
          s.x + s.width / 2,
          s.z + s.depth / 2,
          s.rotation,
          { w: s.width, d: s.depth },
        );
        const dx = rect.cx - proposedX,
          dz = rect.cz - proposedZ;
        if (Math.hypot(dx, dz) > dragRadius + PREFILTER_MARGIN) continue;
        if (rotRectsOverlap(dragRect, rect)) {
          next.add(draggedId);
          next.add(s.id);
        }
      }

      // Step 5: wall intrusion — reuse room bounds + line-wall segments.
      for (const room of fp.rooms ?? []) {
        const walls: [number, number, number, number][] = [
          [room.x, room.z, room.x + room.width, room.z], // north
          [
            room.x,
            room.z + room.depth,
            room.x + room.width,
            room.z + room.depth,
          ], // south
          [room.x, room.z, room.x, room.z + room.depth], // west
          [
            room.x + room.width,
            room.z,
            room.x + room.width,
            room.z + room.depth,
          ], // east
        ];
        for (const [ax, az, bx, bz] of walls) {
          if (furnitureIntersectsWallSegment(dragRect, ax, az, bx, bz)) {
            next.add(draggedId);
            next.add(`${room.id}::wall`);
          }
        }
      }

      for (const seg of fp.lineSegments ?? []) {
        const nodes = seg.nodeIds
          .map((id) => fp.lineNodes.find((n: LineNode) => n.id === id))
          .filter(Boolean) as LineNode[];
        for (let i = 0; i < nodes.length - 1; i++) {
          const a = nodes[i]!,
            b = nodes[i + 1]!;
          if (
            furnitureIntersectsWallSegment(
              dragRect,
              a.x,
              a.z,
              b.x,
              b.z,
              seg.thickness ?? 0.15,
            )
          ) {
            next.add(draggedId);
            next.add(seg.id);
          }
        }
      }

      overlappingRef.current = next;
      return next;
    },
    [],
  );

  const clear = useCallback(() => {
    overlappingRef.current = new Set();
  }, []);

  /**
   * Cheap set-equality check against the last computed overlap set —
   * callers should use this (backed by overlappingRef, not React state)
   * to decide whether to re-render, since it's always current even
   * inside a stale useCallback closure.
   */
  const hasChanged = useCallback(
    (newSet: Set<string>, prevSet: Set<string>): boolean => {
      if (newSet.size !== prevSet.size) return true;
      for (const id of newSet) if (!prevSet.has(id)) return true;
      return false;
    },
    [],
  );

  return { checkCollisions, overlappingRef, clear, hasChanged };
}
