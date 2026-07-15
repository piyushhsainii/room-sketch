import {
  DOOR_MATERIALS,
  FLOOR_MAT_DEFS,
  FURNITURE_MATERIALS,
  WALL_MAT_DEFS,
  WALL_MATERIALS,
} from "../Tools/constants";
import {
  categoryFromThumbnail,
  thumbnailFromDef,
  MaterialCategory,
} from "./textureCategorize";

// If you have a FURNITURE_MATERIALS export (used in PropsPanel's furniture
// texture section — "Light Wood / Dark Wood / Grey Fabric / Blue Fabric /
// Black Leather / Chrome" from your screenshot), import it here too:
//
// import { FURNITURE_MATERIALS } from './furnitureMaterials'

export type ApplicableTo = "wall" | "floor" | "door" | "furniture";

export interface UniversalMaterial {
  id: string;
  label: string;
  swatch: string;
  thumbnail?: string;
  category: MaterialCategory;
  appliesTo: ApplicableTo[];
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
      category: categorizeDoorMaterial(d.id),
      appliesTo: ["door"],
    });
  }

  // ── Furniture (if you export FURNITURE_MATERIALS, uncomment) ───────────
  for (const f of FURNITURE_MATERIALS) {
    items.push({
      id: f.id,
      label: f.label,
      swatch: f.swatch,
      thumbnail: undefined,
      category: categoryFromThumbnail(f.id) ?? "other",
      appliesTo: ["furniture"],
    });
  }

  return items;
}

// Door style ids don't carry a texture file path directly (DoorMat.tsx picks
// its own texture per id internally), so categorize by the id itself.
function categorizeDoorMaterial(id: string): MaterialCategory {
  if (id.startsWith("wood_")) return "wood";
  if (id.startsWith("glass_")) return "other";
  if (id.startsWith("metal_")) return "metal";
  if (id.startsWith("panel_")) return "other";
  return "other";
}

export const UNIVERSAL_MATERIALS: UniversalMaterial[] = buildCatalog();

/** Filters the catalog down to materials valid for a given object type. */
export function getMaterialsFor(type: ApplicableTo): UniversalMaterial[] {
  return UNIVERSAL_MATERIALS.filter((m) => m.appliesTo.includes(type));
}
