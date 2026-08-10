import { EditorOpening, FloorPlanState } from "./constants";
import { DEFAULT_ROOF, Floor, ProjectFloorPlan } from "./floor-data";

/**
 * Converts a pre-multi-floor saved project (a bare FloorPlanState) into the
 * new ProjectFloorPlan shape, wrapping the entire old state as a single
 * "Ground Floor" entry. Idempotent — if already migrated, returns input
 * with per-opening field migrations still applied (see migrateWindowVariant),
 * since "already multi-floor" and "has all current opening fields" are
 * independent facts about a saved project.
 */
export function migrateToMultiFloor(
  data: FloorPlanState | ProjectFloorPlan,
): ProjectFloorPlan {
  if (isProjectFloorPlan(data)) {
    return {
      ...data,
      floors: data.floors.map(migrateFloorWindowVariants),
    };
  }

  const groundFloor: Floor = {
    id: "floor-ground",
    label: "Ground Floor",
    order: 0,
    elevation: 0,
    visible: true,
    state: migrateFloorPlanStateWindowVariants(data),
  };

  return {
    floors: [groundFloor],
    activeFloorId: groundFloor.id,
    viewMode: "single",
    showUnderlay: true,
    roof: DEFAULT_ROOF,
  };
}

function isProjectFloorPlan(
  data: FloorPlanState | ProjectFloorPlan,
): data is ProjectFloorPlan {
  return (
    typeof data === "object" &&
    data !== null &&
    "floors" in data &&
    Array.isArray((data as ProjectFloorPlan).floors)
  );
}

/** Recomputes each floor's elevation from the roomHeight of floors below it,
 *  in order, skipping any floor whose elevation was manually overridden.
 *  Call this after adding/removing/reordering floors, or after a roomHeight
 *  change on any floor, to keep stacking consistent by default. */
export function recomputeFloorElevations(
  floors: Floor[],
  overriddenFloorIds: Set<string> = new Set(),
): Floor[] {
  const sorted = [...floors].sort((a, b) => a.order - b.order);
  let runningElevation = 0;
  return sorted.map((floor) => {
    const elevation = overriddenFloorIds.has(floor.id)
      ? floor.elevation
      : runningElevation;
    runningElevation = elevation + floor.state.roomHeight;
    return { ...floor, elevation };
  });
}

/**
 * Idempotent per-opening migration for window fields (variant/isOpen/
 * openAmount) added after the original window rendering shipped. Safe to
 * run on every opening, every load — a no-op once fields already exist.
 */
function migrateWindowVariant(op: EditorOpening): EditorOpening {
  if (op.type !== "window") return op;

  let next = op;

  if (!next.variant) {
    next = { ...next, variant: "window-fixed" };
  }
  if (next.isOpen === undefined) {
    next = { ...next, isOpen: false };
  }
  if (next.openAmount === undefined) {
    next = { ...next, openAmount: next.isOpen ? 1 : 0 };
  }

  return next;
}

/**
 * Applies migrateWindowVariant to every opening in a single FloorPlanState.
 * `openings` lives directly on FloorPlanState (not per-room, not per-floor
 * array) — confirmed against the actual type, correcting an earlier wrong
 * guess that assumed a floors[] shape here.
 */
function migrateFloorPlanStateWindowVariants(
  state: FloorPlanState,
): FloorPlanState {
  return {
    ...state,
    openings: (state.openings ?? []).map(migrateWindowVariant),
  };
}

/** Applies the same per-opening migration to a single Floor's nested state. */
function migrateFloorWindowVariants(floor: Floor): Floor {
  return {
    ...floor,
    state: migrateFloorPlanStateWindowVariants(floor.state),
  };
}
