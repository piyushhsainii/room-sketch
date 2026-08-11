import { SceneConfig } from "../FloorPlanEditor"
import { PlacedLight } from "../lights-constant"
import { MaterialCategory } from "../texture/materials-registry"
import { UniversalMaterial } from "../texture/universalMaterials"
import { CameraView } from "./camera"
import { FurnitureType, PlacedFurniture } from "./furniture-constants"
import { PlacedOutdoorObject } from "./outdoor-constants"
import { PlacedStairs, StairsType } from "./stairs-constants"
import { WallType } from "./wall-constants"


export type MaterialDomain = 'wall' | 'floor' | 'door' | 'furniture' | 'outdoor' | 'stairs'

export type MaterialDef = {
    color: string
    roughness: number
    metalness: number
    repeatScale: number
    category: MaterialCategory       // was accepted but never declared — fixed
    domains: MaterialDomain[]        // NEW — which pickers this material shows up in
    label?: string
    preview?: string
    textureUrl?: string
    normalMapUrl?: string
    roughnessMapUrl?: string
}



const TILE_BASE = [
    { id: 'tiles-058', folder: 'Tiles058_1K-JPG', color: '#2A2A2E', roughness: 0.35, domains: ['floor', 'stairs'] },        // dark pebble mosaic
    { id: 'tiles-030', folder: 'Tiles030_1K-JPG', color: '#B7BFC7', roughness: 0.3, domains: ['floor', 'wall', 'stairs'] }, // light gray subway-ish
    { id: 'tiles-109', folder: 'Tiles109_1K-JPG', color: '#C7C2B3', roughness: 0.32, domains: ['floor', 'wall'] },          // beige domed tile
    { id: 'tiles-007', folder: 'Tiles007_1K-JPG', color: '#B9B9B9', roughness: 0.3, domains: ['floor', 'wall'] },           // gray square
    { id: 'tiles-111', folder: 'Tiles111_1K-JPG', color: '#A6552E', roughness: 0.4, domains: ['floor', 'stairs'] },        // terracotta
    { id: 'tiles-008', folder: 'Tiles008_1K-JPG', color: '#D8D2C4', roughness: 0.3, domains: ['floor', 'wall'] },          // cream square
    { id: 'tiles-135b', folder: 'Tiles135B_1K-JPG', color: '#7A93A8', roughness: 0.25, domains: ['floor', 'wall'] },       // blue-gray glossy
    { id: 'tiles-124', folder: 'Tiles124_1K-JPG', color: '#3C3C3C', roughness: 0.35, domains: ['floor', 'stairs'] },       // dark pebble round
    { id: 'tiles-095', folder: 'Tiles095_1K-JPG', color: '#C9BFA8', roughness: 0.32, domains: ['floor', 'wall'] },         // beige hex
    { id: 'tiles-072', folder: 'Tiles072_1K-JPG', color: '#5C5C60', roughness: 0.34, domains: ['floor', 'stairs'] },       // dark gray square
    { id: 'tiles-135d', folder: 'Tiles135D_1K-JPG', color: '#8FA6B8', roughness: 0.25, domains: ['floor', 'wall'] },       // blue mosaic
    { id: 'tiles-120', folder: 'Tiles120_1K-JPG', color: '#C6CCD1', roughness: 0.3, domains: ['floor', 'wall'] },          // pebble round light
    { id: 'tiles-010', folder: 'Tiles010_1K-JPG', color: '#D3D3D0', roughness: 0.3, domains: ['floor', 'wall'] },          // white domed
    { id: 'tiles-038', folder: 'Tiles038_1K-JPG', color: '#C7CBCE', roughness: 0.3, domains: ['floor', 'wall'] },          // light square
    { id: 'tiles-054', folder: 'Tiles054_1K-JPG', color: '#AEB5BC', roughness: 0.28, domains: ['floor', 'wall'] },         // gray-blue domed
    { id: 'tiles-110', folder: 'Tiles110_1K-JPG', color: '#B2A48C', roughness: 0.32, domains: ['floor', 'wall'] },         // stone-look mosaic
    { id: 'tiles-076', folder: 'Tiles076_1K-JPG', color: '#1F1F1F', roughness: 0.3, domains: ['floor'] },                  // black/white geometric
    { id: 'tiles-051', folder: 'Tiles051_1K-JPG', color: '#8B8F92', roughness: 0.33, domains: ['floor', 'stairs'] },       // gray square variant
    { id: 'tiles-079', folder: 'Tiles079_1K-JPG', color: '#DADADA', roughness: 0.3, domains: ['floor', 'wall'] },         // white square-grid
    { id: 'tiles-081', folder: 'Tiles081_1K-JPG', color: '#DDD9CE', roughness: 0.28, domains: ['floor', 'wall'] },         // hex ball pattern
    { id: 'tiles-084', folder: 'Tiles084_1K-JPG', color: '#B9AE9C', roughness: 0.32, domains: ['floor', 'wall'] },         // stone hex
    { id: 'tiles-133d', folder: 'Tiles133D_1K-JPG', color: '#C6C1B4', roughness: 0.3, domains: ['floor', 'wall'] },        // white domed
    { id: 'tiles-075', folder: 'Tiles075_1K-JPG', color: '#B7BAC0', roughness: 0.3, domains: ['floor', 'wall'] },          // gray domed variant
    { id: 'tiles-045', folder: 'Tiles045_1K-JPG', color: '#232629', roughness: 0.3, domains: ['floor', 'stairs'] },        // dark square
    { id: 'tiles-108', folder: 'Tiles108_1K-JPG', color: '#151515', roughness: 0.28, domains: ['floor', 'stairs'] },       // black w/ grid
    { id: 'tiles-129b', folder: 'Tiles129B_1K-JPG', color: '#3E3E3E', roughness: 0.32, domains: ['floor'] },               // dark honeycomb
    { id: 'tiles-133a', folder: 'Tiles133A_1K-JPG', color: '#D6D6D2', roughness: 0.28, domains: ['floor', 'wall'] },       // white square-grid
    { id: 'tiles-093', folder: 'Tiles093_1K-JPG', color: '#8A8D90', roughness: 0.32, domains: ['floor', 'stairs'] },       // gray domed
    { id: 'tiles-052', folder: 'Tiles052_1K-JPG', color: '#4A4A4C', roughness: 0.34, domains: ['floor', 'stairs'] },       // dark square
    { id: 'tiles-074', folder: 'Tiles074_1K-JPG', color: '#8F8A7A', roughness: 0.35, domains: ['floor', 'wall'] },         // camo-stone mosaic
    { id: 'tiles-131', folder: 'Tiles131_1K-JPG', color: '#6B6558', roughness: 0.4, domains: ['floor', 'wall'] },          // camo-brown mosaic
    { id: 'tiles-132a', folder: 'Tiles132A_1K-JPG', color: '#3A8A85', roughness: 0.22, domains: ['floor', 'wall'] },       // teal glossy square
] as const
const REPEAT_VARIANTS: { suffix: string; label: string; repeatScale: number }[] = [
    { suffix: 'fine', label: 'Fine', repeatScale: 0.5 },
    { suffix: 'standard', label: 'Standard', repeatScale: 1 },
    { suffix: 'wide', label: 'Wide', repeatScale: 2 },
]

function buildTileEntries(): Record<string, MaterialDef> {
    const entries: Record<string, MaterialDef> = {}
    for (const t of TILE_BASE) {
        for (const v of REPEAT_VARIANTS) {
            entries[`${t.id}-${v.suffix}`] = {
                color: t.color,
                roughness: t.roughness,
                metalness: 0,
                repeatScale: v.repeatScale,
                category: 'tile',
                domains: [...t.domains],
                label: `${t.folder.split('_')[0]} — ${v.label}`,
                textureUrl: `/textures/tiles/${t.folder}/${t.folder}_Color.jpg`,
                normalMapUrl: `/textures/tiles/${t.folder}/${t.folder}_NormalGL.jpg`,
                roughnessMapUrl: `/textures/tiles/${t.folder}/${t.folder}_Roughness.jpg`,
            }
        }
    }
    return entries
}

export const TILE_MATERIALS: Record<string, MaterialDef> = buildTileEntries()

export const MATERIAL_REGISTRY: Record<string, MaterialDef> = {
    // ── Solids — usable everywhere ──────────────────────────────────────
    paint: { color: '#FFFFFF', roughness: 0.85, metalness: 0, repeatScale: 0.1, category: 'solid', domains: ['wall', 'door', 'furniture'], preview: '⬜' },
    plain: { color: '#C8A878', roughness: 0.7, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor'], preview: '🪵' },
    'solid-white': { color: '#F5F5F0', roughness: 0.6, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor', 'wall', 'door', 'furniture'], preview: '⬜' },
    'solid-gray': { color: '#8A8A85', roughness: 0.6, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor', 'wall', 'door', 'furniture'], preview: '⬜' },
    'solid-black': { color: '#1A1A1A', roughness: 0.5, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor', 'wall', 'door', 'furniture'], preview: '⬛' },
    'solid-beige': { color: '#D8C9B0', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor', 'wall', 'door', 'furniture'], preview: '⬜' },

    // ── Wood ─────────────────────────────────────────────────────────────
    wood: { color: '#C8A878', roughness: 0.6, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'wall'], textureUrl: '/textures/Wood049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Wood049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Wood049_1K-JPG_Roughness.jpg' },
    'wood-oak': { color: '#D4B592', roughness: 0.5, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall', 'stairs'], textureUrl: '/textures/Wood049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Wood049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Wood049_1K-JPG_Roughness.jpg' },
    'wood-walnut': { color: '#5C4033', roughness: 0.4, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall', 'stairs'], textureUrl: '/textures/Wood049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Wood049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Wood049_1K-JPG_Roughness.jpg' },
    'wood-slat-oak': { color: '#C8A878', roughness: 0.5, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall', 'stairs'], textureUrl: '/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Roughness.jpg' },
    'wood-slat-dark': { color: '#4A3220', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall', 'stairs'], textureUrl: '/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_Roughness.jpg' },
    'wood-floor-herringbone': { color: '#C4A672', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall'], textureUrl: '/textures/wood/WoodFloor070_1K-JPG/WoodFloor070_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodFloor070_1K-JPG/WoodFloor070_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodFloor070_1K-JPG/WoodFloor070_1K-JPG_Roughness.jpg' },
    'wood-floor-009': { color: '#B6895C', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall'], textureUrl: '/textures/wood/WoodFloor009_1K-JPG/WoodFloor009_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodFloor009_1K-JPG/WoodFloor009_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodFloor009_1K-JPG/WoodFloor009_1K-JPG_Roughness.jpg' },
    'wood-floor-021': { color: '#C9A876', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall'], textureUrl: '/textures/wood/WoodFloor021_1K-JPG/WoodFloor021_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodFloor021_1K-JPG/WoodFloor021_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodFloor021_1K-JPG/WoodFloor021_1K-JPG_Roughness.jpg' },
    'wood-floor-024': { color: '#8C6239', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall'], textureUrl: '/textures/wood/WoodFloor024_1K-JPG/WoodFloor024_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodFloor024_1K-JPG/WoodFloor024_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodFloor024_1K-JPG/WoodFloor024_1K-JPG_Roughness.jpg' },
    'wood-floor-043': { color: '#D8B98C', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall'], textureUrl: '/textures/wood/WoodFloor043_1K-JPG/WoodFloor043_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodFloor043_1K-JPG/WoodFloor043_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodFloor043_1K-JPG/WoodFloor043_1K-JPG_Roughness.jpg' },
    'wood-floor-060': { color: '#A17849', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall'], textureUrl: '/textures/wood/WoodFloor060_1K-JPG/WoodFloor060_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodFloor060_1K-JPG/WoodFloor060_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodFloor060_1K-JPG/WoodFloor060_1K-JPG_Roughness.jpg' },
    'wood-floor-038': { color: '#B8946A', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall'], textureUrl: '/textures/wood/WoodFloor038_1K-JPG/WoodFloor038_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodFloor038_1K-JPG/WoodFloor038_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodFloor038_1K-JPG/WoodFloor038_1K-JPG_Roughness.jpg' },
    'wood-floor-070': { color: '#C4A672', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'wall'], textureUrl: '/textures/wood/WoodFloor070_1K-JPG/WoodFloor070_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodFloor070_1K-JPG/WoodFloor070_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodFloor070_1K-JPG/WoodFloor070_1K-JPG_Roughness.jpg' },

    // ── Wood siding (new, wall/exterior use) ────────────────────────────
    'wood-siding-001': { color: '#9C7A52', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding001_1K-JPG/WoodSiding001_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding001_1K-JPG/WoodSiding001_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding001_1K-JPG/WoodSiding001_1K-JPG_Roughness.jpg' },
    'wood-siding-002': { color: '#A88860', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding002_1K-JPG/WoodSiding002_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding002_1K-JPG/WoodSiding002_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding002_1K-JPG/WoodSiding002_1K-JPG_Roughness.jpg' },
    'wood-siding-003': { color: '#8C6A46', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding003_1K-JPG/WoodSiding003_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding003_1K-JPG/WoodSiding003_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding003_1K-JPG/WoodSiding003_1K-JPG_Roughness.jpg' },
    'wood-siding-004': { color: '#B49470', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding004_1K-JPG/WoodSiding004_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding004_1K-JPG/WoodSiding004_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding004_1K-JPG/WoodSiding004_1K-JPG_Roughness.jpg' },
    'wood-siding-005': { color: '#7C5C3C', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding005_1K-JPG/WoodSiding005_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding005_1K-JPG/WoodSiding005_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding005_1K-JPG/WoodSiding005_1K-JPG_Roughness.jpg' },
    'wood-siding-006': { color: '#A08058', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding006_1K-JPG/WoodSiding006_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding006_1K-JPG/WoodSiding006_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding006_1K-JPG/WoodSiding006_1K-JPG_Roughness.jpg' },
    'wood-siding-007': { color: '#946E48', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding007_1K-JPG/WoodSiding007_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding007_1K-JPG/WoodSiding007_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding007_1K-JPG/WoodSiding007_1K-JPG_Roughness.jpg' },
    'wood-siding-008': { color: '#BC9C74', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding008_1K-JPG/WoodSiding008_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding008_1K-JPG/WoodSiding008_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding008_1K-JPG/WoodSiding008_1K-JPG_Roughness.jpg' },
    'wood-siding-009': { color: '#846246', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding009_1K-JPG/WoodSiding009_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding009_1K-JPG/WoodSiding009_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding009_1K-JPG/WoodSiding009_1K-JPG_Roughness.jpg' },
    'wood-siding-010': { color: '#AC8C64', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding010_1K-JPG/WoodSiding010_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding010_1K-JPG/WoodSiding010_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding010_1K-JPG/WoodSiding010_1K-JPG_Roughness.jpg' },
    'wood-siding-012': { color: '#98785450', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding012_1K-JPG/WoodSiding012_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding012_1K-JPG/WoodSiding012_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding012_1K-JPG/WoodSiding012_1K-JPG_Roughness.jpg' },
    'wood-siding-013': { color: '#B0906C', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'floor', 'door', 'outdoor'], textureUrl: '/textures/wood/WoodSiding013_1K-JPG/WoodSiding013_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodSiding013_1K-JPG/WoodSiding013_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodSiding013_1K-JPG/WoodSiding013_1K-JPG_Roughness.jpg' },
    'planks-015': { color: '#8B6742', roughness: 0.6, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/wood/Planks015_1K-JPG/Planks015_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/Planks015_1K-JPG/Planks015_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/Planks015_1K-JPG/Planks015_1K-JPG_Roughness.jpg' },
    'planks-013': { color: '#5C4632', roughness: 0.62, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/wood/Planks013_1K-JPG/Planks013_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/Planks013_1K-JPG/Planks013_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/Planks013_1K-JPG/Planks013_1K-JPG_Roughness.jpg' },
    'planks-012': { color: '#7A5738', roughness: 0.6, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/wood/Planks012_1K-JPG/Planks012_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/Planks012_1K-JPG/Planks012_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/Planks012_1K-JPG/Planks012_1K-JPG_Roughness.jpg' },
    'planks-017': { color: '#96674A', roughness: 0.58, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/wood/Planks017_1K-JPG/Planks017_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/Planks017_1K-JPG/Planks017_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/Planks017_1K-JPG/Planks017_1K-JPG_Roughness.jpg' },
    'planks-014': { color: '#4A3626', roughness: 0.64, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/wood/Planks014_1K-JPG/Planks014_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/Planks014_1K-JPG/Planks014_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/Planks014_1K-JPG/Planks014_1K-JPG_Roughness.jpg' },

    // ── Marble & stone ───────────────────────────────────────────────────
    marble: { color: '#EAE6E0', roughness: 0.12, metalness: 0.1, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs', 'door'], textureUrl: '/textures/Marble022_1K-JPG_Color.jpg', normalMapUrl: '/textures/Marble022_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Marble022_1K-JPG_Roughness.jpg' },
    'marble-white': { color: '#F9F9F9', roughness: 0.05, metalness: 0.1, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs'] },
    'marble-black': { color: '#1A1A1A', roughness: 0.05, metalness: 0.2, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs'] },
    'marble-onyx': { color: '#3A3A3E', roughness: 0.08, metalness: 0.1, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs', 'wall'], textureUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_Roughness.jpg' },
    'marble-travertine': { color: '#D8C9AE', roughness: 0.35, metalness: 0.02, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs'], textureUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_Roughness.jpg' },
    'marble-white-veined': { color: '#F0EEE8', roughness: 0.08, metalness: 0.08, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs'], textureUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_Roughness.jpg' },
    'marble-veined': { color: '#E8E4DC', roughness: 0.1, metalness: 0.06, repeatScale: 1.5, category: 'marble-stone', domains: ['wall'], textureUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_Roughness.jpg' },
    // --- Marble022 variations (using existing textureUrl) ---
    'marble-polished': { color: '#EAE6E0', roughness: 0.04, metalness: 0.15, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs', 'door'], textureUrl: '/textures/Marble022_1K-JPG_Color.jpg', normalMapUrl: '/textures/Marble022_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Marble022_1K-JPG_Roughness.jpg' },
    'marble-honed': { color: '#EAE6E0', roughness: 0.35, metalness: 0.03, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs', 'door'], textureUrl: '/textures/Marble022_1K-JPG_Color.jpg', normalMapUrl: '/textures/Marble022_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Marble022_1K-JPG_Roughness.jpg' },
    'marble-large-slab': { color: '#EAE6E0', roughness: 0.12, metalness: 0.1, repeatScale: 0.5, category: 'marble-stone', domains: ['floor', 'stairs', 'door'], textureUrl: '/textures/Marble022_1K-JPG_Color.jpg', normalMapUrl: '/textures/Marble022_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Marble022_1K-JPG_Roughness.jpg' },
    'marble-tiled-small': { color: '#EAE6E0', roughness: 0.12, metalness: 0.1, repeatScale: 3, category: 'marble-stone', domains: ['floor', 'stairs', 'door'], textureUrl: '/textures/Marble022_1K-JPG_Color.jpg', normalMapUrl: '/textures/Marble022_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Marble022_1K-JPG_Roughness.jpg' },

    // --- Onyx013 variations ---
    'marble-onyx-backlit': { color: '#4A4550', roughness: 0.05, metalness: 0.05, repeatScale: 0.75, category: 'marble-stone', domains: ['wall'], textureUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_Roughness.jpg' },
    'marble-onyx-tiled': { color: '#3A3A3E', roughness: 0.08, metalness: 0.1, repeatScale: 2, category: 'marble-stone', domains: ['floor', 'stairs', 'wall'], textureUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_Roughness.jpg' },

    // --- Travertine009 variations ---
    'marble-travertine-large': { color: '#D8C9AE', roughness: 0.35, metalness: 0.02, repeatScale: 0.6, category: 'marble-stone', domains: ['floor', 'stairs'], textureUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_Roughness.jpg' },
    'marble-travertine-sealed': { color: '#D8C9AE', roughness: 0.18, metalness: 0.05, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs'], textureUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_Roughness.jpg' },

    // --- Marble016 (white-veined) variations ---
    'marble-white-veined-large': { color: '#F0EEE8', roughness: 0.08, metalness: 0.08, repeatScale: 0.5, category: 'marble-stone', domains: ['floor', 'stairs'], textureUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_Roughness.jpg' },
    'marble-white-veined-matte': { color: '#F0EEE8', roughness: 0.4, metalness: 0.02, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs'], textureUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_Roughness.jpg' },

    // --- Marble012 variations ---
    'marble-veined-tight': { color: '#E8E4DC', roughness: 0.1, metalness: 0.06, repeatScale: 3, category: 'marble-stone', domains: ['wall'], textureUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_Roughness.jpg' },
    'marble-veined-panel': { color: '#E8E4DC', roughness: 0.1, metalness: 0.06, repeatScale: 0.4, category: 'marble-stone', domains: ['wall'], textureUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_Roughness.jpg' },
    // NEW: Added missing folders found in file system
    'marble-014': { color: '#D4CFC7', roughness: 0.1, metalness: 0.05, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Roughness.jpg' },
    'marble-onyx-015': { color: '#2A302E', roughness: 0.06, metalness: 0.12, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Roughness.jpg' },
    'marble-travertine-010': { color: '#CDBFA6', roughness: 0.38, metalness: 0.02, repeatScale: 3, category: 'marble-stone', domains: ['floor', 'stairs', 'door', 'wall'], textureUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Roughness.jpg' },

    // --- Marble014 variations ---
    'marble-014-polished': { color: '#D4CFC7', roughness: 0.04, metalness: 0.15, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Roughness.jpg' },
    'marble-014-honed': { color: '#D4CFC7', roughness: 0.35, metalness: 0.02, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Roughness.jpg' },
    'marble-014-large-slab': { color: '#D4CFC7', roughness: 0.1, metalness: 0.05, repeatScale: 0.5, category: 'marble-stone', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Roughness.jpg' },
    'marble-014-tiled': { color: '#D4CFC7', roughness: 0.1, metalness: 0.05, repeatScale: 3, category: 'marble-stone', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Roughness.jpg' },

    // --- Onyx015 variations ---
    'marble-onyx-015-backlit': { color: '#3D4A46', roughness: 0.04, metalness: 0.06, repeatScale: 0.75, category: 'marble-stone', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Roughness.jpg' },
    'marble-onyx-015-tiled': { color: '#2A302E', roughness: 0.06, metalness: 0.12, repeatScale: 2, category: 'marble-stone', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Roughness.jpg' },
    'marble-onyx-015-large-slab': { color: '#2A302E', roughness: 0.06, metalness: 0.12, repeatScale: 0.5, category: 'marble-stone', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Roughness.jpg' },

    // --- Travertine010 variations ---
    'marble-travertine-010-large': { color: '#CDBFA6', roughness: 0.38, metalness: 0.02, repeatScale: 0.6, category: 'marble-stone', domains: ['floor', 'stairs', 'door', 'wall'], textureUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Roughness.jpg' },
    'marble-travertine-010-sealed': { color: '#CDBFA6', roughness: 0.18, metalness: 0.05, repeatScale: 1.5, category: 'marble-stone', domains: ['floor', 'stairs', 'door', 'wall'], textureUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Roughness.jpg' },
    'marble-travertine-010-fine': { color: '#CDBFA6', roughness: 0.32, metalness: 0.02, repeatScale: 5, category: 'marble-stone', domains: ['floor', 'stairs', 'door', 'wall'], textureUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Roughness.jpg' },



    // ── Concrete ─────────────────────────────────────────────────────────
    concrete: { color: '#A8A8A8', roughness: 0.92, metalness: 0, repeatScale: 2, category: 'concrete', domains: ['floor', 'stairs', 'wall'], textureUrl: '/textures/Concrete025_1K-JPG_Color.jpg', normalMapUrl: '/textures/Concrete025_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Concrete025_1K-JPG_Roughness.jpg' },
    'concrete-raw': { color: '#A8A6A0', roughness: 0.95, metalness: 0, repeatScale: 0.15, category: 'concrete', domains: ['wall', 'floor'], textureUrl: '/textures/Concrete025_1K-JPG_Color.jpg', normalMapUrl: '/textures/Concrete025_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Concrete025_1K-JPG_Roughness.jpg' },
    'concrete-smooth': { color: '#B0AEA8', roughness: 0.6, metalness: 0, repeatScale: 2, category: 'concrete', domains: ['wall', 'floor'], textureUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_Color.jpg', normalMapUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_Roughness.jpg' },
    'concrete-polished': { color: '#B6B4AE', roughness: 0.25, metalness: 0.05, repeatScale: 2, category: 'concrete', domains: ['floor', 'wall'], textureUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_Color.jpg', normalMapUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_Roughness.jpg' },
    // ── Painted bricks (new) ─────────────────────────────────────────────
    'painted-bricks-001': { color: '#D8D4CC', roughness: 0.7, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'floor', 'door'], textureUrl: '/textures/concrete/PaintedBricks001_1K-JPG/PaintedBricks001_1K-JPG_Color.jpg', normalMapUrl: '/textures/concrete/PaintedBricks001_1K-JPG/PaintedBricks001_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/concrete/PaintedBricks001_1K-JPG/PaintedBricks001_1K-JPG_Roughness.jpg' },
    'painted-bricks-002': { color: '#C8C0B4', roughness: 0.7, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'floor', 'door'], textureUrl: '/textures/concrete/PaintedBricks002_1K-JPG/PaintedBricks002_1K-JPG_Color.jpg', normalMapUrl: '/textures/concrete/PaintedBricks002_1K-JPG/PaintedBricks002_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/concrete/PaintedBricks002_1K-JPG/PaintedBricks002_1K-JPG_Roughness.jpg' },
    'painted-bricks-003': { color: '#E4E0D8', roughness: 0.7, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'floor', 'door'], textureUrl: '/textures/concrete/PaintedBricks003_1K-JPG/PaintedBricks003_1K-JPG_Color.jpg', normalMapUrl: '/textures/concrete/PaintedBricks003_1K-JPG/PaintedBricks003_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/concrete/PaintedBricks003_1K-JPG/PaintedBricks003_1K-JPG_Roughness.jpg' },
    'painted-bricks-004': { color: '#B8B0A4', roughness: 0.7, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'floor', 'door'], textureUrl: '/textures/concrete/PaintedBricks004_1K-JPG/PaintedBricks004_1K-JPG_Color.jpg', normalMapUrl: '/textures/concrete/PaintedBricks004_1K-JPG/PaintedBricks004_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/concrete/PaintedBricks004_1K-JPG/PaintedBricks004_1K-JPG_Roughness.jpg' },
    'painted-bricks-005': { color: '#A8A098', roughness: 0.7, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'floor', 'door'], textureUrl: '/textures/concrete/PaintedBricks005_1K-JPG/PaintedBricks005_1K-JPG_Color.jpg', normalMapUrl: '/textures/concrete/PaintedBricks005_1K-JPG/PaintedBricks005_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/concrete/PaintedBricks005_1K-JPG/PaintedBricks005_1K-JPG_Roughness.jpg' },

    // ── Tile ─────────────────────────────────────────────────────────────
    tiles: {
        color: '#D4D0C8', roughness: 0.3, metalness: 0, repeatScale: 1, category: 'tile', domains: ['floor', 'stairs', 'door', 'wall'], // was 20 — lower repeat count = larger, more visible tile squares
        textureUrl: '/textures/tiles/Tiles075_1K-JPG/Tiles075_1K-JPG_Color.jpg',
        normalMapUrl: '/textures/tiles/Tiles075_1K-JPG/Tiles075_1K-JPG_NormalGL.jpg',
        roughnessMapUrl: '/textures/tiles/Tiles075_1K-JPG/Tiles075_1K-JPG_Roughness.jpg',
    },
    'tile-ceramic': {
        color: '#F2F1EC', roughness: 0.25, metalness: 0.05, repeatScale: 1, category: 'tile', domains: ['floor', 'stairs', 'wall', 'door'], // was 0.5 — for THIS entry, 0.5 was actually stretching one texture across the whole surface almost unrepeated; bumped up slightly toward a visible grid too, adjust to taste
        textureUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_1K-JPG_Color.jpg',
        normalMapUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_1K-JPG_NormalGL.jpg',
        roughnessMapUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_Roughness.jpg',
    },
    'tile-travertine': {
        color: '#F2F1F0',
        roughness: 0.25, metalness: 0.05, repeatScale: 1, category: 'tile', domains: ['floor', 'stairs', 'wall', "door"], // was 0.5, same note as tile-ceramic
        textureUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_1K-JPG_Color.jpg',
        normalMapUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_1K-JPG_NormalGL.jpg',
        roughnessMapUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_Roughness.jpg',
    },

    // ── Brick ────────────────────────────────────────────────────────────
    'brick-red': { color: '#A85C42', roughness: 0.85, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/Bricks104_1K-JPG_Color.jpg', normalMapUrl: '/textures/Bricks104_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Bricks104_1K-JPG_Roughness.jpg' },
    'brick-white': { color: '#D8D2C4', roughness: 0.82, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/Bricks019_1K-JPG_Color.jpg', normalMapUrl: '/textures/Bricks019_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Bricks019_1K-JPG_Roughness.jpg' },
    'exposed-brick': { color: '#8B5A44', roughness: 0.95, metalness: 0, repeatScale: 0.35, category: 'brick', domains: ['wall', 'stairs'], preview: '🧱' },
    'bricks-055': { color: '#8C8C8C', roughness: 0.88, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks055_1K-JPG/Bricks055_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks055_1K-JPG/Bricks055_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks055_1K-JPG/Bricks055_1K-JPG_Roughness.jpg' },
    'bricks-048': { color: '#B8B4AC', roughness: 0.85, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks048_1K-JPG/Bricks048_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks048_1K-JPG/Bricks048_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks048_1K-JPG/Bricks048_1K-JPG_Roughness.jpg' },
    'bricks-067': { color: '#9A9A96', roughness: 0.87, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks067_1K-JPG/Bricks067_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks067_1K-JPG/Bricks067_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks067_1K-JPG/Bricks067_1K-JPG_Roughness.jpg' },
    'bricks-031': { color: '#A6553F', roughness: 0.86, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks031_1K-JPG/Bricks031_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks031_1K-JPG/Bricks031_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks031_1K-JPG/Bricks031_1K-JPG_Roughness.jpg' },
    'bricks-088': { color: '#A8402C', roughness: 0.84, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks088_1K-JPG/Bricks088_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks088_1K-JPG/Bricks088_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks088_1K-JPG/Bricks088_1K-JPG_Roughness.jpg' },
    'bricks-083': { color: '#C4B79A', roughness: 0.89, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks083_1K-JPG/Bricks083_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks083_1K-JPG/Bricks083_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks083_1K-JPG/Bricks083_1K-JPG_Roughness.jpg' },
    'bricks-071': { color: '#9C4530', roughness: 0.85, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks071_1K-JPG/Bricks071_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks071_1K-JPG/Bricks071_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks071_1K-JPG/Bricks071_1K-JPG_Roughness.jpg' },
    'bricks-103': { color: '#C9BC9E', roughness: 0.9, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks103_1K-JPG/Bricks103_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks103_1K-JPG/Bricks103_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks103_1K-JPG/Bricks103_1K-JPG_Roughness.jpg' },
    'bricks-058': { color: '#88857E', roughness: 0.87, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks058_1K-JPG/Bricks058_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks058_1K-JPG/Bricks058_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks058_1K-JPG/Bricks058_1K-JPG_Roughness.jpg' },
    'bricks-051': { color: '#A5503A', roughness: 0.86, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks051_1K-JPG/Bricks051_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks051_1K-JPG/Bricks051_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks051_1K-JPG/Bricks051_1K-JPG_Roughness.jpg' },
    'bricks-066': { color: '#ADADA8', roughness: 0.88, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks066_1K-JPG/Bricks066_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks066_1K-JPG/Bricks066_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks066_1K-JPG/Bricks066_1K-JPG_Roughness.jpg' },
    'bricks-060': { color: '#D6D2C8', roughness: 0.91, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks060_1K-JPG/Bricks060_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks060_1K-JPG/Bricks060_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks060_1K-JPG/Bricks060_1K-JPG_Roughness.jpg' },
    'bricks-075a': { color: '#B0A88F', roughness: 0.93, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks075A_1K-JPG/Bricks075A_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks075A_1K-JPG/Bricks075A_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks075A_1K-JPG/Bricks075A_1K-JPG_Roughness.jpg' },
    'bricks-068': { color: '#9E9C97', roughness: 0.86, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'stairs', 'floor'], textureUrl: '/textures/bricks/Bricks068_1K-JPG/Bricks068_1K-JPG_Color.jpg', normalMapUrl: '/textures/bricks/Bricks068_1K-JPG/Bricks068_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/bricks/Bricks068_1K-JPG/Bricks068_1K-JPG_Roughness.jpg' },

    // ── Wallpaper / PVC panel (wall-only) ───────────────────────────────
    'wallpaper-stripe': { color: '#E8E4DC', roughness: 0.7, metalness: 0, repeatScale: 0.3, category: 'wallpaper', domains: ['wall', 'stairs'] },
    'wallpaper-floral': { color: '#F0E6E4', roughness: 0.7, metalness: 0, repeatScale: 0.25, category: 'wallpaper', domains: ['wall', 'stairs'] },
    'wallpaper-textured': { color: '#EDEAE4', roughness: 0.9, metalness: 0, repeatScale: 0.4, category: 'wallpaper', domains: ['wall', 'stairs'] },
    'pvc-panel-groove': { color: '#E4DDCF', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'pvc-panel', domains: ['wall', 'stairs'] },
    'pvc-panel-brick': { color: '#C9B8A8', roughness: 0.75, metalness: 0, repeatScale: 0.5, category: 'pvc-panel', domains: ['wall', 'stairs'] },

    // ── Leather ─────────────────────────────────────────────────────────
    'leather-008': { color: '#6B4A38', roughness: 0.45, metalness: 0, repeatScale: 3, category: 'leather', domains: ['wall', 'floor', 'door', 'furniture'], textureUrl: '/textures/leather/Leather008_1K-JPG/Leather008_1K-JPG_Color.jpg', normalMapUrl: '/textures/leather/Leather008_1K-JPG/Leather008_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/leather/Leather008_1K-JPG/Leather008_1K-JPG_Roughness.jpg' },
    'leather-009': { color: '#3A2A20', roughness: 0.4, metalness: 0, repeatScale: 3, category: 'leather', domains: ['wall', 'floor', 'door', 'furniture'], textureUrl: '/textures/leather/Leather009_1K-JPG/Leather009_1K-JPG_Color.jpg', normalMapUrl: '/textures/leather/Leather009_1K-JPG/Leather009_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/leather/Leather009_1K-JPG/Leather009_1K-JPG_Roughness.jpg' },
    'leather-012': { color: '#8A6248', roughness: 0.5, metalness: 0, repeatScale: 3, category: 'leather', domains: ['wall', 'floor', 'door', 'furniture'], textureUrl: '/textures/leather/Leather012_1K-JPG/Leather012_1K-JPG_Color.jpg', normalMapUrl: '/textures/leather/Leather012_1K-JPG/Leather012_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/leather/Leather012_1K-JPG/Leather012_1K-JPG_Roughness.jpg' },
    'leather-026': { color: '#1E1A18', roughness: 0.35, metalness: 0, repeatScale: 3, category: 'leather', domains: ['wall', 'floor', 'door', 'furniture'], textureUrl: '/textures/leather/Leather026_1K-JPG/Leather026_1K-JPG_Color.jpg', normalMapUrl: '/textures/leather/Leather026_1K-JPG/Leather026_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/leather/Leather026_1K-JPG/Leather026_1K-JPG_Roughness.jpg' },
    'leather-032': { color: '#9C7A5A', roughness: 0.48, metalness: 0, repeatScale: 3, category: 'leather', domains: ['wall', 'floor', 'door', 'furniture'], textureUrl: '/textures/leather/Leather032_1K-JPG/Leather032_1K-JPG_Color.jpg', normalMapUrl: '/textures/leather/Leather032_1K-JPG/Leather032_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/leather/Leather032_1K-JPG/Leather032_1K-JPG_Roughness.jpg' },
    'leather-034a': { color: '#4A342A', roughness: 0.42, metalness: 0, repeatScale: 3, category: 'leather', domains: ['wall', 'floor', 'door', 'furniture'], textureUrl: '/textures/leather/Leather034A_1K-JPG/Leather034A_1K-JPG_Color.jpg', normalMapUrl: '/textures/leather/Leather034A_1K-JPG/Leather034A_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/leather/Leather034A_1K-JPG/Leather034A_1K-JPG_Roughness.jpg' },
    'leather-035a': { color: '#B08860', roughness: 0.52, metalness: 0, repeatScale: 3, category: 'leather', domains: ['wall', 'floor', 'door', 'furniture'], textureUrl: '/textures/leather/Leather035A_1K-JPG/Leather035A_1K-JPG_Color.jpg', normalMapUrl: '/textures/leather/Leather035A_1K-JPG/Leather035A_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/leather/Leather035A_1K-JPG/Leather035A_1K-JPG_Roughness.jpg' },
    'leather-035c': { color: '#5C3E2E', roughness: 0.44, metalness: 0, repeatScale: 3, category: 'leather', domains: ['wall', 'floor', 'door', 'furniture'], textureUrl: '/textures/leather/Leather035C_1K-JPG/Leather035C_1K-JPG_Color.jpg', normalMapUrl: '/textures/leather/Leather035C_1K-JPG/Leather035C_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/leather/Leather035C_1K-JPG/Leather035C_1K-JPG_Roughness.jpg' },
    'leather-037': { color: '#2C2420', roughness: 0.38, metalness: 0, repeatScale: 3, category: 'leather', domains: ['wall', 'floor', 'door', 'furniture'], textureUrl: '/textures/leather/Leather037_1K-JPG/Leather037_1K-JPG_Color.jpg', normalMapUrl: '/textures/leather/Leather037_1K-JPG/Leather037_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/leather/Leather037_1K-JPG/Leather037_1K-JPG_Roughness.jpg' },

    // ── Metal ────────────────────────────────────────────────────────────
    'metal-corrugated': { color: '#9AA0A6', roughness: 0.3, metalness: 0.8, repeatScale: 3, category: 'metal', domains: ['wall', 'stairs', 'floor', 'door'], textureUrl: '/textures/metal/CorrugatedSteel009_1K-JPG/CorrugatedSteel009_1K-JPG_Color.jpg', normalMapUrl: '/textures/metal/CorrugatedSteel009_1K-JPG/CorrugatedSteel009_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/metal/CorrugatedSteel009_1K-JPG/CorrugatedSteel009_1K-JPG_Roughness.jpg' },
    'metal-brushed': { color: '#B4B8BC', roughness: 0.2, metalness: 0.9, repeatScale: 2, category: 'metal', domains: ['wall', 'stairs', 'floor', 'door'], textureUrl: '/textures/metal/Metal050A_1K-JPG/Metal050A_1K-JPG_Color.jpg', normalMapUrl: '/textures/metal/Metal050A_1K-JPG/Metal050A_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/metal/Metal050A_1K-JPG/Metal050A_1K-JPG_Roughness.jpg' },
    'metal-panel-056c': { color: '#8E969C', roughness: 0.28, metalness: 0.82, repeatScale: 2, category: 'metal', domains: ['wall', 'stairs'], textureUrl: '/textures/metal/Metal056C_1K-JPG/Metal056C_1K-JPG_Color.jpg', normalMapUrl: '/textures/metal/Metal056C_1K-JPG/Metal056C_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/metal/Metal056C_1K-JPG/Metal056C_1K-JPG_Roughness.jpg' },

    // ── Fabric / carpet ──────────────────────────────────────────────────
    fabric: { color: '#B8A898', roughness: 0.98, metalness: 0, repeatScale: 10, category: 'fabric', domains: ['floor', 'stairs', 'wall', 'furniture', 'door'], textureUrl: '/textures/Fabric049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Fabric049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Fabric049_1K-JPG_Roughness.jpg' },
    'fabric-1': { color: '#C4B8A8', roughness: 0.96, metalness: 0, repeatScale: 1, category: 'fabric', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/Fabric049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Fabric049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Fabric049_1K-JPG_Roughness.jpg' },
    'fabric-fine-weave': { color: '#C4B8A8', roughness: 0.96, metalness: 0, repeatScale: 10, category: 'fabric', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/fabric/Fabric061_1K-JPG/Fabric061_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric061_1K-JPG/Fabric061_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric061_1K-JPG/Fabric061_1K-JPG_Roughness.jpg' },
    'carpet-plush': { color: '#B8ACA0', roughness: 0.98, metalness: 0, repeatScale: 12, category: 'fabric', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/fabric/Carpet001_1K-JPG/Carpet001_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Carpet001_1K-JPG/Carpet001_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Carpet001_1K-JPG/Carpet001_1K-JPG_Roughness.jpg' },
    'carpet-woven': { color: '#A89A88', roughness: 0.95, metalness: 0, repeatScale: 12, category: 'fabric', domains: ['floor', 'stairs', 'wall', 'door'], textureUrl: '/textures/fabric/Carpet015_1K-JPG/Carpet015_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Carpet015_1K-JPG/Carpet015_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Carpet015_1K-JPG/Carpet015_1K-JPG_Roughness.jpg' },
    'fabric-panel-blue': { color: '#8A9AB0', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric045_1K-JPG/Fabric045_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric045_1K-JPG/Fabric045_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric045_1K-JPG/Fabric045_1K-JPG_Roughness.jpg' },
    'fabric-panel-tan': { color: '#C9B8A0', roughness: 0.92, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric028_1K-JPG/Fabric028_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric028_1K-JPG/Fabric028_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric028_1K-JPG/Fabric028_1K-JPG_Roughness.jpg' },
    'fabric-panel-018': { color: '#B8A898', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric018_1K-JPG/Fabric018_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric018_1K-JPG/Fabric018_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric018_1K-JPG/Fabric018_1K-JPG_Roughness.jpg' },
    'fabric-panel-022': { color: '#A89888', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric022_1K-JPG/Fabric022_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric022_1K-JPG/Fabric022_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric022_1K-JPG/Fabric022_1K-JPG_Roughness.jpg' },
    'fabric-panel-023': { color: '#C4B4A4', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric023_1K-JPG/Fabric023_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric023_1K-JPG/Fabric023_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric023_1K-JPG/Fabric023_1K-JPG_Roughness.jpg' },
    'fabric-panel-026': { color: '#9A8A7A', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric026_1K-JPG/Fabric026_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric026_1K-JPG/Fabric026_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric026_1K-JPG/Fabric026_1K-JPG_Roughness.jpg' },
    'fabric-panel-048': { color: '#D0C0AC', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric048_1K-JPG/Fabric048_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric048_1K-JPG/Fabric048_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric048_1K-JPG/Fabric048_1K-JPG_Roughness.jpg' },
    'fabric-panel-054': { color: '#B0A090', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric054_1K-JPG/Fabric054_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric054_1K-JPG/Fabric054_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric054_1K-JPG/Fabric054_1K-JPG_Roughness.jpg' },
    'fabric-panel-055': { color: '#CCC0B0', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric055_1K-JPG/Fabric055_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric055_1K-JPG/Fabric055_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric055_1K-JPG/Fabric055_1K-JPG_Roughness.jpg' },
    'fabric-panel-063': { color: '#A4948A', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric063_1K-JPG/Fabric063_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric063_1K-JPG/Fabric063_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric063_1K-JPG/Fabric063_1K-JPG_Roughness.jpg' },
    'fabric-panel-066': { color: '#BCAC9C', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric066_1K-JPG/Fabric066_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric066_1K-JPG/Fabric066_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric066_1K-JPG/Fabric066_1K-JPG_Roughness.jpg' },
    'fabric-panel-076': { color: '#C8B8A8', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric076_1K-JPG/Fabric076_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric076_1K-JPG/Fabric076_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric076_1K-JPG/Fabric076_1K-JPG_Roughness.jpg' },
    'fabric-panel-077': { color: '#948474', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric077_1K-JPG/Fabric077_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric077_1K-JPG/Fabric077_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric077_1K-JPG/Fabric077_1K-JPG_Roughness.jpg' },
    'fabric-panel-079': { color: '#D4C8B8', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric079_1K-JPG/Fabric079_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric079_1K-JPG/Fabric079_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric079_1K-JPG/Fabric079_1K-JPG_Roughness.jpg' },
    'fabric-panel-083': { color: '#AC9C8C', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'floor', 'furniture'], textureUrl: '/textures/fabric/Fabric083_1K-JPG/Fabric083_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric083_1K-JPG/Fabric083_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric083_1K-JPG/Fabric083_1K-JPG_Roughness.jpg' },

    'wicker-007b': { color: '#B89968', roughness: 0.85, metalness: 0, repeatScale: 2, category: 'wicker', domains: ['furniture', 'wall', 'door', 'outdoor'], textureUrl: '/textures/wicker/Wicker007B_1K-JPG/Wicker007B_1K-JPG_Color.jpg', normalMapUrl: '/textures/wicker/Wicker007B_1K-JPG/Wicker007B_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wicker/Wicker007B_1K-JPG/Wicker007B_1K-JPG_Roughness.jpg' },
    'wicker-008a': { color: '#C4A574', roughness: 0.85, metalness: 0, repeatScale: 2, category: 'wicker', domains: ['furniture', 'wall', 'door', 'outdoor'], textureUrl: '/textures/wicker/Wicker008A_1K-JPG/Wicker008A_1K-JPG_Color.jpg', normalMapUrl: '/textures/wicker/Wicker008A_1K-JPG/Wicker008A_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wicker/Wicker008A_1K-JPG/Wicker008A_1K-JPG_Roughness.jpg' },
    'wicker-009a': { color: '#A8895C', roughness: 0.85, metalness: 0, repeatScale: 2, category: 'wicker', domains: ['furniture', 'wall', 'door', 'outdoor'], textureUrl: '/textures/wicker/Wicker009A_1K-JPG/Wicker009A_1K-JPG_Color.jpg', normalMapUrl: '/textures/wicker/Wicker009A_1K-JPG/Wicker009A_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wicker/Wicker009A_1K-JPG/Wicker009A_1K-JPG_Roughness.jpg' },
    'wicker-010a': { color: '#D4B888', roughness: 0.85, metalness: 0, repeatScale: 2, category: 'wicker', domains: ['furniture', 'wall', 'door', 'outdoor'], textureUrl: '/textures/wicker/Wicker010A_1K-JPG/Wicker010A_1K-JPG_Color.jpg', normalMapUrl: '/textures/wicker/Wicker010A_1K-JPG/Wicker010A_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wicker/Wicker010A_1K-JPG/Wicker010A_1K-JPG_Roughness.jpg' },
    'wicker-010b': { color: '#9C7C50', roughness: 0.85, metalness: 0, repeatScale: 2, category: 'wicker', domains: ['furniture', 'wall', 'door', 'outdoor'], textureUrl: '/textures/wicker/Wicker010B_1K-JPG/Wicker010B_1K-JPG_Color.jpg', normalMapUrl: '/textures/wicker/Wicker010B_1K-JPG/Wicker010B_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wicker/Wicker010B_1K-JPG/Wicker010B_1K-JPG_Roughness.jpg' },

    // ── Glass & Miscellaneous ───────────────────────────────────────────
    glass_frosted: { color: '#C8D8E4', roughness: 0.3, metalness: 0, repeatScale: 1, category: 'glass', domains: ['door'] },
    glass_clear: { color: '#B8D0E0', roughness: 0.05, metalness: 0, repeatScale: 1, category: 'glass', domains: ['door'] },
    plaster: { color: '#D8D0C8', roughness: 0.88, metalness: 0, repeatScale: 8, category: 'solid', domains: ['floor'], textureUrl: '/textures/Plaster001_1K-JPG_Color.jpg', normalMapUrl: '/textures/Plaster001_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Plaster001_1K-JPG_Roughness.jpg' },

    grass: {
        color: '#B8A878', roughness: 0.98, metalness: 0, repeatScale: 1, category: 'outdoor',
        domains: ['floor', 'furniture', 'door', 'outdoor'], textureUrl: '/textures/outdoor/Grass005_1K-JPG/Grass005_1K-JPG_Color.jpg', normalMapUrl: '/textures/outdoor/Grass005_1K-JPG/Grass005_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/outdoor/Grass005_1K-JPG/Grass005_1K-JPG_Roughness.jpg'
    },
    'pave-stone': {
        color: '#B8A898', roughness: 0.98, metalness: 0, repeatScale: 1, category: 'outdoor',
        domains: ['floor', 'furniture', 'door', 'outdoor'], textureUrl: '/textures/outdoor/PavingStones149_1K-JPG/PavingStones149_1K-JPG_Color.jpg', normalMapUrl: '/textures/outdoor/PavingStones149_1K-JPG/PavingStones149_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/outdoor/PavingStones149_1K-JPG/PavingStones149_1K-JPG_Roughness.jpg'
    },
    'bamboo': {
        color: '#B8A898', roughness: 0.98, metalness: 0, repeatScale: 1, category: 'outdoor',
        domains: ['floor', 'furniture', 'door', 'outdoor'], textureUrl: '/textures/outdoor/Bamboo001C_1K-JPG/Bamboo001C_1K-JPG_Color.jpg', normalMapUrl: '/textures/outdoor/Bamboo001C_1K-JPG/Bamboo001C_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/outdoor/Bamboo001C_1K-JPG/Bamboo001C_1K-JPG_Roughness.jpg'
    },
    ...TILE_MATERIALS
}




export function getMaterialsForDomain(domain: MaterialDomain): { key: string; def: MaterialDef }[] {
    return Object.entries(MATERIAL_REGISTRY)
        .filter(([, def]) => def.domains.includes(domain))
        .map(([key, def]) => ({ key, def }))
}

export function getMaterialsByCategory(domain: MaterialDomain): Record<MaterialCategory, { key: string; def: MaterialDef }[]> {
    const items = getMaterialsForDomain(domain)
    const grouped = {} as Record<MaterialCategory, { key: string; def: MaterialDef }[]>
    for (const item of items) {
        (grouped[item.def.category] ??= []).push(item)
    }
    return grouped
}


export interface EditorOpening {
    id: string
    roomId: string
    wall: 'north' | 'south' | 'east' | 'west'
    type: 'door' | 'window' | 'opening'
    variant: string
    position: number
    width: number
    height: number
    sillHeight: number
    swingDirection: 'inward' | 'outward'
    segmentNodeIds?: string[]
    segmentT?: number
    material?: DoorStyle
    isOpen?: boolean
    openAmount?: number
    bayPanelCount?: number   // defaults to 3
    bayDoorIndex?: number
}

export type DoorMaterial = 'wood_oak' | 'wood_dark' | 'wood_white' | 'glass_frosted' | 'glass_clear' | 'metal_steel' | 'panel_white'

export type DoorStyle =
    | 'wood_oak'
    | 'wood_dark'
    | 'wood_white'
    | 'glass_frosted'
    | 'glass_clear'
    | 'metal_steel'
    | 'panel_white'

export type FloorPlanState = {
    rooms: EditorRoom[]; openings: EditorOpening[]; roomHeight: number
    lineNodes: LineNode[]; lineSegments: LineSegment[]; closedShapes: ClosedShape[]
    annotations: Annotation[]
    furniture: PlacedFurniture[]
    stairs: PlacedStairs[]   // ← new
    wallDecor: PlacedWallDecor[],
    lights: PlacedLight[],
    outdoorObjects: PlacedOutdoorObject[],
    savedViews: CameraView[]

}

export const DEFAULT_FP: FloorPlanState = {
    rooms: [], openings: [], roomHeight: 2.7,
    lineNodes: [], lineSegments: [], closedShapes: [],
    annotations: [],
    furniture: [],
    stairs: [],   // ← new
    wallDecor: [],
    lights: [],
    outdoorObjects: [],
    savedViews: []
}

export const STAIRS_FOOTPRINTS: Record<StairsType, { w: number; d: number }> = {
    'stairs-straight': { w: 1.0, d: 3.2 },
    'stairs-l': { w: 2.4, d: 2.4 },
    'stairs-u': { w: 2.4, d: 2.8 },
    'stairs-spiral': { w: 1.8, d: 1.8 },
    'stairs-ramp': { w: 1.2, d: 4.0 },
    elevator: { w: 1.6, d: 1.6 },
}

export const STAIRS_LABELS: Record<StairsType, string> = {
    'stairs-straight': 'Stairs', 'stairs-l': 'L-Stairs', 'stairs-u': 'U-Stairs',
    'stairs-spiral': 'Spiral', 'stairs-ramp': 'Ramp', elevator: 'Elevator',
}

export type EditorRoom = {
    id: string
    x: number
    z: number
    width: number
    depth: number
    label: string
}

export type LineNode = {
    id: string
    x: number
    z: number
}

export type LineSegment = {
    id: string
    nodeIds: string[]
    thickness: number
    closed: boolean
    wallType?: WallType
    height?: number
}


export type ClosedShape = {
    id: string
    nodeIds: string[]
    label?: string
    color?: string
    floorMaterial?: FloorMaterial
    wallMaterial?: WallMaterial
    wallOverrides?: Record<string, {
        color?: string
        material?: WallMaterial
        exteriorColor?: string
        exteriorMaterial?: WallMaterial
    }>
    exteriorWallMaterial?: WallMaterial
    exteriorWallColor?: string
    wallMaterialSide?: 'interior' | 'exterior' | 'both'

}

export type Annotation = { id: string; x: number; z: number; text: string; fontSize: number }



export const FLOOR_MATERIALS: { id: FloorMaterial; label: string; preview: string; roughness: number; color: string }[] = [
    { id: 'plain', label: 'Plain', preview: '🪵', roughness: 0.7, color: '#C8A878' },
    { id: 'wood', label: 'Wood', preview: '🪵', roughness: 0.7, color: '#C8A878' },
    { id: 'marble', label: 'Marble', preview: '⬜', roughness: 0.12, color: '#EAE6E0' },
    { id: 'concrete', label: 'Concrete', preview: '🩶', roughness: 0.92, color: '#A8A8A8' },
    { id: 'tiles', label: 'Tiles', preview: '🔲', roughness: 0.3, color: '#D4D0C8' },
    { id: 'fabric', label: 'Fabric', preview: '🟫', roughness: 0.98, color: '#B8A898' },
    { id: 'plaster', label: 'Plaster', preview: '🟪', roughness: 0.88, color: '#D8D0C8' },
    { id: 'tile-ceramic', label: 'Ceramic Tile', preview: '🔲', roughness: 0.1, color: '#F0F0F0' },
    { id: 'brick-red', label: 'Red Brick', preview: '🧱', roughness: 0.85, color: '#A85C42' },
    { id: 'brick-white', label: 'White Brick', preview: '🧱', roughness: 0.82, color: '#D8D2C4' },
]

export interface ToolLeaf {
    id: EditorTool
    label: string
    key?: string       // keyboard shortcut, only primary ones get one
    icon: React.ReactNode
}

export interface ToolGroup {
    id: string
    label: string       // shown as flyout header
    leaves: ToolLeaf[]
}

// In ToolConfig.tsx, alongside TOOL_GROUPS
export const KEY_TO_DEFAULT_TOOL: Record<string, EditorTool> = {
    v: 'select',
    h: 'pan',
    r: 'room',
    l: 'line',
    b: 'bend',
    d: 'door-swing-single',
    n: 'window-fixed',
    s: 'stairs-straight',
    a: 'annotate',
    f: 'furniture',
}


import type React from 'react'

// ── Shared cursor constants ──
const DOOR_WINDOW_CURSOR = 'crosshair' // keep your existing value/URL here

// ── Small helper for stroke-based icons (same as your old `S`) ──
function S(children: React.ReactNode): React.ReactNode {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {children}
        </svg>
    )
}

// ── Single source of truth ──
// Add a new tool by adding ONE entry here. `EditorTool` is derived from these keys,
// so the type, cursor map, and icon map can never drift out of sync again.
export const TOOL_CONFIG = {
    select: { cursor: 'default', icon: S(<path d="M5 3l14 9-7 1-4 7z" />) },
    pan: {
        cursor: 'grab',
        icon: S(<>
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3" />
            <path d="M3 12h18M12 3v18" />
        </>),
    },
    room: { cursor: 'crosshair', icon: S(<rect x="3" y="3" width="18" height="18" rx="1" />) },
    pencil: {
        cursor: 'crosshair',
        icon: S(<>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </>),
    },
    line: {
        cursor: 'crosshair',
        icon: S(<>
            <line x1="4" y1="20" x2="20" y2="4" strokeWidth="2.5" />
            <circle cx="4" cy="20" r="2" fill="currentColor" />
            <circle cx="20" cy="4" r="2" fill="currentColor" />
        </>),
    },
    bend: {
        cursor: 'crosshair',
        icon: S(<>
            <path d="M4 20 Q12 4 20 20" strokeWidth="2.5" />
            <circle cx="4" cy="20" r="2" fill="currentColor" />
            <circle cx="20" cy="20" r="2" fill="currentColor" />
            <circle cx="12" cy="8" r="2" fill="currentColor" />
        </>),
    },

    // ── Doors ──
    'door-swing-single': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="3" y="3" width="13" height="18" rx="1" />
            <path d="M16 7h4M3 21h18M3 3h18" />
            <path d="M8 12 Q8 8 12 8" strokeDasharray="2 1" />
        </>),
    },
    'door-swing-double': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="3" width="9" height="18" rx="1" />
            <rect x="13" y="3" width="9" height="18" rx="1" />
            <path d="M11 12 Q11 8 15 8M11 12 Q11 8 7 8" strokeDasharray="2 1" />
        </>),
    },
    'door-sliding': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="4" width="20" height="16" rx="1" />
            <path d="M2 12h9" strokeWidth="2.5" />
            <path d="M13 12h9" strokeDasharray="3 2" />
            <path d="M6 9l-2 3 2 3" />
        </>),
    },
    // NEW — 4-panel telescoping slider (distinct icon: 4 vertical leaves + double-headed slide arrow)
    'door-sliding-panorama': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="4" width="20" height="16" rx="1" />
            <path d="M2 4v16M7 4v16M12 4v16M17 4v16M22 4v16" strokeDasharray="1.5 3" />
            <path d="M5 12l-2.5 3M19 12l2.5 3" />
        </>),
    },
    'door-pocket': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="4" width="20" height="16" rx="1" />
            <path d="M4 12h7" strokeWidth="2.5" />
            <rect x="15" y="9" width="5" height="6" strokeDasharray="1.5 1.5" />
        </>),
    },
    'door-folding': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="3" width="20" height="18" rx="1" />
            <path d="M6 3v18M10 3v18M14 3v18M18 3v18" strokeDasharray="2 1.5" />
        </>),
    },
    'door-garage': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="4" width="20" height="16" rx="1" />
            <path d="M2 8h20M2 12h20M2 16h20" />
        </>),
    },

    // ── Windows ──
    'window-fixed': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="6" width="20" height="12" rx="1" />
            <line x1="12" y1="6" x2="12" y2="18" />
            <line x1="2" y1="12" x2="22" y2="12" />
        </>),
    },
    'window-sliding': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="6" width="20" height="12" rx="1" />
            <line x1="12" y1="6" x2="12" y2="18" />
            <path d="M4 12h5M15 12h5" strokeDasharray="1.5 1.5" />
        </>),
    },
    'window-casement': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="6" width="20" height="12" rx="1" />
            <path d="M12 6 L4 12 L12 6 L20 12" />
        </>),
    },
    'window-bay': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <path d="M4 18 L4 10 L9 6 L15 6 L20 10 L20 18" />
            <path d="M4 18h16M9 6v12M15 6v12" />
        </>),
    },
    'window-skylight': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="4" y="4" width="16" height="16" rx="1" transform="rotate(20 12 12)" />
            <line x1="12" y1="4" x2="12" y2="20" transform="rotate(20 12 12)" />
        </>),
    },

    // ── Openings ──
    'opening-archway': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <path d="M4 21V10a8 8 0 0 1 16 0v11" />
            <path d="M4 21h16" />
        </>),
    },
    'opening-passage': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <path d="M4 3v18M20 3v18" strokeDasharray="3 2" />
            <path d="M4 21h16" opacity="0.4" />
        </>),
    },

    // ── Stairs / vertical circulation ──
    'stairs-straight': { cursor: 'crosshair', icon: S(<path d="M3 21v-3h3v-3h3v-3h3v-3h3v-3h3V3" />) },
    'stairs-l': { cursor: 'crosshair', icon: S(<path d="M3 21v-6h6v-6h9V3" />) },
    'stairs-u': { cursor: 'crosshair', icon: S(<path d="M4 3v6h6v6h-6v6M14 21v-6h6V3" />) },
    'stairs-spiral': {
        cursor: 'crosshair',
        icon: S(<>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 6.36 15.36M12 21a9 9 0 0 1-6.36-15.36" strokeDasharray="2 2" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </>),
    },
    'stairs-ramp': {
        cursor: 'crosshair',
        icon: S(<>
            <path d="M3 21h18" />
            <path d="M3 21L15 5h6" />
        </>),
    },
    elevator: {
        cursor: 'crosshair',
        icon: S(<>
            <rect x="4" y="2" width="16" height="20" rx="1" />
            <path d="M12 8l-3 3h6l-3-3zM12 16l3-3H9l3 3z" />
        </>),
    },

    delete: {
        cursor: 'not-allowed',
        icon: S(<>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </>),
    },
    annotate: { cursor: 'crosshair', icon: S(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />) },
    furniture: {
        cursor: 'copy',
        icon: S(<>
            <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" />
            <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z" />
            <path d="M6 19v2M18 19v2" />
        </>),
    },

    'wall-decor-led': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="2" y="9" width="20" height="4" rx="1" />
            <line x1="2" y1="11" x2="22" y2="11" strokeDasharray="1 2" strokeWidth="1" />
        </>),
    },
    'wall-decor-pvc': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="3" y="3" width="18" height="18" rx="1" />
            <line x1="7" y1="3" x2="7" y2="21" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="17" y1="3" x2="17" y2="21" />
        </>),
    },
    'wall-decor-painting': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="3" y="3" width="18" height="18" rx="1" />
            <circle cx="9" cy="9" r="2" />
            <path d="M21 15l-5-5-8 8" />
        </>),
    },
    led_tv: {
        cursor: 'default',
        icon: S(<>
            <rect x="2" y="5" width="20" height="13" rx="1.5" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="18" x2="12" y2="21" />
        </>),
    },

    // ── Lighting ──
    'light-ceiling-pendant': {
        cursor: 'default',
        icon: S(<>
            <path d="M12 2v6" />
            <path d="M7 8h10l-2 6H9l-2-6z" />
            <circle cx="12" cy="17" r="2.5" fill="currentColor" opacity="0.3" />
        </>),
    },
    'light-ceiling-recessed': {
        cursor: 'default',
        icon: S(<>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
        </>),
    },
    'light-floor-lamp': {
        cursor: 'default',
        icon: S(<>
            <path d="M12 2l5 7H7l5-7z" />
            <line x1="12" y1="9" x2="12" y2="19" />
            <path d="M8 22h8" />
            <path d="M10 19h4" />
        </>),
    },
    'light-wall-sconce': {
        cursor: 'default',
        icon: S(<>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v4M12 18v4" strokeDasharray="1 1" opacity="0.5" />
            <path d="M4 4l2 2M20 4l-2 2M4 20l2-2M20 20l-2-2" strokeWidth="1.5" opacity="0.6" />
        </>),
    },
    'light-track': {
        cursor: 'default',
        icon: S(<>
            <path d="M3 6h18" />
            <path d="M7 6v3M12 6v3M17 6v3" />
            <path d="M6 9l1.5 3M12 9l0 3M18 9l-1.5 3" />
        </>),
    },
    'light-chandelier': {
        cursor: 'default',
        icon: S(<>
            <path d="M12 3v3" />
            <circle cx="12" cy="10" r="4" />
            <path d="M9 13l-2 5M15 13l2 5M12 13v5M6 16h12" />
        </>),
    },
    'light-shelf-strip': {
        cursor: DOOR_WINDOW_CURSOR,
        icon: S(<>
            <rect x="3" y="10" width="18" height="4" rx="1" />
            <path d="M5 14v2M19 14v2" />
        </>),
    },
    'light-spotlight': {
        cursor: 'default',
        icon: S(<>
            <path d="M9 3h6l2 5H7l2-5z" />
            <path d="M9 8l3 13 3-13" />
        </>),
    },
    'light-string': {
        cursor: 'crosshair',
        icon: S(<>
            <path d="M3 6c4 6 14 6 18 0" />
            <circle cx="7" cy="9" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="12" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="17" cy="9" r="1.3" fill="currentColor" stroke="none" />
        </>),
    },
    'light-outdoor-bollard': {
        cursor: 'default',
        icon: S(<>
            <rect x="9" y="4" width="6" height="12" rx="1" />
            <path d="M6 20h12M8 16v4M16 16v4" />
        </>),
    },

    // ── Outdoor ──
    'outdoor-crosswalk': { cursor: 'crosshair', icon: S(<path d="M4 20L8 4M10 20L14 4M16 20L20 4" />) },
    'outdoor-dustbin': {
        cursor: 'crosshair',
        icon: S(<path d="M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" />),
    },
    'outdoor-bench': { cursor: 'crosshair', icon: S(<path d="M3 11h18M5 11v7M19 11v7M8 11V6h8v5" />) },
    'outdoor-mailbox': {
        cursor: 'crosshair',
        icon: S(<>
            <path d="M3 12a5 5 0 015-5h9a4 4 0 010 8H8a5 5 0 01-5-5z" />
            <path d="M8 7v10M4 17h16" />
        </>),
    },

    presets: {
        cursor: 'default', // opens a panel, doesn't draw on canvas
        icon: S(<>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </>),
    },
    'template-place': {
        cursor: 'copy', // armed placement, mirrors 'furniture'
        icon: S(<path d="M12 2l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1.5z" />),
    },
} as const satisfies Record<string, { cursor: string; icon: React.ReactNode }>

// ── Derived type — the ONLY place `EditorTool` is defined now ──
export type EditorTool = keyof typeof TOOL_CONFIG

// ── Derived maps for drop-in compatibility with existing call sites ──
export const TOOL_CURSORS: Record<EditorTool, string> =
    Object.fromEntries(Object.entries(TOOL_CONFIG).map(([k, v]) => [k, v.cursor])) as Record<EditorTool, string>

export const ICONS: Record<EditorTool, React.ReactNode> =
    Object.fromEntries(Object.entries(TOOL_CONFIG).map(([k, v]) => [k, v.icon])) as Record<EditorTool, React.ReactNode>

// ── Tool groups (drives the toolbar layout) ────────────────────────────────

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
    ambientIntensity: 1.5,
    wallRoughness: 0.85,
    wallTextured: false,
    showFurniture: true,
    showLabels: true,
    fogEnabled: false,
    doorStyle: 'glass_clear',
    globalFloorMaterial: 'plain',
    globalWallMaterial: 'paint',
    rooms: [],
    lights: []
}

export const WALL_COLORS = [
    '#F5F0E8', '#E8E0D0', '#D4C4A0', '#C8B898',
    '#E8D5C0', '#D4B896', '#F0E8D8', '#8B7B6B',
    '#B8D4C8', '#A0C4B8', '#C8D4E8', '#A0B4D0',
    '#E8C8C8', '#D4A8A8', '#C8E8C8', '#A8D4A8',
    '#FFFFFF', '#F0F0F0', '#D0D0D0', '#A0A0A0',
]

export const TEXTURE_BASE = '/textures'

export const FLOOR_TEXTURE_URLS: Partial<Record<Exclude<FloorMaterial, 'plain'>, {
    map: string; normalMap: string; roughnessMap: string; repeat: number
    roughness: number; metalness: number
}>> = {
    wood: {
        map: `${TEXTURE_BASE}/Wood049_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Wood049_1K-JPG_Roughness.jpg`,
        repeat: 3, roughness: 0.72, metalness: 0.0,
    },
    // ── ADDED: New Wood Variants ───────────────────────────────────
    'wood-oak': {
        map: `${TEXTURE_BASE}/Wood049_1K-JPG_Color.jpg`, // Swap out file if distinct oak image exists
        normalMap: `${TEXTURE_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Wood049_1K-JPG_Roughness.jpg`,
        repeat: 3, roughness: 0.70, metalness: 0.0,
    },
    'wood-walnut': {
        map: `${TEXTURE_BASE}/Wood049_1K-JPG_Color.jpg`, // Swap out file if distinct walnut image exists
        normalMap: `${TEXTURE_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Wood049_1K-JPG_Roughness.jpg`,
        repeat: 3, roughness: 0.65, metalness: 0.0, // slightly glossier roughness adjustments
    },
    marble: {
        map: `${TEXTURE_BASE}/Marble022_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Marble022_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Marble022_1K-JPG_Roughness.jpg`,
        repeat: 1.5, roughness: 0.18, metalness: 0.04,
    },
    // ── ADDED: New Marble Variants ─────────────────────────────────
    'marble-white': {
        map: `${TEXTURE_BASE}/marble/Marble022_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/marble/Marble022_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/marble/Marble022_1K-JPG_Roughness.jpg`,
        repeat: 1.5, roughness: 0.15, metalness: 0.04,
    },
    'marble-black': {
        map: `${TEXTURE_BASE}/marble/Marble022_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/marble/Marble022_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/marble/Marble022_1K-JPG_Roughness.jpg`,
        repeat: 1.5, roughness: 0.22, metalness: 0.06,
    },
    concrete: {
        map: `${TEXTURE_BASE}/Concrete025_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/concrete/Concrete025_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/concrete/Concrete025_1K-JPG_Roughness.jpg`,
        repeat: 2, roughness: 0.92, metalness: 0.0,
    },
    tiles: {
        map: `${TEXTURE_BASE}/tiles/Tiles101_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/tiles/Tiles101_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/tiles/Tiles101_Roughness.jpg`,
        repeat: 2, roughness: 0.30, metalness: 0.04,
    },
    // ── ADDED: New Tile Variants ───────────────────────────────────
    'tile-ceramic': {
        map: `${TEXTURE_BASE}/tiles/Tiles101_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/tiles/Tiles101_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/tiles/Tiles101_Roughness.jpg`,
        repeat: 2, roughness: 0.25, metalness: 0.02,
    },
    fabric: {
        map: `${TEXTURE_BASE}/Fabric049_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/fabric/Fabric049_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/fabric/Fabric049_1K-JPG_Roughness.jpg`,
        repeat: 4, roughness: 0.97, metalness: 0.0,
    },
    plaster: {
        map: `${TEXTURE_BASE}/Plaster001_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Plaster001_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Plaster001_1K-JPG_Roughness.jpg`,
        repeat: 2, roughness: 0.88, metalness: 0.0,
    },
}

export const WALL_TEXTURE_URLS = {
    normalMap: `${TEXTURE_BASE}/Plaster001_1K-JPG_NormalGL.jpg`,
    roughnessMap: `${TEXTURE_BASE}/Plaster001_1K-JPG_Roughness.jpg`,
}

// export const DOOR_TEXTURE_URLS: Record<DoorStyle, { map: string; normalMap: string; roughnessMap: string } | null> = {
//     wood_oak: {
//         map: `${TEXTURE_BASE}/Wood049_1K-JPG_Color.jpg`,
//         normalMap: `${TEXTURE_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
//         roughnessMap: `${TEXTURE_BASE}/Wood049_1K-JPG_Roughness.jpg`,
//     },
//     wood_dark: {
//         map: `${TEXTURE_BASE}/Wood049_1K-JPG_Color.jpg`,
//         normalMap: `${TEXTURE_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
//         roughnessMap: `${TEXTURE_BASE}/Wood049_1K-JPG_Roughness.jpg`,
//     },
//     wood_white: null,      // no texture — flat painted
//     glass_frosted: null,   // no texture — transparent
//     glass_clear: null,     // no texture — transparent
//     metal_steel: {
//         map: `${TEXTURE_BASE}/Metal032_1K-JPG_Color.jpg`,
//         normalMap: `${TEXTURE_BASE}/Metal032_1K-JPG_NormalGL.jpg`,
//         roughnessMap: `${TEXTURE_BASE}/Metal032_1K-JPG_Roughness.jpg`,
//     },
//     panel_white: null,     // no texture — flat painted
// }

// export const DOOR_STYLE_COLORS: Record<DoorStyle, string> = {
//     wood_oak: '#C8A878',
//     wood_dark: '#4A3220',
//     wood_white: '#F0EDE8',
//     glass_frosted: '#C8D8E4',
//     glass_clear: '#B8D0E0',
//     metal_steel: '#9AABB8',
//     panel_white: '#F5F2EE',
// }



export const GRID_M = 0.5
export const PX_PER_M = 40
export const MIN_ROOM = 1.0



export const OPENING_VARIANT_LABELS: Record<string, string> = {
    'door-swing-single': 'Single Swing Door',
    'door-swing-double': 'Double Swing Door',
    'door-sliding': 'Sliding Door',
    'door-pocket': 'Pocket Door',
    'door-folding': 'Bi-fold Door',
    'door-garage': 'Garage Door',
    'window-fixed': 'Fixed Window',
    'window-sliding': 'Sliding Window',
    'window-casement': 'Casement Window',
    'window-bay': 'Bay Window',
    'window-skylight': 'Skylight',
    'opening-archway': 'Archway',
    'opening-passage': 'Open Passage',
}

export type FurnitureCategory =
    | 'seating'
    | 'tables'
    | 'bedroom'
    | 'kitchen'
    | 'bathroom'
    | 'storage'
    | 'decor'
    | 'lighting'
    | 'wall'

export interface FurnitureCatalogEntry {
    type: FurnitureType
    label: string
    icon: string // lucide-react icon name, e.g. 'Sofa', 'Lamp', 'Armchair'
    category: FurnitureCategory
    isNew?: boolean
    newSince?: string // ISO date, e.g. '2026-07-01'
}

export const FURNITURE_CATALOG: FurnitureCatalogEntry[] = [
    { type: 'sofa', label: 'Sofa', icon: 'Sofa', category: 'seating' },
    { type: 'single_sofa', label: 'Armchair', icon: 'Armchair', category: 'seating' },
    { type: 'chair', label: 'Chair', icon: 'Armchair', category: 'seating' },
    { type: 'lounge_recliner', label: 'Recliner', icon: 'Armchair', category: 'seating' },
    { type: 'dining_table', label: 'Dining Table', icon: 'UtensilsCrossed', category: 'tables' },
    { type: 'desk', label: 'Desk', icon: 'Table2', category: 'tables' },
    { type: 'coffee_table', label: 'Coffee Table', icon: 'Table', category: 'tables' },
    { type: 'bed', label: 'Bed', icon: 'BedDouble', category: 'bedroom' },
    { type: 'wardrobe', label: 'Wardrobe', icon: 'DoorClosed', category: 'storage' },
    { type: 'shoe_rack', label: 'Shoe Rack', icon: 'AlignJustify', category: 'storage' },
    { type: 'commode', label: 'Commode', icon: 'Archive', category: 'storage' },
    { type: 'kitchen_stove', label: 'Stove', icon: 'Flame', category: 'kitchen' },
    { type: 'chimney', label: 'Chimney', icon: 'Wind', category: 'kitchen' },
    { type: 'bathtub', label: 'Bathtub', icon: 'Bath', category: 'bathroom' },
    { type: 'toilet', label: 'Toilet', icon: 'Toilet', category: 'bathroom' },
    { type: 'shower', label: 'Shower', icon: 'ShowerHead', category: 'bathroom' },
    { type: 'plant', label: 'Plant', icon: 'Flower2', category: 'decor' },
    { type: 'mirror', label: 'Mirror', icon: 'RectangleVertical', category: 'decor' },
    { type: 'painting', label: 'Painting', icon: 'Image', category: 'decor' },
    { type: 'lamp', label: 'Lamp', icon: 'Lamp', category: 'lighting' },
    { type: 'led_strip', label: 'LED Strip', icon: 'Sparkles', category: 'lighting', isNew: true, newSince: '2026-07-10' },
    { type: 'wall_panel_pvc', label: 'PVC Wall Panel', icon: 'PanelTop', category: 'wall', isNew: true, newSince: '2026-07-10' },
    {
        type: 'sofa_l',
        label: 'L-Shape Sofa',
        icon: 'Sofa',
        category: 'seating',
    },
    {
        type: 'bed_single',
        label: 'Single Bed',
        icon: 'BedSingle',
        category: 'bedroom',
    },
    {
        type: 'bed_double',
        label: 'Double Bed',
        icon: 'BedDouble',
        category: 'bedroom',
    },
    {
        type: 'bed_bunk',
        label: 'Bunk Bed',
        icon: 'Rows3',
        category: 'bedroom',
    },
    {
        type: 'dressing_table',
        label: 'Dressing Table',
        icon: 'Table2',
        category: 'bedroom',
    },
    {
        type: 'kitchen_cabinet_base',
        label: 'Base Cabinet',
        icon: 'Archive',
        category: 'kitchen',
    },
    {
        type: 'kitchen_cabinet_wall',
        label: 'Wall Cabinet',
        icon: 'PanelTop',
        category: 'kitchen',
    },
    {
        type: 'kitchen_countertop_slab',
        label: 'Countertop',
        icon: 'RectangleHorizontal',
        category: 'kitchen',
    },
    {
        type: 'kitchen_sink',
        label: 'Kitchen Sink',
        icon: 'Droplet',
        category: 'kitchen',
    },
    {
        type: 'kitchen_fridge',
        label: 'Fridge',
        icon: 'Refrigerator',
        category: 'kitchen',
    },
    {
        type: 'kitchen_island',
        label: 'Kitchen Island',
        icon: 'Table',
        category: 'kitchen',
    },
    {
        type: 'kitchen_dishwasher',
        label: 'Dishwasher',
        icon: 'WashingMachine',
        category: 'kitchen',
    },
    {
        type: 'kitchen_backsplash_panel',
        label: 'Backsplash',
        icon: 'Grid3x3',
        category: 'kitchen',
    },

]

export interface FurnitureMaterial {
    id: string
    label: string
    swatch: string // Hex color, image url, or gradient
}

// Helper function to check if a furniture type supports textures
export function supportsFurnitureTexture(type: string): boolean {
    const textureSupportedTypes = [
        'sofa',
        'chair',
        'desk',
        'bed',
        'table',
        'dining_table',
        'armchair'
    ] // Customize this array with types that support textures in your app
    return textureSupportedTypes.includes(type.toLowerCase())
}

export function getFurnitureByCategory(): Record<FurnitureCategory, FurnitureCatalogEntry[]> {
    return FURNITURE_CATALOG.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || []
        acc[item.category].push(item)
        return acc
    }, {} as Record<FurnitureCategory, FurnitureCatalogEntry[]>)
}

// Auto-expiring "new" check — treat an item as new for N days after
// `newSince`, falling back to the static `isNew` flag if no date is set.
export function isFurnitureNew(entry: FurnitureCatalogEntry, windowDays = 30): boolean {
    if (entry.newSince) {
        const since = new Date(entry.newSince).getTime()
        const ageDays = (Date.now() - since) / (1000 * 60 * 60 * 24)
        return ageDays <= windowDays
    }
    return !!entry.isNew
}

// ---------------------------------------------------------------------------
// Materials catalog — same "isNew" pattern for fabrics/textures/finishes,
// so a materials picker in the toolbar can badge freshly-added PBR sets.
// ---------------------------------------------------------------------------
export interface MaterialCatalogEntry {
    id: string
    label: string
    thumbnail: string // e.g. '/textures/fabric049/Fabric049_1K-JPG_Color.jpg'
    basePath: string  // folder prefix, e.g. '/textures/fabric049/Fabric049_1K-JPG'
    category: 'fabric' | 'wood' | 'stone' | 'metal' | 'concrete' | 'other'
    isNew?: boolean
    newSince?: string
}

export const MATERIAL_CATALOG: MaterialCatalogEntry[] = [
    {
        id: 'fabric049',
        label: 'Woven Fabric',
        thumbnail: '/textures/fabric049/Fabric049_1K-JPG_Color.jpg',
        basePath: '/textures/fabric049/Fabric049_1K-JPG',
        category: 'fabric',
        isNew: true,
        newSince: '2026-07-10',
    },
    {
        id: 'concrete025',
        label: 'Concrete',
        thumbnail: '/textures/concrete025/Concrete025.png',
        basePath: '/textures/concrete025/Concrete025',
        category: 'concrete',
    },
]

export function isMaterialNew(entry: MaterialCatalogEntry, windowDays = 30): boolean {
    if (entry.newSince) {
        const since = new Date(entry.newSince).getTime()
        const ageDays = (Date.now() - since) / (1000 * 60 * 60 * 24)
        return ageDays <= windowDays
    }
    return !!entry.isNew
}

export const FURNITURE_CATEGORIES: { id: FurnitureCategory; label: string; items: FurnitureType[] }[] = [
    { id: 'seating', label: 'Seating', items: ['sofa', 'single_sofa', 'chair', "lounge_recliner"] },
    { id: 'bedroom', label: 'Bedroom', items: ['bed', 'wardrobe'] },
    { id: 'tables', label: 'Tables', items: ['dining_table', 'coffee_table', 'desk'] },
    { id: 'storage', label: 'Storage', items: ['wardrobe', 'shoe_rack'] },
    { id: 'kitchen', label: 'Kitchen', items: ['kitchen_stove', 'chimney'] },
    { id: 'bathroom', label: 'Bathroom', items: ['bathtub', 'toilet', 'commode', 'shower'] },
    { id: 'decor', label: 'Decor', items: ['plant', 'lamp', 'mirror', 'led_strip', 'wall_panel_pvc', 'painting'] },
]


export type WallDecorType = 'led_strip' | 'wall_panel_pvc' | 'painting' | "led_tv"

export type PlacedWallDecor = {
    id: string
    type: WallDecorType
    roomId: string
    wall?: 'north' | 'south' | 'east' | 'west'
    position: number
    segmentNodeIds?: string[]
    segmentT?: number
    heightOffset: number
    width: number
    rotation?: number
    scale: number
    facingInward?: boolean
}

export const WALL_DECOR_LABELS: Record<WallDecorType, string> = {
    led_strip: 'LED Strip',
    wall_panel_pvc: 'PVC Wall Panel',
    painting: 'Painting',
    led_tv: "Led TV"
}

export const WALL_DECOR_DEFAULTS: Record<WallDecorType, { width: number; heightOffset: number }> = {
    led_strip: { width: 1.2, heightOffset: 2.4 },
    wall_panel_pvc: { width: 1.2, heightOffset: 0.0 },
    painting: { width: 0.9, heightOffset: 1.5 },
    led_tv: { width: 1.2, heightOffset: 1.3 }
}

export type FloorMaterial =
    | 'plain' | 'solid-white' | 'solid-gray' | 'solid-black' | 'solid-beige'   // solid colors
    | 'wood' | 'wood-oak' | 'wood-walnut' | 'wood-floor-herringbone'
    | 'marble' | 'marble-white' | 'marble-black' | 'marble-onyx' | 'marble-travertine' | 'marble-white-veined'
    | 'concrete' | 'concrete-polished' | 'tiles' | 'tile-ceramic'
    | 'brick-red' | 'brick-white'
    | 'fabric' | 'fabric-fine-weave' | 'carpet-plush' | 'carpet-woven'
    | 'plaster'

// New WallMaterial union
export type WallMaterial =
    | 'paint' | 'wallpaper-stripe' | 'wallpaper-floral' | 'wallpaper-textured'
    | 'pvc-panel-groove' | 'pvc-panel-brick'
    | 'brick-red' | 'brick-white' | 'exposed-brick'
    | 'tile-ceramic'
    | 'concrete-raw' | 'concrete-smooth'
    | 'fabric-panel-blue' | 'fabric-panel-tan'
    | 'fabric-panel-018' | 'fabric-panel-022' | 'fabric-panel-023' | 'fabric-panel-026'
    | 'fabric-panel-048' | 'fabric-panel-054' | 'fabric-panel-055' | 'fabric-panel-063'
    | 'fabric-panel-066' | 'fabric-panel-076' | 'fabric-panel-077' | 'fabric-panel-079'
    | 'fabric-panel-083'
    | 'marble-veined' | 'marble-onyx'
    | 'metal-corrugated' | 'metal-brushed' | 'metal-panel-056c'
    | 'wood-slat-oak' | 'wood-slat-dark'


// Global Definitions
export const WALL_MAT_DEFS: Record<string, MaterialDef> =
    Object.fromEntries(getMaterialsForDomain('wall').map(({ key, def }) => [key, def]))

export const FLOOR_MAT_DEFS: Record<string, MaterialDef> =
    Object.fromEntries(getMaterialsForDomain('floor').map(({ key, def }) => [key, def]))

export const WALL_MATERIALS = [
    { id: 'paint', label: 'Paint', swatch: '#FFFFFF' },
    { id: 'wallpaper-stripe', label: 'Stripe Wallpaper', swatch: '#E8E4DC' },
    { id: 'wallpaper-floral', label: 'Floral Wallpaper', swatch: '#F0E6E4' },
    { id: 'wallpaper-textured', label: 'Textured Wallpaper', swatch: '#EDEAE4' },
    { id: 'pvc-panel-groove', label: 'PVC Grooved Panel', swatch: '#E4DDCF' },
    { id: 'pvc-panel-brick', label: 'PVC Brick Panel', swatch: '#C9B8A8' },
    { id: 'brick-red', label: 'Red Brick', swatch: '#A85C42' },
    { id: 'brick-white', label: 'White Brick', swatch: '#D8D2C4' },
    { id: 'tile-ceramic', label: 'Ceramic Tile', swatch: '#F2F1EC' },
    { id: 'exposed-brick', label: 'Exposed Brick', swatch: '#8B5A44' },
    { id: 'concrete-raw', label: 'Raw Concrete', swatch: '#A8A6A0' },
    { id: 'concrete-smooth', label: 'Smooth Concrete', swatch: '#B0AEA8' },
    { id: 'fabric-panel-blue', label: 'Blue Fabric Panel', swatch: '#8A9AB0' },
    { id: 'fabric-panel-tan', label: 'Tan Fabric Panel', swatch: '#C9B8A0' },
    { id: 'marble-veined', label: 'Veined Marble', swatch: '#E8E4DC' },
    { id: 'marble-onyx', label: 'Onyx', swatch: '#3A3A3E' },
    { id: 'metal-corrugated', label: 'Corrugated Steel', swatch: '#9AA0A6' },
    { id: 'metal-brushed', label: 'Brushed Metal', swatch: '#B4B8BC' },
    { id: 'wood-slat-oak', label: 'Oak Slat', swatch: '#C8A878' },
    { id: 'wood-slat-dark', label: 'Dark Wood Slat', swatch: '#4A3220' },
    { id: 'fabric-panel-018', label: 'Fabric Panel 018', swatch: '#B8A898' },
    { id: 'fabric-panel-022', label: 'Fabric Panel 022', swatch: '#A89888' },
    { id: 'fabric-panel-023', label: 'Fabric Panel 023', swatch: '#C4B4A4' },
    { id: 'fabric-panel-026', label: 'Fabric Panel 026', swatch: '#9A8A7A' },
    { id: 'fabric-panel-048', label: 'Fabric Panel 048', swatch: '#D0C0AC' },
    { id: 'fabric-panel-054', label: 'Fabric Panel 054', swatch: '#B0A090' },
    { id: 'fabric-panel-055', label: 'Fabric Panel 055', swatch: '#CCC0B0' },
    { id: 'fabric-panel-063', label: 'Fabric Panel 063', swatch: '#A4948A' },
    { id: 'fabric-panel-066', label: 'Fabric Panel 066', swatch: '#BCAC9C' },
    { id: 'fabric-panel-076', label: 'Fabric Panel 076', swatch: '#C8B8A8' },
    { id: 'fabric-panel-077', label: 'Fabric Panel 077', swatch: '#948474' },
    { id: 'fabric-panel-079', label: 'Fabric Panel 079', swatch: '#D4C8B8' },
    { id: 'fabric-panel-083', label: 'Fabric Panel 083', swatch: '#AC9C8C' },
    { id: 'metal-panel-056c', label: 'Metal Panel 056C', swatch: '#8E969C' },
] as const;


export const DOOR_MATERIALS: { id: DoorStyle; label: string; swatch: string; textured: boolean }[] =
    getMaterialsForDomain('door').map(({ key, def }) => ({
        id: key as DoorStyle,
        label: def.label ?? labelize(key),
        swatch: def.color,
        textured: Boolean(def.textureUrl),
    }))

export const DOOR_STYLES: { value: DoorStyle; label: string; color: string; textured: boolean }[] =
    DOOR_MATERIALS.map(d => ({ value: d.id, label: d.label, color: d.swatch, textured: d.textured }))

export const DOOR_STYLE_COLORS: Record<DoorStyle, string> =
    Object.fromEntries(DOOR_MATERIALS.map(d => [d.id, d.swatch])) as Record<DoorStyle, string>

export const DOOR_TEXTURE_URLS: Record<DoorStyle, { map: string; normalMap: string; roughnessMap: string } | null> =
    Object.fromEntries(
        getMaterialsForDomain('door').map(({ key, def }) => [
            key,
            def.textureUrl
                ? { map: def.textureUrl, normalMap: def.normalMapUrl ?? '', roughnessMap: def.roughnessMapUrl ?? '' }
                : null,
        ])
    ) as Record<DoorStyle, { map: string; normalMap: string; roughnessMap: string } | null>



export const FURNITURE_MATERIALS: UniversalMaterial[] =
    getMaterialsForDomain('furniture').map(({ key, def }) => ({
        id: key,
        label: def.label ?? labelize(key),
        category: def.category as MaterialCategory,

        swatch: def.color,
        thumbnail: def.textureUrl || undefined,
        textureUrl: def.textureUrl,

        // Required by UniversalMaterial
        appliesTo: ['furniture'] as const,
    }));

function labelize(key: string) {
    return key
        .split(/[-_]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
}