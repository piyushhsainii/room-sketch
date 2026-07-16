import { labelize } from "../MaterialPicker";
import { DOOR_STYLES, FLOOR_MAT_DEFS, WALL_MAT_DEFS } from "../Tools/constants";
import { DOOR_TEXTURE_MATERIALS } from "../Tools/textureMaterials";
import { MaterialCategory, MaterialDomain } from "./materials-registry";

export const CATEGORY_META: Record<
  MaterialCategory,
  { label: string; icon: string; order: number }
> = {
  solid: { label: "Solid Colors", icon: "🎨", order: 0 },
  fabric: { label: "Fabric", icon: "🧵", order: 1 },
  wood: { label: "Wood", icon: "🪵", order: 2 },
  "marble-stone": { label: "Marble & Stone", icon: "🗿", order: 3 },
  brick: { label: "Brick", icon: "🧱", order: 4 },
  tile: { label: "Tile", icon: "◻️", order: 5 },
  concrete: { label: "Concrete", icon: "🪨", order: 6 },
  metal: { label: "Metal", icon: "⚙️", order: 7 },
  glass: { label: "Glass", icon: "🫙", order: 8 },
  wallpaper: { label: "Wallpaper", icon: "📜", order: 9 },
  "pvc-panel": { label: "PVC Panels", icon: "🪵", order: 10 },
};

// filename prefix (lowercased, digits stripped) → category
const PREFIX_TO_CATEGORY: Record<string, MaterialCategory> = {
  // Solids & Paints
  paint: "solid",
  plain: "solid",
  solid: "solid",

  // Fabrics
  fabric: "fabric",
  carpet: "fabric",

  // Woods
  wood: "wood",
  woodfloor: "wood",

  // Stones
  marble: "marble-stone",
  onyx: "marble-stone",
  travertine: "marble-stone",

  // Structural Materials
  brick: "brick",
  bricks: "brick",
  tile: "tile",
  tiles: "tile",
  concrete: "concrete",
  plaster: "solid", // In your registry, plaster has category: 'solid'

  // Metals
  metal: "metal",
  corrugatedsteel: "metal",

  // Specialty items
  glass: "glass",
  wallpaper: "wallpaper",
  pvc: "pvc-panel",
};

/**
 * Reads the category from the TEXTURE FILENAME's prefix, e.g.
 * "Wood052_1K-JPG_Color.jpg" → "wood", "Bricks104_1K-JPG_Color.jpg" → "brick".
 * Works for both flat paths ("/textures/Wood049_1K-JPG_Color.jpg") and
 * nested ones ("/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Color.jpg").
 */
export function categoryFromThumbnail(path?: string): MaterialCategory {
  if (!path) return "solid"; // Fallback changed from "other" to "solid"

  const lowerPath = path.toLowerCase();

  // 1. Try to match explicit directory strings first (e.g., /textures/pvc-panel/...)
  if (lowerPath.includes("pvc-panel")) return "pvc-panel";
  if (lowerPath.includes("wallpaper")) return "wallpaper";
  if (lowerPath.includes("marble")) return "marble-stone";

  // 2. Extract the filename prefix as a secondary fallback strategy
  const filename = lowerPath.split("/").pop() ?? "";
  const prefixMatch = filename.match(/^([a-z0-9]+)/); // Included numbers just in case
  const prefix = prefixMatch?.[1];

  if (prefix && PREFIX_TO_CATEGORY[prefix]) {
    return PREFIX_TO_CATEGORY[prefix];
  }

  return "solid"; // Default fallback
}

/** Pulls the actual preview image off a material def (textureUrl, or an
 *  image-path preview — emoji previews like '⬜'/'🧱' are NOT image paths
 *  and are treated as "no thumbnail", landing in Solid Colors). */
export function thumbnailFromDef(def: any): string | undefined {
  if (def?.textureUrl) return def.textureUrl;
  if (typeof def?.preview === "string" && def.preview.startsWith("/")) {
    return def.preview;
  }
  return undefined;
}

// getMaterialItems.ts
