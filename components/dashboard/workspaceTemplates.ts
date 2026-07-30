// constants/workspaceTemplates.ts
import type { SceneConfig } from "../workspace/FloorPlanEditor";
import type { FloorPlanState } from "../workspace/lib/constants";

export type WorkspaceTemplate = {
  id: string;
  label: string;
  description: string;
  thumbnail: string;
  config: Partial<FloorPlanState> & { sceneConfig?: Partial<SceneConfig> };
};

// ── Studio Apartment — single 6m x 5m room ──────────────────────────────
const STUDIO_CONFIG: Partial<FloorPlanState> = {
  roomHeight: 2.8,
  lineNodes: [
    { id: "n1", x: 0, z: 0 },
    { id: "n2", x: 6, z: 0 },
    { id: "n3", x: 6, z: 5 },
    { id: "n4", x: 0, z: 5 },
  ],
  lineSegments: [
    {
      id: "s1",
      nodeIds: ["n1", "n2"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s2",
      nodeIds: ["n2", "n3"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s3",
      nodeIds: ["n3", "n4"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s4",
      nodeIds: ["n4", "n1"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
  ],
  closedShapes: [
    {
      id: "shape1",
      nodeIds: ["n1", "n2", "n3", "n4"],
      label: "Studio",
      floorMaterial: "plain",
      wallMaterial: "paint",
    },
  ],
  rooms: [],
  openings: [],
  annotations: [],
  furniture: [],
  stairs: [],
  wallDecor: [],
  lights: [],
  outdoorObjects: [],
  savedViews: [],
};

// ── Family Home — two rooms split by a shared partition wall ───────────
// Outer rectangle 10m x 7m, partition at x=5 splitting into two 5x7 rooms.
const FAMILY_HOME_CONFIG: Partial<FloorPlanState> = {
  roomHeight: 2.8,
  lineNodes: [
    { id: "n1", x: 0, z: 0 },
    { id: "n2", x: 10, z: 0 },
    { id: "n3", x: 10, z: 7 },
    { id: "n4", x: 0, z: 7 },
    { id: "n5", x: 5, z: 0 }, // partition top
    { id: "n6", x: 5, z: 7 }, // partition bottom
  ],
  lineSegments: [
    {
      id: "s1",
      nodeIds: ["n1", "n5"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s2",
      nodeIds: ["n5", "n2"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s3",
      nodeIds: ["n2", "n3"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s4",
      nodeIds: ["n3", "n6"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s5",
      nodeIds: ["n6", "n4"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s6",
      nodeIds: ["n4", "n1"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s7",
      nodeIds: ["n5", "n6"],
      thickness: 0.1,
      closed: false,
      wallType: "solid",
    }, // partition
  ],
  closedShapes: [
    {
      id: "shapeA",
      nodeIds: ["n1", "n5", "n6", "n4"],
      label: "Living Room",
      floorMaterial: "plain",
      wallMaterial: "paint",
    },
    {
      id: "shapeB",
      nodeIds: ["n5", "n2", "n3", "n6"],
      label: "Bedroom",
      floorMaterial: "plain",
      wallMaterial: "paint",
    },
  ],
  rooms: [],
  openings: [],
  annotations: [],
  furniture: [],
  stairs: [],
  wallDecor: [],
  lights: [],
  outdoorObjects: [],
  savedViews: [],
};

// ── Office Space — open-plan rectangle with a railing partial-divider ──
const OFFICE_CONFIG: Partial<FloorPlanState> = {
  roomHeight: 3.0,
  lineNodes: [
    { id: "n1", x: 0, z: 0 },
    { id: "n2", x: 12, z: 0 },
    { id: "n3", x: 12, z: 8 },
    { id: "n4", x: 0, z: 8 },
    { id: "n5", x: 6, z: 0 },
    { id: "n6", x: 6, z: 8 },
  ],
  lineSegments: [
    {
      id: "s1",
      nodeIds: ["n1", "n5"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s2",
      nodeIds: ["n5", "n2"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s3",
      nodeIds: ["n2", "n3"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s4",
      nodeIds: ["n3", "n6"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s5",
      nodeIds: ["n6", "n4"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s6",
      nodeIds: ["n4", "n1"],
      thickness: 0.15,
      closed: false,
      wallType: "solid",
    },
    {
      id: "s7",
      nodeIds: ["n5", "n6"],
      thickness: 0.1,
      closed: false,
      wallType: "railing",
    }, // open-plan divider
  ],
  closedShapes: [
    {
      id: "shapeA",
      nodeIds: ["n1", "n5", "n6", "n4"],
      label: "Open Desks",
      floorMaterial: "plain",
      wallMaterial: "paint",
    },
    {
      id: "shapeB",
      nodeIds: ["n5", "n2", "n3", "n6"],
      label: "Meeting Area",
      floorMaterial: "plain",
      wallMaterial: "paint",
    },
  ],
  rooms: [],
  openings: [],
  annotations: [],
  furniture: [],
  stairs: [],
  wallDecor: [],
  lights: [],
  outdoorObjects: [],
  savedViews: [],
};

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: "studio",
    label: "Studio Apartment",
    description: "Ideal for compact designs",
    thumbnail: "/preview-assets/studio-apartment.jpg",
    config: STUDIO_CONFIG,
  },
  {
    id: "family_home",
    label: "Family Home",
    description: "Multi-room spatial planning",
    thumbnail: "/preview-assets/family-home.jpg",
    config: FAMILY_HOME_CONFIG,
  },
  {
    id: "office",
    label: "Office Space",
    description: "Professional work environments",
    thumbnail: "/preview-assets/office.jpg",
    config: OFFICE_CONFIG,
  },
];
