import { MATERIAL_REGISTRY, MaterialDomain } from "../lib/constants";
import { MaterialCategory } from "./materials-registry";

export type ApplicableTo = MaterialDomain;

export interface UniversalMaterial {
  id: string;
  label: string;
  swatch: string;
  thumbnail?: string;
  category: MaterialCategory;
  appliesTo: ApplicableTo[];
  textureUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  aoMapUrl?: string;
  repeatScale?: number;
  roughness?: number;
  metalness?: number;
  textureScale?: number;
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
