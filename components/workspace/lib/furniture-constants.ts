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
  | "coffee_table"
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
  // NEW — kitchen expansion
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

  // New types
  sofa_l: { w: 2.6, d: 1.9 }, // main run + chaise leg, bounding box
  bed_single: { w: 1.15, d: 2.1 }, // includes classical arched headboard width
  bed_double: { w: 1.95, d: 2.2 }, // includes classical carved headboard
  bed_bunk: { w: 1.15, d: 2.05 }, // includes ladder projection on open side
  dressing_table: { w: 1.2, d: 0.9 }, // includes stool space in front of table
  kitchen_cabinet_base: { w: 0.6, d: 0.6 }, // standard base unit width, 60cm depth counters
  kitchen_cabinet_wall: { w: 0.6, d: 0.35 }, // wall units are shallower
  kitchen_countertop_slab: { w: 1.2, d: 0.62 }, // spans ~2 base units by default; scale to fit a run
  kitchen_sink: { w: 0.8, d: 0.55 }, // sits inset into a countertop run
  kitchen_fridge: { w: 0.75, d: 0.75 },
  kitchen_island: { w: 1.6, d: 0.9 },
  kitchen_dishwasher: { w: 0.6, d: 0.6 },
  kitchen_backsplash_panel: { w: 1.0, d: 0.03 },
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

export const FURNITURE_LABELS: Record<FurnitureType, string> = {
  sofa: "Sofa",
  bed: "Bed",
  dining_table: "Table",
  desk: "Desk",
  wardrobe: "WRB",
  bathtub: "Bath",
  toilet: "WC",
  plant: "♣",
  chair: "Chair",
  coffee_table: "C.T",
  single_sofa: "S.Sofa",
  lamp: "Lamp",
  mirror: "Mirr",
  kitchen_stove: "Stove",
  chimney: "Chimney",
  commode: "Commode",
  shower: "Shower",
  shoe_rack: "Shoe-Rack",
  led_strip: "LED",
  wall_panel_pvc: "PVC Panel",
  painting: "Art",
  lounge_recliner: "Recliner",
  sofa_l: "L-Sofa",
  bed_single: "S.Bed",
  bed_double: "D.Bed",
  bed_bunk: "Bunk Bed",
  dressing_table: "Dresser",
  kitchen_cabinet_base: "Base Cabinet",
  kitchen_cabinet_wall: "Wall Cabinet",
  kitchen_countertop_slab: "Countertop",
  kitchen_sink: "Kitchen Sink",
  kitchen_fridge: "Fridge",
  kitchen_island: "Kitchen Island",
  kitchen_dishwasher: "Dishwasher",
  kitchen_backsplash_panel: "Backsplash",
};
export const FURNITURE_COLORS: Record<FurnitureType, string> = {
  sofa: "rgba(160,148,130,0.88)",
  bed: "rgba(130,120,155,0.88)",
  dining_table: "rgba(155,125,95,0.88)",
  desk: "rgba(110,130,155,0.88)",
  wardrobe: "rgba(70,60,50,0.88)",
  bathtub: "rgba(140,175,185,0.88)",
  toilet: "rgba(200,200,200,0.88)",
  plant: "rgba(65,140,65,0.88)",
  chair: "rgba(145,135,115,0.88)",
  coffee_table: "rgba(140,118,88,0.88)",
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
  // New types — kept in the same family as their closest existing relative
  // (sofa, bed, desk) so they read as part of the same set on a floor plan.
  sofa_l: "rgba(165,150,128,0.88)", // near `sofa`
  bed_single: "rgba(135,124,158,0.88)", // near `bed`
  bed_double: "rgba(128,116,152,0.88)", // near `bed`, slightly deeper
  bed_bunk: "rgba(120,110,148,0.88)", // near `bed`, deepest of the three
  dressing_table: "rgba(150,128,150,0.88)", // desk/mirror hybrid tone

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
