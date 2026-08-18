import { EditorOpening, FloorPlanState } from "./constants";
import { DEFAULT_ROOF, Floor, ProjectFloorPlan } from "./floor-data";

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

function migrateFloorPlanStateWindowVariants(
  state: FloorPlanState,
): FloorPlanState {
  return {
    ...state,
    openings: (state.openings ?? []).map(migrateWindowVariant),
  };
}

function migrateFloorWindowVariants(floor: Floor): Floor {
  return {
    ...floor,
    state: migrateFloorPlanStateWindowVariants(floor.state),
  };
}
