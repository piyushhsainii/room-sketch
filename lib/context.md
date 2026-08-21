# Floor Plan Editor — Codebase Context (consolidated)

React/Next.js 2D-drawn + 3D-rendered, multi-floor floor plan editor.
`FloorPlanEditor.tsx` owns all state. Everything else is a render helper,
dumb display component, or a panel that patches state via callbacks —
nothing else holds its own copy of plan data.

**Recurring bug pattern across this project's history**: fields/types
silently renamed, dropped, duplicated, or a fix "planned in chat" but never
actually landed in the file. Before editing any file, view its actual
current contents — don't assume a doc or a prior message matches what's
live. After editing, re-view to confirm the change landed.

---

## 1. State model

**Per-floor plan data** — unchanged from the original single-floor design:

```ts
FloorPlanState {
  rooms, lineNodes, lineSegments, closedShapes, openings,
  furniture, stairs, wallDecor, lights, outdoorObjects, annotations, roomHeight
}
```

`fp`/`setFp`/`fpRef` in `FloorPlanEditor.tsx` = the **currently-edited
floor's live state**. Every mouse handler, panel, and 2D render reads/writes
this directly, exactly as before multi-floor existed.

**Multi-floor wrapper** (`lib/floor-data.ts`):

```ts
Floor { id, label, order, elevation, visible, state: FloorPlanState }
ProjectFloorPlan { floors: Floor[], activeFloorId, viewMode: 'single'|'stacked'|'stacked-full', showUnderlay, roof }
```

Each floor wraps a normal, unchanged `FloorPlanState`. `floors[]` is the
saved/at-rest representation; `fp` is a synced-out working copy of
whichever floor is active. `switchToFloor` folds `fp` back into
`floors[activeFloorId].state` before loading the new floor's state into
`fp`. `migrateToMultiFloor()` wraps legacy single-floor saves as one
"Ground Floor" entry — idempotent, called both client-side (state
initializers) and server-side (save/load API routes).

**Critical gotcha, fixed this cycle, don't regress**: `Scene3D` must
receive the _live_ `fp` for whichever floor is active, not
`floors[activeFloorId].state` — the latter is only as fresh as the last
`switchToFloor`/save, so live edits (dragging furniture, drawing walls)
would never appear in the 3D pane without this. Fix: `Scene3D` takes a
`activeFp: FloorPlanState` prop (passed as `activeFp={fp}` from
`FloorPlanEditor.tsx`), and its floor-render loop substitutes it in only
for the active floor: `fp={floor.id === activeFloorId ? activeFp : floor.state}`.

**`viewMode` semantics**:

- `single` — only active floor renders. `showUnderlay` independently shows
  the floor directly below, faded (0.25 alpha), in both 2D and 3D.
- `stacked` — all visible floors render; non-active ones at ~0.35 opacity.
- `stacked-full` — all visible floors render at full opacity.
  Floors below the active one get a solid ceiling cap (`FloorCap`, see §4)
  in `stacked`/`stacked-full` only — never in `single`.

---

## 2. File map (current)

FloorPlanEditor.tsx // State owner (fp + floors[] + viewMode etc), mouse handlers, layout, dock/menu wiring
3DScene.tsx // Scene3D — loops over floors[], applies elevation/opacity/cap per floor, owns global lighting/camera/controls once
FloorGeometry.tsx // Per-floor 3D geometry (rooms, walls, lights, furniture, stairs, outdoor objects) — one instance per rendered floor
FloorCap.tsx // NEW — solid ceiling-cap plane for floors below active, in stacked/stacked-full views (§4)
Tools/2dDraw.tsx // draw2D — imperative canvas render. Does NOT clear the canvas itself (see §3) — caller owns clearing.
Tools/constants.ts // Types, tool defs, ICONS, FURNITURE_CATEGORIES, DEFAULT_FP, DEFAULT_SCENE_CONFIG
Tools/CameraViewPicker.tsx, FloorPlanEditorModal.tsx, FloorplanMinimap.tsx
Tools/MaterialPicker.tsx, MaterialsPanel.tsx, PropsPanel.tsx, SceneConfigPanel.tsx
Tools/QuickActionMenu.tsx // Floating per-object action menu (§5)
Tools/ResilientCanvas.tsx // <Canvas> wrapper, remounts only on CONFIRMED context loss
Tools/WalkModeControls.tsx
Tools/WorkspaceCanvas.tsx, WorkspaceConfigPanel.tsx, WorkspaceContainer.tsx,
WorkspaceLoader.tsx, WorkspaceToolbar.tsx // AI-extraction flow, separate from manual editor, single-floor only
Tools/lights-constant.ts // PlacedLight defaults/labels/LIGHT_PLACEMENT_KIND map

components/workspace/lib/
floor-data.ts // Floor / ProjectFloorPlan / RoofConfig types, createEmptyFloor, recomputeFloorElevations
migrateToMultiFloor.ts // legacy → ProjectFloorPlan wrapper, idempotent
computeDerivedFloorData.ts // per-floor derived data for 2D ghost rendering (closedPolygons, indices) — see §3
lights/resolveLightPosition.ts // resolveLightTransform (shared by render + shadow ranking), resolveShadowEligibleLightIds\* (§4b)
lights/LightsLayer.tsx // renders all non-string lights + string lights for one floor, applies shadow-eligibility cap

hooks/
useFurnitureCollisions.ts // Overlap detection → overlappingIds → draw2D red dashed outline

mesh/
door-style-migration.ts
furnitureMesh.tsx // Single outer <group position={[f.x, f.heightOffset ?? 0, f.z]}> — heightOffset added §4c. STILL has its own private texture cache (not yet migrated to lib/textureLoader.ts — see §7)
lights-mesh.tsx // LightFixtureMesh — per-fixture-type geometry, castShadow gated by forceCastShadow prop (§4b)
outdoor-object-mesh.tsx // ObjectBody switch — MUST have a case per OutdoorObjectType + default: return null
stairsMesh.tsx // Straight/L/U/Spiral/Ramp/Elevator (§4d, unchanged this cycle)
string-lights-mesh.tsx // Path-based light, separate render path from point/strip lights

objects/
arch-header.tsx, door-leaf.tsx, door-variants.tsx, doormat.tsx,
error-boundary.tsx (SceneErrorBoundary — required around any <Canvas> using real textures),
floormat.tsx, wallmat.tsx, wall-decor-mesh.tsx, window-variant3d.tsx
line-walls-3d.tsx // Line-wall extrusion, openings, wall decor, floors, wallType branch (§ wall types)
railing-3d.tsx // Railing/open wall-type geometry — NOT shared with stairs' own railing impl

texture/
MaterialPicker.tsx, inspector-ui.tsx, materials-registry.ts, textureCategorize.ts, universalMaterials.ts
// ⚠️ STILL UNCONFIRMED: universalMaterials.ts / materials-registry.ts vs Tools/constants.ts's
// MATERIAL_REGISTRY — legacy duplicate or canonical? Not resolved, don't assume.

lib/
textureLoader.ts // Shared texture cache/loader (extracted from furnitureMesh.tsx for stairsMesh.tsx to use). furnitureMesh.tsx NOT yet migrated to it — still has a private duplicate (§7).
helpers.ts // deriveClosedPolygons(), toCanvas/toWorld, getSegmentOpeningWorldPos, misc geometry
outdoor-constants.ts, furniture-constants.ts

three/
CameraController.tsx, NavigationGizmo.tsx, RoomCeiling.tsx (does not yet exist — see §4), RoomFloor.tsx,
RoomFurniture.tsx, RoomGroup.tsx, RoomLabel.tsx, RoomWall.tsx, SceneLighting.tsx

../ui/Dock.tsx, ScrollableList.tsx, FloatingDock.tsx, FloatingMenu.tsx

**Never pasted/viewed this cycle — treat as unknown, verify before
editing**: `useDelayedAmt.ts`, `errorMessage.ts`, `three/CameraController.tsx`
/`NavigationGizmo.tsx`/`RoomGroup.tsx`/`RoomLabel.tsx`/`RoomWall.tsx`/
`SceneLighting.tsx`, `texture/inspector-ui.tsx`, `WorkspaceContainer.tsx`
and siblings, `stairsMesh.tsx` internals (unchanged, prior notes still apply).

---

## 3. 2D rendering — ghosting, clearing, drag state

**Canvas clearing is the caller's job, not `draw2D`'s.** `draw2D()` no
longer calls `ctx.clearRect()` internally — it used to, which meant
drawing a ghost floor then the active floor wiped the ghost out
immediately. `scheduleRedraw()` (in `FloorPlanEditor.tsx`) now clears once
per frame, then draws each ghost floor (`ctx.globalAlpha = 0.25`, no
interactivity/hit-test data, no selection) followed by the active floor at
full opacity. Ghost floor list comes from `ghostFloorsDerived`
(`useMemo`, depends on `viewMode`/`showUnderlay`/`floors`/`activeFloorId`)
→ synced into `ghostFloorsDerivedRef` via a `useEffect` → read by
`scheduleRedraw` (which runs in a rAF, reads via refs not deps). Ghosting
covers full detail — rooms, furniture, labels, lights, stairs, outdoor
objects — since it's just another `draw2D` call with the same rendering
code, not a separate simplified path.

**`shapesIndex` keying**: `computeDerivedFloorData.ts` keys it by
`[...s.nodeIds].sort().join(',')` — must match `2dDraw.tsx`'s lookup key
exactly (`shapeKey = [...nodeIds].sort().join(',')`), or shape labels
silently fall back to `'Area'` and selection never resolves for shapes.

**Drag state → `isDraggingSelection`, centralized.** All mouse-drag
interactions (room, furniture, light, wall decor, node, segment, shape,
outdoor object, opening) flow through one dispatch table, `dragEntries`,
each with an `isActive()`/`apply()` pair, consumed by
`runActiveDrag(dragEntries, ...)` in `handleMouseMove`. `isDraggingSelection`
(hides `QuickActionMenu` during a drag) is derived in exactly ONE place —
set `true` when any `dragEntries` member crosses the movement threshold,
cleared in the single shared `handleMouseUp` cleanup block alongside all
the `...DragRef.current = null` resets. Do NOT set/unset this flag inside
individual per-tool mousedown branches — that pattern is what caused the
original bug (light drags never flipped it, since the light-drag mousedown
branch was added later and didn't know about this flag).

**Light drag `isFree` must be derived from anchor fields, not a type
allowlist.** `isFree: !lightHit.wall && !lightHit.segmentNodeIds` — NOT
`lightHit.type !== 'wall_sconce'` (a hardcoded single-type check that
silently broke dragging for every other wall/segment-anchored light type:
shelf_strip, wall-mounted spotlight, track_lighting).

---

## 4. Materials, lighting, floor caps, outdoor objects, stairs

### 4a. Materials — MATERIAL_REGISTRY is the single source of truth

Unchanged from prior notes: `getMaterialsForDomain`/`getMaterialsByCategory`,
door material resolution checks `MATERIAL_REGISTRY[style]` first with legacy
fallback, new entities default to flat solid material, swatch pickers must
conditionally render (not CSS-hide) collapsed categories.

### 4b. Lighting

`LIGHT_PLACEMENT_KIND` maps each type to `'wall-point' | 'wall-strip' |
'free-point' | 'path'`. **Position fields**: free-point lights use
`x`/`z`/`heightOffset` (all three now exposed in `PropsPanel` — X pos, Z
pos, Height); wall/segment-anchored lights use `position` (distance along
wall/segment) + `heightOffset` (vertical) + `facingInward` (side) —
`PropsPanel` shows X/Z pos fields ONLY when `!light.wall && !light.segmentNodeIds`,
and Position/Side fields only when `light.wall || light.segmentNodeIds` —
these are mutually exclusive now, previously could show both at once for
the same light, which was confusing/broken.

**Shadow budget, scene-wide, not per-floor.** GPU fragment shaders have a
hard `MAX_TEXTURE_IMAGE_UNITS` ceiling (commonly 16); each shadow-casting
light consumes one. `resolveShadowEligibleLightIds(fp)` in
`resolveLightPosition.ts` caps a single floor's shadow-casting lights to
the nearest `MAX_SHADOW_LIGHTS` (8) by distance to that floor's room
centroid. **In `stacked`/`stacked-full` view, this must be computed ONCE,
scene-wide, across all rendered floors** (`resolveShadowEligibleLightIdsAcrossFloors`
in `Scene3D.tsx`, passed down through `FloorGeometry` → `LightsLayer` as a
`shadowEligibleIds` prop) — NOT independently per floor, since 2-3 floors
each independently budgeting 8 shadow lights can blow the global 16-unit
ceiling even though each floor's local count looks fine. `LightsLayer`
falls back to its own local computation only if no prop is passed (keeps
`single`-view callers working unchanged).

`shelf_strip` (`wall-strip` kind) 2D rendering now draws a small circular
anchor-point handle in addition to its bar body, matching every other
light type's visual/hit-target language — the bar alone was too thin a
target and inconsistent with the rest of the UI.

### 4c. Furniture

`PlacedFurniture.heightOffset?: number` — new, optional, defaults to `0`
(floor level) when unset, zero migration impact on existing saves. Applied
ONCE at the single outer `<group position={[f.x, f.heightOffset ?? 0, f.z]}>`
in `furnitureMesh.tsx` — additive on top of any per-type hardcoded mount
height already baked into that type's geometry (e.g. `kitchen_cabinet_wall`'s
`1.4 * s` default stays as the type's baseline; `heightOffset` nudges up/down
from there). Every per-type branch's internal geometry is already relative
to this one outer group, so this required no per-type changes.

### 4d. Outdoor objects — unchanged from prior notes (§4c in old doc): `ObjectBody`

switch must cover every `OutdoorObjectType` + explicit default.

### 4e. Stairs / Elevator — unchanged this cycle, all prior notes still apply

(6-type union, per-type 3D branches, `${id}-${type}` remount key,
spiral radius/railing fixes, `lib/textureLoader.ts` tread texture
support, own self-contained railing implementation not shared with
`objects/railing-3d.tsx`). Still un-started: Auto Cutout, railing styles
beyond baluster, per-floor From/To Level linking (this last one is now
UNBLOCKED at the data-model level since `FloorPlanState`/floors exist, but
the UI wiring itself has not been built — see §7).

### 4f. Floor caps (`FloorCap.tsx`) — NEW

Renders a solid horizontal plane at `fp.roomHeight` for a floor, acting as
the visual "roof" of the floor beneath the active one, in `stacked`/
`stacked-full` view only. Built from `deriveClosedPolygons(fp.lineNodes,
fp.lineSegments)` (irregular line-drawn areas) UNION `fp.rooms` rects
(so both wall systems get capped, not just one). `Scene3D.tsx` sets
`renderCap: f.order < activeFloor.order` per floor in `floorsToRender`,
threaded through `FloorGeometry`'s `renderCap` prop. Visually confirmed to
render at the correct elevation; NOT yet confirmed at a proper (non-top-down)
camera angle that it reads clearly as a distinct surface rather than being
mistaken for the floor slab beneath it — verify visually before assuming
this is fully polished.

### 4g. Wall face materials (interior/exterior) — line-walls-3d.tsx

Each wall piece is a SINGLE `boxGeometry` mesh with a 6-slot material
array (`material-0` through `material-5`), not two separate meshes with a
floating overlay plane. The overlay-plane approach (a thin coincident
`planeGeometry` positioned in front of the box's own face) was the
original implementation and caused persistent z-fighting / draw-order
flicker between the box's own face and the overlay — this is why "wrong
material on wrong side" bugs kept resurfacing. **Do not reintroduce a
floating overlay mesh for wall faces.** If a mesh with `<WallMat>` +
`planeGeometry` (or a `<WallMat>` with no geometry at all, i.e. dead code
left mid-refactor) shows up again in this file, it's regressing.

## 4h. Partial railings (balcony openings) — NEW

- Not a new entity — rides `EditorOpening` (`fp.openings`) with `type: 'railing'`, same mechanism as doors/windows.
- Different from full-segment railing (`LineSegment.wallType === 'railing'`, §4g) — that's a whole wall piece; this is a span cut into an otherwise-solid wall. Never overlap: `wallType` only applies when a segment has zero openings.
- `Tools/constants.ts` — `EditorOpening.type` includes `'railing'`. New fields (only used when `type === 'railing'`): `railingStyle`, `railingHeight`, `railingPostSpacing`, `railingWidthDim`, `railingColor`, `railingSolidAbove`, `railingWallStart`.
- `objects/railing-3d.tsx` — `Railing3D` component, unchanged. Renders the actual rail mesh (posts/infill by style). Its `RailingStyleConfig` (`style`/`postSpacing`/`railingWidth`) is what the `EditorOpening.railing*` fields map onto.
- `FloorPlanEditor.tsx` (pointer-down handler) — placement lives in `if (isOpeningTool || tool === 'railing-partial') {...}`. `isOpeningTool` (`tool.startsWith('opening-')`) does NOT include `railing-partial` — any other code gating on `isOpeningTool` alone needs the same `|| tool === 'railing-partial'` addition. Defaults on creation: `railingStyle: 'baluster'`, `railingHeight: 0.9`, `railingSolidAbove: true`, `railingWallStart: 1.9`.
- `mesh/line-walls-3d.tsx` and `Room3D.tsx` — both independently implement the railing render branch (no shared opening-render helper between the two wall systems). Any render change must be made in both.
  - `isRailingSpan = op.type === 'railing' && !op.railingSolidAbove` — when true, skips the header block (open to ceiling), same as passage/archway.
  - When `railingSolidAbove` is true, the existing header-slab code fills from rail to ceiling via `effOpeningTop`/`effHeaderH`, computed once and used only inside the header block — nothing else in the opening loop uses these two.
  - Rail mesh itself is a separate `else if (op.type === 'railing')` branch next to the `window`/`door` branches.
  - Rotation convention differs by file (line-walls: `-angle` from `Math.atan2`; Room3D: `wall.axis === 'x' ? 0 : Math.PI/2`) — don't cross-copy.
- `objects/wallmat.tsx` — `Math.max(1, ...)` floor added to `tex.repeat` on both axes (procedural path and `RealTextureWallMat.prep()`), needed because short header pieces (e.g. small gap between `railingHeight` and `railingWallStart`) could produce repeat < 1, which THREE stretches instead of tiling.
- `Tools/PropsPanel.tsx` — dedicated card gated on `opening.type === 'railing'`, alongside the generic opening block. Fields: Style, Height, Rail width, Post spacing (baluster/cable only), Color, Above-rail toggle, Wall-starts (only shown when Above-rail is on).
- Toolbar — icon entry keyed `'railing-partial'` in the same config map as `opening-passage`/`opening-archway`.

### 4i. Floor cutouts + partial railings — NEW

`ClosedShape.cutout?: { enabled, toLevel?, openingOffset? }` marks a shape
as a void: no walls render on its boundary, no floor fill of its own, and
it punches a hole into any overlapping room/area floor (`Room3D` for
rectangular rooms, `LineWalls3D`'s `DerivedFloorShape` for irregular
areas) plus the stacked-view ceiling cap below (`FloorCap`, scoped by
`toLevel`). 2D shows a dashed-red void outline, not an Area label.
Toggle lives in `PropsPanel`'s shape section (Floor Cutout card).
Known gap: irregular-area hole-punching has an unresolved polygon-
matching bug (see §7) — rectangular rooms work correctly.

Per-wall type (`solid`/`railing`/`open`) already existed on `LineSegment`;
a bulk "set for whole area" control in `PropsPanel` is scoped, not yet built.

**Two independent axes, do not conflate them:**

1. **Geometry — which box face is "interior" vs "exterior".** This is a
   FIXED constant, unrelated to any per-wall computation:

```ts
const INTERIOR_ATTACH = "material-5"; // confirmed correct as of this fix
const EXTERIOR_ATTACH = "material-4";
```

`material-0`/`1` = end caps (±X), `material-2`/`3` = top/bottom, both
always get `interior.mat` (mostly hidden anyway, doesn't matter
visually). If this axis is ever found wrong again, it can ONLY be a
two-value swap of these two literals — nothing else in the file should
need to change. Previously this was wrongly computed as a per-wall
ternary keyed off `!!shapeFacingA` (`interiorIsPlusNormal`), which
silently produced a fixed-but-wrong result for freestanding wall
segments (no shape at all → `shapeFacingA` always undefined → ternary
always resolved the same way regardless of the user's actual pick).
Don't reintroduce that coupling.

2. **Material resolution — what `interiorMat`/`exteriorMat` actually
   equal.** This DOES vary per wall piece, based on `shapeFacingA`/
   `shapeFacingB` (which `ClosedShape`(s), if any, border this wall). Two
   real cases:
   - **Shared edge (`matchingShapes.length === 2`)**: `shapeFacingB`'s own
     `wallMaterial` mirrors onto this piece's exterior-relative face —
     i.e. what looks like "my exterior" is actually "the neighbor's own
     interior."
   - **Solo/true-exterior (`matchingShapes.length < 2`)**: read the same
     shape's `exteriorWallMaterial` field (set via
     `applyShapeExteriorMaterial`), regardless of whether that lone shape
     landed in the `shapeFacingA` or `shapeFacingB` slot — slot assignment
     is winding-direction-dependent and NOT meaningful on its own; branch
     on `matchingShapes.length`, never on which slot got populated.

   After this branching, a confirmed-correct-but-inverted-output swap is
   applied:

```ts
[interiorMat, exteriorMat] = [exteriorMat, interiorMat];
```

This must run BEFORE segment-level explicit overrides (next point),
so a user's own Interior/Exterior pick on a wall segment always wins
as-authored and never gets re-flipped by this line.

**Segment-level explicit override** (from `PropsPanel`'s per-segment
Interior/Exterior/Both picker) always wins over shape-derived defaults:

```ts
if (selectedWallMaterial) interiorMat = selectedWallMaterial;
if (selectedWallExteriorMaterial) exteriorMat = selectedWallExteriorMaterial;
```

sourced from `segWallMaterial`/`segWallExteriorMaterial` maps, built once
per render from `roomSceneConfigs` (`RoomSceneConfig.wallMaterial` /
`.exteriorWallMaterial`, keyed by `seg.id`).

**Known past bug, now fixed — the picker itself, not the render logic.**
`PropsPanel`'s wall-segment `MaterialTexturePicker` `onSelect`/`onClear`
must branch on the active `segWallSide` tab and write to the matching
field:

```ts
onSelect={(id) => {
    const patch: Partial<RoomSceneConfig> = {}
    if (segWallSide === 'interior' || segWallSide === 'both') patch.wallMaterial = id as WallMaterial
    if (segWallSide === 'exterior' || segWallSide === 'both') patch.exteriorWallMaterial = id as WallMaterial
    patchRoomSceneById(seg.id, patch)
}}
```

A prior version always wrote `wallMaterial` regardless of which tab was
active — Exterior picks silently landed on the interior field, making
Exterior appear completely non-functional no matter what render-logic
fixes were made downstream. **If a similar per-side texture bug appears
for a NEW entity type in the future, check the picker's write logic
first, before assuming the render/attach logic is at fault** — this
exact bug shape (correct render logic, wrong picker write target) cost
significant debugging time here.

**Areas/shapes use a parallel but separate write path** —
`PropsPanel.applyShapeWallTexture` + `lib/helpers.ts`'s
`applyShapeExteriorMaterial`. Both must resolve the SAME `ClosedShape` by
`id` (not by re-deriving a `nodeIds`-sorted key independently), or
Interior and Exterior picks fork into two separate `ClosedShape` rows
with the same `nodeIds` — this previously caused `shapesForSegment` to
see 2 matching shapes for what should be a single isolated room, feeding
the wrong material into `shapeFacingA`/`shapeFacingB` unpredictably.
`applyShapeExteriorMaterial(fp, shape.id, shape.nodeIds, patch)` — the
`shape.id` param is REQUIRED, added specifically to fix this; do not
drop it. When creating a not-yet-persisted shape's first `ClosedShape`
row (either side), reuse `shape.id` as-is — do NOT mint a
`crypto.randomUUID()` for it, or the two write paths will diverge again.

---

## 5. Floating UI — unchanged from prior notes

`QuickActionMenu` visible only when `tool === 'select' && !isDraggingSelection`
(see §3 for the centralized fix to how that flag is now maintained).
Delete-handler logic still duplicated across ≥3 sites (keyboard handler,
`PropsPanel`'s `onDelete`, `QuickActionMenu`'s `onDelete`) — must stay in
sync when a new entity type is added to the delete-type-check chain.
`FloatingMenu`, `FloatingDock`, `PresetsPanel`, split-pane 2D/3D layout —
all unchanged, see old doc if needed.

---

## 6. Shipped, confirmed working (this cycle)

- **Multi-floor support** — add/switch/rename/show-hide floors, ground/
  upper/basement via order, elevation auto-computed via
  `recomputeFloorElevations`. Confirmed via low-angle 3D screenshot that
  floors genuinely stack vertically (earlier "floors render beside each
  other" reports were a steep top-down camera angle illusion, not a bug).
- **2D ghost-floor rendering** — full detail (not just outlines), correct
  clear/redraw ordering.
- **Active floor's 3D view stays live** during editing, not just after
  floor-switch/save.
- **Floor ceiling caps** in stacked views (visual polish pending, see §4f).
- **Scene-wide shadow-light budget** across stacked floors (was previously
  blowing the GPU texture-unit limit when 2+ floors were visible together).
- **Light position controls** — X/Z (free-point) and Position/Side/Height
  (wall-anchored) properly mutually exclusive in the panel.
- **Furniture vertical position** (`heightOffset`) — for wall-mounted
  pieces like `kitchen_cabinet_wall`.
- **Light + all other entity types drag correctly** and correctly hide
  `QuickActionMenu` during the drag (centralized `isDraggingSelection`).

Everything previously listed as shipped in the pre-multi-floor doc (wall
thickness, camera presets, duplicate/copy-paste, SVG export, furniture
overlap detection, area labels, railing/partial-wall segments, stairs
core feature set) is unaffected and still shipped.

---

## 7. Known open items (don't assume otherwise)

- **Shared/partition wall material override** — unresolved, same as
  before: floor override works per sub-area, wall override doesn't for a
  segment shared by two adjacent `ClosedShape`s. Needs a two-sided
  `(segmentId, ownerShapeId)` data model. Not started.
- **Window variant rendering** — reported flat/dark, root cause not
  isolated. Not fixed.
- **`universalMaterials.ts` vs `MATERIAL_REGISTRY`** — still unconfirmed
  legacy-vs-canonical.
- **2D redraw performance** — `deriveClosedPolygons()`/openings-filter
  memoization status not re-confirmed this cycle; verify before assuming
  solved.
- **Stairs Auto Cutout** — still inert, needs floor/ceiling slab generator
  (`three/RoomFloor.tsx`/a not-yet-existing `RoomCeiling.tsx`) to accept
  stair footprints and hole-punch. Not started. Note `FloorCap.tsx` (§4f)
  is a DIFFERENT thing — a flat cap plane for stacked-floor visualization,
  not the actual per-room ceiling/floor slab generator stairs would need
  to cut into.
- **Stairs From/To Level** — data-model blocker (no floor concept) is now
  gone since floors exist, but the actual dropdown-wiring/UI work in
  `PropsPanel.tsx` has not been done. Re-scope as a real task, not just
  "unblocked."
- **Stairs railing styles** beyond baluster — still unimplemented.
- **`furnitureMesh.tsx` texture-loader duplication** — still not migrated
  to the shared `lib/textureLoader.ts`; double-loads shared texture URLs.
- **`FloorCap` visual polish** — see §4f, needs a proper-angle screenshot
  confirmation, not just elevation-correctness confirmation.
- **`switchToFloor`'s double-`setFloors`-call pattern** — calls `setFp` as
  a side effect inside a second `setFloors` updater, which isn't
  guaranteed-once under React's rules. Never confirmed to cause a visible
  bug, but flagged as fragile — collapse to one `setFloors` call + a
  `setFp` call outside the updater, reading the target floor's state from
  the `floors` closure before the fold-back write (safe, since the target
  floor is a different floor than the one being folded back).
- **`showUnderlay`** has no dedicated UI toggle yet (only settable via
  state directly).
- **Server-side `scene_json` is derived from the active floor only** —
  share links (`/share/[token]`) and anything consuming `scene_json` will
  only ever show one floor of a multi-floor project. The share page itself
  now correctly wraps that single floor into a valid `floors`/`activeFp`
  shape for `Scene3D`, but the underlying single-floor-only limitation at
  the API/data layer is unresolved.

- **Custom user-uploaded GLB furniture support** — FUTURE SCOPE, not
  started. Current pipeline only supports developer-registered,
  build-time-known models with hand-authored `FurnitureModelDef` entries
  (materialSlots, target dimensions, preview images). A user-upload flow
  would need: runtime registry entry creation (no build-time def),
  automatic `materialSlots` detection (the manual per-model console-log
  workflow doesn't scale to arbitrary user uploads), sane default sizing
  without a curated `defaultTargetWidth/Depth` (bbox-measurement + the
  new 2x baseline multiplier only, no per-model override available),
  and upload-time asset validation (file size limits, malformed GLB
  handling — `GLTFErrorBoundary` covers render-time failures only).

---

## 8. Standing gotchas (still apply)

- `Scene3D` now takes `floors`/`activeFloorId`/`viewMode`/`showUnderlay`/
  `activeFp` — NOT a single `fp` prop directly (that changed with
  multi-floor; old "takes the whole fp object" note is superseded).
- `ResilientCanvas`: only remounts on a CONFIRMED-still-lost context after
  a delay; never on every successful `webglcontextrestored`. Does not
  memoize children — ruled out as a cause of any stale-render bug.
- Persistence: `floorplan_editor_state` stores `{ projectFloorPlan,
sceneConfig }` now (not `{ floorPlanState, sceneConfig }`) — both
  `ProjectViewerPage` and `NewProjectPage` save/load in this shape via
  `migrateToMultiFloor()` for legacy rows.
- Every new draggable/selectable/deletable entity type needs updating in
  ALL of: hit-test-priority sites, delete-handler chain (≥3 sites),
  `PropsPanel`'s early-return guard, `pushHistory`'s `hadDrag` boolean,
  save/load round-trip, AND now the `dragEntries` dispatch table (§3) if
  it's draggable.
- Wall-mounted mesh centerline-burial bug: offset along wall normal, don't
  place at raw centerline — check first for anything invisible in 3D but
  fine in 2D.
- Type-switch stale-geometry bug: key wrapping group/element on
  `${id}-${type}`, not just `id`, for any component whose geometry
  branches on a mutable type field.
- `ScrollableList`, not `overflowY: auto`, for scrollable floating panels.
- Stray debug `console.log`s in `furnitureMesh.tsx` — still present, low
  priority cleanup.
