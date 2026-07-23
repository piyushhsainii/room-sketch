export type FurnitureType =
  | "sofa"
  | "bed"
  | "dining_table"
  | "desk"
  | "wardrobe"
  | "bathtub"
  | "toilet"
  | "plant"
  | "chair"
  | "coffee_table"
  | "single_sofa"
  | "lamp"
  | "mirror"
  | "kitchen_stove"
  | "chimney"
  | "commode"
  | "shower"
  | "shoe_rack"
  | "led_strip"
  | "wall_panel_pvc"
  | "painting"
  | "lounge_recliner";

export type PlacedFurniture = {
  id: string;
  type: FurnitureType;
  x: number;
  z: number;
  rotation: number;
  scale: number;
  materialId?: string;
};

export const FURNITURE_FOOTPRINTS: Record<
  FurnitureType,
  { w: number; d: number }
> = {
  sofa: { w: 2.2, d: 0.95 },
  bed: { w: 1.7, d: 2.1 },
  dining_table: { w: 1.5, d: 1.5 },
  desk: { w: 1.4, d: 0.7 },
  wardrobe: { w: 1.9, d: 0.62 },
  bathtub: { w: 0.82, d: 1.6 },
  toilet: { w: 0.46, d: 0.68 },
  plant: { w: 0.4, d: 0.4 },
  chair: { w: 0.55, d: 0.55 },
  coffee_table: { w: 1.2, d: 0.65 },
  single_sofa: { w: 0.95, d: 0.9 },
  lamp: { w: 0.35, d: 0.35 },
  mirror: { w: 0.7, d: 0.06 },
  kitchen_stove: { w: 0.6, d: 0.6 },
  chimney: { w: 0.9, d: 0.55 },
  commode: { w: 0.5, d: 0.45 },
  shower: { w: 0.9, d: 0.9 },
  shoe_rack: { w: 0.9, d: 0.32 },
  led_strip: { w: 1.25, d: 0.05 },
  wall_panel_pvc: { w: 1.2, d: 0.05 },
  painting: { w: 0.9, d: 0.05 },
  lounge_recliner: { w: 2, d: 2 },
};

export function getFurnitureFootprint(
  type: FurnitureType,
  scale: number | undefined,
): { w: number; d: number } {
  const base = FURNITURE_FOOTPRINTS[type];
  const s = scale ?? 1;
  return { w: base.w * s, d: base.d * s };
}

export function getFurnitureFootprintFor(f: {
  type: FurnitureType;
  scale?: number;
}): { w: number; d: number } {
  return getFurnitureFootprint(f.type, f.scale);
}
