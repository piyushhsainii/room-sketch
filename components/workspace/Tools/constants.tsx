import { SceneConfig } from "../FloorPlanEditor"

export type EditorOpening = {
    id: string
    roomId: string
    wall: 'north' | 'south' | 'east' | 'west'
    type: 'door' | 'window' | 'opening'   // ← added 'opening' for archway/passage
    position: number
    width: number
    height: number
    sillHeight: number
    swingDirection: 'inward' | 'outward'
    segmentNodeIds?: string[]
    segmentT?: number
    variant?: EditorTool
}

export type StairsType = 'stairs-straight' | 'stairs-l' | 'stairs-u' | 'stairs-spiral' | 'stairs-ramp' | 'elevator'

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
}

export const DEFAULT_FP: FloorPlanState = {
    rooms: [], openings: [], roomHeight: 2.7,
    lineNodes: [], lineSegments: [], closedShapes: [],
    annotations: [],
    furniture: [],
    stairs: [],   // ← new
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
}

export type FloorMaterial = 'wood' | 'marble' | 'concrete' | 'tiles' | 'fabric' | 'plaster' | 'plain'
export type DoorStyle = 'natural' | 'white' | 'dark' | 'glass'


export type ClosedShape = { id: string; nodeIds: string[]; label: string; color: string; floorMaterial?: FloorMaterial }

export type Annotation = { id: string; x: number; z: number; text: string; fontSize: number }

export type FurnitureType = 'sofa' | 'bed' | 'dining_table' | 'desk' | 'wardrobe' | 'bathtub' | 'toilet' | 'plant' | 'chair' | 'coffee_table'

export type PlacedFurniture = {
    id: string
    type: FurnitureType
    x: number       // world metres
    z: number
    rotation: number // radians Y-axis
    scale: number   // 1.0 = default
}


export const FLOOR_MATERIALS: { id: FloorMaterial; label: string; preview: string; roughness: number; color: string }[] = [
    { id: 'plain', label: 'Plain', preview: '🪵', roughness: 0.7, color: '#C8A878' },
    { id: 'wood', label: 'Wood', preview: '🪵', roughness: 0.7, color: '#C8A878' },
    { id: 'marble', label: 'Marble', preview: '⬜', roughness: 0.12, color: '#EAE6E0' },
    { id: 'concrete', label: 'Concrete', preview: '🩶', roughness: 0.92, color: '#A8A8A8' },
    { id: 'tiles', label: 'Tiles', preview: '🔲', roughness: 0.3, color: '#D4D0C8' },
    { id: 'fabric', label: 'Fabric', preview: '🟫', roughness: 0.98, color: '#B8A898' },
    { id: 'plaster', label: 'Plaster', preview: '🟪', roughness: 0.88, color: '#D8D0C8' },
]

export const DOOR_STYLES: { value: DoorStyle; label: string; color: string }[] = [
    { value: 'natural', label: 'Natural Oak', color: '#C8A878' },
    { value: 'white', label: 'White', color: '#F0EEEA' },
    { value: 'dark', label: 'Dark Walnut', color: '#3A2E22' },
    { value: 'glass', label: 'Glass', color: '#93C5FD' },
]

export type EditorTool =
    | 'select' | 'pan'
    | 'room' | 'pencil' | 'line' | 'bend'
    | 'door-swing-single' | 'door-swing-double' | 'door-sliding'
    | 'door-pocket' | 'door-folding' | 'door-garage'
    | 'window-fixed' | 'window-sliding' | 'window-casement'
    | 'window-bay' | 'window-skylight'
    | 'opening-archway' | 'opening-passage'
    | 'stairs-straight' | 'stairs-l' | 'stairs-u' | 'stairs-spiral' | 'stairs-ramp'
    | 'elevator'
    | 'annotate' | 'furniture' | 'delete'

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
}

// ── Tool groups (drives the toolbar layout) ─────────────────────────────────

export const TOOL_GROUPS: ToolGroup[] = [
    { id: 'select', label: 'Select', leaves: [{ id: 'select', label: 'Select / Move', key: 'V', icon: ICONS.select }] },
    { id: 'pan', label: 'Pan', leaves: [{ id: 'pan', label: 'Pan Canvas', key: 'H', icon: ICONS.pan }] },

    {
        id: 'draw', label: 'Draw Walls', leaves: [
            { id: 'room', label: 'Draw Room', key: 'R', icon: ICONS.room },
            { id: 'pencil', label: 'Freeform', key: 'P', icon: ICONS.pencil },
            { id: 'line', label: 'Line Wall', key: 'L', icon: ICONS.line },
            { id: 'bend', label: 'Bend Wall', key: 'B', icon: ICONS.bend },
        ]
    },

    {
        id: 'doors', label: 'Doors', leaves: [
            { id: 'door-swing-single', label: 'Single Swing Door', key: 'D', icon: ICONS['door-swing-single'] },
            { id: 'door-swing-double', label: 'Double Swing Door', icon: ICONS['door-swing-double'] },
            { id: 'door-sliding', label: 'Sliding Door', icon: ICONS['door-sliding'] },
            { id: 'door-pocket', label: 'Pocket Door', icon: ICONS['door-pocket'] },
            { id: 'door-folding', label: 'Bi-fold Door', icon: ICONS['door-folding'] },
            { id: 'door-garage', label: 'Garage Door', icon: ICONS['door-garage'] },
        ]
    },

    {
        id: 'windows', label: 'Windows', leaves: [
            { id: 'window-fixed', label: 'Fixed Window', key: 'N', icon: ICONS['window-fixed'] },
            { id: 'window-sliding', label: 'Sliding Window', icon: ICONS['window-sliding'] },
            { id: 'window-casement', label: 'Casement Window', icon: ICONS['window-casement'] },
            { id: 'window-bay', label: 'Bay Window', icon: ICONS['window-bay'] },
            { id: 'window-skylight', label: 'Skylight', icon: ICONS['window-skylight'] },
        ]
    },

    {
        id: 'openings', label: 'Openings', leaves: [
            { id: 'opening-archway', label: 'Archway', icon: ICONS['opening-archway'] },
            { id: 'opening-passage', label: 'Open Passage', icon: ICONS['opening-passage'] },
        ]
    },

    {
        id: 'vertical', label: 'Stairs & Vertical', leaves: [
            { id: 'stairs-straight', label: 'Straight Stairs', key: 'S', icon: ICONS['stairs-straight'] },
            { id: 'stairs-l', label: 'L-Shaped Stairs', icon: ICONS['stairs-l'] },
            { id: 'stairs-u', label: 'U-Shaped Stairs', icon: ICONS['stairs-u'] },
            { id: 'stairs-spiral', label: 'Spiral Stairs', icon: ICONS['stairs-spiral'] },
            { id: 'stairs-ramp', label: 'Ramp', icon: ICONS['stairs-ramp'] },
            { id: 'elevator', label: 'Elevator', icon: ICONS.elevator },
        ]
    },

    { id: 'annotate', label: 'Annotate', leaves: [{ id: 'annotate', label: 'Add Label', key: 'A', icon: ICONS.annotate }] },
    { id: 'furniture', label: 'Furniture', leaves: [{ id: 'furniture', label: 'Place Furniture', key: 'F', icon: ICONS.furniture }] },
    { id: 'delete', label: 'Delete', leaves: [{ id: 'delete', label: 'Delete', key: '⌫', icon: ICONS.delete }] },
]


// wherever DEFAULT_SCENE_CONFIG is defined (constants.ts), it should read:
export const DEFAULT_SCENE_CONFIG: SceneConfig = {
    ambientIntensity: 0.9,
    wallRoughness: 0.95,     // higher roughness = flatter, less specular highlight
    wallTextured: false,
    showFurniture: true,
    showLabels: true,
    fogEnabled: false,
    doorStyle: 'natural',
    globalFloorMaterial: 'plain', // add a 'plain' entry to FLOOR_MATERIALS
    rooms: [],
}
export const WALL_COLORS = [
    '#F5F0E8', '#E8E0D0', '#D4C4A0', '#C8B898',
    '#E8D5C0', '#D4B896', '#F0E8D8', '#8B7B6B',
    '#B8D4C8', '#A0C4B8', '#C8D4E8', '#A0B4D0',
    '#E8C8C8', '#D4A8A8', '#C8E8C8', '#A8D4A8',
    '#FFFFFF', '#F0F0F0', '#D0D0D0', '#A0A0A0',
]

export const TEXTURE_BASE = '/textures'

export const FLOOR_TEXTURE_URLS: Record<Exclude<FloorMaterial, 'plain'>, {
    map: string; normalMap: string; roughnessMap: string; repeat: number
    roughness: number; metalness: number
}> = {
    wood: {
        map: `${TEXTURE_BASE}/Wood049_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Wood049_1K-JPG_Roughness.jpg`,
        repeat: 3, roughness: 0.72, metalness: 0.0,
    },
    marble: {
        map: `${TEXTURE_BASE}/Marble022_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Marble022_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Marble022_1K-JPG_Roughness.jpg`,
        repeat: 1.5, roughness: 0.18, metalness: 0.04,
    },
    concrete: {
        map: `${TEXTURE_BASE}/Concrete025_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Concrete025_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Concrete025_1K-JPG_Roughness.jpg`,
        repeat: 2, roughness: 0.92, metalness: 0.0,
    },
    tiles: {
        map: `${TEXTURE_BASE}/Tiles101_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Tiles101_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Tiles101_Roughness.jpg`,
        repeat: 2, roughness: 0.30, metalness: 0.04,
    },
    fabric: {
        map: `${TEXTURE_BASE}/Fabric049_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Fabric049_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Fabric049_1K-JPG_Roughness.jpg`,
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

export const DOOR_TEXTURE_URLS: Record<DoorStyle, { map: string; normalMap: string; roughnessMap: string } | null> = {
    natural: {
        map: `${TEXTURE_BASE}/Wood049_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Wood049_1K-JPG_Roughness.jpg`,
    },
    dark: {
        map: `${TEXTURE_BASE}/Wood049_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Wood049_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Wood049_1K-JPG_Roughness.jpg`,
    },
    white: null,   // no texture — flat painted
    glass: null,   // no texture — transparent
}

export const DOOR_STYLE_COLORS: Record<DoorStyle, string> = {
    natural: '#C8A878',
    white: '#F0EEEA',
    dark: '#3A2E22',
    glass: '#93C5FD',
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
}

export const FURNITURE_LABELS: Record<FurnitureType, string> = {
    sofa: 'Sofa', bed: 'Bed', dining_table: 'Table', desk: 'Desk',
    wardrobe: 'WRB', bathtub: 'Bath', toilet: 'WC', plant: '♣',
    chair: 'Chr', coffee_table: 'C.T',
}