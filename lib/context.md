# Floor Plan Editor — Codebase Context

React/Next.js 2D-drawn + 3D-rendered floor plan editor. `FloorPlanEditor.tsx`
owns all state (`fp: FloorPlanState`, `sceneConfig: SceneConfig`). Everything
else is a render helper, dumb display component, or a panel that patches
state via `(value, onChange)` callbacks — nothing else holds its own copy of
plan data.

**Recurring bug pattern, seen 5+ times across this project's history**:
fields/types get silently renamed, dropped, or duplicated into a second
parallel source of truth when a file is rewritten wholesale instead of
incrementally patched. Before editing any file, view its actual current
contents — don't assume a prior description matches what's live. After
editing, re-view to confirm the change landed. This single habit prevents
most of the bugs documented below from recurring.

---

## 1. File map

FloorPlanEditor.tsx // State owner, mouse handlers, 2D canvas draw, layout
2dDraw.tsx // ? — likely draw2D extracted out; verify before assuming
3dRoom.tsx / 3DScene.tsx // ? — likely Room3D / Scene3D; verify before assuming
Tools/constants.ts // Types, MATERIAL_REGISTRY (see §3), tool defs, ICONS
Tools/ToolBar.tsx, GroupComponent.tsx // Toolbar UI
Tools/door-style-migration.ts // Legacy DoorMaterial → registry key translation
MaterialsPanel.tsx // Dock tab — global + per-room/shape material swatches
PropsPanel.tsx // Per-entity property editor (room/wall/opening/furniture/etc.)
SceneConfigPanel.tsx // Scene-wide lighting/toggle controls
FloorPlanEditorModal.tsx, FloorplanMinimap.tsx // ? — not yet pasted, verify before touching
ResilientCanvas.tsx // <Canvas> wrapper with WebGL context-loss recovery (see §6)
WorkspaceContainer.tsx, WorkspaceCanvas.tsx, WorkspaceConfigPanel.tsx,
WorkspaceLoader.tsx, WorkspaceToolbar.tsx // AI-extraction flow — separate from
// the manual editor, ? not yet pasted
texture/
MaterialPicker.tsx // Swatch grid UI — check for eager-load-all bug (§5)
materials-registry.ts // ? — possibly duplicate of Tools/constants.ts's MATERIAL_REGISTRY, verify
textureCategorize.ts // ?
universalMaterials.ts // LEGACY — getMaterialsFor(domain), likely superseded by
// Tools/constants.ts's getMaterialsForDomain; confirm which
// is authoritative before touching either (see §3)
three/
CameraController.tsx, NavigationGizmo.tsx, RoomCeiling.tsx, RoomFloor.tsx,
RoomFurniture.tsx, RoomGroup.tsx, RoomLabel.tsx, RoomWall.tsx, SceneLighting.tsx
// ? none pasted yet — this may be a newer decomposition of what was
// previously monolithic Room3D/Scene3D logic; verify before assuming old
// Room3D/LineWalls3D descriptions below still apply as-is
objects/
wallmat.tsx, floormat.tsx // Material renderers (real-texture + procedural fallback)
doormat.tsx // Door material resolution (registry-first, see §3)
door-variants.tsx, window-variant3d.tsx, arch-header.tsx
line-walls-3d.tsx // Line-wall extrusion, openings, wall decor, floors
wall-decor-mesh.tsx // LED/PVC panel/painting decor meshes
lights-mesh.tsx // Light fixture meshes (wall sconce/pendant/recessed/floor lamp)
scene-graph.tsx // Collapsible entity tree panel
error-boundary.tsx // SceneErrorBoundary — required around any <Canvas> using real textures
furniture/furnitureMesh.tsx, stairsMesh.tsx
WalkModeControls.tsx
lights-constant.ts // PlacedLight defaults/labels (parallel to Tools/constants — verify not a dup)
../ui/Dock.tsx, ScrollableList.tsx

---

## 2. Core data model

```ts
FloorPlanState {
  rooms, lineNodes, lineSegments, closedShapes, openings,
  furniture, stairs, wallDecor, lights, annotations, roomHeight
}
SceneConfig {
  ambientIntensity, wallRoughness, wallTextured, showFurniture, showLabels,
  fogEnabled, doorStyle, globalFloorMaterial, globalWallMaterial,
  rooms: RoomSceneConfig[]   // ⚠️ field name is `rooms`, NEVER `roomOverrides` — renamed 3+ times historically
}
RoomSceneConfig { roomId, wallColor?, wallMaterial?, floorMaterial?, wallOverrides? }
ClosedShape { id, nodeIds, label?, floorMaterial?, wallMaterial?, wallOverrides? }
```

**Two parallel wall systems**, always check `segmentNodeIds` presence to know which:

- Room walls: `wall: 'north'|'south'|'east'|'west'` + `position` (offset along wall)
- Line walls: `segmentNodeIds: [fromId, toId]` + `segmentT` (0–1 interpolation)
  Openings, wall decor, and lights (`PlacedLight`) all use this identical dual pattern.

**Per-wall/per-segment overrides** (`wallOverrides` on `RoomSceneConfig`/`ClosedShape`,
keyed by `'north'|...` or `` `${segId}_${i}` ``): data model + save/load round-trip
exist; confirm current `Room3D`/`LineWalls3D`/`MaterialsPanel` actually read/write
them before assuming the feature works end-to-end — this was scoped as a multi-step
build and needs re-verification against current files.

**Room wall synthetic id**: `` `${roomId}::wall::${wall}` `` — not a real entity id,
special-cased via `selectedId?.includes('::wall::')` in PropsPanel/hit-testing.

---

## 3. Materials system — MATERIAL_REGISTRY is the single source of truth

```ts
type MaterialDomain = 'wall' | 'floor' | 'door' | 'furniture'
type MaterialDef = { color, roughness, metalness, repeatScale, category, domains: MaterialDomain[], label?, preview?, textureUrl?, normalMapUrl?, roughnessMapUrl? }
MATERIAL_REGISTRY: Record<string, MaterialDef>   // ~60 entries, tagged by domain
getMaterialsForDomain(domain) → { key, def }[]
getMaterialsByCategory(domain) → Record<category, { key, def }[]>
```

Legacy `WALL_MAT_DEFS`/`FLOOR_MAT_DEFS` are derived from the registry
(`Object.fromEntries(getMaterialsForDomain(...))`) so old call sites keep working.

**⚠️ `texture/universalMaterials.ts`'s `getMaterialsFor(domain)` may be a second,
older parallel catalog** — confirm whether it's still used anywhere before trusting
it; `PropsPanel.tsx` was found calling both `getMaterialsFor` (wall/floor/furniture)
and `getMaterialsForDomain` (door) inconsistently in the same file. Prefer
`getMaterialsForDomain` (registry-backed, confirmed working) and migrate/remove the
other if truly redundant.

**Door material resolution** (`objects/doormat.tsx`): `resolveDoorMaterial(style)`
must check `MATERIAL_REGISTRY[style]` **first** (direct registry key, what the
picker now writes), falling back to a legacy 7-value `DoorMaterial`→registry-key
translation map only for old saved data, then a hardcoded oak fallback. If a door
material "does nothing," check this resolution order first — checking the legacy
map before the registry silently discards any material not in the original 7.

**Wall/floor real-texture loading** (`RealTextureWallMat`/`RealTextureFloorMat`):
`useLoader` per map (color/normal/roughness) — can suspend, wrap every `<Canvas>`
using textured materials in both `<Suspense>` and `<SceneErrorBoundary>` (a bad
texture path throws past Suspense, blanking the whole canvas with no recovery
otherwise). Real photo textures live flat under `public/textures/` (some in
subfolders like `wood/Wood052_1K-JPG/`) — **filenames are inconsistent even within
one pack** (e.g. `Tiles101_Roughness.jpg` has no `_1K-JPG` segment unlike its
siblings) — always verify the exact real filename before writing a `textureUrl`.
`repeatScale` needs per-material, per-surface-type tuning by eye — no formula
works across materials; wall-scale and floor-scale surfaces need very different
values for the same texture.

**Swatch/picker eager-loading bug**: rendering every material's `<img>`/
background-image unconditionally (even for collapsed categories) causes 60+
simultaneous texture fetches on mount, defeating the deliberate lazy
load-on-select + hover-prefetch design. Collapsed categories must not mount
image elements at all (conditional render, not CSS visibility).

**Texture cache staleness bug** (furniture materials, possibly others using a
similar pattern): a module-level cache that inserts a placeholder (`null`)
_before_ a texture finishes loading, then checks `.has()` to skip re-requesting,
permanently blocks retry if the component unmounts mid-load (e.g. Fast Refresh).
Fix: track "loaded" and "in-flight" as separate `Map`/`Set`s — never cache a
placeholder as if it were a real (if absent) result.

---

## 4. Lighting system (`PlacedLight`)

```ts
type LightFixtureType = 'wall_sconce' | 'ceiling_pendant' | 'ceiling_recessed' | 'floor_lamp'
PlacedLight { id, type, roomId?, wall?, position?, segmentNodeIds?, segmentT?,  // wall_sconce
              x?, z?,                                                          // ceiling/floor free placement
              heightOffset, color, intensity, castShadow, scale, facingInward? }
```

Follows the exact wall-decor dual-placement pattern (§2) for `wall_sconce`; free
x/z placement (via `hitRoom` + `snapM`) for the other three types. Rendered via
`objects/lights-mesh.tsx` — visible fixture body + emissive "bulb" mesh + real
`<pointLight>`. Given only 2–5 lights expected per scene, shadow-casting is
acceptable but use a smaller `shadow-mapSize` (512²) than the main directional
light. `facingInward` flips which side of the wall a sconce projects toward — same
normal-offset math as wall decor (§ below), just negatable.

**Verify before assuming complete**: hit-testing (`hitLight`) wired into all 3
required sites (select, hover, delete — see §6), PropsPanel editing section, and
save/load round-trip (`SceneJSON.lights`, snake_case ↔ camelCase translation same
as `closed_shapes`) — this was built in stages across several handoffs, confirm
each stage actually landed rather than assuming the full chain works.

---

## 5. Wall-mounted mesh occlusion bug (recurring — check this FIRST for new mesh types)

Any wall-mounted mesh (decor, lights, future fixture types) placed at the wall's
raw centerline coordinates renders **invisible in 3D, correct in 2D, no console
error** — it's buried inside the solid wall box. Diagnostic tell: works in 2D,
silently absent in 3D, nothing logs. Fix: offset `basePos` outward along the
wall's normal by `T/2 + smallGap` before use. Has recurred independently in
`Room3D`, `LineWalls3D`, and needs re-checking for any new fixture type (lights)
built without explicit awareness of this pattern.

---

## 6. Rendering, persistence, and known gotchas

- **`Scene3D`'s prop contract is `{ fp, sceneConfig?, walkMode? }`** — takes the
  whole `fp` object, never decomposed individual fields. A decomposed-props
  rewrite silently drops line walls/furniture/stairs. Recurred 2×.
- **`ResilientCanvas`** wraps `<Canvas>` for context-loss recovery — only remount
  on a confirmed-still-lost context after a delay (`onLost` → `scheduleRemount`
  → re-check `isContextLost()`); do NOT remount on every successful
  `webglcontextrestored` event, that turns harmless momentary context loss into
  a visible full-scene reload/flicker loop.
- **Persistence has (had) 3 independently-writable copies of the same data**
  (`scene_json`, `floorplan_editor_state`, `workspace_config`) — reportedly
  consolidated to one source of truth as of this writing; if "changes aren't
  saving/loading" resurfaces, check for a second write path before assuming a
  logic bug, this exact failure mode has recurred multiple times.
- **`SceneJSON.furniture` was `unknown[]`** and silently dropped furniture on
  save — fixed once already (should be `PlacedFurniture[]`); if it regresses to
  `unknown[]` again, furniture will silently stop persisting. `annotations` and
  `wallDecor` may have the same unaddressed gap — verify before assuming they save.
- **Hit-testing priority order** (duplicated 3×: select, hover, delete — no
  shared `hitTestAll()`): node → opening → wall decor → light → furniture →
  stairs → closed shape → room → room wall → line segment → furniture fallback.
  Changing priority in one place requires checking the other two.
- **Every new draggable/selectable entity type needs its drag ref cleared in
  BOTH `handleMouseUp` AND canvas `onMouseLeave`** — forgetting one permanently
  sticks the cursor in drag mode after one use. Has happened before (`wallDragRef`).
- **`PropsPanel`'s "nothing selected" early-return guard** must include every
  new entity type's presence check, not just its JSX branch — forgetting this
  silently shows the empty state instead of the new entity's fields. Has
  happened before (closed shapes).
- **`Suspense fallback={null}` on a shared/top-level boundary** causes a full
  visible blank flash on ANY texture load anywhere in the scene. Scope
  `<Suspense>` per-mesh with a real loading placeholder (pulsing gray material)
  instead of one wrapper around the whole `<Canvas>`.
- **`ScrollableList`**, not `overflowY: 'auto'` — the 2D canvas's native wheel
  listener hijacks scroll events inside floating panels; this is settled, don't
  re-litigate it.
- **Stray debug `console.count`/`console.log` calls** have caused false "infinite
  loop" bug reports — a per-render debug log during 3D orbit (which re-renders
  every frame) looks identical to a real re-render bug. Check for leftover
  debug statements before assuming a memoization/effect-dependency bug.

---

## 7. Quick recipes

**New entity type**: type + array on `FloorPlanState` → `draw2D` block → 3D mesh
(offset off wall centerline if wall-mounted, §5) → hit-testing in 3 places (§6) →
drag ref + both cleanup sites → `pushHistory`'s `hadDrag` → `PropsPanel` branch +
guard-clause update → delete-key handler → toolbar entry/icon → SceneJSON
round-trip (both directions, snake_case↔camelCase).

**New material**: add one entry to `MATERIAL_REGISTRY` with correct `domains`
array — nothing else to touch. Don't add to a per-domain list separately.

**Before debugging "state not syncing"**: grep for field-name drift
(`roomOverrides` vs `rooms`, two parallel material catalogs, decomposed `Scene3D`
props) and stray debug logs before assuming a logic error — these have been the
actual cause more often than not.
