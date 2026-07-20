import {
  DOOR_MATERIALS,
  FLOOR_MAT_DEFS,
  WALL_MAT_DEFS,
  WALL_MATERIALS,
} from "../lib/constants";

export type MaterialCategory =
  | "solid"
  | "fabric"
  | "wood"
  | "marble-stone"
  | "brick"
  | "tile"
  | "concrete"
  | "metal"
  | "wallpaper"
  | "pvc-panel"
  | "glass"
  | "leather"
  | "outdoor";

export type MaterialDomain =
  | "wall"
  | "floor"
  | "door"
  | "furniture"
  | "outdoor";

export type MaterialDef = {
  color: string;
  roughness: number;
  metalness: number;
  repeatScale: number;
  category: MaterialCategory;
  domains: MaterialDomain[];
  label?: string;
  preview?: string;
  textureUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
};

function inferCategory(key: string, textureUrl?: string): MaterialCategory {
  if (key.startsWith("wallpaper")) return "wallpaper";
  if (key.startsWith("pvc-panel")) return "pvc-panel";
  if (key.startsWith("glass")) return "glass";

  const filename = textureUrl?.split("/").pop() ?? "";
  const prefix = filename.match(/^([A-Za-z]+)/)?.[1]?.toLowerCase();
  const prefixMap: Record<string, MaterialCategory> = {
    fabric: "fabric",
    carpet: "fabric",
    wood: "wood",
    woodfloor: "wood",
    marble: "marble-stone",
    onyx: "marble-stone",
    travertine: "marble-stone",
    brick: "brick",
    bricks: "brick",
    tile: "tile",
    tiles: "tile",
    concrete: "concrete",
    metal: "metal",
    corrugatedsteel: "metal",
  };
  if (prefix && prefixMap[prefix]) return prefixMap[prefix];

  // Fallback: infer from the key itself for defs with no texture file
  // (solid colors, or entries missing a preview/textureUrl).
  if (key.includes("brick")) return "brick";
  if (key.includes("tile")) return "tile";
  if (key.includes("concrete")) return "concrete";
  if (
    key.includes("marble") ||
    key.includes("onyx") ||
    key.includes("travertine")
  )
    return "marble-stone";
  if (key.includes("metal")) return "metal";
  if (key.includes("wood")) return "wood";
  if (key.includes("fabric") || key.includes("carpet")) return "fabric";
  return "solid";
}

function buildRegistry(): Record<string, MaterialDef> {
  const registry: Record<string, MaterialDef> = {};

  // ── Wall materials ───────────────────────────────────────────────────
  for (const [key, def] of Object.entries(WALL_MAT_DEFS) as [string, any][]) {
    registry[key] = {
      color: def.color,
      roughness: def.roughness,
      metalness: def.metalness,
      repeatScale: def.repeatScale,
      preview: def.preview,
      textureUrl: def.textureUrl,
      normalMapUrl: def.normalMapUrl,
      roughnessMapUrl: def.roughnessMapUrl,
      label: WALL_MATERIALS.find((w: any) => w.id === key)?.label,
      category: inferCategory(key, def.textureUrl),
      domains: ["wall"],
    };
  }

  const WALL_FLOOR_KEY_COLLISIONS = new Set([
    "brick-red",
    "brick-white",
    "tile-ceramic",
  ]);

  for (const [rawKey, def] of Object.entries(FLOOR_MAT_DEFS) as [
    string,
    any,
  ][]) {
    const key = WALL_FLOOR_KEY_COLLISIONS.has(rawKey)
      ? `${rawKey}-floor`
      : rawKey;
    if (registry[key] && !WALL_FLOOR_KEY_COLLISIONS.has(rawKey)) {
      registry[key].domains.push("floor");
      continue;
    }
    registry[key] = {
      color: def.color,
      roughness: def.roughness,
      metalness: def.metalness,
      repeatScale: def.repeatScale,
      preview: def.preview,
      textureUrl: def.textureUrl,
      normalMapUrl: def.normalMapUrl,
      roughnessMapUrl: def.roughnessMapUrl,
      label: def.label,
      category: inferCategory(rawKey, def.textureUrl),
      domains: ["floor"],
    };
  }

  for (const d of DOOR_MATERIALS) {
    registry[d.id] = {
      color: d.swatch,
      roughness: 0.5,
      metalness: d.id.startsWith("metal") ? 0.8 : 0,
      repeatScale: 1,
      label: d.label,
      category: inferCategory(d.id),
      domains: ["door"],
    };
  }

  return registry;
}

export const MATERIAL_REGISTRY: Record<string, MaterialDef> = buildRegistry();

export function getMaterialsForDomain(
  domain: MaterialDomain,
): { key: string; def: MaterialDef }[] {
  return Object.entries(MATERIAL_REGISTRY)
    .filter(([, def]) => def.domains.includes(domain))
    .map(([key, def]) => ({ key, def }));
}

export function getMaterialsByCategory(
  domain: MaterialDomain,
): Record<MaterialCategory, { key: string; def: MaterialDef }[]> {
  const items = getMaterialsForDomain(domain);
  const grouped = {} as Record<
    MaterialCategory,
    { key: string; def: MaterialDef }[]
  >;
  for (const item of items) {
    if (!grouped[item.def.category]) grouped[item.def.category] = [];
    grouped[item.def.category].push(item);
  }
  return grouped;
}

export function labelize(v: string): string {
  return v.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
