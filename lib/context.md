# Floor Plan Editor — Codebase Context

React/Next.js 2D-drawn + 3D-rendered floor plan editor. `FloorPlanEditor.tsx`
owns all state (`fp: FloorPlanState`, `sceneConfig: SceneConfig`). Everything
else is a render helper, dumb display component, or a panel that patches
state via `(value, onChange)` callbacks — nothing else holds its own copy of
plan data.

**Recurring bug pattern, seen repeatedly across this project's history**:
fields/types silently renamed, dropped, or duplicated into a second parallel
source of truth when a file is rewritten wholesale instead of incrementally
patched. Before editing any file, view its actual current contents — don't
assume a prior description matches what's live. After editing, re-view to
confirm the change landed.

---

## 1. File map (current)

FloorPlanEditor.tsx // State owner, mouse handlers, layout, split-pane 2D/3D, floating dock/menu wiring
Tools/2dDraw.tsx // draw2D — imperative canvas render (was inline, now its own file)
Tools/3dRoom.tsx, 3DScene.tsx // Room3D / Scene3D
Tools/constants.ts // Types, tool defs, ICONS, FURNITURE_CATEGORIES
Tools/CameraViewPicker.tsx // Saved camera views UI (embedded in FloatingMenu)
Tools/FloorPlanEditorModal.tsx, FloorplanMinimap.tsx
Tools/MaterialPicker.tsx, MaterialsPanel.tsx, PropsPanel.tsx, SceneConfigPanel.tsx
Tools/QuickActionMenu.tsx // NEW — floating per-object action menu (see §5)
Tools/ResilientCanvas.tsx // <Canvas> wrapper with WebGL context-loss recovery
Tools/WalkModeControls.tsx
Tools/WorkspaceCanvas.tsx, WorkspaceConfigPanel.tsx, WorkspaceContainer.tsx,
WorkspaceLoader.tsx, WorkspaceToolbar.tsx // AI-extraction flow, separate from manual editor
Tools/lights-constant.ts // PlacedLight defaults/labels/placement-kind map

hooks/
useDelayedAmt.ts // ? not yet pasted
useFurnitureCollisions.ts // Overlap detection — drives 2D draw2D's overlappingIds param (item 10, shipped)

mesh/ // NEW top-level grouping — mesh components split out of objects/
door-style-migration.ts
furnitureMesh.tsx
lights-mesh.tsx // Point/wall/free-placed light fixtures
outdoor-object-mesh.tsx // Crosswalk/dustbin/bench/mailbox etc. — ObjectBody switch, MUST have a case per OutdoorObjectType + explicit default: return null
stairsMesh.tsx
string-lights-mesh.tsx // Path-based light type, separate from point/strip lights — see §4b

objects/
arch-header.tsx, door-leaf.tsx, door-variants.tsx, doormat.tsx,
error-boundary.tsx (SceneErrorBoundary — required around any <Canvas> using real textures),
floormat.tsx, wallmat.tsx, wall-decor-mesh.tsx, window-variant3d.tsx
line-walls-3d.tsx // Line-wall extrusion, openings, wall decor, floors, wallType branch (§3)
railing-3d.tsx // NEW — railing/open wall-type geometry, split out of line-walls-3d (§3)
scene-graph.tsx

texture/
MaterialPicker.tsx, inspector-ui.tsx
materials-registry.ts, textureCategorize.ts, universalMaterials.ts
// ⚠️ STILL VERIFY: confirm whether universalMaterials.ts / materials-registry.ts
// are legacy duplicates of Tools/constants.ts's MATERIAL_REGISTRY or the
// current canonical source — this ambiguity was flagged before and has not
// been explicitly resolved/confirmed closed.

three/
CameraController.tsx, NavigationGizmo.tsx, RoomCeiling.tsx, RoomFloor.tsx,
RoomFurniture.tsx, RoomGroup.tsx, RoomLabel.tsx, RoomWall.tsx, SceneLighting.tsx
// Decomposition of what were previously monolithic Room3D/Scene3D pieces —
// if editing wall/floor/ceiling/furniture 3D rendering, check whether the
// logic now lives here rather than in 3dRoom.tsx/3DScene.tsx directly.

lib/
drag-controller.ts // ? — likely centralizes the various xxxDragRef patterns; verify before assuming shape
errorMessage.ts // ?
helpers.ts // deriveClosedPolygons(), toCanvas/toWorld, getSegmentOpeningWorldPos, misc geometry
outdoor-constants.ts, furniture-constants.ts

../ui/Dock.tsx, ScrollableList.tsx, FloatingDock.tsx (NEW), FloatingMenu.tsx (NEW)

**Files referenced but not yet pasted into this context — treat as unknown,
verify before editing**: `useDelayedAmt.ts`, `drag-controller.ts`,
`errorMessage.ts`, `3dRoom.tsx`/`3DScene.tsx` internals, everything under
`three/`, `texture/inspector-ui.tsx`, `WorkspaceContainer.tsx` and siblings.

---

## 2. Core data model

```ts
FloorPlanState {
  rooms, lineNodes, lineSegments, closedShapes, openings,
  furniture, stairs, wallDecor, lights, outdoorObjects, annotations, roomHeight
}
LineSegment { id, nodeIds, thickness, closed, wallType?: 'solid'|'railing'|'open' }  // wallType shipped (§3)
SceneConfig {
  ambientIntensity, wallRoughness, wallTextured, showFurniture, showLabels,
  fogEnabled, doorStyle, globalFloorMaterial, globalWallMaterial,
  rooms: RoomSceneConfig[]   // ⚠️ field name is `rooms`, NEVER `roomOverrides`
}
RoomSceneConfig { roomId, wallColor?, wallMaterial?, floorMaterial?, wallOverrides? }
ClosedShape { id, nodeIds, label?, floorMaterial?, wallMaterial?, wallOverrides? }
```

**Two parallel wall systems**, check `segmentNodeIds` presence to know which
(room-wall `wall`/`position` vs. line-wall `segmentNodeIds`/`segmentT`).
Openings, wall decor, and lights all use this identical dual pattern.

**Room wall synthetic id**: `` `${roomId}::wall::${wall}` ``.

**⚠️ KNOWN UNRESOLVED BUG — shared/partition wall material override.**
When a line-wall segment forms the shared boundary between two adjacent
`ClosedShape`s (e.g. a partition line splitting one drawn area into two),
the existing `wallOverrides` resolution assumes a segment has exactly ONE
owning shape. A shared segment's node-pair legitimately belongs to both
shapes' `nodeIds` sets, so selecting either sub-area and overriding its wall
material produces ambiguous/order-dependent results on the shared wall
specifically (non-shared/outer walls of the same shapes are unaffected and
work correctly — floor material per sub-area also works correctly, this is
wall-material-only). **Fix requires a genuinely two-sided data model** for
shared segments — likely keying overrides by `(segmentId, ownerShapeId)`
rather than `segmentId` alone, detecting shared-segment-ness by checking
node-pair membership across all shapes, and rendering shared wall panels as
two independently-materialed faces rather than one uniform box. Scoped, not
yet implemented — see prior planning message for full breakdown before
touching `wallOverrides` resolution in `line-walls-3d.tsx`/`railing-3d.tsx`.

---

## 3. Wall types — solid / railing / open (SHIPPED)

`LineSegment.wallType` (`'solid' | 'railing' | 'open'`, defaults to `solid`
when absent). Set via a control in the segment's `PropsPanel` section
(alongside its existing wall color/material pickers) — no separate toolbar
tool, reuses the existing draw-then-select-then-edit flow.

- **2D** (`Tools/2dDraw.tsx`): `railing` → dashed stroke, distinct color;
  `open` → faint/minimal dotted boundary marker; `solid` → unchanged existing
  appearance.
- **3D**: `railing` geometry (bottom rail + top handrail + evenly spaced
  vertical balusters) now lives in `objects/railing-3d.tsx`, split out of
  `line-walls-3d.tsx` rather than inlined — check there for wall-type-specific
  geometry construction. `open` renders no geometry at all. `solid` unchanged
  full-height box.
- **Openings** (doors/windows) should be rejected/skipped on `railing`/`open`
  segments at placement time — verify this guard exists in the relevant
  `hitLineSegment` placement branches if extending opening tools further.
- Round-trips through `SceneJSON.line_segments[].wall_type`.

---

## 4. Materials, lighting, outdoor objects

### 4a. Materials — MATERIAL_REGISTRY is the single source of truth

`getMaterialsForDomain(domain: 'wall'|'floor'|'door'|'furniture')`,
`getMaterialsByCategory(domain)`. Legacy `WALL_MAT_DEFS`/`FLOOR_MAT_DEFS`
derived from the registry. Door material resolution (`objects/doormat.tsx`)
checks `MATERIAL_REGISTRY[style]` directly FIRST, falls back to a legacy
7-value translation map only for old saved data.

**Default material for newly-created entities**: per the "keep sketching
lightweight" fix, new rooms/walls should start on flat solid (`'paint'`/
`'plain'`) regardless of the current global default material, so drawing a
fresh plan doesn't eagerly trigger texture loads. Verify this is still true
if entity-creation code is touched.

**Swatch eager-loading**: collapsed material categories must not mount
`<img>`/background-image elements at all (conditional render, not CSS
visibility) — confirmed fix pattern, re-check if `MaterialPicker.tsx` /
`texture/MaterialPicker.tsx` is regenerated wholesale.

### 4b. Lighting (`PlacedLight`, `lights-constant.ts`, `mesh/lights-mesh.tsx`)

`LIGHT_PLACEMENT_KIND` maps each `LightFixtureType` to one of: `'wall-point'`,
`'wall-strip'`, `'free-point'` (ceiling/floor fixtures), or `'path'` (string
lights specifically — `mesh/string-lights-mesh.tsx`, a distinct render path
from the other three since it's a chain of many small lights along
`pathNodeIds`, not a single fixture at one point/wall position). `spotlight`
type carries an `aimRotation` — rendered as a small direction wedge in 2D.
2D rendering for all 4 placement kinds lives in `Tools/2dDraw.tsx`'s lights
section — follow that file's existing per-kind branching pattern if adding
a new light type rather than bolting another `if` onto one kind's branch.

### 4c. Outdoor objects (`mesh/outdoor-object-mesh.tsx`)

`OutdoorObjectType` union, `OUTDOOR_OBJECT_FOOTPRINTS`, `OUTDOOR_OBJECT_LABELS`,
`OUTDOOR_FLAT_TYPES` (ground-decal, no bounding-box/volume — currently just
`crosswalk`). **`ObjectBody`'s switch statement must have a case for every
type in the union, plus a `default: return null`.** History: 3 of 4 types
(dustbin/bench/mailbox) were silently unimplemented for a period — the
switch fell through to `undefined`, which renders nothing with zero console
error, while the SAME objects rendered correctly in 2D (separate `draw2D`
icon path) — this asymmetry (correct in 2D, blank in 3D, no error) is the
exact "wall-mounted mesh occlusion" diagnostic pattern from §5, but caused by
a missing switch case instead of a centerline-offset bug. **Any time a new
outdoor type is added to the type union, immediately add its `ObjectBody`
case in the same change** — don't let the type union and the switch drift.

---

## 5. Floating UI — Quick Action Menu, Floating Dock, Presets panel (NEW)

**`QuickActionMenu`** (`Tools/QuickActionMenu.tsx`): appears anchored near a
selected 2D object (`quickMenuAnchor` state, computed from the selection's
world position converted to screen coords) offering move/duplicate/delete/
bend-style quick actions without opening the full properties panel. Visible
only when `tool === 'select'` and not `isDraggingSelection`. Wired to the
SAME underlying delete/duplicate logic used elsewhere (the delete handler
here is textually duplicated across at least 3 places in `FloorPlanEditor.tsx`
— the keyboard handler, `PropsPanel`'s `onDelete`, and this menu's
`onDelete` — **all three must stay in sync when a new entity type is added
to the delete-type-check chain**; this is the same "3 hit-test-order sites"
risk pattern already documented for hit-testing, now also applies to
deletion). `onBend`/`handleBendSelectedSegment` and `onMove`/`handleArmMove`
are new — confirm their implementations before assuming they follow other
established patterns.

**`FloatingMenu`** (rendered via portal, fixed top-right): houses Walk Mode
toggle, Interactive Mode toggle, Preview pane show/hide toggle, and an
embedded `CameraViewPickerV2` slot (camera presets, shipped — see §6).

**`FloatingDock`**: bottom-positioned tab switcher for Properties/Scene
panels (replaces or sits alongside the older `Dock.tsx` — confirm which is
actually still in use). Panels themselves are now `position: absolute`
floating cards (not docked inline), each independently closable.

**Presets tab / `PresetsPanel`**: toolbar flyout (portaled, anchored to the
toolbar group) offering wall presets and room templates —
`armedWallPresetId`/`armedTemplateId` state, `armWallPreset`/
`armRoomTemplate` handlers "arm" a preset for placement (click-then-place
pattern, consistent with existing tool interaction model, not drag-and-drop).
This is the asset-library feature — confirm scope (template-based inserts of
existing entity types vs. genuinely new geometry types like true curved
walls) before extending further.

**Split-pane 2D/3D layout**: `splitRatio` + `handleDividerMouseDown` — the
2D/3D panes are now user-resizable via a draggable divider, not a fixed
percentage. `previewOpen` toggles the entire 3D pane's mount/unmount.

---

## 6. Shipped since last update (confirmed, per explicit sign-off)

- **Wall thickness** — user-editable per-segment property (was hardcoded `T = 0.15`).
- **Camera view presets** (`CameraViewPickerV2`) — saved viewpoints, embedded in `FloatingMenu`.
- **Duplicate/copy-paste** (`handleDuplicateSelected`, `handleMirrorSelected`) — rooms and furniture groups.
- **Real dimension/measurement SVG export** — printable 2D plan with scale, dimension lines, area labels.
- **Furniture overlap/collision detection** (`useFurnitureCollisions` hook) — feeds `overlappingIds` into `draw2D`, rendered as a dashed red outline on overlapping furniture (see the `overlappingIds.has(f.id)` block in the furniture-drawing loop).
- **Area/shape custom labels** — persist and render correctly in both 2D and 3D (was broken, now fixed — labels visibly show custom names like "Area 17"/"Area 18" rather than a hardcoded literal).
- **Railing / partial-wall segments** — see §3.
- **Texture cache staleness** — confirmed no longer an issue as of this writing.

## 7. Known open items (not yet done, don't assume otherwise)

- **Shared/partition wall material override** — see §2's detailed writeup. Floor override works correctly for sub-areas split by a partition; wall override does not.
- **Window variant rendering** — reported as rendering flat/dark with no visible frame or glass distinction across variants; root cause not yet isolated (candidates: `WindowVariant3D` not invoked, wrong/lost `variant` value, glass material issue, or the wall-mounted-centerline-burial bug per §5-of-prior-doc applying to window glass specifically). Not yet fixed — diagnose via the 3-step isolation (mesh invocation → variant data → material) before patching blind.
- **`universalMaterials.ts` vs `MATERIAL_REGISTRY`** — still unconfirmed whether this is dead/legacy or actively used; do not assume resolved.
- **2D redraw performance** — `deriveClosedPolygons()` and the `fp.openings.filter(...)` calls inside `draw2D` were identified as running unmemoized every frame/redraw; fix is to precompute these once per `fp` change (`useMemo` in `FloorPlanEditor.tsx`) and pass as params into `draw2D` rather than recomputing inside it. Confirm this landed before assuming 2D pan/drag performance is solved — the deeper "why does mousemove trigger so many redraws" question also depends on `handleMouseMove`/`scheduleRedraw`'s current throttling, which was flagged but not yet reviewed.

---

## 8. Standing gotchas (still apply, condensed from prior versions)

- `Scene3D` prop contract: takes the whole `fp` object, never decomposed fields.
- `ResilientCanvas`: only remount on a CONFIRMED-still-lost context after a delay; never remount on every successful `webglcontextrestored`.
- Persistence: confirm single source of truth (`floorplan_editor_state` as canonical, `scene_json` derived) hasn't regressed to multiple independent writers.
- Every new draggable/selectable/deletable entity type needs updating in ALL of: 3 hit-test-priority sites, delete-handler chain (now at least 3 sites per §5), `PropsPanel`'s early-return guard, `pushHistory`'s `hadDrag` boolean, save/load round-trip.
- Wall-mounted mesh centerline-burial bug: offset `basePos` along the wall normal, don't place at raw centerline — check this FIRST for any new mesh type that's invisible in 3D but fine in 2D (see §4c's outdoor-object case for a variant of this same symptom class, caused by a missing switch case rather than centerline burial specifically — both produce "2D correct, 3D blank, no error").
- Stray debug `console.log`/`console.count` calls have caused false "performance bug" reports before — check for leftover debug statements before assuming a re-render/memoization bug.
- `ScrollableList`, not `overflowY: auto`, for any scrollable floating panel content.
