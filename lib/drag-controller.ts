// components/workspace/lib/drag-controller.ts
//
// Two problems this solves at once:
//
// 1. THE "SELECTING SOMETIMES MOVES IT" BUG — handleMouseDown sets a drag
//    ref (dragRoomRef, shapeDragRef, segDragRef, etc.) the instant you
//    click, and handleMouseMove applies movement unconditionally as soon
//    as a ref is set. There's no minimum pointer travel before a click
//    counts as a drag, so ordinary mouse jitter between mousedown and
//    mouseup — which is nearly always nonzero — gets applied as a real
//    move. Fix: track the mousedown screen position, and don't apply any
//    movement until the pointer has moved past DRAG_THRESHOLD_PX. This is
//    a SINGLE shared gate — every existing drag kind gets it for free
//    without duplicating threshold logic per ref.
//
// 2. THE LONG-FUNCTION PROBLEM — handleMouseMove is one large if/else
//    chain, one branch per ref. That's not wrong, just unwieldy to keep
//    extending (you're about to add a 'move' quick-action that needs the
//    same apply logic outside of a raw pointer drag). Fix: express "what
//    counts as an active drag, and what happens when it moves" as a table
//    of { isActive, apply } entries. handleMouseMove becomes: find the
//    first active entry, threshold-gate it, call apply(). Same entries are
//    reused by the Move quick-action (click-to-relocate) below, so there's
//    exactly one place that knows how each drag kind mutates state.

import { MutableRefObject } from "react";

export const DRAG_THRESHOLD_PX = 4;

/** Screen-space point captured at mousedown, used to gate any drag kind. */
export type DragOrigin = { sx: number; sy: number } | null;

export function pastThreshold(
  origin: DragOrigin,
  cx: number,
  cy: number,
): boolean {
  if (!origin) return true; // no origin recorded — don't block (e.g. programmatic moves)
  return Math.hypot(cx - origin.sx, cy - origin.sy) >= DRAG_THRESHOLD_PX;
}

/**
 * One entry per "kind" of thing that can be actively dragged. `isActive`
 * reads whether that kind's ref is currently engaged; `apply` performs the
 * actual state mutation for a given current world position. Keeping these
 * together means handleMouseMove doesn't need a bespoke if-branch per kind
 * — it just walks this list.
 */
export type DragKindEntry = {
  name: string;
  isActive: () => boolean;
  /** wx/wz = current world position. Called only after the drag has
   *  crossed DRAG_THRESHOLD_PX (or, for non-pointer callers like the Move
   *  quick-action, called directly without a threshold check). */
  apply: (wx: number, wz: number) => void;
};

/**
 * Call once per handleMouseMove invocation. Finds the first active drag
 * kind, threshold-gates it against `dragOriginRef`, and applies it if past
 * threshold. Returns true if a drag kind was active (whether or not it was
 * past threshold yet) — callers use this to know whether to `return` early
 * and skip hover/tooltip logic below, same as the current code's per-branch
 * `return` statements.
 */
export function runActiveDrag(
  entries: DragKindEntry[],
  dragOriginRef: MutableRefObject<DragOrigin>,
  cx: number,
  cy: number,
  wx: number,
  wz: number,
): boolean {
  for (const entry of entries) {
    if (entry.isActive()) {
      if (pastThreshold(dragOriginRef.current, cx, cy)) {
        entry.apply(wx, wz);
      }
      return true;
    }
  }
  return false;
}
