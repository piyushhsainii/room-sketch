import { FloorPlanState } from "./constants";
import { DEFAULT_ROOF, Floor, ProjectFloorPlan } from "./floor-data";

/**
 * Converts a pre-multi-floor saved project (a bare FloorPlanState) into the
 * new ProjectFloorPlan shape, wrapping the entire old state as a single
 * "Ground Floor" entry. Idempotent — if already migrated, returns input
 * unchanged.
 */
export function migrateToMultiFloor(
  data: FloorPlanState | ProjectFloorPlan,
): ProjectFloorPlan {
  if (isProjectFloorPlan(data)) {
    return data;
  }

  const groundFloor: Floor = {
    id: "floor-ground",
    label: "Ground Floor",
    order: 0,
    elevation: 0,
    visible: true,
    state: data,
  };

  return {
    floors: [groundFloor],
    activeFloorId: groundFloor.id,
    viewMode: "single",
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
