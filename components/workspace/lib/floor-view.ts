import type { Floor, ProjectFloorPlan } from "./floor-data";

export function getPreviewFloors(
  floors: Floor[],
  activeFloor: Floor | undefined,
  viewMode: ProjectFloorPlan["viewMode"],
): Floor[] {
  if (viewMode === "single") return activeFloor ? [activeFloor] : [];
  return floors.filter(floor =>
    floor.visible && (
      viewMode === "stacked-full" ||
      (activeFloor && floor.order <= activeFloor.order)
    ),
  );
}
