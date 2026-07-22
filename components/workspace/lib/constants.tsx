import { SceneConfig } from "../FloorPlanEditor"
import { PlacedLight } from "../lights-constant"
import { MaterialCategory } from "../texture/materials-registry"
import { UniversalMaterial } from "../texture/universalMaterials"
import { CameraView } from "./camera"
import { PlacedOutdoorObject } from "./outdoor-constants"
import { WallType } from "./wall-constants"


export type MaterialDomain = 'wall' | 'floor' | 'door' | 'furniture' | "outdoor"

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

export const MATERIAL_REGISTRY: Record<string, MaterialDef> = {
    // ── Solids — usable everywhere ──────────────────────────────────────
    paint: { color: '#FFFFFF', roughness: 0.85, metalness: 0, repeatScale: 0.1, category: 'solid', domains: ['wall', 'door', 'furniture'], preview: '⬜' },
    plain: { color: '#C8A878', roughness: 0.7, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor'], preview: '🪵' },
    'solid-white': { color: '#F5F5F0', roughness: 0.6, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor', 'wall', 'door', 'furniture'], preview: '⬜' },
    'solid-gray': { color: '#8A8A85', roughness: 0.6, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor', 'wall', 'door', 'furniture'], preview: '⬜' },
    'solid-black': { color: '#1A1A1A', roughness: 0.5, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor', 'wall', 'door', 'furniture'], preview: '⬛' },
    'solid-beige': { color: '#D8C9B0', roughness: 0.65, metalness: 0, repeatScale: 1, category: 'solid', domains: ['floor', 'wall', 'door', 'furniture'], preview: '⬜' },

    // ── Wood ─────────────────────────────────────────────────────────────
    wood: { color: '#C8A878', roughness: 0.6, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor'], textureUrl: '/textures/Wood049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Wood049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Wood049_1K-JPG_Roughness.jpg' },
    'wood-oak': { color: '#D4B592', roughness: 0.5, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'furniture'], textureUrl: '/textures/Wood049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Wood049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Wood049_1K-JPG_Roughness.jpg' },
    'wood-walnut': { color: '#5C4033', roughness: 0.4, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door', 'furniture'], textureUrl: '/textures/Wood049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Wood049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Wood049_1K-JPG_Roughness.jpg' },
    'wood-slat-oak': { color: '#C8A878', roughness: 0.5, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'door'], textureUrl: '/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/Wood052_1K-JPG/Wood052_1K-JPG_Roughness.jpg' },
    'wood-slat-dark': { color: '#4A3220', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['wall', 'door'], textureUrl: '/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/Wood066_1K-JPG/Wood066_1K-JPG_Roughness.jpg' },
    'wood-floor-herringbone': { color: '#C4A672', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'wood', domains: ['floor', 'door'], textureUrl: '/textures/wood/WoodFloor070_1K-JPG/WoodFloor070_1K-JPG_Color.jpg', normalMapUrl: '/textures/wood/WoodFloor070_1K-JPG/WoodFloor070_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/wood/WoodFloor070_1K-JPG/WoodFloor070_1K-JPG_Roughness.jpg' },

    // ── Marble & stone ───────────────────────────────────────────────────
    marble: { color: '#EAE6E0', roughness: 0.12, metalness: 0.1, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'door'], textureUrl: '/textures/Marble022_1K-JPG_Color.jpg', normalMapUrl: '/textures/Marble022_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Marble022_1K-JPG_Roughness.jpg' },
    'marble-white': { color: '#F9F9F9', roughness: 0.05, metalness: 0.1, repeatScale: 1, category: 'marble-stone', domains: ['floor'] },
    'marble-black': { color: '#1A1A1A', roughness: 0.05, metalness: 0.2, repeatScale: 1, category: 'marble-stone', domains: ['floor'] },
    'marble-onyx': { color: '#3A3A3E', roughness: 0.08, metalness: 0.1, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'wall'], textureUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Onyx013_1K-JPG/Onyx013_1K-JPG_Roughness.jpg' },
    'marble-travertine': { color: '#D8C9AE', roughness: 0.35, metalness: 0.02, repeatScale: 1, category: 'marble-stone', domains: ['floor'], textureUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Travertine009_1K-JPG/Travertine009_1K-JPG_Roughness.jpg' },
    'marble-white-veined': { color: '#F0EEE8', roughness: 0.08, metalness: 0.08, repeatScale: 1, category: 'marble-stone', domains: ['floor'], textureUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble016_1K-JPG/Marble016_1K-JPG_Roughness.jpg' },
    'marble-veined': { color: '#E8E4DC', roughness: 0.1, metalness: 0.06, repeatScale: 1.5, category: 'marble-stone', domains: ['wall'], textureUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble012_1K-JPG/Marble012_1K-JPG_Roughness.jpg' },

    // NEW: Added missing folders found in file system
    'marble-014': { color: '#D4CFC7', roughness: 0.1, metalness: 0.05, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'wall'], textureUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Marble014_1K-JPG/Marble014_1K-JPG_Roughness.jpg' },
    'marble-onyx-015': { color: '#2A302E', roughness: 0.06, metalness: 0.12, repeatScale: 1, category: 'marble-stone', domains: ['floor', 'wall'], textureUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Onyx015_1K-JPG/Onyx015_1K-JPG_Roughness.jpg' },
    'marble-travertine-010': { color: '#CDBFA6', roughness: 0.38, metalness: 0.02, repeatScale: 1, category: 'marble-stone', domains: ['floor'], textureUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Color.jpg', normalMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/marble/Travertine010_1K-JPG/Travertine010_1K-JPG_Roughness.jpg' },

    // ── Concrete ─────────────────────────────────────────────────────────
    concrete: { color: '#A8A8A8', roughness: 0.92, metalness: 0, repeatScale: 2, category: 'concrete', domains: ['floor'], textureUrl: '/textures/Concrete025_1K-JPG_Color.jpg', normalMapUrl: '/textures/Concrete025_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Concrete025_1K-JPG_Roughness.jpg' },
    'concrete-raw': { color: '#A8A6A0', roughness: 0.95, metalness: 0, repeatScale: 0.15, category: 'concrete', domains: ['wall'], textureUrl: '/textures/Concrete025_1K-JPG_Color.jpg', normalMapUrl: '/textures/Concrete025_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Concrete025_1K-JPG_Roughness.jpg' },
    'concrete-smooth': { color: '#B0AEA8', roughness: 0.6, metalness: 0, repeatScale: 2, category: 'concrete', domains: ['wall'], textureUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_Color.jpg', normalMapUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_Roughness.jpg' },
    'concrete-polished': { color: '#B6B4AE', roughness: 0.25, metalness: 0.05, repeatScale: 2, category: 'concrete', domains: ['floor'], textureUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_Color.jpg', normalMapUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/concrete/Concrete045_1K-JPG/Concrete045_1K-JPG_Roughness.jpg' },

    // ── Tile ─────────────────────────────────────────────────────────────
    tiles: {
        color: '#D4D0C8', roughness: 0.3, metalness: 0, repeatScale: 1, category: 'tile', domains: ['floor', 'door'], // was 20 — lower repeat count = larger, more visible tile squares
        textureUrl: '/textures/tiles/Tiles075_1K-JPG/Tiles075_1K-JPG_Color.jpg',
        normalMapUrl: '/textures/tiles/Tiles075_1K-JPG/Tiles075_1K-JPG_NormalGL.jpg',
        roughnessMapUrl: '/textures/tiles/Tiles075_1K-JPG/Tiles075_1K-JPG_Roughness.jpg',
    },
    'tile-ceramic': {
        color: '#F2F1EC', roughness: 0.25, metalness: 0.05, repeatScale: 1, category: 'tile', domains: ['floor', 'wall'], // was 0.5 — for THIS entry, 0.5 was actually stretching one texture across the whole surface almost unrepeated; bumped up slightly toward a visible grid too, adjust to taste
        textureUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_1K-JPG_Color.jpg',
        normalMapUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_1K-JPG_NormalGL.jpg',
        roughnessMapUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_Roughness.jpg',
    },
    'tile-travertine': {
        color: '#F2F1F0',
        roughness: 0.25, metalness: 0.05, repeatScale: 1, category: 'tile', domains: ['floor', 'wall'], // was 0.5, same note as tile-ceramic
        textureUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_1K-JPG_Color.jpg',
        normalMapUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_1K-JPG_NormalGL.jpg',
        roughnessMapUrl: '/textures/tiles/Tiles101_1K-JPG/Tiles101_Roughness.jpg',
    },

    // ── Brick ────────────────────────────────────────────────────────────
    'brick-red': { color: '#A85C42', roughness: 0.85, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'floor'], textureUrl: '/textures/Bricks104_1K-JPG_Color.jpg', normalMapUrl: '/textures/Bricks104_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Bricks104_1K-JPG_Roughness.jpg' },
    'brick-white': { color: '#D8D2C4', roughness: 0.82, metalness: 0, repeatScale: 1, category: 'brick', domains: ['wall', 'floor'], textureUrl: '/textures/Bricks019_1K-JPG_Color.jpg', normalMapUrl: '/textures/Bricks019_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Bricks019_1K-JPG_Roughness.jpg' },
    'exposed-brick': { color: '#8B5A44', roughness: 0.95, metalness: 0, repeatScale: 0.35, category: 'brick', domains: ['wall'], preview: '🧱' },

    // ── Wallpaper / PVC panel (wall-only) ───────────────────────────────
    'wallpaper-stripe': { color: '#E8E4DC', roughness: 0.7, metalness: 0, repeatScale: 0.3, category: 'wallpaper', domains: ['wall'] },
    'wallpaper-floral': { color: '#F0E6E4', roughness: 0.7, metalness: 0, repeatScale: 0.25, category: 'wallpaper', domains: ['wall'] },
    'wallpaper-textured': { color: '#EDEAE4', roughness: 0.9, metalness: 0, repeatScale: 0.4, category: 'wallpaper', domains: ['wall'] },
    'pvc-panel-groove': { color: '#E4DDCF', roughness: 0.55, metalness: 0, repeatScale: 1, category: 'pvc-panel', domains: ['wall'] },
    'pvc-panel-brick': { color: '#C9B8A8', roughness: 0.75, metalness: 0, repeatScale: 0.5, category: 'pvc-panel', domains: ['wall'] },

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
    'metal-corrugated': { color: '#9AA0A6', roughness: 0.3, metalness: 0.8, repeatScale: 3, category: 'metal', domains: ['wall', 'door'], textureUrl: '/textures/metal/CorrugatedSteel009_1K-JPG/CorrugatedSteel009_1K-JPG_Color.jpg', normalMapUrl: '/textures/metal/CorrugatedSteel009_1K-JPG/CorrugatedSteel009_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/metal/CorrugatedSteel009_1K-JPG/CorrugatedSteel009_1K-JPG_Roughness.jpg' },
    'metal-brushed': { color: '#B4B8BC', roughness: 0.2, metalness: 0.9, repeatScale: 2, category: 'metal', domains: ['wall', 'door'], textureUrl: '/textures/metal/Metal050A_1K-JPG/Metal050A_1K-JPG_Color.jpg', normalMapUrl: '/textures/metal/Metal050A_1K-JPG/Metal050A_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/metal/Metal050A_1K-JPG/Metal050A_1K-JPG_Roughness.jpg' },
    'metal-panel-056c': { color: '#8E969C', roughness: 0.28, metalness: 0.82, repeatScale: 2, category: 'metal', domains: ['wall'], textureUrl: '/textures/metal/Metal056C_1K-JPG/Metal056C_1K-JPG_Color.jpg', normalMapUrl: '/textures/metal/Metal056C_1K-JPG/Metal056C_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/metal/Metal056C_1K-JPG/Metal056C_1K-JPG_Roughness.jpg' },

    // ── Fabric / carpet ──────────────────────────────────────────────────
    fabric: { color: '#B8A898', roughness: 0.98, metalness: 0, repeatScale: 10, category: 'fabric', domains: ['floor', 'furniture', 'door'], textureUrl: '/textures/Fabric049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Fabric049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Fabric049_1K-JPG_Roughness.jpg' },
    'fabric-fine-weave': { color: '#C4B8A8', roughness: 0.96, metalness: 0, repeatScale: 10, category: 'fabric', domains: ['floor', 'door'], textureUrl: '/textures/fabric/Fabric061_1K-JPG/Fabric061_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric061_1K-JPG/Fabric061_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric061_1K-JPG/Fabric061_1K-JPG_Roughness.jpg' },
    'carpet-plush': { color: '#B8ACA0', roughness: 0.98, metalness: 0, repeatScale: 12, category: 'fabric', domains: ['floor', 'door'], textureUrl: '/textures/fabric/Carpet001_1K-JPG/Carpet001_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Carpet001_1K-JPG/Carpet001_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Carpet001_1K-JPG/Carpet001_1K-JPG_Roughness.jpg' },
    'carpet-woven': { color: '#A89A88', roughness: 0.95, metalness: 0, repeatScale: 12, category: 'fabric', domains: ['floor', 'door'], textureUrl: '/textures/fabric/Carpet015_1K-JPG/Carpet015_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Carpet015_1K-JPG/Carpet015_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Carpet015_1K-JPG/Carpet015_1K-JPG_Roughness.jpg' },
    'fabric-panel-blue': { color: '#8A9AB0', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric045_1K-JPG/Fabric045_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric045_1K-JPG/Fabric045_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric045_1K-JPG/Fabric045_1K-JPG_Roughness.jpg' },
    'fabric-panel-tan': { color: '#C9B8A0', roughness: 0.92, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric028_1K-JPG/Fabric028_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric028_1K-JPG/Fabric028_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric028_1K-JPG/Fabric028_1K-JPG_Roughness.jpg' },
    'fabric-panel-018': { color: '#B8A898', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric018_1K-JPG/Fabric018_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric018_1K-JPG/Fabric018_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric018_1K-JPG/Fabric018_1K-JPG_Roughness.jpg' },
    'fabric-panel-022': { color: '#A89888', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric022_1K-JPG/Fabric022_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric022_1K-JPG/Fabric022_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric022_1K-JPG/Fabric022_1K-JPG_Roughness.jpg' },
    'fabric-panel-023': { color: '#C4B4A4', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric023_1K-JPG/Fabric023_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric023_1K-JPG/Fabric023_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric023_1K-JPG/Fabric023_1K-JPG_Roughness.jpg' },
    'fabric-panel-026': { color: '#9A8A7A', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric026_1K-JPG/Fabric026_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric026_1K-JPG/Fabric026_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric026_1K-JPG/Fabric026_1K-JPG_Roughness.jpg' },
    'fabric-panel-048': { color: '#D0C0AC', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric048_1K-JPG/Fabric048_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric048_1K-JPG/Fabric048_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric048_1K-JPG/Fabric048_1K-JPG_Roughness.jpg' },
    'fabric-panel-054': { color: '#B0A090', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric054_1K-JPG/Fabric054_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric054_1K-JPG/Fabric054_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric054_1K-JPG/Fabric054_1K-JPG_Roughness.jpg' },
    'fabric-panel-055': { color: '#CCC0B0', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric055_1K-JPG/Fabric055_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric055_1K-JPG/Fabric055_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric055_1K-JPG/Fabric055_1K-JPG_Roughness.jpg' },
    'fabric-panel-063': { color: '#A4948A', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric063_1K-JPG/Fabric063_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric063_1K-JPG/Fabric063_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric063_1K-JPG/Fabric063_1K-JPG_Roughness.jpg' },
    'fabric-panel-066': { color: '#BCAC9C', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric066_1K-JPG/Fabric066_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric066_1K-JPG/Fabric066_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric066_1K-JPG/Fabric066_1K-JPG_Roughness.jpg' },
    'fabric-panel-076': { color: '#C8B8A8', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric076_1K-JPG/Fabric076_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric076_1K-JPG/Fabric076_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric076_1K-JPG/Fabric076_1K-JPG_Roughness.jpg' },
    'fabric-panel-077': { color: '#948474', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric077_1K-JPG/Fabric077_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric077_1K-JPG/Fabric077_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric077_1K-JPG/Fabric077_1K-JPG_Roughness.jpg' },
    'fabric-panel-079': { color: '#D4C8B8', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric079_1K-JPG/Fabric079_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric079_1K-JPG/Fabric079_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric079_1K-JPG/Fabric079_1K-JPG_Roughness.jpg' },
    'fabric-panel-083': { color: '#AC9C8C', roughness: 0.9, metalness: 0, repeatScale: 4, category: 'fabric', domains: ['wall', 'furniture'], textureUrl: '/textures/fabric/Fabric083_1K-JPG/Fabric083_1K-JPG_Color.jpg', normalMapUrl: '/textures/fabric/Fabric083_1K-JPG/Fabric083_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/fabric/Fabric083_1K-JPG/Fabric083_1K-JPG_Roughness.jpg' },

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
    isOpen?: boolean   // NEW — persisted open/closed state, default false (closed)
}
export type StairsType = 'stairs-straight' | 'stairs-l' | 'stairs-u' | 'stairs-spiral' | 'stairs-ramp' | 'elevator'

export type DoorMaterial = 'wood_oak' | 'wood_dark' | 'wood_white' | 'glass_frosted' | 'glass_clear' | 'metal_steel' | 'panel_white'

export type DoorStyle =
    | 'wood_oak'
    | 'wood_dark'
    | 'wood_white'
    | 'glass_frosted'
    | 'glass_clear'
    | 'metal_steel'
    | 'panel_white'

// export const DOOR_MATERIALS: { id: DoorStyle; label: string; swatch: string; textured: boolean }[] = [
//     { id: 'wood_oak', label: 'Oak', swatch: '#C8A878', textured: true },
//     { id: 'wood_dark', label: 'Dark Wood', swatch: '#4A3220', textured: true },
//     { id: 'wood_white', label: 'White', swatch: '#F0EDE8', textured: true },
//     { id: 'glass_frosted', label: 'Frosted Glass', swatch: '#C8D8E4', textured: false },
//     { id: 'glass_clear', label: 'Clear Glass', swatch: '#B8D0E0', textured: false },
//     { id: 'metal_steel', label: 'Steel', swatch: '#9AABB8', textured: true },
//     { id: 'panel_white', label: 'Panel White', swatch: '#F5F2EE', textured: true },
// ]

// export const DOOR_STYLES: { value: DoorStyle; label: string; color: string; textured: boolean }[] =
//     DOOR_MATERIALS.map(d => ({ value: d.id, label: d.label, color: d.swatch, textured: d.textured }))

export type PlacedStairs = {
    id: string
    type: StairsType
    x: number       // world metres, top-left anchor
    z: number
    width: number   // footprint
    depth: number
    rotation: number // radians
}

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
}


export type ClosedShape = {
    id: string
    nodeIds: string[]
    label?: string
    color?: string
    floorMaterial?: FloorMaterial
    wallMaterial?: WallMaterial
    wallOverrides?: Record<string, { color?: string; material?: WallMaterial }>

}

export type Annotation = { id: string; x: number; z: number; text: string; fontSize: number }

export type FurnitureType =
    | 'sofa'
    | 'bed'
    | 'dining_table'
    | 'desk'
    | 'wardrobe'
    | 'bathtub'
    | 'toilet'
    | 'plant'
    | 'chair'
    | 'coffee_table'
    | 'single_sofa'
    | 'lamp'
    | 'mirror'
    | 'kitchen_stove'
    | 'chimney'
    | 'commode'
    | 'shower'
    | 'shoe_rack'
    | 'led_strip'
    | 'wall_panel_pvc'
    | 'painting'
    | 'lounge_recliner'

export type PlacedFurniture = {
    id: string
    type: FurnitureType
    x: number
    z: number
    rotation: number
    scale: number
    materialId?: string;
}


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


export type EditorTool =
    | 'select' | 'pan' | 'room' | 'pencil' | 'line' | 'bend'
    | 'door-swing-single' | 'door-swing-double' | 'door-sliding' | 'door-pocket' | 'door-folding' | 'door-garage'
    | 'window-fixed' | 'window-sliding' | 'window-casement' | 'window-bay' | 'window-skylight'
    | 'opening-archway' | 'opening-passage'
    | 'stairs-straight' | 'stairs-l' | 'stairs-u' | 'stairs-spiral' | 'stairs-ramp'
    | 'elevator'
    | 'delete' | 'annotate' | 'furniture'
    | 'wall-decor-led' | 'wall-decor-pvc' | 'wall-decor-painting' | 'led_tv'
    | 'light-ceiling-pendant' | 'light-ceiling-recessed' | 'light-floor-lamp' | 'light-wall-sconce'
    | 'outdoor-crosswalk' | 'outdoor-dustbin' | 'outdoor-bench' | 'outdoor-mailbox'   // NEW

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

// ── Icon set ──────────────────────────────────────────────────────────────

const S = (children: React.ReactNode) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
)

export const ICONS: Record<EditorTool, React.ReactNode> = {
    select: S(<path d="M5 3l14 9-7 1-4 7z" />),
    pan: S(<>
        <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3" />
        <path d="M3 12h18M12 3v18" />
    </>),
    room: S(<rect x="3" y="3" width="18" height="18" rx="1" />),
    pencil: S(<>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>),
    line: S(<>
        <line x1="4" y1="20" x2="20" y2="4" strokeWidth="2.5" />
        <circle cx="4" cy="20" r="2" fill="currentColor" />
        <circle cx="20" cy="4" r="2" fill="currentColor" />
    </>),
    bend: S(<>
        <path d="M4 20 Q12 4 20 20" strokeWidth="2.5" />
        <circle cx="4" cy="20" r="2" fill="currentColor" />
        <circle cx="20" cy="20" r="2" fill="currentColor" />
        <circle cx="12" cy="8" r="2" fill="currentColor" />
    </>),

    // ── Doors ──
    'door-swing-single': S(<>
        <rect x="3" y="3" width="13" height="18" rx="1" />
        <path d="M16 7h4M3 21h18M3 3h18" />
        <path d="M8 12 Q8 8 12 8" strokeDasharray="2 1" />
    </>),
    'door-swing-double': S(<>
        <rect x="2" y="3" width="9" height="18" rx="1" />
        <rect x="13" y="3" width="9" height="18" rx="1" />
        <path d="M11 12 Q11 8 15 8M11 12 Q11 8 7 8" strokeDasharray="2 1" />
    </>),
    'door-sliding': S(<>
        <rect x="2" y="4" width="20" height="16" rx="1" />
        <path d="M2 12h9" strokeWidth="2.5" />
        <path d="M13 12h9" strokeDasharray="3 2" />
        <path d="M6 9l-2 3 2 3" />
    </>),
    'door-pocket': S(<>
        <rect x="2" y="4" width="20" height="16" rx="1" />
        <path d="M4 12h7" strokeWidth="2.5" />
        <rect x="15" y="9" width="5" height="6" strokeDasharray="1.5 1.5" />
    </>),
    'door-folding': S(<>
        <rect x="2" y="3" width="20" height="18" rx="1" />
        <path d="M6 3v18M10 3v18M14 3v18M18 3v18" strokeDasharray="2 1.5" />
    </>),
    'door-garage': S(<>
        <rect x="2" y="4" width="20" height="16" rx="1" />
        <path d="M2 8h20M2 12h20M2 16h20" />
    </>),

    // ── Windows ──
    'window-fixed': S(<>
        <rect x="2" y="6" width="20" height="12" rx="1" />
        <line x1="12" y1="6" x2="12" y2="18" />
        <line x1="2" y1="12" x2="22" y2="12" />
    </>),
    'window-sliding': S(<>
        <rect x="2" y="6" width="20" height="12" rx="1" />
        <line x1="12" y1="6" x2="12" y2="18" />
        <path d="M4 12h5M15 12h5" strokeDasharray="1.5 1.5" />
    </>),
    'window-casement': S(<>
        <rect x="2" y="6" width="20" height="12" rx="1" />
        <path d="M12 6 L4 12 L12 6 L20 12" />
    </>),
    'window-bay': S(<>
        <path d="M4 18 L4 10 L9 6 L15 6 L20 10 L20 18" />
        <path d="M4 18h16M9 6v12M15 6v12" />
    </>),
    'window-skylight': S(<>
        <rect x="4" y="4" width="16" height="16" rx="1" transform="rotate(20 12 12)" />
        <line x1="12" y1="4" x2="12" y2="20" transform="rotate(20 12 12)" />
    </>),

    // ── Openings ──
    'opening-archway': S(<>
        <path d="M4 21V10a8 8 0 0 1 16 0v11" />
        <path d="M4 21h16" />
    </>),
    'opening-passage': S(<>
        <path d="M4 3v18M20 3v18" strokeDasharray="3 2" />
        <path d="M4 21h16" opacity="0.4" />
    </>),

    // ── Stairs / vertical circulation ──
    'stairs-straight': S(<path d="M3 21v-3h3v-3h3v-3h3v-3h3v-3h3V3" />),
    'stairs-l': S(<path d="M3 21v-6h6v-6h9V3" />),
    'stairs-u': S(<path d="M4 3v6h6v6h-6v6M14 21v-6h6V3" />),
    'stairs-spiral': S(<>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 6.36 15.36M12 21a9 9 0 0 1-6.36-15.36" strokeDasharray="2 2" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>),
    'stairs-ramp': S(<>
        <path d="M3 21h18" />
        <path d="M3 21L15 5h6" />
    </>),
    elevator: S(<>
        <rect x="4" y="2" width="16" height="20" rx="1" />
        <path d="M12 8l-3 3h6l-3-3zM12 16l3-3H9l3 3z" />
    </>),

    annotate: S(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
    furniture: S(<>
        <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" />
        <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z" />
        <path d="M6 19v2M18 19v2" />
    </>),
    delete: S(<>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>),
    'wall-decor-led': S(<>
        <rect x="2" y="9" width="20" height="4" rx="1" />
        <line x1="2" y1="11" x2="22" y2="11" strokeDasharray="1 2" strokeWidth="1" />
    </>),
    'wall-decor-pvc': S(<>
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <line x1="7" y1="3" x2="7" y2="21" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="17" y1="3" x2="17" y2="21" />
    </>),
    'wall-decor-painting': S(<>
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5-8 8" />
    </>),
    'light-wall-sconce': S(<>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4" strokeDasharray="1 1" opacity="0.5" />
        <path d="M4 4l2 2M20 4l-2 2M4 20l2-2M20 20l-2-2" strokeWidth="1.5" opacity="0.6" />
    </>),
    'light-ceiling-pendant': S(<>
        <path d="M12 2v6" />
        <path d="M7 8h10l-2 6H9l-2-6z" />
        <circle cx="12" cy="17" r="2.5" fill="currentColor" opacity="0.3" />
    </>),
    'light-ceiling-recessed': S(<>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
    </>),
    'light-floor-lamp': S(<>
        <path d="M12 2l5 7H7l5-7z" />
        <line x1="12" y1="9" x2="12" y2="19" />
        <path d="M8 22h8" />
        <path d="M10 19h4" />
    </>),
    'led_tv': S(<>
        <rect x="2" y="5" width="20" height="13" rx="1.5" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="18" x2="12" y2="21" />
    </>),
    'outdoor-crosswalk': (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 20L8 4M10 20L14 4M16 20L20 4" strokeLinecap="round" />
        </svg>
    ),
    'outdoor-dustbin': (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    'outdoor-bench': (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 11h18M5 11v7M19 11v7M8 11V6h8v5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    'outdoor-mailbox': (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a5 5 0 015-5h9a4 4 0 010 8H8a5 5 0 01-5-5z" />
            <path d="M8 7v10M4 17h16" strokeLinecap="round" />
        </svg>
    ),
}

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

export const FURNITURE_LABELS: Record<FurnitureType, string> = {
    sofa: 'Sofa', bed: 'Bed', dining_table: 'Table', desk: 'Desk',
    wardrobe: 'WRB', bathtub: 'Bath', toilet: 'WC', plant: '♣',
    chair: 'Chair', coffee_table: 'C.T',
    single_sofa: 'S.Sofa', lamp: 'Lamp', mirror: 'Mirr',
    kitchen_stove: 'Stove', chimney: 'Chimney', commode: 'Commode',
    shower: 'Shower', shoe_rack: 'Shoe-Rack',
    led_strip: 'LED', wall_panel_pvc: 'PVC Panel', painting: 'Art',
    lounge_recliner: 'Recliner'
}

export const GRID_M = 0.5
export const PX_PER_M = 40
export const MIN_ROOM = 1.0

export const FURNITURE_FOOTPRINTS: Record<FurnitureType, { w: number; d: number }> = {
    sofa: { w: 2.2, d: 0.95 },
    bed: { w: 1.7, d: 2.1 },
    dining_table: { w: 1.5, d: 1.5 },
    desk: { w: 1.4, d: 0.7 },
    wardrobe: { w: 1.9, d: 0.62 },
    bathtub: { w: 0.82, d: 1.6 },
    toilet: { w: 0.46, d: 0.68 },
    plant: { w: 0.4, d: 0.4 },
    chair: { w: 0.55, d: 0.55 },
    coffee_table: { w: 1.2, d: 0.65 },
    single_sofa: { w: 0.95, d: 0.9 },
    lamp: { w: 0.35, d: 0.35 },
    mirror: { w: 0.7, d: 0.06 },
    kitchen_stove: { w: 0.6, d: 0.6 },
    chimney: { w: 0.9, d: 0.55 },
    commode: { w: 0.5, d: 0.45 },
    shower: { w: 0.9, d: 0.9 },
    shoe_rack: { w: 0.9, d: 0.32 },
    led_strip: { w: 1.25, d: 0.05 },
    wall_panel_pvc: { w: 1.2, d: 0.05 },
    painting: { w: 0.9, d: 0.05 },
    lounge_recliner: { w: 2, d: 2 }
}
export const FURNITURE_COLORS: Record<FurnitureType, string> = {
    sofa: 'rgba(160,148,130,0.88)',
    bed: 'rgba(130,120,155,0.88)',
    dining_table: 'rgba(155,125,95,0.88)',
    desk: 'rgba(110,130,155,0.88)',
    wardrobe: 'rgba(70,60,50,0.88)',
    bathtub: 'rgba(140,175,185,0.88)',
    toilet: 'rgba(200,200,200,0.88)',
    plant: 'rgba(65,140,65,0.88)',
    chair: 'rgba(145,135,115,0.88)',
    coffee_table: 'rgba(140,118,88,0.88)',
    single_sofa: 'rgba(170,150,125,0.88)',
    lamp: 'rgba(230,200,120,0.88)',
    mirror: 'rgba(180,200,215,0.88)',
    kitchen_stove: 'rgba(90,95,100,0.88)',
    chimney: 'rgba(60,65,70,0.88)',
    commode: 'rgba(210,210,205,0.88)',
    shower: 'rgba(150,190,200,0.88)',
    shoe_rack: 'rgba(120,95,70,0.88)',
    led_strip: 'rgba(255,220,150,0.9)',
    wall_panel_pvc: 'rgba(228,221,207,0.88)',
    painting: 'rgba(120,105,85,0.88)',
    lounge_recliner: "rgba(110, 90,70, 1)"
}


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
]

export interface FurnitureMaterial {
    id: string
    label: string
    swatch: string // Hex color, image url, or gradient
}

// export const FURNITURE_MATERIALS: FurnitureMaterial[] = [
//     { id: 'wood_light', label: 'Light Wood', swatch: '#E6C280' },
//     { id: 'wood_dark', label: 'Dark Wood', swatch: '#5C4033' },
//     { id: 'fabric_grey', label: 'Grey Fabric', swatch: '#808080' },
//     { id: 'fabric_blue', label: 'Blue Fabric', swatch: '#2B4C7E' },
//     { id: 'leather_black', label: 'Black Leather', swatch: '#1A1A1A' },
//     { id: 'metal_chrome', label: 'Chrome', swatch: 'linear-gradient(45deg, #999, #e1e1e1, #999)' },
// ]

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