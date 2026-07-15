import { labelize } from "../MaterialPicker";
import { DOOR_STYLES, FLOOR_MAT_DEFS, WALL_MAT_DEFS } from "../Tools/constants";
import { DOOR_TEXTURE_MATERIALS } from "../Tools/textureMaterials";
import { MaterialDomain, MaterialGridItem } from "./materials-registry";

export type MaterialCategory =
  | "fabric"
  | "wood"
  | "marble"
  | "brick"
  | "tile"
  | "concrete"
  | "plaster"
  | "metal"
  | "other";

export const CATEGORY_META: Record<
  MaterialCategory,
  { label: string; icon: string; order: number }
> = {
  fabric: { label: "Fabric", icon: "🧵", order: 0 },
  wood: { label: "Wood", icon: "🪵", order: 1 },
  marble: { label: "Marble & Stone", icon: "🗿", order: 2 },
  brick: { label: "Brick", icon: "🧱", order: 3 },
  tile: { label: "Tile", icon: "◻️", order: 4 },
  concrete: { label: "Concrete", icon: "🪨", order: 5 },
  plaster: { label: "Plaster", icon: "🎨", order: 6 },
  metal: { label: "Metal", icon: "⚙️", order: 7 },
  other: { label: "Solid Colors", icon: "🎨", order: 8 },
};

// filename prefix (lowercased, digits stripped) → category
const PREFIX_TO_CATEGORY: Record<string, MaterialCategory> = {
  fabric: "fabric",
  carpet: "fabric",
  wood: "wood",
  woodfloor: "wood",
  marble: "marble",
  onyx: "marble",
  travertine: "marble",
  brick: "brick",
  bricks: "brick",
  tile: "tile",
  tiles: "tile",
  concrete: "concrete",
  plaster: "plaster",
  metal: "metal",
  corrugatedsteel: "metal",
};

/**
 * Reads the category from the TEXTURE FILENAME's prefix, e.g.
 * "Wood052_1K-JPG_Color.jpg" → "wood", "Bricks104_1K-JPG_Color.jpg" → "brick".
 * Works for both flat paths ("/textures/Wood049_1K-JPG_Color.jpg") and
 * nested ones ("/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Color.jpg").
 */
export function categoryFromThumbnail(path?: string): MaterialCategory {
  if (!path) return "other";
  const filename = path.split("/").pop() ?? "";
  const prefixMatch = filename.match(/^([A-Za-z]+)/);
  const prefix = prefixMatch?.[1]?.toLowerCase();
  if (prefix && PREFIX_TO_CATEGORY[prefix]) return PREFIX_TO_CATEGORY[prefix];
  return "other";
}

/** Pulls the actual preview image off a material def (textureUrl, or an
 *  image-path preview — emoji previews like '⬜'/'🧱' are NOT image paths
 *  and are treated as "no thumbnail", landing in Solid Colors). */
export function thumbnailFromDef(def: any): string | undefined {
  if (def?.textureUrl) return def.textureUrl;
  if (typeof def?.preview === "string" && def.preview.startsWith("/"))
    return def.preview;
  return undefined;
}

// getMaterialItems.ts

export function getMaterialItems(domain: MaterialDomain): MaterialGridItem[] {
  if (domain === "door") {
    return DOOR_STYLES.map((d) => ({
      key: d.value,
      label: d.label,
      color: d.color,
      thumbnail: DOOR_TEXTURE_MATERIALS[d.value]?.map,
      category: "other" as MaterialCategory,
    }));
  }
  const defs = domain === "wall" ? WALL_MAT_DEFS : FLOOR_MAT_DEFS;
  return Object.entries(defs).map(([key, def]) => {
    const thumbnail = def.preview?.startsWith("/") ? def.preview : undefined;
    return {
      key,
      label: labelize(key),
      color: def.color,
      thumbnail,
      category: categoryFromThumbnail(thumbnail),
    };
  });
}
