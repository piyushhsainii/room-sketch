export const APP = {
  name: "RoomSketch",
  description: "Draw a floor plan. Walk the home before it's built.",
  projectsLabel: "PROJECTS",
  noProjects: "No projects",
  freePlan: "Free",
  proPlan: "Pro",
  signOut: "Sign out",
  signIn: "Sign in",
  menu: "Menu",
} as const;

export const DASHBOARD = {
  headline: "Sketch a floor plan. Walk it in 3D.",
  subheadline:
    "Draw rooms and walls in the editor — the 3D model updates the instant you draw.",
} as const;

// The node-based floor plan editor: walls, doors, windows, stairs.
export const EDITOR = {
  toolbarLabel: "Draw",
  tools: {
    wall: { id: "wall" as const, label: "Wall" },
    door: { id: "door" as const, label: "Door" },
    window: { id: "window" as const, label: "Window" },
    stairs: { id: "stairs" as const, label: "Stairs" },
  },
  wallTypes: {
    solid: { id: "solid" as const, label: "Solid" },
    railing: { id: "railing" as const, label: "Railing" },
    open: { id: "open" as const, label: "Open" },
  },
  duplicate: "Duplicate",
  mirror: "Mirror",
  undo: "Undo",
  redo: "Redo",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
} as const;

// Materials registry — walls, floors, doors, furniture finishes.
export const MATERIALS = {
  sectionLabel: "Materials",
  categories: {
    wall: "Wall",
    floor: "Floor",
    door: "Door",
    furniture: "Furniture",
  },
  applyToRoom: "Apply to room",
  swatchCount: "60+ materials",
} as const;

// Live 3D pane and Walk Mode toolbar.
export const WORKSPACE = {
  splitViewLabel: "3D preview",
  buttonLabel: "Walk Mode",
  buttonLoadingLabel: "Building 3D scene…",
  buttonTooltip: "Walk through your floor plan at eye level",
  enteringWalkMode: "Entering Walk Mode…",

  extractingLabel: "Reading floor plan…",
  buildingLabel: "Building 3D model…",
  readyLabel: "Scene ready",

  errorNoWalls: "Draw at least one room before entering Walk Mode.",
  errorSceneFailed: "Couldn't load the 3D scene. Please try again.",

  loadingSteps: [
    "Reading floor plan data...",
    "Detecting rooms and walls...",
    "Placing doors and windows...",
    "Building 3D geometry...",
    "Applying materials and lighting...",
    "Finalizing scene...",
  ],

  toolbar: {
    orbit: "Orbit",
    walk: "Walk",
    topDown: "Top view",
    reset: "Reset camera",
    exit: "Exit",
  },

  cameraHelp: {
    orbit: "Left click + drag to rotate · Scroll to zoom · Right click to pan",
    walk: "WASD or arrow keys to move · Mouse to look",
    topDown: "Scroll to zoom · Right click to pan",
  },

  roomLabels: {
    fallback: "Room",
  },
} as const;

export const SHARE = {
  buttonLabel: "Share",
  copyLink: "Copy link",
  linkCopied: "Link copied",
  makePublic: "List in community gallery",
  makePrivate: "Keep private",
} as const;

export const MARQUEE = {
  label: "MADE WITH ROOMSKETCH",
  floorPlanCard: "Floor Plan",
  walkthroughCard: "3D Walkthrough",
} as const;

export const PRICING = {
  limitReachedProjects: "You've used your free project. Upgrade to add more.",
  walkModeLocked: "Walk Mode is a Pro feature.",
  sceneFinishesLocked: "Full scene finishes are a Pro feature.",
} as const;

export const ERRORS = {
  unauthorized: "You must be signed in.",
  supabaseMisconfigured: "Supabase environment variables are missing.",
  profileFailed: "Profile update failed.",
  saveFailed: "Couldn't save your project.",
  loadFailed: "Couldn't load this project.",
  projectNotFound: "Project not found.",
  forbidden: "You do not have access to this project.",
  projectLimitReached: "Free plan includes 1 project. Upgrade to add more.",
} as const;

export const WARNINGS = {
  autosaveFailed: "Autosave failed — your latest changes may not be saved.",
} as const;

export const A11Y = {
  openSidebar: "Open sidebar",
  closeSidebar: "Close sidebar",
  download: "Download",
  refresh: "Refresh",
  previous: "Previous",
  next: "Next",
  expand: "Expand",
  closePreview: "Close preview",
} as const;

export const AUTH = {
  loginRequiredTitle: "Sign in required",
  loginRequiredBody: "Please sign in to create and edit floor plans.",
  continueWithGoogle: "Continue with Google",
  orDivider: "or",
  emailLabel: "Email",
  emailPlaceholder: "you@company.com",
  sendMagicLink: "Send magic link",
  sending: "Sending...",
  sent: "Magic link sent. Check your email.",
  close: "Close",
} as const;

export const EMPTY_STATE = {
  title: "Your projects will appear here",
  hint: "Draw your first floor plan to get started.",
} as const;
