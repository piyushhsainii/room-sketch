import { DEFAULT_FP, FloorPlanState, WallMaterial } from "./constants";

export type Floor = {
  id: string;
  label: string;
  order: number;
  elevation: number;
  visible: boolean;
  state: FloorPlanState;
};

export type RoofType = "none" | "flat" | "gable" | "hip" | "shed";

export type RoofConfig = {
  type: RoofType;
  visible: boolean;
  pitch?: number;
  overhang?: number;
  color?: string;
  material?: WallMaterial;
};

export type ProjectFloorPlan = {
  floors: Floor[];
  activeFloorId: string;
  viewMode: "single" | "stacked" | "stacked-full";
  showUnderlay: boolean;
  roof: RoofConfig;
};

export const DEFAULT_ROOF: RoofConfig = {
  type: "none",
  visible: false,
};

function generateFloorId(): string {
  return `floor-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyFloor(
  label: string,
  order: number,
  elevation: number,
): Floor {
  return {
    id: generateFloorId(),
    label,
    order,
    elevation,
    visible: true,
    state: structuredClone(DEFAULT_FP),
  };
}
