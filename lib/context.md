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
Tools/QuickActionMenu.tsx // Floating per-object action menu (see §5)
Tools/ResilientCanvas.tsx // <Canvas> wrapper with WebGL context-loss recovery
Tools/WalkModeControls.tsx
Tools/WorkspaceCanvas.tsx, WorkspaceConfigPanel.tsx, WorkspaceContainer.tsx,
WorkspaceLoader.tsx, WorkspaceToolbar.tsx // AI-extraction flow, separate from manual editor
Tools/lights-constant.ts // PlacedLight defaults/labels/placement-kind map

hooks/
useDelayedAmt.ts // ? not yet pasted
useFurnitureCollisions.ts // Overlap detection — drives 2D draw2D's overlappingIds param (item 10, shipped)

mesh/ // Mesh components split out of objects/
door-style-migration.ts
furnitureMesh.tsx // Has its own PRIVATE texture cache/loader — see §4d note on consolidation
lights-mesh.tsx // Point/wall/free-placed light fixtures
outdoor-object-mesh.tsx // Crosswalk/dustbin/bench/mailbox etc. — ObjectBody switch, MUST have a case per OutdoorObjectType + explicit default: return null
stairsMesh.tsx // Straight/L/U/Spiral/Ramp/Elevator — see §4d for full breakdown
string-lights-mesh.tsx // Path-based light type, separate from point/strip lights — see §4b

objects/
arch-header.tsx, door-leaf.tsx, door-variants.tsx, doormat.tsx,
error-boundary.tsx (SceneErrorBoundary — required around any <Canvas> using real textures),
floormat.tsx, wallmat.tsx, wall-decor-mesh.tsx, window-variant3d.tsx
line-walls-3d.tsx // Line-wall extrusion, openings, wall decor, floors, wallType branch (§3)
railing-3d.tsx // Railing/open wall-type geometry, split out of line-walls-3d (§3).
                // NOTE: stairsMesh.tsx's per-stair railing (baluster posts +
                // handrail, straight AND spiral/helical) is a SEPARATE,
                // parallel implementation, not built on this file — see §4d.
scene-graph.tsx

texture/
MaterialPicker.tsx, inspector-ui.tsx
materials-registry.ts, textureCategorize.ts, universalMaterials.ts
// ⚠️ STILL VERIFY: confirm whether universalMaterials.ts / materials-registry.ts
// are legacy duplicates of Tools/constants.ts's MATERIAL_REGISTRY or the
// current canonical source — this ambiguity was flagged before and has not
// been explicitly resolved/confirmed closed.

lib/
textureLoader.ts // NEW — shared texture cache/loader/subscriber, extracted from
                  // furnitureMesh.tsx's private implementation specifically so
                  // stairsMesh.tsx could reuse it instead of duplicating a second
                  // cache. furnitureMesh.tsx has NOT yet been migrated to import
                  // from here — it still has its own private copy. See §4d.
drag-controller.ts // ? — likely centralizes the various xxxDragRef patterns; verify before assuming shape
errorMessage.ts // ?
helpers.ts // deriveClosedPolygons(), toCanvas/toWorld, getSegmentOpeningWorldPos, misc geometry
outdoor-constants.ts, furniture-constants.ts

three/
CameraController.tsx, NavigationGizmo.tsx, RoomCeiling.tsx, RoomFloor.tsx,
RoomFurniture.tsx, RoomGroup.tsx, RoomLabel.tsx, RoomWall.tsx, SceneLighting.tsx
// Decomposition of what were previously monolithic Room3D/Scene3D pieces —
// if editing wall/floor/ceiling/furniture 3D rendering, check whether the
// logic now lives here rather than in 3dRoom.tsx/3DScene.tsx directly.
// NOTE: floor/ceiling slab generation for a room lives here — this is the
// file that needs stairwell footprint awareness for "Auto Cutout" to ever
// actually punch a hole (currently a no-op, see §4d).

../ui/Dock.tsx, ScrollableList.tsx, FloatingDock.tsx, FloatingMenu.tsx

**Files referenced but not yet pasted into this context — treat as unknown,
verify before editing**: `useDelayedAmt.ts`, `drag-controller.ts`,
`errorMessage.ts`, `3dRoom.tsx`/`3DScene.tsx` internals, everything under
`three/` (INCLUDING for the stairs auto-cutout gap specifically — see §4d),
`texture/inspector-ui.tsx`, `WorkspaceContainer.tsx` and siblings.

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

// Stairs/elevator entity — see §4d for full field-by-field breakdown
PlacedStairs {
  id, type: StairsType, x, z, width, depth, rotation, anchorSegmentId?,
  rise?, steps?,
  railingEnabled?, railingStyle?, railingColor?, railingHeight?,
  materialId?,
  openingMode?, autoCutout?, openingOffset?, fromLevel?, toLevel?
}
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
  vertical balusters) lives in `objects/railing-3d.tsx`, split out of
  `line-walls-3d.tsx`. `open` renders no geometry at all. `solid` unchanged
  full-height box. **Not shared with stairs railings** — see §4d.
- **Openings** (doors/windows) should be rejected/skipped on `railing`/`open`
  segments at placement time — verify this guard exists in the relevant
  `hitLineSegment` placement branches if extending opening tools further.
- Round-trips through `SceneJSON.line_segments[].wall_type`.

---

## 4. Materials, lighting, outdoor objects, stairs

### 4a. Materials — MATERIAL_REGISTRY is the single source of truth

`getMaterialsForDomain(domain: 'wall'|'floor'|'door'|'furniture'|'outdoor'|'stairs')`,
`getMaterialsByCategory(domain)`. **`MaterialDomain` now includes `'stairs'`**
(added alongside the stairs feature — §4d). Legacy `WALL_MAT_DEFS`/
`FLOOR_MAT_DEFS` derived from the registry. Door material resolution
(`objects/doormat.tsx`) checks `MATERIAL_REGISTRY[style]` directly FIRST,
falls back to a legacy 7-value translation map only for old saved data.

`getMaterialsFor(type)` in `texture/universalMaterials.ts` filters
`UNIVERSAL_MATERIALS` by `appliesTo.includes(type)`, where `appliesTo` is
built directly from each registry entry's `domains` array — so a material
only ever shows up in a given picker if its registry entry explicitly lists
that domain. `'stairs'` was deliberately added only to wood, marble/stone,
concrete, tile, and carpet entries (not wallpaper/brick/fabric/wicker/glass)
so the stairs material picker only offers materials that make sense as tread
surfaces. If a registry entry is ever added without a `domains` field, it
silently applies nowhere and logs a dev warning (guarded in `buildCatalog`)
rather than crashing every picker.

**Default material for newly-created entities**: per the "keep sketching
lightweight" fix, new rooms/walls should start on flat solid (`'paint'`/
`'plain'`) regardless of the current global default material, so drawing a
fresh plan doesn't eagerly trigger texture loads. Verify this is still true
if entity-creation code is touched. **Stairs follow the same convention** —
`materialId` is optional and unset by default, falling back to the flat
`STAIR_COLOR` swatch until a user explicitly picks a tread material.

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

### 4d. Stairs / Elevator (`mesh/stairsMesh.tsx`, `PropsPanel.tsx`, `lib/constants.ts`) — NEW

**Type union**: `StairsType = 'stairs-straight' | 'stairs-l' | 'stairs-u' |
'stairs-spiral' | 'stairs-ramp' | 'elevator'`. `STAIRS_LABELS` maps each to
display text. `STAIRS_TYPE_GROUP` maps the full 6-type union down to a
simplified `'straight' | 'curved' | 'spiral' | 'other'` group **for the
props-panel Type toggle only** (L and U both present as "Curved" in that UI
without collapsing the underlying stored type) — this is a UI-presentation
mapping, not a data model merge; `stairs.type` itself always stays one of
the 6 real values.

**`PlacedStairs` fields beyond the original x/z/width/depth/rotation**, all
optional so pre-existing saved plans keep rendering unchanged:
- `rise?: number` — total vertical height in meters; falls back to `roomHeight` when unset.
- `steps?: number` — explicit step count; falls back to stairsMesh's original depth/riser-derived auto-calc when unset. Setting this recomputes per-step riser/run from the explicit count rather than being clamped by the old auto-calc.
- `railingEnabled?: boolean` — defaults to `true` (matches pre-feature always-on behavior).
- `railingStyle?: RailingStyle` (`'baluster' | 'glass' | 'cable' | 'solid'`) — **only `'baluster'` is actually implemented in `stairsMesh.tsx`**; `glass`/`cable`/`solid` exist on the type and are selectable but currently silently render as baluster. Flagged, not yet built.
- `railingColor?: string` — defaults to the module's `RAILING_COLOR` constant.
- `railingHeight?: number` — defaults to `0.9`, threaded into `Railing3D`-style height clamping.
- `materialId?: string` — `MATERIAL_REGISTRY` key (domain `'stairs'`) applied to tread surfaces. See texture loading note below.
- `openingMode?: 'none' | 'destination'`, `autoCutout?: boolean`, `openingOffset?: number` — **currently INERT, see below.**
- `fromLevel?: string`, `toLevel?: string` — **currently INERT, hard multi-floor dependency, see below.**

**Multi-floor dependency (fromLevel/toLevel) — NOT implemented, blocking.**
`FloorPlanState` has no floor/level concept at all. The From-Level/To-Level
dropdowns in `PropsPanel` render disabled with "(coming soon)" placeholder
text rather than being wired to anything. This cannot be meaningfully built
until floor/level scaffolding lands in `FloorPlanState` itself — flagged as
a prerequisite, not a stairs-specific bug.

**Auto Cutout — NOT implemented, also currently a no-op despite having a
working-looking toggle in the panel.** `autoCutout`/`openingMode`/
`openingOffset` are stored on `PlacedStairs` but nothing reads them.
Punching an actual hole requires the ROOM FLOOR/CEILING slab generator
(likely `three/RoomFloor.tsx` / `RoomCeiling.tsx` — not yet pasted into this
context, unconfirmed) to know about stair footprints and subtract them from
the floor/ceiling `THREE.Shape` via `.holes.push(...)` before extrusion —
the same hole-punching technique already used for the spiral tread's
`ExtrudeGeometry`. This is a separate file from `stairsMesh.tsx` and hasn't
been touched yet. Do not assume Auto Cutout does anything until this lands.

**2D icon** (`Tools/2dDraw.tsx`, stairs/elevator loop): switched from an
`if/else if` chain to a `switch (s.type)` specifically because the old chain
had TWO `else if (s.type === 'stairs-spiral')` branches (one stale
placeholder arc, one real spoke-pattern icon) — the first consumed the
narrowing, so TS flagged the second as an impossible comparison. The switch
form is exhaustive-safe against this recurring mistake; if a 7th stairs type
is ever added, prefer adding a `default: const _exhaustive: never = s.type`
guard to catch missed cases at compile time (not yet added, worth doing —
mirrors the `ObjectBody` "must have a case per type" rule in §4c).

**3D geometry** (`mesh/stairsMesh.tsx`) — per-type branches: `StraightStairs`,
`LStairs`, `UStairs`, `SpiralStairs`, `RampStairs`, `ElevatorMesh`. Two bugs
fixed during implementation, both worth remembering as patterns:

1. **Type-switch stale-geometry bug.** Switching a placed stair's `type`
   (e.g. straight → spiral) could render a mix of both geometries
   simultaneously, because the outer `<group>` wrapping the per-type branches
   had no `key`, so React reconciled leftover meshes from the previous type
   instead of a clean unmount. **Fixed by keying the group on
   `` `${s.id}-${s.type}` ``**, forcing full remount on type change. General
   lesson: any component that swaps between structurally-different geometry
   branches based on a mutable type field needs a type-inclusive key, not
   just an id key.

2. **Spiral radius/railing bugs.** (a) Radius was `Math.min(w, d) / 2 -
   0.05`, so increasing `width` alone did nothing once `depth` became the
   limiting dimension — spiral stairs use `width` as their diameter, `depth`
   should mirror it. **Fix belongs partly in `PropsPanel.tsx`**: the Width
   input's `onChange` for stairs now also sets `depth` to match whenever
   `stairs.type === 'stairs-spiral'`, keeping the footprint square. (b) The
   railing used a `CatmullRomCurve3` through sampled points, which can bulge
   between samples since a spline isn't constrained to lie exactly on a
   circle — visibly misaligned from the actual tread edges. **Fixed with an
   exact parametric `HelixCurve` (custom `THREE.Curve` subclass)** so every
   point on the `TubeGeometry`, not just sampled ones, sits exactly on the
   true radius; posts also now compute position from the same
   `angleStep`/`radius` values the treads themselves use, rather than an
   independent even-spacing loop.

**Texture loading — `lib/textureLoader.ts` (NEW shared module).**
`stairsMesh.tsx`'s tread material needed real image texture support (map/
normalMap/roughnessMap), not just flat color/roughness/metalness — the
initial pass only read flat values off `MATERIAL_REGISTRY` entries and
silently ignored `textureUrl` etc., so photo-textured materials (Marble,
Tile Ceramic, Brick White...) fell back to a flat swatch color with no
visible pattern. `furnitureMesh.tsx` already had working texture-loading
logic (global cache + subscriber/notify pattern, NOT drei's `useTexture`),
so that logic was extracted into `lib/textureLoader.ts` as
`useTextureMaterialProps` for stairs to reuse rather than building a second
independent cache. **`furnitureMesh.tsx` has NOT yet been migrated to import
from the new shared file** — it still has its own private copy of the same
cache/loader/subscriber code. Until that migration happens, a texture URL
referenced by both a furniture item and a stair tread will be loaded/cached
twice under two separate Maps. Flagged as a follow-up, not yet done.

`TreadMaterial` (component in `stairsMesh.tsx`) mirrors `furnitureMesh.tsx`'s
override pattern: keep rendering the flat-color material until the texture
load status is definitively `'loaded'` or `'failed'`, so nothing flashes
into an untextured white/swatch box mid-load.

**Not shared with `objects/railing-3d.tsx`.** Stairs railings (baluster
posts + handrail, both straight and spiral/helical variants) are a
self-contained implementation inside `stairsMesh.tsx`, independent of the
wall-type railing geometry in `objects/railing-3d.tsx` (§3). They happen to
produce a visually similar baluster look but do not share code. If unifying
these two railing implementations is ever desired, that's a real refactor,
not a rename.

---

## 5. Floating UI — Quick Action Menu, Floating Dock, Presets panel

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
- **Stairs: geometry, rise/steps, railing on/off + color/height, tread material picker (domain `'stairs'`), 2D icon (all 6 types), spiral radius/railing alignment fixes** — see §4d. Auto Cutout, railing styles beyond baluster, and level-linking are explicitly NOT part of this — see §7.

## 7. Known open items (not yet done, don't assume otherwise)

- **Shared/partition wall material override** — see §2's detailed writeup. Floor override works correctly for sub-areas split by a partition; wall override does not.
- **Window variant rendering** — reported as rendering flat/dark with no visible frame or glass distinction across variants; root cause not yet isolated (candidates: `WindowVariant3D` not invoked, wrong/lost `variant` value, glass material issue, or the wall-mounted-centerline-burial bug per §5-of-prior-doc applying to window glass specifically). Not yet fixed — diagnose via the 3-step isolation (mesh invocation → variant data → material) before patching blind.
- **`universalMaterials.ts` vs `MATERIAL_REGISTRY`** — still unconfirmed whether this is dead/legacy or actively used; do not assume resolved.
- **2D redraw performance** — `deriveClosedPolygons()` and the `fp.openings.filter(...)` calls inside `draw2D` were identified as running unmemoized every frame/redraw; fix is to precompute these once per `fp` change (`useMemo` in `FloorPlanEditor.tsx`) and pass as params into `draw2D` rather than recomputing inside it. Confirm this landed before assuming 2D pan/drag performance is solved — the deeper "why does mousemove trigger so many redraws" question also depends on `handleMouseMove`/`scheduleRedraw`'s current throttling, which was flagged but not yet reviewed.
- **Stairs Auto Cutout** — stored fields (`autoCutout`, `openingMode`, `openingOffset`) are inert; requires floor/ceiling slab generator (likely in `three/`) to accept stair footprints and hole-punch around them. Not started.
- **Stairs From/To Level** — hard-blocked on multi-floor scaffolding not existing in `FloorPlanState` at all. UI stubbed disabled, not wired.
- **Stairs railing styles** — `railingStyle: 'glass' | 'cable' | 'solid'` are selectable in the type but unimplemented in `stairsMesh.tsx`'s `Railing`/spiral-railing rendering; only `'baluster'` actually renders differently, others silently fall back to it.
- **`furnitureMesh.tsx` texture-loader duplication** — has its own private texture cache/loader/subscriber implementation that predates and was copied (not migrated) into the new shared `lib/textureLoader.ts` for stairs to use. Should be consolidated so both meshes share one cache; not yet done, so a texture URL used by both furniture and stairs currently double-loads under two separate Maps.

---

## 8. Standing gotchas (still apply, condensed from prior versions)

- `Scene3D` prop contract: takes the whole `fp` object, never decomposed fields.
- `ResilientCanvas`: only remount on a CONFIRMED-still-lost context after a delay; never remount on every successful `webglcontextrestored`.
- Persistence: confirm single source of truth (`floorplan_editor_state` as canonical, `scene_json` derived) hasn't regressed to multiple independent writers.
- Every new draggable/selectable/deletable entity type needs updating in ALL of: 3 hit-test-priority sites, delete-handler chain (now at least 3 sites per §5), `PropsPanel`'s early-return guard, `pushHistory`'s `hadDrag` boolean, save/load round-trip.
- Wall-mounted mesh centerline-burial bug: offset `basePos` along the wall normal, don't place at raw centerline — check this FIRST for any new mesh type that's invisible in 3D but fine in 2D (see §4c's outdoor-object case for a variant of this same symptom class, caused by a missing switch case rather than centerline burial specifically — both produce "2D correct, 3D blank, no error").
- Stray debug `console.log`/`console.count` calls have caused false "performance bug" reports before — check for leftover debug statements before assuming a re-render/memoization bug. **`furnitureMesh.tsx` currently has two such leftover `console.log` calls** (`_furnitureMatById` keys dump, and per-render `materialId`/`overrideMat` dump) — worth removing in a cleanup pass, not urgent.
- `ScrollableList`, not `overflowY: auto`, for any scrollable floating panel content.
- **Type-switch stale-geometry bug (new, §4d)**: any component whose rendered geometry branches on a mutable `type`-like field needs to key its wrapping group/element on `` `${id}-${type}` ``, not just `id` — otherwise switching type can leave stale meshes from the previous type mixed into the new render. First caught on stairs (straight→spiral), worth checking any other type-branching mesh component for the same risk.