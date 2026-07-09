# Floor Plan Editor — Codebase Context

A React/Next.js 2D-drawn + 3D-rendered floor plan editor. One giant client component
(`FloorPlanEditor.tsx`) owns all state; everything else is either a **pure render
helper**, a **dumb display component**, or a **panel that patches state via callbacks**.

Read this before touching anything — it tells you which file to open for a given
change so you don't have to grep the whole tree.

---

## 1. File map

FloorPlanEditor.tsx // God component: state, mouse handlers, 2D canvas draw, 3D scene wrapper, layout
Tools/constants.ts // All types, defaults, tool definitions, ICONS, color/material lists, FURNITURE_CATEGORIES
Tools/ToolBar.tsx // Thin wrapper — maps TOOL_GROUPS to <GroupButton>
Tools/GroupComponent.tsx // GroupButton — toolbar button + flyout variant picker (portals)
SceneConfigPanel.tsx // Right-dock "scene" tab UI — room colors, materials, lighting toggles (tabs: rooms/shapes/scene)
MaterialsPanel.tsx // Right-dock "materials" tab UI — global + per-room wall/floor material swatches (see §2, §8)
objects/scene-graph.tsx // <SceneGraphPanel> — collapsible tree (Models/Walls/Doors/Windows/Openings/Rooms/Labels), sits above PropsPanel
lib/helpers.ts // deriveClosedPolygons(), WALL_TEX (texture paths), misc geometry helpers
objects/wallmat.tsx // <WallMat> — wall material (plain by default, PBR textured opt-in via textured prop; now also accepts material?: WallMaterial, see §3b)
objects/floormat.tsx // <FloorMat> — floor material (verify: should mirror WallMat's plain-default pattern)
objects/doormat.tsx // <DoorMat> — door leaf material by style (natural/white/dark walnut/glass)
objects/door-variants.tsx // <DoorVariant3D> — renders all door tool variants (single/double swing, sliding, pocket, folding, garage)
objects/window-variant3d.tsx// <WindowVariant3D> — renders all window tool variants
objects/arch-header.tsx // <ArchHeader3D> — extruded semicircular-notch header mesh for archway openings
objects/line-walls-3d.tsx // <LineWalls3D> — extrudes freeform line-tool walls into 3D meshes; also renders line-wall openings and line-wall wall-decor (see §3b wall-decor bug writeup)
objects/wall-decor-mesh.tsx // <WallDecorMesh> — renders placed wall decor (led_strip/wall_panel_pvc/painting) given a precomputed angle+basePos; switch-based per-type geometry
furniture/furnitureMesh.tsx // <FurnitureMesh> — 3D furniture primitives keyed by FurnitureType
furniture/stairsMesh.tsx // <StairsMesh> — 3D stairs/elevator/ramp/spiral primitives
WalkModeControls.tsx // First-person WASD + pointer-lock controls (replaces OrbitControls)
../ui/Dock.tsx // Bottom dock shell (mobile-style expand/collapse sheet) hosting Properties/Scene Config/Materials tabs
../ui/ScrollableList.tsx // Custom-thumb scrollable container — use for ANY panel that scrolls (see §7)

**Nothing else owns state.** `FloorPlanEditor` holds `fp: FloorPlanState` (the floor
plan data) and `sceneConfig: SceneConfig` (3D appearance). Every other component is
either read-only (`Scene3D`, mesh components) or receives `(value, onChange)` and
calls `onChange` — no component maintains its own copy of plan data.

`THEME` (the light-mode color object) is defined in and exported from
`FloorPlanEditor.tsx` — `objects/scene-graph.tsx` and other panel components import
it from there rather than redefining it. If you add a new panel component, import
`THEME` the same way instead of hardcoding colors. (Note: `MaterialsPanel.tsx` as
currently written defines its own local `THEME` constant instead of importing the
shared one — inconsistent with this rule, worth fixing when next touched.)

**The following files appear in the project tree but have not yet been pasted into
this context/conversation — treat as unknown, do not assume behavior:**
`WorkspaceConfigPanel.tsx`, `WorkspaceContainer.tsx`, `WorkspaceCanvas.tsx`,
`WorkspaceLoader.tsx`, `WorkspaceToolbar.tsx`, `FloorPlanEditorModal.tsx`,
`FloorplanMinimap.tsx`, `Walk3dScene.tsx`. Ask for the relevant file before editing
anything that touches these.

---

## 2. Core data model (`Tools/constants.ts`)

```ts
FloorPlanState {
  rooms: EditorRoom[]        // rect rooms (x, z, width, depth, label) — drawn by 'room'/'pencil' tools
  lineNodes: LineNode[]      // {id, x, z} — vertices for freeform walls
  lineSegments: LineSegment[]// {id, nodeIds[], thickness, closed} — polylines through lineNodes
  closedShapes: ClosedShape[]// derived-then-persisted cycles in the line-wall graph (see §4)
  openings: EditorOpening[]  // doors/windows/archways, attached to EITHER a room wall OR a line segment
  furniture: PlacedFurniture[]
  stairs: PlacedStairs[]
  wallDecor: PlacedWallDecor[] // placed LED strips / PVC panels / paintings — attached to EITHER a room wall (roomId+wall+position) OR a line segment (segmentNodeIds+segmentT), same dual-system split as openings
  annotations: Annotation[]
  roomHeight: number         // global ceiling height (meters)
}

RoomSceneConfig {
  roomId: string
  wallColor?: string
  wallMaterial?: WallMaterial    // NEW — per-room wall surface material override
  floorMaterial?: FloorMaterial
}

SceneConfig {
  ambientIntensity: number
  wallRoughness: number
  wallTextured: boolean
  showFurniture: boolean
  showLabels: boolean
  fogEnabled: boolean
  doorStyle: DoorStyle
  globalFloorMaterial: FloorMaterial
  globalWallMaterial?: WallMaterial   // NEW — global default wall surface material
  rooms: RoomSceneConfig[]            // per-room overrides — see naming warning below
}
```

**⚠️ The field is `rooms`, not `roomOverrides`.** This has broken multiple times
when components were regenerated/rewritten independently — `MaterialsPanel.tsx`,
`Scene3D`, and a broken `<Canvas>` call site have all independently drifted to
inventing `roomOverrides` and/or a nonexistent top-level `SceneConfig.wallColor`
(wall color has always been per-room, never global-flat). Every consumer
(`Scene3D`'s `cfg.rooms.find(...)`, `SceneConfigPanel`'s `getRoomSceneCfg`/
`patchRoom`, `MaterialsPanel`'s `updateRoom`) must use the exact field name `rooms`.
**If a panel or the 3D scene "isn't syncing" with saved state, check for a renamed
field before assuming a logic bug** — this exact class of bug has recurred three
times in this project's history so far.

**Units are meters in "world space."** `PX_PER_M` (constants.ts) converts world
meters → 2D canvas pixels. `GRID_M` is the room/wall snap grid (0.5m). Furniture and
stairs-drag use a separate finer snap (`snapFurniture`, 0.1m, see §6) — don't reuse
`snapM` for furniture.

**Two parallel wall systems exist and both must be kept in sync when editing anything
wall/opening/decor related:**

- **Room walls**: implicit — 4 walls derived from `EditorRoom.x/z/width/depth`.
  Openings reference them via `opening.wall: 'north'|'south'|'east'|'west'` +
  `opening.position` (offset along that wall). Wall decor uses the identical
  `wall`/`position` pattern via `PlacedWallDecor.wall`/`position`.
- **Line walls**: explicit polylines (`lineNodes` + `lineSegments`). Openings on
  these use `opening.segmentNodeIds: [fromId, toId]` + `opening.segmentT` (0–1
  interpolation) instead of `wall`/`position`. Wall decor mirrors this via
  `PlacedWallDecor.segmentNodeIds`/`segmentT`.

`EditorOpening.roomId` and `PlacedWallDecor.roomId` are both overloaded: either an
`EditorRoom.id` or a `LineSegment.id` depending on which system placed it. Check
`segmentNodeIds` presence to know which (present → line wall; absent → room wall).

**Room walls are independently selectable/draggable** as of a later pass — a room
wall's synthetic id is the string `` `${roomId}::wall::${wall}` `` (not a real entity
id). `PropsPanel`, delete handlers, and hover/hit-test logic all special-case this
string pattern via `selectedId?.includes('::wall::')`. If you add new selectable
synthetic ids, follow this same string-tag convention rather than inventing a new
scheme.

**Opening variants and rendering:**

- `opening.type`: `'door' | 'window' | 'opening'`
- `opening.variant`: the specific tool id, e.g. `'door-swing-double'`,
  `'window-casement'`, `'opening-archway'`, `'opening-passage'`
- Passage (`opening-passage`) gets **no header at all** (full-height gap).
- Archway (`opening-archway`) gets a **curved semicircular header** via
  `ArchHeader3D`, not a flat box — this was a real bug (rendered as a flat
  "closed door" look) fixed by extruding a `THREE.Shape` with an `absarc` notch
  cut into the bottom-center. Header color/roughness now matches wall color
  (no more hardcoded tint).
- All other openings get a flat rectangular header box.

**Wall decor types (`PlacedWallDecor.type`)**: `'led_strip' | 'wall_panel_pvc' |
'painting'`. This is a _placed object_ system, distinct from `WallMaterial` (§3b) —
a wall can have both a surface material (e.g. `'wallpaper-floral'`) AND a discrete
`wall_panel_pvc` decor item mounted on top of it. Don't conflate the two.

---

## 3. Rendering — two completely separate pipelines

### 3a. 2D canvas (`draw2D` in FloorPlanEditor.tsx)

Plain `CanvasRenderingContext2D` — no React reconciliation, redrawn imperatively via
`scheduleRedraw()` (rAF-throttled). Draws, **in z-order**: grid → rooms → resize
handles (room handles AND closed-shape handles, see §4) → wall decor (labeled pills
for LED/painting/PVC panel, both room-wall and line-wall variants) → draw-preview
rect → pencil preview → line segments (+ length labels) → openings on segments →
closed-shape fills → line nodes → furniture icons → stairs icons → annotations →
live line/bend rubber-band.

If you add a new entity type, you must add its draw block here **and** its 3D mesh
separately — they don't share code.

### 3b. 3D scene (`Scene3D` → `Room3D` / `LineWalls3D` / mesh components)

Real `@react-three/fiber` tree. `Room3D` builds wall boxes per rect room, punching
holes for openings by splitting each wall into panels around opening positions.
Door and window rendering was refactored out of `Room3D` into their own components:

- `<DoorVariant3D op={op} angle={angle} basePos={basePos} doorStyle={doorStyle} />`
  — takes a precomputed world-space `basePos` and wall-alignment `angle` rather than
  the raw `wallAxis`/`room`/`wPos` triple `Room3D` used to pass. Internally branches
  on `op.variant` to render single-swing, double-swing (two half-width leaves meeting
  at center, hinge-then-rotate math so `angle=0` is always flush/closed — doors
  render **closed by default**, no open-angle animation currently exists), sliding,
  pocket, folding (accordion), and garage (rolled slats) geometries. Each leaf uses
  a `DoorFace` helper with inset panels + a handle cylinder for visual detail
  matching a real door face rather than a flat slab.
- `<WindowVariant3D op={op} angle={angle} basePos={basePos} />` — same
  precomputed-position pattern, branches on window variant.

`LineWalls3D` does the line-wall equivalent — extrudes wall panels along each
segment's node chain, punches openings the same way `Room3D` does for room walls
(sorted-by-`segmentT` opening list, cursor-based panel splitting), and separately
renders floors for closed line-wall polygons (`deriveClosedPolygons` → exact
`THREE.ShapeGeometry` per polygon, matched against persisted `ClosedShape` metadata
for `floorMaterial`) and wall decor (see below).

**Materials are theme-driven, not hardcoded**, as of the "remove default textures"
fix, and now support a richer per-surface material system:

- `WallMat({color, roughness, textured=false, material?})` — flat
  `meshStandardMaterial` unless `textured` is true (loads `WALL_TEX` normal/roughness
  maps via Suspense), OR unless `material` is a non-`'paint'` `WallMaterial` value, in
  which case it branches to render tiled wallpaper (repeat-wrapped texture/canvas) or
  PVC panel groove relief (same groove-box technique as `WallDecorMesh`'s
  `wall_panel_pvc` case, generalized to tile across the full wall width rather than
  one placed panel's width). `textured` flows from `SceneConfig.wallTextured` →
  `Room3D` prop → every `<WallMat>` call site; `material` flows from
  `SceneConfig.globalWallMaterial` → per-room `RoomSceneConfig.wallMaterial` →
  `Scene3D` resolution (`roomCfg?.wallMaterial ?? cfg.globalWallMaterial ?? 'paint'`)
  → `Room3D` prop → `<WallMat>` call sites. **Not every `<WallMat>` call site in
  `Room3D` forwards either prop** — only the no-opening full-wall case reliably does;
  the segment/header/sill panel cases around openings may still call
  `<WallMat color roughness />` without forwarding `wallTextured` or `material`.
  Worth auditing if textured/materialed walls look inconsistent around openings.
- `LineWalls3D` receives `wallMaterial` as one flat top-level prop (same pattern as
  its existing `wallColor`/`floorMaterial`) — **not per-segment**. All line-drawn
  walls in a given `<LineWalls3D>` call share one material. If per-shape line-wall
  material override is ever needed, it'd need to follow the `ClosedShape.floorMaterial`
  per-entity-override pattern (§4) rather than this flat-prop pattern.
- `FloorMat` — check this file before assuming behavior; it should follow the same
  `textured`/plain-by-default pattern (was mid-refactor, verify before editing).

#### Wall-decor centerline bug (fixed — know this pattern for future mesh types)

Both `Room3D`'s and `LineWalls3D`'s wall-decor rendering blocks originally computed
`basePos` using the exact same centerline coordinates as the wall mesh itself (e.g.
`room.z + T/2` for a north wall) — this places the decor mesh's full thickness dead
center _inside_ the solid wall box, fully occluded by opaque wall material on both
sides. It renders successfully (no error, no NaN, no dropped filter) but is
invisible in the 3D view while showing correctly in the 2D canvas — **this
asymmetry (correct in 2D, invisible in 3D, no console error) is the diagnostic tell
for this specific bug class**, and is worth checking before assuming a data/prop
plumbing issue when something "isn't showing up in 3D."

**Fix pattern**: offset the decor position outward along the wall's normal by
roughly `T/2 + smallGap` before passing it as `basePos`:

```ts
// LineWalls3D (line-wall variant, normal computed from segment angle)
const normalOffset = T / 2 + 0.02;
const nx = -Math.sin(angle) * normalOffset;
const nz = Math.cos(angle) * normalOffset;
// basePos = [dx + nx, d.heightOffset, dz + nz]

// Room3D (room-wall variant, normal is axis-aligned per wall side)
const normalOffset = T / 2 + 0.02;
// north: dz = room.z + normalOffset · south: dz = room.z + D - normalOffset
// west:  dx = room.x + normalOffset · east:  dx = room.x + W - normalOffset
```

Sign/direction needs eyeballing once visible — depends on winding order and which
side is "interior." If a newly-added wall-mounted mesh type is invisible in 3D but
fine in 2D, check for this exact bug (centerline burial) before looking anywhere else.

**Stairs geometry (`stairsMesh.tsx`) uses a fixed riser/run ratio, not a
footprint-stretch.** `StraightStairs` used to force the entire `roomHeight` to climb
across whatever shallow `depth` the placed stairs object had, producing near-vertical
slopes and railings that visually speared through walls (`hypot(d,h)` on a near-90°
slope ≈ `h`). Fixed by computing `numTreads` from realistic constants
(`RISER = 0.18m`, `RUN = 0.28m`), clamped by both available height AND available
depth, then deriving `usedH`/`usedD` from that — the flight now stops short of the
ceiling if the footprint is too shallow (correct behavior; means the person needs a
deeper stairs box) instead of exploding geometrically. `LStairs`/`UStairs`/
`RampStairs`/`SpiralStairs` were NOT patched with this same fix — they still use the
old force-fit pattern and may have the same slope bug if given a shallow footprint.

---

## 4. Line-wall → closed-shape conversion

`tryConvertClosedLineShape()` (in FloorPlanEditor.tsx) runs after every new line
segment is added. It BFS/DFS-walks the node adjacency graph to detect if the new
segment closed a cycle, then pushes a `ClosedShape` (dedup'd against existing ones).
This is how a freeform-drawn room becomes fillable/floor-materialable in
`SceneConfigPanel`'s "Shapes" tab — **closed shapes are never auto-promoted to a
`Room`**, they stay a separate entity type forever.

`deriveClosedPolygons()` (lib/helpers.ts) is the **read-time** equivalent, called
every render in `draw2D` and in `SceneConfigPanel`'s shapes tab (and in
`LineWalls3D`'s floor-rendering pass) — it recomputes cycles from
`lineNodes`/`lineSegments` live, independent of the persisted `closedShapes` array.
The persisted array only exists to hold per-shape metadata (label, floorMaterial)
that survives across renders; geometry itself is always re-derived.

**Closed shapes are now fully first-class selectable/draggable/resizable entities**
(this was previously incomplete/buggy and has since been fixed):

- **Select+drag as a whole unit**: `shapeDragRef` — click-tests via
  `hitClosedShape` (point-in-polygon), checked in `handleMouseDown`'s select branch
  **before** line-segment hit-testing, so clicking inside a closed area selects/drags
  the shape rather than falling through to the nearest border segment.
- **Resize via corner handles**: `shapeResizeRef` — 4 bbox-corner handles drawn in
  `draw2D` when a shape is selected, anchor-scale math in `handleMouseMove` scales
  all member nodes proportionally from the opposite corner.
- **Properties panel**: `PropsPanel` has a `shape` branch (label editing). **This had
  a real bug**: the panel's early-return "nothing selected" guard was updated to
  compute `shape` but the guard's boolean condition wasn't updated to include
  `!shape`, so selecting a shape silently fell through to the empty state. Fixed —
  if you add another new entity type to `PropsPanel`, double-check the early-return
  guard includes it, this is an easy step to miss.
- **Delete**: both the keyboard delete-key handler and the Properties panel's
  `onDelete` callback need (and now have) a `closedShapes` branch (and a
  `wallDecor` branch, added alongside it — same pattern, same file, checked before
  the generic openings fallback).

---

## 5. Tool system

`EditorTool` (constants.ts) is a big string union — includes `'wall-decor-led'`,
`'wall-decor-pvc'`, `'wall-decor-painting'` alongside the door/window/opening/stairs
groups. `TOOL_GROUPS` groups related tools (e.g. all door variants, all wall-decor
variants) under one toolbar button with a flyout. `ICONS` maps every leaf tool to an
SVG built via a shared `S(...)` wrapper — **icons rely on `stroke="currentColor"`**
so they inherit the button's text color; don't hardcode icon colors.

`Toolbar.tsx` just maps `TOOL_GROUPS` → `<GroupButton>`, tracking `lastUsed` (which
variant was picked last per group, e.g. remembers you last used "Casement Window").
`GroupComponent.tsx` still has hardcoded dark-theme colors in places (see §7) —
prefer converting to `THEME`/CSS vars over adding a third palette when touching it.

Tool behavior itself lives entirely in `FloorPlanEditor.tsx`'s
`handleMouseDown`/`handleMouseMove`/`handleMouseUp` — long if/else chains keyed on
`tool`. **This is the single largest function in the codebase and the most common
place you'll need to edit** for new-tool behavior. Pattern per tool: mousedown
places/starts an entity or begins a drag-ref, mousemove updates a ref or live
preview, mouseup commits + `pushHistory()`.

The wall-decor tool (`isWallDecorTool = tool.startsWith('wall-decor-')`) follows the
door/window placement pattern exactly: `hitRoom` + `getWallHit` for room walls,
falling through to `hitLineSegment` for line walls, each branch constructing a
`PlacedWallDecor` with the appropriate `wall`/`position` or
`segmentNodeIds`/`segmentT` fields and pushing via `setFp(prev => ({ ...prev,
wallDecor: [...] }))`. Dragging an existing decor item (`wallDecorDragRef`) supports
repositioning along its wall/segment; clamps to `[width/2, wallLen - width/2]` same
as initial placement.

**A real bug pattern to watch for: forgetting to clear a drag ref in
`handleMouseUp`/`onMouseLeave`.** `wallDragRef` (wall-resize drag, added when room
walls became independently selectable) was introduced in `handleMouseDown` but never
added to the cleanup list in `handleMouseUp` or the canvas's `onMouseLeave` — so
after clicking a wall once, the cursor got permanently stuck in resize mode with no
way to place doors/windows/etc. again (the door/window tool's `hitRoomWall` check
also **shouldn't exist at all** — that branch was mistakenly copy-pasted from the
`select` tool into the door/window handler, causing clicks near a wall to start a
wall-resize drag and `return` before ever reaching the actual door-placement code).
**Lesson: every new `xxxRef.current = {...}` assignment in `handleMouseDown` needs a
matching `xxxRef.current = null` in BOTH `handleMouseUp` and the canvas's
`onMouseLeave`,** and tool-specific drag logic should never be copy-pasted across
tool branches without checking whether it actually belongs there.
(`wallDecorDragRef` follows this cleanup rule correctly — was added to both cleanup
sites from the start.)

---

## 6. State management patterns — important gotchas

- **`fp` (floor plan) has undo/redo**: `pushHistory()` snapshots `fpRef.current`
  (deep-cloned) into `historyRef`. Call it **once per completed action**, not on
  every mousemove — dragging updates state continuously but only commits history on
  mouseup. If you add a new draggable entity type, don't forget the `pushHistory()`
  call in `handleMouseUp`'s history-trigger condition (`hadDrag` boolean — extend
  this, don't add a separate check).
- **Refs vs state, deliberately split for perf**: drag operations (`dragRoomRef`,
  `segDragRef`, `furnitureDragRef`, `resizeHandleRef`, `panToolRef`, `spacePanRef`,
  `shapeDragRef`, `shapeResizeRef`, `wallDragRef`, `wallDecorDragRef`) live in refs
  and mutate `fp` via `setFp` directly during mousemove — they do NOT go through
  React state for the drag anchor itself, only the resulting geometry. `hoveredIdRef`
  mirrors `hoveredId` state but is checked first to avoid triggering React
  re-renders on every mousemove pixel; `scheduleRedraw()` is called manually when it
  actually changes.
- **Two coordinate systems**: `wx`/`wz` = world meters (canvas-independent),
  `cx`/`cy` = canvas pixels. `evWorld()` converts a mouse event once per handler.
  `toWorld`/`toCanvas` are the raw conversion functions — pan/zoom apply here only.
- **Snap granularity is NOT uniform**: rooms/walls/nodes/closed-shape resize snap to
  `GRID_M` via `snapM()`. Furniture and stairs-drag use a separate finer snap
  (`snapFurniture`, 0.1m) — introduced because reusing `snapM` made furniture
  placement too coarse (couldn't nudge items precisely against a wall). Wall decor
  placement/drag does NOT snap to a grid at all — it clamps to wall bounds and stores
  a raw `parseFloat(...toFixed(2))` position, matching how openings (doors/windows)
  are positioned along a wall. If you add a new draggable entity, decide its snap
  granularity explicitly; don't assume `snapM` is correct.
- **Hit-testing order matters and is duplicated 3x**: `handleMouseDown` (select),
  `handleMouseMove` (hover), and `delete` tool each re-implement roughly the same
  priority order. Current order (select tool): node → opening → wall decor →
  furniture → stairs → **closed shape** → room → room wall → line segment →
  furniture (fallback). Closed shapes are intentionally checked before rooms/segments
  so interior clicks select the whole shape rather than the nearest border. There's
  no shared `hitTestAll()` — if you change priority in one place, check the other two.
- **`hitOpening`**, **`hitRoomWall`**, and **`hitWallDecor`** are newer hit-test
  helpers (openings and wall decor are independently selectable/hoverable/deletable
  rather than only reachable via their parent room/segment; room walls are
  independently selectable for the wall-drag-resize feature). All follow the same
  ref-based pattern as the older hit-testers, each branching on
  `segmentNodeIds` presence (line wall) vs `wall`/`position` (room wall) to compute
  world position before distance-testing.

---

## 7. Theming & shared UI

Two theme systems currently coexist — **know which file you're in**:

- `FloorPlanEditor.tsx` defines and **exports** `THEME` (light-mode hex/rgba object)
  — other panel components (`scene-graph.tsx`, etc.) import it from here rather than
  redefining it. Prefer this for any new component. (`MaterialsPanel.tsx` currently
  violates this by defining its own local `THEME` — see §8.)
- `SceneConfigPanel.tsx` uses CSS custom properties (`var(--fp-bg)`,
  `var(--fp-accent)`, `var(--fp-text-muted)`, etc.) — defined globally, respects
  light theme already. Different mechanism from `THEME` but same visual palette.
- `GroupComponent.tsx` (toolbar buttons/flyouts/tooltips) still has **hardcoded
  dark-theme colors** (`rgba(15,23,42,...)`, `color: 'white'`) in some spots — known
  inconsistency, not yet fully migrated.

**`ScrollableList` (`../ui/ScrollableList.tsx`)** — use this for any panel content
that needs to scroll. Native `overflowY: 'auto'` + native wheel scrolling does NOT
work inside floating panels here, because the 2D canvas's zoom-on-wheel listener is
attached natively (`addEventListener('wheel', ..., {passive:false})`) to
`canvasDivRef`, an ancestor of these floating panels, and unconditionally calls
`preventDefault()`/`stopPropagation()` — so any wheel event inside a child panel gets
hijacked into a canvas zoom before the panel can scroll. `ScrollableList` sidesteps
this entirely by not using wheel events at all: it renders a custom draggable
scrollbar thumb using plain `mousedown`/`mousemove`/`mouseup` (same pattern as the
canvas's own pan-drag), with `stopPropagation()` on the thumb's mousedown so it never
reaches the canvas. Wrap any new scrollable panel content in
`<ScrollableList maxHeight={N}>...</ScrollableList>` rather than adding
`overflowY: 'auto'` directly — currently used by `SceneGraphPanel` and the furniture
picker; **do not** try to fix scroll-in-a-floating-panel bugs with `onWheel={e =>
e.stopPropagation()}` alone — that was tried first and is unreliable due to React's
synthetic-event bubble-phase timing vs. the native ancestor listener; `ScrollableList`
is the settled solution. (`MaterialsPanel.tsx` does not yet wrap its content in
`ScrollableList` — worth checking once room lists get long.)

**Furniture picker** is NOT a separate component — it's inline JSX in
`FloorPlanEditor.tsx`, rendered conditionally when `tool === 'furniture'`, sourced
from `FURNITURE_CATEGORIES` (constants.ts, shape `{id, label, items: FurnitureType[]}`)
and `openFurnitureCats` state (a `Set<string>` of expanded category ids, mirroring
`SceneGraphPanel`'s `openGroups` pattern). Wrapped in `ScrollableList`. An earlier
paginated-carousel version (`furnitureCategoryIdx` state, "SEATING · 1/7" chevron
pager) was replaced by this collapsible-list version to match the Scene Graph's
visual style — `furnitureCategoryIdx` may be dead state if nothing else reads it,
worth removing if so.

**`SceneGraphPanel`** (`objects/scene-graph.tsx`) — collapsible tree grouped into
Models / Walls (room walls + line walls combined) / Doors / Windows / Openings /
Rooms / Labels, each with a count badge. Sits directly above `PropsPanel` in the
Properties tab of the bottom `Dock`. `openGroups` state defaults to **all
collapsed** (`{}`) — was previously pre-expanding several groups by default, changed
per explicit request. Wrapped in `ScrollableList`. (Wall decor is not currently a
group in this tree — candidate for addition per §9's "add a new entity type" recipe
step 10.)

---

## 8. Known in-progress/fragile areas (check before assuming)

- **`Scene3D`'s prop contract is `{ fp: FloorPlanState; sceneConfig?: SceneConfig;
walkMode?: boolean }` — it takes the whole `fp` object, not individual
  destructured fields.** This has been accidentally rewritten more than once into a
  version that takes `rooms`/`openings`/`wallDecor`/etc. as separate props instead —
  which silently drops `<LineWalls3D>` (needs the full `fp` to render line walls,
  closed-shape floors, and line-wall decor), `furniture`, and `stairs` entirely,
  since a decomposed-props version has no way to forward what it was never given.
  **If line walls / furniture / stairs vanish from the 3D preview after any
  `Scene3D`-adjacent change, check its prop signature first** — it's almost always
  this, not a rendering bug. The corresponding `<Canvas>` call site must pass
  `<Scene3D fp={fp} sceneConfig={sceneConfig} walkMode={walkMode} />` — not
  reconstructed individual props.
- **`SceneConfig.rooms` naming drift** — see §2. Grep for `roomOverrides` and a
  top-level `sceneConfig?.wallColor` (as opposed to `sceneConfig.rooms[].wallColor`)
  periodically; both are signs a component regenerated the type independently
  instead of importing it. Has recurred 3× across `MaterialsPanel.tsx`, a rewritten
  `Scene3D`, and a rewritten `<Canvas>` call site.
- **`FLOOR_MATERIALS` vs `FLOOR_MAT_DEFS`** — the materials-tab work introduced
  `FLOOR_MAT_DEFS`/`WALL_MAT_DEFS` (keyed objects, used by `MaterialsPanel`'s swatch
  renderer) alongside the pre-existing `FLOOR_MATERIALS` (array, used by
  `SceneConfigPanel`'s grid). Confirm whether these were meant to be unified into one
  source before adding new material entries — right now a new floor material added to
  one may not appear in the other's picker.
- **`MaterialsPanel.tsx` is a new Dock tab** (`'materials'`, alongside
  `'properties'`/`'scene'`) added in `FloorPlanEditor.tsx`'s `rightTab` union +
  `Dock` `items` array. Takes `fp`, `config={sceneConfig}`, `onChange={setSceneConfig}`
  — same wiring pattern as `SceneConfigPanel`'s embedded mode. Global swatches at top
  (wall + floor), per-room override rows below (mirrors `SceneConfigPanel`'s
  rooms-tab structure, not a new pattern). **Overlaps significantly with
  `SceneConfigPanel`'s existing Rooms tab** (both edit `RoomSceneConfig`) — worth
  deciding whether `SceneConfigPanel`'s wall-color/floor-material controls should be
  removed now that `MaterialsPanel` covers it, especially since the Rooms/Shapes tabs
  in `SceneConfigPanel` were already slated for removal (see below). Also defines its
  own local `THEME` object instead of importing the shared one from
  `FloorPlanEditor.tsx` — inconsistent with §7's convention, not yet fixed.
- **`FloorMat`** — not yet verified to follow the same "plain by default, `textured`
  opt-in" pattern as `WallMat`. Check before assuming.
- **`WallMat` texture/material forwarding is inconsistent** — only the no-opening
  full-wall panel reliably passes `textured={wallTextured}` and `material={wallMaterial}`;
  the segment/header/sill panels around openings may not forward either. Low-priority
  visual inconsistency around openings, not yet fully audited/fixed.
- **`LStairs`/`UStairs`/`RampStairs`/`SpiralStairs`** likely have the same
  footprint-vs-height slope bug that `StraightStairs` had, unpatched.
- **`RoomSceneConfig.wallColor`/`wallMaterial`/`floorMaterial` are all optional
  (`?`), not required.** This was a deliberate fix — `patchRoom` used to inject a
  default `floorMaterial: 'wood'` into a room's config the _first time you touched
  wallColor_, silently overriding whatever floor material the room should have
  inherited from `globalFloorMaterial`. Now all three fields resolve via fallback
  chains at read time (`roomCfg?.wallColor ?? '#FFFFFF'`, `roomCfg?.wallMaterial ??
cfg.globalWallMaterial ?? 'paint'`, `roomCfg?.floorMaterial ??
cfg.globalFloorMaterial ?? 'plain'`) rather than being baked in eagerly. **If you
  ever add a new per-room override field, follow this same optional +
  fallback-at-read-time pattern — do not inject a default into the stored object.**
- **Default colors**: room walls/floors were changed from brown/wood
  (`#8B7B6B`/`'wood'`) to white/plain (`#FFFFFF`/`'plain'`) in several places —
  `DEFAULT_SCENE_CONFIG`, `Room3D` prop defaults, `SceneConfigPanel`'s
  `getRoomSceneCfg` fallback and `patchRoom`'s new-entry fallback,
  `tryConvertClosedLineShape`'s new-shape `color`. These are separate literals with
  no single source of truth — if the "default color" ever needs to change again,
  grep for `8B7B6B` and `'wood'` across the codebase rather than assuming one
  constant controls it. (Default wall _material_ is `'paint'` — set in
  `DEFAULT_SCENE_CONFIG.globalWallMaterial` — should follow the same grep-don't-assume
  caution if it's ever changed.)
- **`SceneConfigPanel`'s tab structure** (`'rooms' | 'shapes' | 'scene'`) is a known
  target for simplification — per an earlier request, the Rooms and Shapes tabs were
  proposed for removal to leave only Scene (this predates and is now somewhat
  superseded by `MaterialsPanel` covering the Rooms tab's material-picking role —
  see above). **Not yet applied.** Before touching `SceneConfigPanel.tsx`, get the
  current file first; it has moved on from earlier versions described in older
  context (now uses `var(--fp-*)`, `embedded` prop, per-shape floor material grid,
  etc.) and guessing at a patch risks reintroducing already-fixed bugs.
- **`furnitureCategoryIdx`** may be dead state left over from the carousel-picker
  version, now that the picker is a collapsible list using `openFurnitureCats`
  instead. Confirm nothing else reads it before removing.
- **Wall-decor centerline burial bug** — fixed in both `Room3D` and `LineWalls3D`
  (see §3b) but worth re-checking if either file is regenerated/rewritten wholesale
  again, since that's exactly how this bug and the `SceneConfig.rooms` naming drift
  both originally got reintroduced in this project.

---

## 9. Quick recipes

**Add a new entity type (e.g. "zones"):**

1. Add type + array to `FloorPlanState` (constants.ts).
2. Add a `draw2D` block (2D icon/render).
3. Add a 3D mesh component + render it in `Scene3D`. **If it's wall-mounted, offset
   it off the wall centerline along the wall normal (§3b) — don't place it at the
   same position as the wall mesh itself, or it'll render buried/invisible.**
4. Add hit-testing in `handleMouseDown`/`handleMouseMove`/delete tool (3 places,
   consistent priority order — see §6).
5. Add drag-ref (`xxxRef`) + mousemove handling if draggable. **Clear the ref in
   BOTH `handleMouseUp` AND the canvas's `onMouseLeave`** (see §5's bug writeup —
   this exact mistake has happened before).
6. Add `pushHistory()` triggering — extend `handleMouseUp`'s `hadDrag` boolean.
7. Add a branch in `PropsPanel` for editing + delete — **remember to add the new
   entity's presence check to the early-return "nothing selected" guard**, not just
   the JSX branch (this exact mistake has happened before, with closed shapes).
8. Add to the keyboard delete-key handler's type-check chain.
9. Add a toolbar entry in `TOOL_GROUPS` + icon in `ICONS` (icon must use
   `stroke="currentColor"`).
10. If it should appear in the Scene Graph panel, add a group to `buildSceneGraph()`
    in `objects/scene-graph.tsx`.

**Add a new scene-level toggle (e.g. `wallTextured`):**

1. Add field to `SceneConfig` type + `DEFAULT_SCENE_CONFIG`.
2. Add a `<CfgToggle label="..." value={config.x} onChange={v => patchScene({x: v})} />`
   line in `SceneConfigPanel`'s scene section — don't invent a new field component,
   `CfgToggle`/`CfgLabel`/`ColorSwatch` already cover checkbox/label/swatch needs.
3. Thread the value through `Scene3D` → wherever it's consumed. Check **every**
   relevant material call site actually forwards the new prop (see the incomplete
   `wallTextured`/`wallMaterial` forwarding issue in §8 for what happens when one is
   missed).

**Add a new per-room override field:** make it optional on `RoomSceneConfig`, resolve
via `??` fallback chain at read time — never inject a default into the stored patch
object (see §8). **Use the exact field name `rooms` on `SceneConfig` when reading/
writing the array itself — do not rename it, even locally in a new component** (see
§2's naming-drift warning).

**Add a scrollable panel:** wrap content in `<ScrollableList maxHeight={N}>`, don't
use `overflowY: 'auto'` directly (see §7 — wheel events get hijacked by the canvas's
zoom listener).

**Change default wall/floor color or material:** touch all the literals listed in
§8, not just one.

**Add a new wall-mounted mesh type (decor, fixtures, etc.):** follow §3b's
normal-offset pattern from the start — do not place `basePos` at the wall's raw
centerline coordinates, even though that's what the wall mesh itself uses. This
exact mistake has already happened twice (once each for `Room3D` and `LineWalls3D`)
and produces a "works in 2D, silently invisible in 3D, no errors" symptom that's
easy to mis-diagnose as a data/plumbing bug instead of a geometry occlusion bug.

**Before assuming a "state not syncing" bug is a logic error:** grep for field-name
drift first (`roomOverrides` vs `rooms`, decomposed `Scene3D` props vs `fp`/
`sceneConfig`, etc.) — this class of bug has been the actual cause more often than
not in this project so far, usually introduced when a file gets wholesale
regenerated instead of incrementally patched.
