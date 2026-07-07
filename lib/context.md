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
Tools/constants.ts         // All types, defaults, tool definitions, ICONS, color/material lists
Tools/ToolBar.tsx          // Thin wrapper — maps TOOL_GROUPS to <GroupButton>
Tools/GroupComponent.tsx   // GroupButton — toolbar button + flyout variant picker (portals)
SceneConfigPanel.tsx       // Right-dock "scene" tab UI — room colors, materials, lighting toggles
lib/helpers.ts             // deriveClosedPolygons(), WALL_TEX (texture paths), misc geometry helpers
objects/wallmat.tsx         // <WallMat> — wall material (plain by default, PBR textured opt-in)
objects/floormat.tsx        // <FloorMat> — floor material (check before editing; same pattern as wallmat)
objects/doormat.tsx         // <DoorMat> — door material by style
objects/line-walls-3d.tsx   // <LineWalls3D> — extrudes freeform line-tool walls into 3D meshes
furniture/furnitureMesh.tsx // <FurnitureMesh> — 3D furniture primitives keyed by FurnitureType
furniture/stairsMesh.tsx    // <StairsMesh> — 3D stairs/elevator primitives
WalkModeControls.tsx        // First-person WASD + pointer-lock controls (replaces OrbitControls)
```

**Nothing else owns state.** `FloorPlanEditor` holds `fp: FloorPlanState` (the floor
plan data) and `sceneConfig: SceneConfig` (3D appearance). Every other component is
either read-only (`Scene3D`, mesh components) or receives `(value, onChange)` and
calls `onChange` — no component maintains its own copy of plan data.

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
  rooms: RoomSceneConfig[]   // per-room override: {roomId, wallColor, floorMaterial}
}
```

**Units are meters in "world space."** `PX_PER_M` (constants.ts) converts world
meters → 2D canvas pixels. `GRID_M` is the room/wall snap grid (0.5m). Furniture uses
its own finer snap (0.1m, see §6) — don't reuse `snapM` for furniture.

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

---

## 3. Rendering — two completely separate pipelines

### 3a. 2D canvas (`draw2D` in FloorPlanEditor.tsx)
Plain `CanvasRenderingContext2D` — no React reconciliation, redrawn imperatively via
`scheduleRedraw()` (rAF-throttled). Draws, **in z-order**: grid → rooms → resize
handles → draw-preview rect → pencil preview → line segments (+ length labels) →
openings on segments → closed-shape fills → line nodes → furniture icons → stairs
icons → annotations → live line/bend rubber-band.

If you add a new entity type, you must add its draw block here **and** its 3D mesh
separately — they don't share code.

### 3b. 3D scene (`Scene3D` → `Room3D` / `LineWalls3D` / mesh components)
Real `@react-three/fiber` tree. `Room3D` builds wall boxes per rect room, punching
holes for openings by splitting each wall into panels around opening positions
(see the `panels.push(...)` loop — header above door/window, sill below window,
glass pane, swinging door mesh). `LineWalls3D` does the equivalent for line-tool
walls (not pasted here — treat as a black box unless you're editing wall extrusion).

**Materials are theme-driven, not hardcoded**, as of the "remove default textures"
fix:
- `WallMat({color, roughness, textured=false})` — flat `meshStandardMaterial` unless
  `textured` is true, in which case it Suspense-loads `WALL_TEX` normal/roughness
  maps. `textured` flows from `SceneConfig.wallTextured` → `Room3D` prop → every
  `<WallMat>` call site.
- `FloorMat` — check this file before assuming behavior; it should follow the same
  `textured`/plain-by-default pattern (was mid-refactor, verify before editing).

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

**Selecting/dragging a whole closed shape as one unit** requires matching a derived
polygon back to its `ClosedShape` id by comparing node-id sets (see `shapeMatch`
pattern) — there's no direct id on the derived polygon itself.

---

## 5. Tool system

`EditorTool` (constants.ts) is a big string union. `TOOL_GROUPS` groups related tools
(e.g. all door variants) under one toolbar button with a flyout. `ICONS` maps every
leaf tool to an SVG built via a shared `S(...)` wrapper — **icons rely on
`stroke="currentColor"`** so they inherit the button's text color; don't hardcode
icon colors.

`Toolbar.tsx` just maps `TOOL_GROUPS` → `<GroupButton>`, tracking `lastUsed` (which
variant was picked last per group, e.g. remembers you last used "Casement Window").

Tool behavior itself lives entirely in `FloorPlanEditor.tsx`'s
`handleMouseDown`/`handleMouseMove`/`handleMouseUp` — long if/else chains keyed on
`tool`. **This is the single largest function in the codebase and the most common
place you'll need to edit** for new-tool behavior. Pattern per tool: mousedown
places/starts an entity or begins a drag-ref, mousemove updates a ref or live
preview, mouseup commits + `pushHistory()`.

---

## 6. State management patterns — important gotchas

- **`fp` (floor plan) has undo/redo**: `pushHistory()` snapshots `fpRef.current`
  (deep-cloned) into `historyRef`. Call it **once per completed action**, not on
  every mousemove — dragging updates state continuously but only commits history on
  mouseup. If you add a new draggable entity type, don't forget the `pushHistory()`
  call in `handleMouseUp`'s history-trigger condition.
- **Refs vs state, deliberately split for perf**: drag operations (`dragRoomRef`,
  `segDragRef`, `furnitureDragRef`, `resizeHandleRef`, `panToolRef`, `spacePanRef`)
  live in refs and mutate `fp` via `setFp` directly during mousemove — they do NOT
  go through React state for the drag anchor itself, only the resulting geometry.
  `hoveredIdRef` mirrors `hoveredId` state but is checked first to avoid
  triggering React re-renders on every mousemove pixel; `scheduleRedraw()` is called
  manually when it actually changes.
- **Two coordinate systems**: `wx`/`wz` = world meters (canvas-independent),
  `cx`/`cy` = canvas pixels. `evWorld()` converts a mouse event once per handler.
  `toWorld`/`toCanvas` are the raw conversion functions — pan/zoom apply here only.
- **Snap granularity is NOT uniform**: rooms/walls/nodes snap to `GRID_M` via
  `snapM()`. Furniture/stairs use a separate finer snap (`snapFurniture`, 0.1m) —
  introduced because reusing `snapM` made furniture placement too coarse. If you add
  a new draggable entity, decide its snap granularity explicitly; don't assume
  `snapM` is correct.
- **Hit-testing order matters and is duplicated 3x**: `handleMouseDown` (select),
  `handleMouseMove` (hover), and `delete` tool each re-implement roughly the same
  priority order (node → furniture → stairs → room → segment → closed shape).
  There's no shared `hitTestAll()` — if you change priority in one place, check the
  other two.

---

## 7. Theming

Two theme systems currently coexist — **know which file you're in**:
- `FloorPlanEditor.tsx` uses a local `THEME` JS object (`THEME.bg`, `THEME.text`,
  etc.) — hardcoded hex/rgba, light theme.
- `SceneConfigPanel.tsx` uses CSS custom properties (`var(--fp-bg)`,
  `var(--fp-accent)`, `var(--fp-text-muted)`, etc.) — defined somewhere global (not
  in this file), respects light theme already.
- `GroupComponent.tsx` (toolbar buttons/flyouts/tooltips) still has **hardcoded
  dark-theme colors** (`rgba(15,23,42,...)`, `color: 'white'`) — this was
  identified as inconsistent and is mid-fix. If you touch toolbar styling, prefer
  converting to the `var(--fp-*)` custom properties SceneConfigPanel uses, for
  consistency, rather than adding a third hardcoded palette.

---

## 8. Known in-progress/fragile areas (as of last edits)

- **`FloorMat`** — not yet verified to follow the same "plain by default, `textured`
  opt-in" pattern as `WallMat`. Check before assuming.
- **Closed-shape selection/drag** — was recently added (`shapeDragRef` pattern
  mirroring `segDragRef`); verify it's fully wired into `PropsPanel` delete branch
  and the keyboard delete handler, both of which need a `closedShapes` case.
  Line-drawn shapes also lacked whole-object select/drag/delete support that
  room-tool shapes had for free — this was the reason for adding the shape-match
  pattern.
- **`SceneConfig.wallTextured`** — newly added field; must exist in the type
  (`FloorPlanEditor.tsx`), `DEFAULT_SCENE_CONFIG` (`constants.ts`), and be threaded
  through `Scene3D` → `Room3D` → every `<WallMat>` call site, plus `LineWalls3D` if
  it renders walls independently. If textures reappear/disappear unexpectedly,
  check this chain first.
- **Default colors**: room walls/floors were changed from brown/wood
  (`#8B7B6B`/`'wood'`) to white/plain (`#FFFFFF`/`'plain'`) in several places —
  `DEFAULT_SCENE_CONFIG`, `Room3D` prop defaults, `SceneConfigPanel`'s
  `getRoomSceneCfg` fallback and `patchRoom`'s new-room fallback. These are four
  separate literals with no single source of truth — if the "default color" ever
  needs to change again, grep for `8B7B6B` and `'wood'` across the codebase rather
  than assuming one constant controls it.

---

## 9. Quick recipes

**Add a new entity type (e.g. "zones"):**
1. Add type + array to `FloorPlanState` (constants.ts).
2. Add a `draw2D` block (2D icon/render).
3. Add a 3D mesh component + render it in `Scene3D`.
4. Add hit-testing in `handleMouseDown`/`handleMouseMove`/delete tool (3 places).
5. Add drag-ref + mousemove/mouseup handling if draggable.
6. Add a branch in `PropsPanel` for editing + delete.
7. Add to the keyboard delete-key handler's type-check chain.
8. Add a toolbar entry in `TOOL_GROUPS` + icon in `ICONS`.

**Add a new scene-level toggle (e.g. `wallTextured`):**
1. Add field to `SceneConfig` type + `DEFAULT_SCENE_CONFIG`.
2. Add a `<CfgToggle label="..." value={config.x} onChange={v => patchScene({x: v})} />`
   line in `SceneConfigPanel`'s "scene" tab — don't invent a new field component,
   `CfgToggle`/`CfgLabel`/`ColorSwatch` already cover checkbox/label/swatch needs.
3. Thread the value through `Scene3D` → wherever it's consumed.

**Change default wall/floor color:** touch all 4 literals listed in §8, not just one.
