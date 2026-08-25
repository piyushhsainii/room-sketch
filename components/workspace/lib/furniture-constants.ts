import {
  FURNITURE_CATALOG,
  FURNITURE_MODELS,
} from "../mesh/furniture-model-registry";
import { GLB_DEFAULT_SIZE_MULTIPLIER } from "../mesh/GLTFFurnitureMesh";
import { FurnitureCategory } from "./constants";

export type FurnitureType =
  | "sofa"
  | "sofa_l"
  | "single_sofa"
  | "bed"
  | "bed_single"
  | "bed_double"
  | "bed_bunk"
  | "dining_table"
  | "desk"
  | "dressing_table"
  | "wardrobe"
  | "bathtub"
  | "toilet"
  | "plant"
  | "chair"
  | "desk_chair"
  | "coffee_table"
  | "side_table"
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
  | "lounge_recliner"
  | "bench"
  | "stool_bar"
  | "bookcase"
  | "cabinet_bed"
  | "coat_rack"
  | "ceiling_fan"
  | "kitchen_cabinet_base"
  | "kitchen_cabinet_wall"
  | "kitchen_countertop_slab"
  | "kitchen_sink"
  | "kitchen_fridge"
  | "kitchen_island"
  | "kitchen_dishwasher"
  | "kitchen_backsplash_panel";

export type FurnitureVariant = "modern" | "classical";

export type FurnitureOrientation = "left" | "right";

export type PlacedFurniture = {
  id: string;
  type: FurnitureType;
  x: number;
  z: number;
  rotation: number;
  scale: number;
  materialId?: string;
  variant?: FurnitureVariant;
  orientation?: FurnitureOrientation;
  heightOffset?: number;
  targetWidth?: number;
  targetDepth?: number;
  heightScale?: number;
  rotationOffset?: number;
  /** Escape hatch: force procedural fallback rendering even if a GLTF model
   *  is registered for this type (debugging / while a new asset is broken). */
  forceProcedural?: boolean;
};

export function getFurnitureFootprint(
  type: FurnitureType,
  scale: number | undefined,
) {
  const def = FURNITURE_MODELS[type];
  const s = scale ?? 1;
  const w =
    (def?.defaultTargetWidth ?? def?.nativeSize?.[0] ?? 1) *
    s *
    GLB_DEFAULT_SIZE_MULTIPLIER;
  const d =
    (def?.defaultTargetDepth ?? def?.nativeSize?.[2] ?? 1) *
    s *
    GLB_DEFAULT_SIZE_MULTIPLIER;
  return { w, d };
}

export function getFurnitureFootprintFor(f: {
  type: FurnitureType;
  scale?: number;
}): { w: number; d: number } {
  return getFurnitureFootprint(f.type, f.scale);
}

export const FURNITURE_LABELS: Record<string, string> = Object.fromEntries(
  FURNITURE_CATALOG.map((e) => [e.type, e.label]),
);
export const FURNITURE_COLORS: Record<FurnitureType, string> = {
  sofa: "rgba(160,148,130,0.88)",
  bed: "rgba(130,120,155,0.88)",
  dining_table: "rgba(155,125,95,0.88)",
  desk: "rgba(110,130,155,0.88)",
  desk_chair: "rgba(120,140,160,0.88)", // near `desk`
  wardrobe: "rgba(70,60,50,0.88)",
  bathtub: "rgba(140,175,185,0.88)",
  toilet: "rgba(200,200,200,0.88)",
  plant: "rgba(65,140,65,0.88)",
  chair: "rgba(145,135,115,0.88)",
  coffee_table: "rgba(140,118,88,0.88)",
  side_table: "rgba(148,124,92,0.88)", // near `coffee_table`
  single_sofa: "rgba(170,150,125,0.88)",
  lamp: "rgba(230,200,120,0.88)",
  mirror: "rgba(180,200,215,0.88)",
  kitchen_stove: "rgba(90,95,100,0.88)",
  chimney: "rgba(60,65,70,0.88)",
  commode: "rgba(210,210,205,0.88)",
  shower: "rgba(150,190,200,0.88)",
  shoe_rack: "rgba(120,95,70,0.88)",
  led_strip: "rgba(255,220,150,0.9)",
  wall_panel_pvc: "rgba(228,221,207,0.88)",
  painting: "rgba(120,105,85,0.88)",
  lounge_recliner: "rgb(185, 94, 3)",
  bench: "rgba(150,138,120,0.88)", // near `sofa`
  stool_bar: "rgba(160,145,120,0.88)", // near `chair`
  bookcase: "rgba(90,70,55,0.88)", // near `wardrobe`
  cabinet_bed: "rgba(80,68,58,0.88)", // near `wardrobe`
  coat_rack: "rgba(100,85,68,0.88)",
  ceiling_fan: "rgba(200,205,210,0.88)",
  sofa_l: "rgba(165,150,128,0.88)",
  bed_single: "rgba(135,124,158,0.88)",
  bed_double: "rgba(128,116,152,0.88)",
  bed_bunk: "rgba(120,110,148,0.88)",
  dressing_table: "rgba(150,128,150,0.88)",
  kitchen_cabinet_base: "rgba(150,120,85,0.88)",
  kitchen_cabinet_wall: "rgba(165,135,98,0.88)",
  kitchen_countertop_slab: "rgba(210,205,195,0.9)",
  kitchen_sink: "rgba(190,195,198,0.9)",
  kitchen_fridge: "rgba(225,225,222,0.9)",
  kitchen_island: "rgba(145,115,82,0.88)",
  kitchen_dishwasher: "rgba(180,180,178,0.88)",
  kitchen_backsplash_panel: "rgba(220,215,205,0.88)",
};

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  seating: "Seating",
  tables: "Tables",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  storage: "Storage",
  decor: "Decor",
  lighting: "Lighting",
  wall: "Wall",
};
