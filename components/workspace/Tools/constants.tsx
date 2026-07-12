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
    wallDecor: PlacedWallDecor[]
}

export const DEFAULT_FP: FloorPlanState = {
    rooms: [], openings: [], roomHeight: 2.7,
    lineNodes: [], lineSegments: [], closedShapes: [],
    annotations: [],
    furniture: [],
    stairs: [],   // ← new
    wallDecor: [],
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

export type DoorStyle = 'natural' | 'white' | 'dark' | 'glass'

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

export type PlacedFurniture = {
    id: string
    type: FurnitureType
    x: number
    z: number
    rotation: number
    scale: number
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
    | 'wall-decor-led' | 'wall-decor-pvc' | 'wall-decor-painting'   // ← new
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
    {
        id: 'wall-decor', label: 'Wall Decor', leaves: [
            { id: 'wall-decor-led', label: 'LED Strip', icon: ICONS['wall-decor-led'] },
            { id: 'wall-decor-pvc', label: 'PVC Wall Panel', icon: ICONS['wall-decor-pvc'] },
            { id: 'wall-decor-painting', label: 'Painting', icon: ICONS['wall-decor-painting'] },
        ]
    },
]


export const DEFAULT_SCENE_CONFIG: SceneConfig = {
    ambientIntensity: 1.5,
    wallRoughness: 0.85,
    wallTextured: false,
    showFurniture: true,
    showLabels: true,
    fogEnabled: false,
    doorStyle: 'natural',
    globalFloorMaterial: 'plain',
    globalWallMaterial: 'paint',
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
        map: `${TEXTURE_BASE}/Marble022_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Marble022_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Marble022_1K-JPG_Roughness.jpg`,
        repeat: 1.5, roughness: 0.15, metalness: 0.04,
    },
    'marble-black': {
        map: `${TEXTURE_BASE}/Marble022_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Marble022_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Marble022_1K-JPG_Roughness.jpg`,
        repeat: 1.5, roughness: 0.22, metalness: 0.06,
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
    // ── ADDED: New Tile Variants ───────────────────────────────────
    'tile-ceramic': {
        map: `${TEXTURE_BASE}/Tiles101_1K-JPG_Color.jpg`,
        normalMap: `${TEXTURE_BASE}/Tiles101_1K-JPG_NormalGL.jpg`,
        roughnessMap: `${TEXTURE_BASE}/Tiles101_Roughness.jpg`,
        repeat: 2, roughness: 0.25, metalness: 0.02,
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
}

export const FURNITURE_LABELS: Record<FurnitureType, string> = {
    sofa: 'Sofa', bed: 'Bed', dining_table: 'Table', desk: 'Desk',
    wardrobe: 'WRB', bathtub: 'Bath', toilet: 'WC', plant: '♣',
    chair: 'Chr', coffee_table: 'C.T',
    single_sofa: 'S.Sofa', lamp: 'Lamp', mirror: 'Mirr',
    kitchen_stove: 'Stove', chimney: 'Chim', commode: 'Cmd',
    shower: 'Shwr', shoe_rack: 'Shoe',
    led_strip: 'LED', wall_panel_pvc: 'PVC Panel', painting: 'Art',
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
    { id: 'seating', label: 'Seating', items: ['sofa', 'single_sofa', 'chair'] },
    { id: 'bedroom', label: 'Bedroom', items: ['bed', 'wardrobe'] },
    { id: 'tables', label: 'Tables', items: ['dining_table', 'coffee_table', 'desk'] },
    { id: 'storage', label: 'Storage', items: ['wardrobe', 'shoe_rack'] },
    { id: 'kitchen', label: 'Kitchen', items: ['kitchen_stove', 'chimney'] },
    { id: 'bathroom', label: 'Bathroom', items: ['bathtub', 'toilet', 'commode', 'shower'] },
    { id: 'decor', label: 'Decor', items: ['plant', 'lamp', 'mirror', 'led_strip', 'wall_panel_pvc', 'painting'] },
]


export type WallDecorType = 'led_strip' | 'wall_panel_pvc' | 'painting'

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
}

export const WALL_DECOR_LABELS: Record<WallDecorType, string> = {
    led_strip: 'LED Strip',
    wall_panel_pvc: 'PVC Wall Panel',
    painting: 'Painting',
}

export const WALL_DECOR_DEFAULTS: Record<WallDecorType, { width: number; heightOffset: number }> = {
    led_strip: { width: 1.2, heightOffset: 2.4 },
    wall_panel_pvc: { width: 1.2, heightOffset: 0.0 },
    painting: { width: 0.9, heightOffset: 1.5 },
}

export type FloorMaterial =
    | 'plain' | 'solid-white' | 'solid-gray' | 'solid-black' | 'solid-beige'   // NEW solid colors
    | 'wood' | 'wood-oak' | 'wood-walnut'
    | 'marble' | 'marble-white' | 'marble-black'
    | 'concrete' | 'tiles' | 'tile-ceramic'
    | 'brick-red' | 'brick-white'
    | 'fabric' | 'plaster'

// New WallMaterial union
export type WallMaterial =
    | 'paint'
    | 'wallpaper-stripe'
    | 'wallpaper-floral'
    | 'wallpaper-textured'
    | 'pvc-panel-groove'
    | 'pvc-panel-brick'   // existing per createProceduralTexture's mat.includes('brick') check
    | 'brick-red'         // NEW
    | 'brick-white'       // NEW
    | 'tile-ceramic'      // NEW
    | 'exposed-brick'
    | 'concrete-raw'

export type MaterialDef = {
    color: string
    roughness: number
    metalness: number
    repeatScale: number
    preview?: string
    textureUrl?: string        // Color map
    normalMapUrl?: string      // NormalGL (three.js uses OpenGL-convention normals)
    roughnessMapUrl?: string
    aoMapUrl?: string
}

const BRICK_RED_TEX = '/textures/floor/brick-red.jpg'
const BRICK_WHITE_TEX = '/textures/floor/brick-white.jpg'

// Global Definitions
export const FLOOR_MAT_DEFS: Record<FloorMaterial, MaterialDef> = {
    plain: { color: '#C8A878', roughness: 0.7, metalness: 0, repeatScale: 1, preview: '🪵' },
    wood: { color: '#C8A878', roughness: 0.6, metalness: 0, repeatScale: 6, preview: '/textures/Wood049_1K-JPG_Color.jpg', textureUrl: '/textures/Wood049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Wood049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Wood049_1K-JPG_Roughness.jpg' },
    'wood-oak': { color: '#D4B592', roughness: 0.5, metalness: 0, repeatScale: 6, preview: '/textures/Wood049_1K-JPG_Color.jpg', textureUrl: '/textures/Wood049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Wood049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Wood049_1K-JPG_Roughness.jpg' },
    'wood-walnut': { color: '#5C4033', roughness: 0.4, metalness: 0, repeatScale: 6, preview: '/textures/Wood049_1K-JPG_Color.jpg', textureUrl: '/textures/Wood049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Wood049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Wood049_1K-JPG_Roughness.jpg' },
    marble: { color: '#EAE6E0', roughness: 0.12, metalness: 0.1, repeatScale: 3, preview: '/textures/Marble022_1K-JPG_Color.jpg', textureUrl: '/textures/Marble022_1K-JPG_Color.jpg', normalMapUrl: '/textures/Marble022_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Marble022_1K-JPG_Roughness.jpg' },
    'marble-white': { color: '#F9F9F9', roughness: 0.05, metalness: 0.1, repeatScale: 3 },
    'marble-black': { color: '#1A1A1A', roughness: 0.05, metalness: 0.2, repeatScale: 3 },
    concrete: { color: '#A8A8A8', roughness: 0.92, metalness: 0, repeatScale: 14, preview: '/textures/Concrete025_1K-JPG_Color.jpg', textureUrl: '/textures/Concrete025_1K-JPG_Color.jpg', normalMapUrl: '/textures/Concrete025_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Concrete025_1K-JPG_Roughness.jpg' },
    tiles: { color: '#D4D0C8', roughness: 0.3, metalness: 0, repeatScale: 20, preview: '/textures/Tiles101_1K-JPG_Color.jpg', textureUrl: '/textures/Tiles101_1K-JPG_Color.jpg', normalMapUrl: '/textures/Tiles101_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Tiles101_Roughness.jpg' },
    'tile-ceramic': { color: '#F0F0F0', roughness: 0.1, metalness: 0, repeatScale: 20 },
    fabric: { color: '#B8A898', roughness: 0.98, metalness: 0, repeatScale: 10, preview: '/textures/Fabric049_1K-JPG_Color.jpg', textureUrl: '/textures/Fabric049_1K-JPG_Color.jpg', normalMapUrl: '/textures/Fabric049_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Fabric049_1K-JPG_Roughness.jpg' },
    plaster: { color: '#D8D0C8', roughness: 0.88, metalness: 0, repeatScale: 8, preview: '/textures/Plaster001_1K-JPG_Color.jpg', textureUrl: '/textures/Plaster001_1K-JPG_Color.jpg', normalMapUrl: '/textures/Plaster001_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Plaster001_1K-JPG_Roughness.jpg' },
    'brick-red': { color: '#A85C42', roughness: 0.85, metalness: 0, repeatScale: 16 },
    'brick-white': { color: '#D8D2C4', roughness: 0.82, metalness: 0, repeatScale: 16 },
    'solid-white': { color: '#F5F5F0', roughness: 0.6, metalness: 0, repeatScale: 1, preview: '⬜' },
    'solid-gray': { color: '#8A8A85', roughness: 0.6, metalness: 0, repeatScale: 1, preview: '⬜' },
    'solid-black': { color: '#1A1A1A', roughness: 0.5, metalness: 0, repeatScale: 1, preview: '⬛' },
    'solid-beige': { color: '#D8C9B0', roughness: 0.65, metalness: 0, repeatScale: 1, preview: '⬜' },
}


export const WALL_MAT_DEFS: Record<WallMaterial, MaterialDef> = {
    'paint': { color: '#FFFFFF', roughness: 0.85, metalness: 0, repeatScale: 0.1, preview: '⬜' },
    'wallpaper-stripe': { color: '#E8E4DC', roughness: 0.7, metalness: 0, repeatScale: 0.3, preview: '⬜' },
    'wallpaper-floral': { color: '#F0E6E4', roughness: 0.7, metalness: 0, repeatScale: 0.25, preview: '⬜' },
    'wallpaper-textured': { color: '#EDEAE4', roughness: 0.9, metalness: 0, repeatScale: 0.4, preview: '⬜' },
    'pvc-panel-groove': { color: '#E4DDCF', roughness: 0.55, metalness: 0, repeatScale: 1, preview: '⬜' },
    'pvc-panel-brick': { color: '#C9B8A8', roughness: 0.75, metalness: 0, repeatScale: 0.5, preview: '🧱' },
    'brick-red': {
        color: '#A85C42', roughness: 0.85, metalness: 0, repeatScale: 1,
        preview: '/textures/Bricks104_1K-JPG_Color.jpg',
        textureUrl: '/textures/Bricks104_1K-JPG_Color.jpg',
        normalMapUrl: '/textures/Bricks104_1K-JPG_NormalGL.jpg',
        roughnessMapUrl: '/textures/Bricks104_1K-JPG_Roughness.jpg',
    },
    'brick-white': {
        color: '#D8D2C4', roughness: 0.82, metalness: 0, repeatScale: 1,
        preview: '🧱',
        textureUrl: '/textures/Bricks019_1K-JPG_Color.jpg',
        normalMapUrl: '/textures/Bricks019_1K-JPG_NormalGL.jpg',
        roughnessMapUrl: '/textures/Bricks019_1K-JPG_Roughness.jpg',
    },
    'tile-ceramic': { color: '#F2F1EC', roughness: 0.25, metalness: 0.05, repeatScale: 0.5, preview: '/textures/Tiles101_1K-JPG_Color.jpg', textureUrl: '/textures/Tiles101_1K-JPG_Color.jpg', normalMapUrl: '/textures/Tiles101_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Tiles101_Roughness.jpg' },
    'exposed-brick': { color: '#8B5A44', roughness: 0.95, metalness: 0, repeatScale: 0.35, preview: '🧱' },
    'concrete-raw': { color: '#A8A6A0', roughness: 0.95, metalness: 0, repeatScale: 0.15, preview: '/textures/Concrete025_1K-JPG_Color.jpg', textureUrl: '/textures/Concrete025_1K-JPG_Color.jpg', normalMapUrl: '/textures/Concrete025_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Concrete025_1K-JPG_Roughness.jpg' },
}

// export const WALL_MAT_DEFS: Record<WallMaterial, MaterialDef> = {
//     'paint': { color: '#FFFFFF', roughness: 0.85, metalness: 0, repeatScale: 0.1, preview: '⬜' },
//     'wallpaper-stripe': { color: '#E8E4DC', roughness: 0.7, metalness: 0, repeatScale: 0.3, preview: '⬜' },
//     'wallpaper-floral': { color: '#F0E6E4', roughness: 0.7, metalness: 0, repeatScale: 0.25, preview: '⬜' },
//     'wallpaper-textured': { color: '#EDEAE4', roughness: 0.9, metalness: 0, repeatScale: 0.4, preview: '⬜' },
//     'pvc-panel-groove': { color: '#E4DDCF', roughness: 0.55, metalness: 0, repeatScale: 1, preview: '⬜' },
//     'pvc-panel-brick': { color: '#C9B8A8', roughness: 0.75, metalness: 0, repeatScale: 0.5, preview: '🧱' },
//     'brick-red': { color: '#9C4A34', roughness: 0.92, metalness: 0, repeatScale: 0.35, preview: '🧱' },
//     'brick-white': { color: '#D8D2C4', roughness: 0.88, metalness: 0, repeatScale: 0.35, preview: '🧱' },
//     'tile-ceramic': { color: '#F2F1EC', roughness: 0.25, metalness: 0.05, repeatScale: 0.5, preview: '/textures/Tiles101_1K-JPG_Color.jpg', textureUrl: '/textures/Tiles101_1K-JPG_Color.jpg', normalMapUrl: '/textures/Tiles101_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Tiles101_Roughness.jpg' },
//     'exposed-brick': { color: '#8B5A44', roughness: 0.95, metalness: 0, repeatScale: 0.35, preview: '🧱' },
//     'concrete-raw': { color: '#A8A6A0', roughness: 0.95, metalness: 0, repeatScale: 0.15, preview: '/textures/Concrete025_1K-JPG_Color.jpg', textureUrl: '/textures/Concrete025_1K-JPG_Color.jpg', normalMapUrl: '/textures/Concrete025_1K-JPG_NormalGL.jpg', roughnessMapUrl: '/textures/Concrete025_1K-JPG_Roughness.jpg' },
// }