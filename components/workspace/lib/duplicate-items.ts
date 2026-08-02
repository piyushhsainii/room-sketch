// Tools/duplicate-items.ts
//
// Single-item duplication for object types that duplicateRoom/duplicateClosedShape
// don't cover: furniture, stairs, outdoor objects, standalone wall decor, and
// openings. Unlike room/shape duplication, these clone just the one selected
// item (no "everything spatially inside" logic needed — there's nothing inside
// a chair).
//
// Every clone gets a fresh id via uid(), same rule as duplicate.ts.

import { EditorOpening, PlacedWallDecor, FloorPlanState } from "./constants";
import { PlacedFurniture } from "./furniture-constants";
import { PlacedOutdoorObject } from "./outdoor-constants";
import { PlacedStairs } from "./stairs-constants";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Default nudge so the clone doesn't render exactly on top of the original
// and is still trivially distinguishable/selectable. Small enough to stay
// visually "next to" the source item regardless of its footprint.
const DEFAULT_OFFSET = 0.4;

export function duplicateFurniture(
  fp: FloorPlanState,
  id: string,
): { fp: FloorPlanState; newId: string } | null {
  const item = (fp.furniture ?? []).find((f) => f.id === id);
  if (!item) return null;
  const newId = uid();
  const clone: PlacedFurniture = {
    ...item,
    id: newId,
    x: item.x + DEFAULT_OFFSET,
    z: item.z + DEFAULT_OFFSET,
  };
  return {
    fp: { ...fp, furniture: [...(fp.furniture ?? []), clone] },
    newId,
  };
}

export function duplicateStairs(
  fp: FloorPlanState,
  id: string,
): { fp: FloorPlanState; newId: string } | null {
  const item = (fp.stairs ?? []).find((s) => s.id === id);
  if (!item) return null;
  const newId = uid();
  const clone: PlacedStairs = {
    ...item,
    id: newId,
    x: item.x + DEFAULT_OFFSET,
    z: item.z + DEFAULT_OFFSET,
  };
  return {
    fp: { ...fp, stairs: [...(fp.stairs ?? []), clone] },
    newId,
  };
}

export function duplicateOutdoorObject(
  fp: FloorPlanState,
  id: string,
): { fp: FloorPlanState; newId: string } | null {
  const item = (fp.outdoorObjects ?? []).find((o) => o.id === id);
  if (!item) return null;
  const newId = uid();
  const clone: PlacedOutdoorObject = {
    ...item,
    id: newId,
    x: item.x + DEFAULT_OFFSET,
    z: item.z + DEFAULT_OFFSET,
  };
  return {
    fp: { ...fp, outdoorObjects: [...(fp.outdoorObjects ?? []), clone] },
    newId,
  };
}

/**
 * Wall decor is anchored (roomId+wall+position, or segmentNodeIds+segmentT),
 * not free x/z — so "offset" here means nudging along the wall/segment by a
 * fraction of its width, not translating in world space. Falls back to
 * dropping the clone at the same spot if we can't determine a safe nudge
 * (caller/user can still drag it via the existing decor-drag path).
 */
export function duplicateWallDecor(
  fp: FloorPlanState,
  id: string,
): { fp: FloorPlanState; newId: string } | null {
  const item = (fp.wallDecor ?? []).find((d) => d.id === id);
  if (!item) return null;
  const newId = uid();
  const clone: PlacedWallDecor = {
    ...item,
    id: newId,
    position: item.position + item.width + 0.2,
  };
  return {
    fp: { ...fp, wallDecor: [...(fp.wallDecor ?? []), clone] },
    newId,
  };
}

/**
 * Openings (doors/windows/archways) are anchored the same way as wall decor.
 * Nudged along the wall by its own width + a small gap so it doesn't overlap
 * the original opening's cutout.
 */
export function duplicateOpening(
  fp: FloorPlanState,
  id: string,
): { fp: FloorPlanState; newId: string } | null {
  const item = fp.openings.find((o) => o.id === id);
  if (!item) return null;
  const newId = uid();
  const clone: EditorOpening = {
    ...item,
    id: newId,
    position: item.position + item.width + 0.3,
  };
  return {
    fp: { ...fp, openings: [...fp.openings, clone] },
    newId,
  };
}
