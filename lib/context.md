# Floor Plan Editor — Codebase Context

A React/Next.js 2D-drawn + 3D-rendered floor plan editor. One giant client component
(`FloorPlanEditor.tsx`) owns all state; everything else is either a **pure render
helper**, a **dumb display component**, or a **panel that patches state via callbacks**.

Read this before touching anything — it tells you which file to open for a given
change so you don't have to grep the whole tree.

---

## 1. File map

```
FloorPlanEditor.tsx        // God component: state, mouse handlers, 2D canvas draw, 3D scene wrapper, layout
Tools/constants.ts         // All types, defaults, tool definitions, ICONS, color/material lists, FURNITURE_CATEGORIES
Tools/ToolBar.tsx          // Thin wrapper — maps TOOL_GROUPS to <GroupButton>
Tools/GroupComponent.tsx   // GroupButton — toolbar button + flyout variant picker (portals)
SceneConfigPanel.tsx       // Right-dock "scene" tab UI — room colors, materials, lighting toggles (tabs: rooms/shapes/scene)
objects/scene-graph.tsx    // <SceneGraphPanel> — collapsible tree (Models/Walls/Doors/Windows/Openings/Rooms/Labels), sits above PropsPanel
lib/helpers.ts             // deriveClosedPolygons(), WALL_TEX (texture paths), misc geometry helpers
objects/wallmat.tsx         // <WallMat> — wall material (plain by default, PBR textured opt-in via `textured` prop)
objects/floormat.tsx        // <FloorMat> — floor material (verify: should mirror WallMat's plain-default pattern)
objects/doormat.tsx         // <DoorMat> — door leaf material by style (natural/white/dark walnut/glass)
objects/door-variants.tsx   // <DoorVariant3D> — renders all door tool variants (single/double swing, sliding, pocket, folding, garage)
objects/window-variant3d.tsx// <WindowVariant3D> — renders all window tool variants
objects/arch-header.tsx     // <ArchHeader3D> — extruded semicircular-notch header mesh for archway openings
objects/line-walls-3d.tsx   // <LineWalls3D> — extrudes freeform line-tool walls into 3D meshes
furniture/furnitureMesh.tsx // <FurnitureMesh> — 3D furniture primitives keyed by FurnitureType
furniture/stairsMesh.tsx    // <StairsMesh> — 3D stairs/elevator/ramp/spiral primitives
WalkModeControls.tsx        // First-person WASD + pointer-lock controls (replaces OrbitControls)
../ui/Dock.tsx              // Bottom dock shell (mobile-style expand/collapse sheet) hosting Properties/Scene Config tabs
../ui/ScrollableList.tsx    // Custom-thumb scrollable container — use for ANY panel that scrolls (see §7)
```

**Nothing else owns state.** `FloorPlanEditor` holds `fp: FloorPlanState` (the floor
plan data) and `sceneConfig: SceneConfig` (3D appearance). Every other component is
either read-only (`Scene3D`, mesh components) or receives `(value, onChange)` and
calls `onChange` — no component maintains its own copy of plan data.

`THEME` (the light-mode color object) is defined in and exported from
`FloorPlanEditor.tsx` — `objects/scene-graph.tsx` and other panel components import
it from there rather than redefining it. If you add a new panel component, import
`THEME` the same way instead of hardcoding colors.

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
  annotations: Annotation[]
  roomHeight: number         // global ceiling height (meters)
}

SceneConfig {
  ambientIntensity, wallRoughness, wallTextured, showFurniture,
  showLabels, fogEnabled, doorStyle, globalFloorMaterial,
  rooms: RoomSceneConfig[]   // per-room override: {roomId, wallColor?, floorMaterial?} — BOTH OPTIONAL, see §8
}
```

**Units are meters in "world space."** `PX_PER_M` (constants.ts) converts world
meters → 2D canvas pixels. `GRID_M` is the room/wall snap grid (0.5m). Furniture and
stairs-drag use a separate finer snap (`snapFurniture`, 0.1m, see §6) — don't reuse
`snapM` for furniture.

**Two parallel wall systems exist and both must be kept in sync when editing anything
wall/opening related:**

- **Room walls**: implicit — 4 walls derived from `EditorRoom.x/z/width/depth`.
  Openings reference them via `opening.wall: 'north'|'south'|'east'|'west'` +
  `opening.position` (offset along that wall).
- **Line walls**: explicit polylines (`lineNodes` + `lineSegments`). Openings on
  these use `opening.segmentNodeIds: [fromId, toId]` + `opening.segmentT` (0–1
  interpolation) instead of `wall`/`position`.

`EditorOpening.roomId` is overloaded: it's either an `EditorRoom.id` or a
`LineSegment.id` depending on which system placed it. Check `segmentNodeIds` presence
to know which.

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

---

## 3. Rendering — two completely separate pipelines

### 3a. 2D canvas (`draw2D` in FloorPlanEditor.tsx)

Plain `CanvasRenderingContext2D` — no React reconciliation, redrawn imperatively via
`scheduleRedraw()` (rAF-throttled). Draws, **in z-order**: grid → rooms → resize
handles (room handles AND closed-shape handles, see §4) → draw-preview rect → pencil
preview → line segments (+ length labels) → openings on segments → closed-shape
fills → line nodes → furniture icons → stairs icons → annotations → live line/bend
rubber-band.

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

`LineWalls3D` does the line-wall equivalent (not pasted into this conversation —
treat as a black box unless you're editing wall extrusion; ask for the file before
changing anything there).

**Materials are theme-driven, not hardcoded**, as of the "remove default textures"
fix:

- `WallMat({color, roughness, textured=false})` — flat `meshStandardMaterial` unless
  `textured` is true, in which case it Suspense-loads `WALL_TEX` normal/roughness
  maps. `textured` flows from `SceneConfig.wallTextured` → `Room3D` prop → every
  `<WallMat>` call site. **Not every `<WallMat>` call site in `Room3D` passes
  `textured` through** — only the no-opening full-wall case does currently; the
  segment/header/sill panel cases still call `<WallMat color roughness />` without
  forwarding `wallTextured`. Worth auditing if textured walls look inconsistent
  around openings.
- `FloorMat` — check this file before assuming behavior; it should follow the same
  `textured`/plain-by-default pattern (was mid-refactor, verify before editing).

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
every render in `draw2D` and in `SceneConfigPanel`'s shapes tab — it recomputes
cycles from `lineNodes`/`lineSegments` live, independent of the persisted
`closedShapes` array. The persisted array only exists to hold per-shape metadata
(label, floorMaterial) that survives across renders; geometry itself is always
re-derived.

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
  `onDelete` callback need (and now have) a `closedShapes` branch.

---

## 5. Tool system

`EditorTool` (constants.ts) is a big string union. `TOOL_GROUPS` groups related tools
(e.g. all door variants) under one toolbar button with a flyout. `ICONS` maps every
leaf tool to an SVG built via a shared `S(...)` wrapper — **icons rely on
`stroke="currentColor"`** so they inherit the button's text color; don't hardcode
icon colors.

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
  `shapeDragRef`, `shapeResizeRef`, `wallDragRef`) live in refs and mutate `fp` via
  `setFp` directly during mousemove — they do NOT go through React state for the drag
  anchor itself, only the resulting geometry. `hoveredIdRef` mirrors `hoveredId`
  state but is checked first to avoid triggering React re-renders on every mousemove
  pixel; `scheduleRedraw()` is called manually when it actually changes.
- **Two coordinate systems**: `wx`/`wz` = world meters (canvas-independent),
  `cx`/`cy` = canvas pixels. `evWorld()` converts a mouse event once per handler.
  `toWorld`/`toCanvas` are the raw conversion functions — pan/zoom apply here only.
- **Snap granularity is NOT uniform**: rooms/walls/nodes/closed-shape resize snap to
  `GRID_M` via `snapM()`. Furniture and stairs-drag use a separate finer snap
  (`snapFurniture`, 0.1m) — introduced because reusing `snapM` made furniture
  placement too coarse (couldn't nudge items precisely against a wall). If you add a
  new draggable entity, decide its snap granularity explicitly; don't assume `snapM`
  is correct.
- **Hit-testing order matters and is duplicated 3x**: `handleMouseDown` (select),
  `handleMouseMove` (hover), and `delete` tool each re-implement roughly the same
  priority order. Current order (select tool): node → opening → furniture → stairs →
  **closed shape** → room → room wall → line segment → furniture (fallback). Closed
  shapes are intentionally checked before rooms/segments so interior clicks select
  the whole shape rather than the nearest border. There's no shared `hitTestAll()` —
  if you change priority in one place, check the other two.
- **`hitOpening`** and **`hitRoomWall`** are newer hit-test helpers (openings are now
  independently selectable/hoverable/deletable rather than only reachable via their
  parent room/segment; room walls are independently selectable for the wall-drag-
  resize feature). Both follow the same ref-based pattern as the older hit-testers.

---

## 7. Theming & shared UI

Two theme systems currently coexist — **know which file you're in**:

- `FloorPlanEditor.tsx` defines and **exports** `THEME` (light-mode hex/rgba object)
  — other panel components (`scene-graph.tsx`, etc.) import it from here rather than
  redefining it. Prefer this for any new component.
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
is the settled solution.

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
per explicit request. Wrapped in `ScrollableList`.

---

## 8. Known in-progress/fragile areas (check before assuming)

- **`FloorMat`** — not yet verified to follow the same "plain by default, `textured`
  opt-in" pattern as `WallMat`. Check before assuming.
- **`WallMat` texture forwarding is inconsistent** — only the no-opening full-wall
  panel passes `textured={wallTextured}`; the segment/header/sill panels around
  openings don't forward it. Low-priority visual inconsistency, not yet fixed.
- **`LStairs`/`UStairs`/`RampStairs`/`SpiralStairs`** likely have the same
  footprint-vs-height slope bug that `StraightStairs` had, unpatched.
- **`RoomSceneConfig.wallColor`/`floorMaterial` are optional (`?`), not required.**
  This was a deliberate fix — `patchRoom` used to inject a default `floorMaterial:
'wood'` into a room's config the _first time you touched wallColor_, silently
  overriding whatever floor material the room should have inherited from
  `globalFloorMaterial`. Now both fields resolve via fallback chains at read time
  (`roomCfg?.wallColor ?? '#FFFFFF'`, `roomCfg?.floorMaterial ?? cfg.globalFloorMaterial
?? 'plain'`) rather than being baked in eagerly. **If you ever add a new per-room
  override field, follow this same optional + fallback-at-read-time pattern — do not
  inject a default into the stored object.**
- **Default colors**: room walls/floors were changed from brown/wood
  (`#8B7B6B`/`'wood'`) to white/plain (`#FFFFFF`/`'plain'`) in several places —
  `DEFAULT_SCENE_CONFIG`, `Room3D` prop defaults, `SceneConfigPanel`'s
  `getRoomSceneCfg` fallback and `patchRoom`'s new-entry fallback,
  `tryConvertClosedLineShape`'s new-shape `color`. These are separate literals with
  no single source of truth — if the "default color" ever needs to change again,
  grep for `8B7B6B` and `'wood'` across the codebase rather than assuming one
  constant controls it.
- **`SceneConfigPanel`'s tab structure** (`'rooms' | 'shapes' | 'scene'`) is a known
  target for simplification — per the most recent request, the Rooms and Shapes tabs
  are being removed to leave only Scene. **Not yet applied** — the version of this
  file with the removal has not been confirmed/pasted back into this conversation.
  Before touching `SceneConfigPanel.tsx`, get the current file first; it has moved on
  from the version described in earlier context (now uses `var(--fp-*)`, `embedded`
  prop, per-shape floor material grid, etc.) and guessing at a patch risks
  reintroducing already-fixed bugs.
- **`furnitureCategoryIdx`** may be dead state left over from the carousel-picker
  version, now that the picker is a collapsible list using `openFurnitureCats`
  instead. Confirm nothing else reads it before removing.

---

## 9. Quick recipes

**Add a new entity type (e.g. "zones"):**

1. Add type + array to `FloorPlanState` (constants.ts).
2. Add a `draw2D` block (2D icon/render).
3. Add a 3D mesh component + render it in `Scene3D`.
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
   `wallTextured` forwarding issue in §8 for what happens when one is missed).

**Add a new per-room override field:** make it optional on `RoomSceneConfig`, resolve
via `??` fallback chain at read time — never inject a default into the stored patch
object (see §8).

**Add a scrollable panel:** wrap content in `<ScrollableList maxHeight={N}>`, don't
use `overflowY: 'auto'` directly (see §7 — wheel events get hijacked by the canvas's
zoom listener).

**Change default wall/floor color:** touch all the literals listed in §8, not just
one.
