// components/workspace/Tools/textureMaterials.ts
import * as THREE from "three";
import { DOOR_MATERIALS, DoorStyle, WallMaterial } from "../lib/constants";
import { createProceduralTexture } from "../objects/wallmat";

export interface TextureMaterialDef {
  id: string;
  label: string;
  swatch: string; // fallback / accent color
  map: string; // color/diffuse texture path
  normalMap?: string;
  roughnessMap?: string;
  repeat?: [number, number]; // UV tiling
}

// ── DOOR TEXTURES ────────────────────────────────────────────
// Excludes glass_clear / glass_frosted — those stay flat/procedural (transparent).
export const DOOR_TEXTURE_MATERIALS: Record<string, TextureMaterialDef> = {
  wood_oak: {
    id: "wood_oak",
    label: "Natural Oak",
    swatch: "#C8A878",
    map: "/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Color.jpg",
    normalMap: "/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Roughness.jpg",
    repeat: [1, 2],
  },
  wood_dark: {
    id: "wood_dark",
    label: "Dark Walnut",
    swatch: "#4A3220",
    map: "/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_Color.jpg",
    normalMap: "/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_Roughness.jpg",
    repeat: [1, 2],
  },
  wood_white: {
    // whitewashed oak — reuse Wood052 geometry/normal, tinted via color grading in-shader
    // (see note below on why we don't just use a flat white swatch)
    id: "wood_white",
    label: "White",
    swatch: "#F0EDE8",
    map: "/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Color.jpg",
    normalMap: "/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Roughness.jpg",
    repeat: [1, 2],
  },
  metal_steel: {
    id: "metal_steel",
    label: "Steel",
    swatch: "#9AABB8",
    map: "/textures/metal/Metal050A_1K-JPG/Metal050A_1K-JPG_Color.jpg",
    normalMap: "/textures/metal/Metal050A_1K-JPG/Metal050A_1K-JPG_NormalGL.jpg",
    roughnessMap:
      "/textures/metal/Metal050A_1K-JPG/Metal050A_1K-JPG_Roughness.jpg",
    repeat: [1, 1],
  },
  panel_white: {
    id: "panel_white",
    label: "White Panel",
    swatch: "#F5F2EE",
    map: "/textures/metal/Metal056C_1K-JPG/Metal056C_1K-JPG_Color.jpg", // brushed panel look
    normalMap: "/textures/metal/Metal056C_1K-JPG/Metal056C_1K-JPG_NormalGL.jpg",
    roughnessMap:
      "/textures/metal/Metal056C_1K-JPG/Metal056C_1K-JPG_Roughness.jpg",
    repeat: [1, 1],
  },
};

// ── WALL TEXTURES (new entries only — texture actually adds value) ──
// tile-ceramic and brick-*/exposed-brick genuinely benefit from real texture maps.
// I did NOT add texture for 'concrete-raw' duplicate — you likely already wire
// Concrete045 into that one; left untouched here.
export const WALL_TEXTURE_MATERIALS: Record<string, TextureMaterialDef> = {
  "brick-red": {
    id: "brick-red",
    label: "Red Brick",
    swatch: "#9C4A3C",
    map: "/textures/brick/Brick012_1K-JPG/Brick012_1K-JPG_Color.jpg",
    normalMap: "/textures/brick/Brick012_1K-JPG/Brick012_1K-JPG_NormalGL.jpg",
    roughnessMap:
      "/textures/brick/Brick012_1K-JPG/Brick012_1K-JPG_Roughness.jpg",
    repeat: [2, 2],
  },
  "brick-white": {
    id: "brick-white",
    label: "White Brick",
    swatch: "#E8E2D8",
    map: "/textures/brick/Brick012_1K-JPG/Brick012_1K-JPG_Color.jpg", // same geometry, tinted lighter
    normalMap: "/textures/brick/Brick012_1K-JPG/Brick012_1K-JPG_NormalGL.jpg",
    roughnessMap:
      "/textures/brick/Brick012_1K-JPG/Brick012_1K-JPG_Roughness.jpg",
    repeat: [2, 2],
  },
  "tile-ceramic": {
    id: "tile-ceramic",
    label: "Ceramic Tile",
    swatch: "#DCE6E8",
    map: "/textures/tile/Tile001_1K-JPG/Tile001_1K-JPG_Color.jpg",
    normalMap: "/textures/tile/Tile001_1K-JPG/Tile001_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/tile/Tile001_1K-JPG/Tile001_1K-JPG_Roughness.jpg",
    repeat: [3, 3],
  },
  "exposed-brick": {
    id: "exposed-brick",
    label: "Exposed Brick",
    swatch: "#8A5A45",
    map: "/textures/brick/Brick012_1K-JPG/Brick012_1K-JPG_Color.jpg",
    normalMap: "/textures/brick/Brick012_1K-JPG/Brick012_1K-JPG_NormalGL.jpg",
    roughnessMap:
      "/textures/brick/Brick012_1K-JPG/Brick012_1K-JPG_Roughness.jpg",
    repeat: [2.5, 2.5],
  },
};

// ── SHARED LOADER + CACHE ────────────────────────────────────
const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

function loadCached(path: string): THREE.Texture {
  const hit = textureCache.get(path);
  if (hit) return hit;
  const tex = loader.load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(path, tex);
  return tex;
}

function loadCachedLinear(path: string): THREE.Texture {
  // normal/roughness maps should NOT be sRGB-decoded
  const hit = textureCache.get(path);
  if (hit) return hit;
  const tex = loader.load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(path, tex);
  return tex;
}

/** Builds (or reuses) a MeshStandardMaterial for a texture-based material def. */
export function buildTexturedMaterial(
  def: TextureMaterialDef,
  extraProps: Partial<THREE.MeshStandardMaterialParameters> = {},
) {
  const map = loadCached(def.map);
  const normalMap = def.normalMap ? loadCachedLinear(def.normalMap) : undefined;
  const roughnessMap = def.roughnessMap
    ? loadCachedLinear(def.roughnessMap)
    : undefined;

  const [rx, ry] = def.repeat ?? [1, 1];
  [map, normalMap, roughnessMap].forEach((t) => t?.repeat.set(rx, ry));

  // wood_white is a tint variant of Wood052 — lighten via material color multiply
  const tintColor = def.id === "wood_white" ? "#e8e0d0" : "#ffffff";

  return new THREE.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap,
    color: tintColor,
    roughness: roughnessMap ? 1 : 0.8,
    metalness: def.id.startsWith("metal") ? 0.6 : 0.05,
    ...extraProps,
  });
}

function getDoorMaterial(style: DoorStyle) {
  const def = DOOR_MATERIALS.find((d) => d.id === style);
  const textureDef = DOOR_TEXTURE_MATERIALS[style];

  if (def?.textured && textureDef) {
    return buildTexturedMaterial(textureDef);
  }

  // glass fallback — kept procedural/transparent, not textured
  const isFrosted = style === "glass_frosted";
  return new THREE.MeshPhysicalMaterial({
    color: def?.swatch ?? "#ffffff",
    transparent: true,
    opacity: isFrosted ? 0.55 : 0.25,
    roughness: isFrosted ? 0.6 : 0.05,
    transmission: isFrosted ? 0.3 : 0.9,
  });
}
function getWallMaterial(mat: WallMaterial) {
  const textureDef = WALL_TEXTURE_MATERIALS[mat];
  if (textureDef) return buildTexturedMaterial(textureDef);
  return createProceduralTexture(mat); // existing procedural path for paint/wallpaper/pvc
}
