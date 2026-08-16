import {
  DOOR_MATERIALS,
  FLOOR_MAT_DEFS,
  FURNITURE_MATERIALS,
  MATERIAL_REGISTRY,
  MaterialDomain,
  WALL_MAT_DEFS,
  WALL_MATERIALS,
} from "../lib/constants";
import { MaterialCategory } from "./materials-registry";
import { categoryFromThumbnail, thumbnailFromDef } from "./textureCategorize";

// If you have a FURNITURE_MATERIALS export (used in PropsPanel's furniture
// texture section — "Light Wood / Dark Wood / Grey Fabric / Blue Fabric /
// Black Leather / Chrome" from your screenshot), import it here too:
//
// import { FURNITURE_MATERIALS } from './furnitureMaterials'

// export type ApplicableTo =
//   | "wall"
//   | "floor"
//   | "door"
//   | "furniture"
//   | "outdoor"
//   | "stairs"; // add 'outdoor'

export type ApplicableTo = MaterialDomain;

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

  for (const [id, def] of Object.entries(MATERIAL_REGISTRY)) {
    const thumbnail = def.textureUrl;
    const domains = def.domains ?? [];

    if (domains.length === 0) {
      console.warn(
        `[materials] "${id}" has no domains — it will never appear in any picker.`,
      );
    }

    items.push({
      id,
      label:
        (def as any).label ??
        id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      swatch: def.color,
      thumbnail,
      textureUrl: def.textureUrl ?? thumbnail,
      category: def.category,
      appliesTo: domains,
    });
  }

  return items;
}

export const UNIVERSAL_MATERIALS: UniversalMaterial[] = buildCatalog();

/** Filters the catalog down to materials valid for a given object type. */
export function getMaterialsFor(type: ApplicableTo): UniversalMaterial[] {
  return UNIVERSAL_MATERIALS.filter((m) => m.appliesTo.includes(type));
}
