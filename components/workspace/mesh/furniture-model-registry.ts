// furniture-model-registry.ts
import { ArmchairIcon, SofaIcon } from "lucide-react";
import type {
  FurnitureType,
  PlacedFurniture,
} from "../lib/furniture-constants";
import { FurnitureCatalogEntry } from "../lib/constants";

export interface FurnitureModelDef {
  url: string;
  nativeSize: [number, number, number]; // fallback only — real size is measured at runtime
  rotationOffset?: [number, number, number];
  positionOffset?: [number, number, number]; // manual [x, y, z] nudge in meters, applied post-centering, in local (unscaled, unrotated) model space — for correcting pivot/visual-weight mismatches auto-centering can't solve generically
  materialSlots?: string[]; // verify via console before trusting — see debug flow below
  available?: boolean;
  previewUrl?: string;
  textureRepeatOverride?: number;
  defaultTargetWidth?: number;
  defaultTargetDepth?: number;
}

export function getPreviewUrl(type: string): string | undefined {
  return FURNITURE_MODELS[type]?.previewUrl;
}

const P = (name: string) => `/previews/${name}.png`;
const M = (name: string) => `/models/${name}.glb`;

export const FURNITURE_MODELS: Partial<Record<string, FurnitureModelDef>> = {
  // ─── Seating (verified: sofa) ───
  sofa: {
    url: M("loungeDesignSofa"),
    nativeSize: [1.12, 0.4, 0.41],
    materialSlots: ["carpetBlue"],
    textureRepeatOverride: 1,
    defaultTargetWidth: 2.0,
    defaultTargetDepth: 0.9,
    previewUrl: P("loungeDesignSofa"),
  },
  sofa_l: {
    url: M("loungeSofaCorner"),
    nativeSize: [1.5, 0.4, 1.5],
    materialSlots: [], // TODO verify
    defaultTargetWidth: 2.6,
    defaultTargetDepth: 1.6,
    previewUrl: P("loungeDesignSofaCorner"),
  },
  single_sofa: {
    url: M("loungeChair"),
    nativeSize: [0.7, 0.4, 0.7],
    materialSlots: [],
    defaultTargetWidth: 0.9,
    defaultTargetDepth: 0.9,
    previewUrl: P("loungeChair"),
  },
  chair: {
    url: M("chair"),
    nativeSize: [0.45, 0.85, 0.45],
    materialSlots: [],
    defaultTargetWidth: 0.5,
    defaultTargetDepth: 0.5,
    previewUrl: P("chair"),
  },
  lounge_recliner: {
    url: M("loungeChairRelax"),
    nativeSize: [0.75, 0.75, 0.9],
    materialSlots: [],
    defaultTargetWidth: 0.9,
    defaultTargetDepth: 1.0,
    previewUrl: P("loungeChairRelax"),
  },
  desk_chair: {
    url: M("chairDesk"),
    nativeSize: [0.5, 0.9, 0.5],
    materialSlots: [],
    defaultTargetWidth: 0.55,
    defaultTargetDepth: 0.55,
    previewUrl: P("chairDesk"),
  },
  bench: {
    url: M("bench"),
    nativeSize: [1.2, 0.45, 0.4],
    materialSlots: [],
    defaultTargetWidth: 1.4,
    defaultTargetDepth: 0.45,
    previewUrl: P("bench"),
  },
  stool_bar: {
    url: M("stoolBar"),
    nativeSize: [0.35, 0.75, 0.35],
    materialSlots: [],
    defaultTargetWidth: 0.4,
    defaultTargetDepth: 0.4,
    previewUrl: P("stoolBar"),
  },

  // ─── Tables ───
  dining_table: {
    url: M("table"),
    nativeSize: [1.5, 0.75, 0.9],
    materialSlots: [],
    defaultTargetWidth: 1.8,
    defaultTargetDepth: 1.0,
    previewUrl: P("table"),
  },
  coffee_table: {
    url: M("tableCoffee"),
    nativeSize: [1.0, 0.4, 0.6],
    materialSlots: [],
    defaultTargetWidth: 1.1,
    defaultTargetDepth: 0.6,
    previewUrl: P("tableCoffee"),
  },
  side_table: {
    url: M("sideTable"),
    nativeSize: [0.45, 0.5, 0.45],
    materialSlots: [],
    defaultTargetWidth: 0.5,
    defaultTargetDepth: 0.5,
    previewUrl: P("sideTable"),
  },
  desk: {
    url: M("desk"),
    nativeSize: [1.2, 0.75, 0.6],
    materialSlots: [],
    defaultTargetWidth: 1.4,
    defaultTargetDepth: 0.7,
    previewUrl: P("desk"),
  },

  // ─── Storage ───
  bookcase: {
    url: M("bookcaseOpen"),
    nativeSize: [0.8, 1.8, 0.35],
    materialSlots: [],
    defaultTargetWidth: 0.9,
    defaultTargetDepth: 0.35,
    previewUrl: P("bookcaseOpen"),
  },
  cabinet_bed: {
    url: M("cabinetBed"),
    nativeSize: [1.0, 1.0, 0.5],
    materialSlots: [],
    defaultTargetWidth: 1.1,
    defaultTargetDepth: 0.55,
    previewUrl: P("cabinetBed"),
  },
  commode: {
    url: M("bathroomCabinet"),
    nativeSize: [0.6, 0.8, 0.45],
    materialSlots: [],
    defaultTargetWidth: 0.7,
    defaultTargetDepth: 0.45,
    previewUrl: P("bathroomCabinet"),
  },
  coat_rack: {
    url: M("coatRackStanding"),
    nativeSize: [0.4, 1.7, 0.4],
    materialSlots: [],
    defaultTargetWidth: 0.4,
    defaultTargetDepth: 0.4,
    previewUrl: P("coatRackStanding"),
  },

  // ─── Bedroom ───
  bed_single: {
    url: M("bedSingle"),
    nativeSize: [1.0, 0.5, 2.0],
    materialSlots: [],
    defaultTargetWidth: 1.0,
    defaultTargetDepth: 2.0,
    previewUrl: P("bedSingle"),
  },
  bed_double: {
    url: M("bedDouble"),
    nativeSize: [1.6, 0.5, 2.0],
    materialSlots: [],
    defaultTargetWidth: 1.6,
    defaultTargetDepth: 2.05,
    previewUrl: P("bedDouble"),
  },
  bed_bunk: {
    url: M("bedBunk"),
    nativeSize: [1.0, 1.6, 2.0],
    materialSlots: [],
    defaultTargetWidth: 1.0,
    defaultTargetDepth: 2.0,
    previewUrl: P("bedBunk"),
  },
  dressing_table: {
    url: M("sideTableDrawers"),
    nativeSize: [0.9, 0.75, 0.45],
    materialSlots: [],
    defaultTargetWidth: 1.0,
    defaultTargetDepth: 0.45,
    previewUrl: P("sideTableDrawers"),
  },

  // ─── Lighting ───
  lamp: {
    url: M("lampRoundFloor"),
    nativeSize: [0.35, 1.5, 0.35],
    materialSlots: [],
    defaultTargetWidth: 0.35,
    defaultTargetDepth: 0.35,
    previewUrl: P("lampRoundFloor"),
  },
  ceiling_fan: {
    url: M("ceilingFan"),
    nativeSize: [1.1, 0.3, 1.1],
    materialSlots: [],
    defaultTargetWidth: 1.1,
    defaultTargetDepth: 1.1,
    previewUrl: P("ceilingFan"),
  },

  // ─── Decor ───
  plant: {
    url: M("pottedPlant"),
    nativeSize: [0.4, 0.9, 0.4],
    materialSlots: [],
    defaultTargetWidth: 0.4,
    defaultTargetDepth: 0.4,
    previewUrl: P("pottedPlant"),
  },
  mirror: {
    url: M("bathroomMirror"),
    nativeSize: [0.6, 0.8, 0.05],
    materialSlots: [],
    defaultTargetWidth: 0.7,
    defaultTargetDepth: 0.05,
    previewUrl: P("bathroomMirror"),
  },

  // ─── Kitchen ───
  kitchen_stove: {
    url: M("kitchenStove"),
    nativeSize: [0.6, 0.9, 0.6],
    materialSlots: [],
    defaultTargetWidth: 0.6,
    defaultTargetDepth: 0.6,
    previewUrl: P("kitchenStove"),
  },
  kitchen_sink: {
    url: M("kitchenSink"),
    nativeSize: [0.6, 0.85, 0.6],
    materialSlots: [],
    defaultTargetWidth: 0.6,
    defaultTargetDepth: 0.6,
    previewUrl: P("kitchenSink"),
  },
  kitchen_fridge: {
    url: M("kitchenFridgeLarge"),
    nativeSize: [0.7, 1.8, 0.7],
    materialSlots: [],
    defaultTargetWidth: 0.75,
    defaultTargetDepth: 0.7,
    previewUrl: P("kitchenFridgeLarge"),
  },
  kitchen_cabinet_base: {
    url: M("kitchenCabinet"),
    nativeSize: [0.6, 0.85, 0.6],
    materialSlots: [],
    defaultTargetWidth: 0.6,
    defaultTargetDepth: 0.6,
    previewUrl: P("kitchenCabinet"),
  },
  kitchen_cabinet_wall: {
    url: M("kitchenCabinetUpper"),
    nativeSize: [0.6, 0.7, 0.35],
    materialSlots: [],
    defaultTargetWidth: 0.6,
    defaultTargetDepth: 0.35,
    previewUrl: P("kitchenCabinetUpper"),
  },
  kitchen_dishwasher: {
    url: M("washer"),
    nativeSize: [0.6, 0.85, 0.6],
    materialSlots: [],
    defaultTargetWidth: 0.6,
    defaultTargetDepth: 0.6,
    previewUrl: P("washer"),
  },

  // ─── Bathroom ───
  toilet: {
    url: M("toilet"),
    nativeSize: [0.4, 0.4, 0.6],
    materialSlots: [],
    defaultTargetWidth: 0.4,
    defaultTargetDepth: 0.6,
    previewUrl: P("toilet"),
  },
  bathtub: {
    url: M("bathtub"),
    nativeSize: [1.7, 0.6, 0.75],
    materialSlots: [],
    defaultTargetWidth: 1.7,
    defaultTargetDepth: 0.75,
    previewUrl: P("bathtub"),
  },
  shower: {
    url: M("shower"),
    nativeSize: [0.9, 2.0, 0.9],
    materialSlots: [],
    defaultTargetWidth: 0.9,
    defaultTargetDepth: 0.9,
    previewUrl: P("shower"),
  },
};

export const FURNITURE_CATALOG: FurnitureCatalogEntry[] = [
  // Seating
  { type: "sofa", label: "Sofa", icon: "Sofa", category: "seating" },
  {
    type: "lounge_recliner",
    label: "Armchair",
    icon: "Armchair",
    category: "seating",
  },
  { type: "sofa_l", label: "L-Shape Sofa", icon: "Sofa", category: "seating" },
  {
    type: "single_sofa",
    label: "Lounge Chair",
    icon: "Armchair",
    category: "seating",
  },
  { type: "chair", label: "Chair", icon: "Armchair", category: "seating" },
  {
    type: "desk_chair",
    label: "Desk Chair",
    icon: "Armchair",
    category: "seating",
  },
  { type: "bench", label: "Bench", icon: "Sofa", category: "seating" },
  {
    type: "stool_bar",
    label: "Bar Stool",
    icon: "Armchair",
    category: "seating",
  },

  // Tables
  {
    type: "dining_table",
    label: "Dining Table",
    icon: "UtensilsCrossed",
    category: "tables",
  },
  {
    type: "coffee_table",
    label: "Coffee Table",
    icon: "Table",
    category: "tables",
  },
  {
    type: "side_table",
    label: "Side Table",
    icon: "Table",
    category: "tables",
  },
  { type: "desk", label: "Desk", icon: "Table", category: "tables" },

  // Storage
  {
    type: "bookcase",
    label: "Bookcase",
    icon: "BookOpen",
    category: "storage",
  },
  {
    type: "cabinet_bed",
    label: "Cabinet",
    icon: "Archive",
    category: "storage",
  },
  { type: "commode", label: "Commode", icon: "Archive", category: "storage" },
  { type: "coat_rack", label: "Coat Rack", icon: "Shirt", category: "storage" },

  // Bedroom
  {
    type: "bed_single",
    label: "Single Bed",
    icon: "BedSingle",
    category: "bedroom",
  },
  {
    type: "bed_double",
    label: "Double Bed",
    icon: "BedDouble",
    category: "bedroom",
  },
  {
    type: "bed_bunk",
    label: "Bunk Bed",
    icon: "BedDouble",
    category: "bedroom",
  },
  {
    type: "dressing_table",
    label: "Dressing Table",
    icon: "Table",
    category: "bedroom",
  },

  // Kitchen
  { type: "kitchen_stove", label: "Stove", icon: "Flame", category: "kitchen" },
  {
    type: "kitchen_sink",
    label: "Sink",
    icon: "Droplets",
    category: "kitchen",
  },
  {
    type: "kitchen_fridge",
    label: "Fridge",
    icon: "Refrigerator",
    category: "kitchen",
  },
  {
    type: "kitchen_cabinet_base",
    label: "Base Cabinet",
    icon: "Archive",
    category: "kitchen",
  },
  {
    type: "kitchen_cabinet_wall",
    label: "Wall Cabinet",
    icon: "Archive",
    category: "kitchen",
  },
  {
    type: "kitchen_dishwasher",
    label: "Dishwasher",
    icon: "WashingMachine",
    category: "kitchen",
  },

  // Bathroom
  { type: "toilet", label: "Toilet", icon: "Bath", category: "bathroom" },
  { type: "bathtub", label: "Bathtub", icon: "Bath", category: "bathroom" },
  { type: "shower", label: "Shower", icon: "ShowerHead", category: "bathroom" },

  // Lighting
  { type: "lamp", label: "Floor Lamp", icon: "Lamp", category: "lighting" },
  {
    type: "ceiling_fan",
    label: "Ceiling Fan",
    icon: "Fan",
    category: "lighting",
  },

  // Decor
  { type: "plant", label: "Plant", icon: "Flower2", category: "decor" },
  {
    type: "mirror",
    label: "Mirror",
    icon: "RectangleHorizontal",
    category: "decor",
  },
];
export function resolveFootprintScale(
  f: PlacedFurniture,
  def: FurnitureModelDef & { nativeSize: [number, number, number] },
): [number, number, number] {
  const baseWidth =
    f.targetWidth ?? def.defaultTargetWidth ?? def.nativeSize[0] * 3;
  const baseDepth =
    f.targetDepth ?? def.defaultTargetDepth ?? def.nativeSize[2] * 3;
  const w = baseWidth * f.scale;
  const d = baseDepth * f.scale;
  const sx = w / def.nativeSize[0];
  const sz = d / def.nativeSize[2];
  const sy = f.heightScale ?? f.scale;
  return [sx, sy, sz];
}
