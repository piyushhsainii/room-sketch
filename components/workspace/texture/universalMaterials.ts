import {
  DOOR_MATERIALS,
  FLOOR_MAT_DEFS,
  FURNITURE_MATERIALS,
  MATERIAL_REGISTRY,
  WALL_MAT_DEFS,
  WALL_MATERIALS,
} from "../Tools/constants";
import { MaterialCategory } from "./materials-registry";
import { categoryFromThumbnail, thumbnailFromDef } from "./textureCategorize";

// If you have a FURNITURE_MATERIALS export (used in PropsPanel's furniture
// texture section — "Light Wood / Dark Wood / Grey Fabric / Blue Fabric /
// Black Leather / Chrome" from your screenshot), import it here too:
//
// import { FURNITURE_MATERIALS } from './furnitureMaterials'

export type ApplicableTo = "wall" | "floor" | "door" | "furniture" | "outdoor"; // add 'outdoor'
export interface UniversalMaterial {
  id: string;
  label: string;
  swatch: string;
  thumbnail?: string;
  category: MaterialCategory;
  appliesTo: ApplicableTo[];
  textureUrl?: string;
}

function buildCatalog(): UniversalMaterial[] {
  const items: UniversalMaterial[] = [];

  // ── Walls ──────────────────────────────────────────────────────────────
  for (const w of WALL_MATERIALS) {
    const def = (WALL_MAT_DEFS as any)[w.id];
    const thumbnail = thumbnailFromDef(def);
    items.push({
      id: w.id,
      label: w.label,
      swatch: w.swatch,
      thumbnail,
      // full-res map for the mesh — falls back to thumbnail if the def
      // doesn't separately provide one, so real-time apply still works
      // even for defs that only ever had a single texture path.
      textureUrl: def?.textureUrl ?? def?.mapUrl ?? thumbnail,
      category: categoryFromThumbnail(thumbnail),
      appliesTo: ["wall"],
    });
  }

  // ── Floors ─────────────────────────────────────────────────────────────
  for (const [key, def] of Object.entries(FLOOR_MAT_DEFS) as [string, any][]) {
    const thumbnail = thumbnailFromDef(def);
    items.push({
      id: key,
      label:
        def.label ??
        key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      swatch: def.swatch ?? def.color ?? "#ccc",
      thumbnail,
      textureUrl: def.textureUrl ?? def.mapUrl ?? thumbnail,
      category: categoryFromThumbnail(thumbnail),
      appliesTo: ["floor"],
    });
  }

  // ── Doors ──────────────────────────────────────────────────────────────
  for (const d of DOOR_MATERIALS) {
    items.push({
      id: d.id,
      label: d.label,
      swatch: d.swatch,
      thumbnail: undefined, // door textures are resolved by DoorMat internally, not a flat file path here
      textureUrl: undefined,
      category: categorizeDoorMaterial(d.id),
      appliesTo: ["door"],
    });
  }

  // ── Furniture ────────────────────────────────────────────────────────
  for (const f of FURNITURE_MATERIALS) {
    items.push({
      id: f.id,
      label: f.label,
      swatch: f.swatch,
      thumbnail: f.thumbnail, // was hardcoded undefined — dropped the picker swatch image
      textureUrl: f.textureUrl, // was missing entirely — this is what FurnitureMesh's resolver reads
      category: categoryFromThumbnail(f.id) ?? "other",
      appliesTo: ["furniture"],
    });
  }

  return items;
}

// Door style ids don't carry a texture file path directly (DoorMat.tsx picks
// its own texture per id internally), so categorize by the id itself.
function categorizeDoorMaterial(id: string): MaterialCategory {
  const material = MATERIAL_REGISTRY[id];

  if (!material) {
    // Fallback for unknown materials
    if (id.includes("wood") || id.startsWith("wood-")) return "wood";
    if (id.includes("glass")) return "glass";
    if (id.includes("metal")) return "metal";
    return "glass";
  }

  // Use the actual category from registry
  const category = material.category as MaterialCategory;

  // Map internal categories to the expected MaterialCategory union if needed
  switch (category) {
    case "solid":
    case "fabric":
    case "wood":
    case "marble-stone":
    case "brick":
    case "tile":
    case "concrete":
    case "metal":
    case "wallpaper":
    case "pvc-panel":
    case "glass":
      return category;
    default:
      return "pvc-panel";
  }
}

export const UNIVERSAL_MATERIALS: UniversalMaterial[] = buildCatalog();

/** Filters the catalog down to materials valid for a given object type. */
export function getMaterialsFor(type: ApplicableTo): UniversalMaterial[] {
  return UNIVERSAL_MATERIALS.filter((m) => m.appliesTo.includes(type));
}
