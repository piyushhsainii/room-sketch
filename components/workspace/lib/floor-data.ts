// ── Multi-floor types — Phase 1 ──────────────────────────────────────────
// These wrap the EXISTING FloorPlanState unchanged. No existing type,
// render function, or edit function is modified in this phase.

import { DEFAULT_FP, FloorPlanState, WallMaterial } from "./constants";

export type Floor = {
  id: string;
  label: string;
  order: number; // 0 = ground; positive = above; negative = basement
  elevation: number; // Y offset in meters; default = sum of roomHeight of all floors below
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
  // Match whatever ID scheme the rest of the codebase already uses
  // (e.g. the short alphanumeric ids seen on rooms — "bhlcwz7" style).
  // Placeholder below; swap for your existing id-generation helper if one exists.
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
    state: structuredClone(DEFAULT_FP), // deep clone — never share references across floors
  };
}
