# Floor Plan Editor — Codebase Context (compact)

React/Next.js 2D-drawn + 3D-rendered, multi-floor floor plan editor.
`FloorPlanEditor.tsx` owns all state. Everything else is a render helper,
dumb display component, or a panel that patches state via callbacks.

**Rule**: before editing any file, view its actual current contents — docs
and prior chat messages can be stale. Re-view after editing to confirm.

---

## State model

- `fp`/`setFp`/`fpRef` (`FloorPlanEditor.tsx`) — live state of the
  currently-edited floor. All handlers/panels/2D render read-write this.
- `floors[]`/`ProjectFloorPlan` (`lib/floor-data.ts`) — saved/at-rest
  multi-floor wrapper: `Floor { id, label, order, elevation, visible, state }`.
- `switchToFloor` — folds `fp` back into `floors[]`, loads target floor
  into `fp`. Confirmed **not** fragile: uses plain `setFloors(recomputed)`
  + separate `setFp(newTarget.state)`, not a nested updater. No action needed.
- `Scene3D` takes `activeFp={fp}` (live), substituted in only for the
  active floor — required so live edits show in 3D before a floor switch.
- `viewMode`: `single` (active only, `showUnderlay` fades floor below),
  `stacked` (~0.35 opacity non-active), `stacked-full` (full opacity +
  `FloorCap` on floors below active).

---

## File map — one-liners

- `FloorPlanEditor.tsx` — state owner, mouse handlers, `scheduleRedraw`, layout.
- `3DScene.tsx` (Scene3D) — loops floors[], elevation/opacity/cap, global camera/lighting.
- `FloorGeometry.tsx` — per-floor 3D geometry, one instance per rendered floor.
- `FloorCap.tsx` — ceiling-cap plane for floors below active (stacked views only).
- `Tools/2dDraw.tsx` (`draw2D`) — imperative canvas render; does NOT clear canvas itself.
- `Tools/constants.ts` — types, tool defs, ICONS, DEFAULT_FP, MATERIAL_REGISTRY.
- `Tools/PropsPanel.tsx` — per-entity property editing, incl. wall material side-picker.
- `Tools/QuickActionMenu.tsx` — floating per-object menu, hidden during drag.
- `Tools/ResilientCanvas.tsx` — remounts <Canvas> only on confirmed context loss.
- `Tools/WorkspaceCanvas.tsx` + siblings — AI-extraction flow, separate, single-floor only.
- `lib/floor-data.ts` — Floor/ProjectFloorPlan types, `recomputeFloorElevations`.
- `lib/migrateToMultiFloor.ts` — legacy → multi-floor wrapper, idempotent.
- `lib/computeDerivedFloorData.ts` — per-floor derived data for ghost rendering.
- `lib/deriveFlatPlan2D.ts` — pure fn, per-`fp` flat 2D data (polygons/walls/openings/labels). **Module-level cache (`_lastFp`) removed — was a cross-instance/cross-floor correctness bug; `useMemo` at call site is now the only cache.**
- `lib/helpers.ts` — `deriveClosedPolygons`, `toCanvas/toWorld`, hit-test math.
- `lib/textureLoader.ts` — shared texture cache; `furnitureMesh.tsx` NOT yet migrated to it (still has private duplicate cache — known perf debt).
- `lights/resolveLightPosition.ts` — `resolveShadowEligibleLightIds(Across Floors)`, scene-wide 8-light cap vs GPU's 16-unit ceiling.
- `lights/LightsLayer.tsx` — renders lights for one floor, applies shadow cap.
- `hooks/useFurnitureCollisions.ts` — overlap detection → red dashed outline.
- `mesh/furnitureMesh.tsx` — procedural fallback (no GLTF def / forceProcedural / GLTF error). `heightOffset` applied once at outer `<group>`.
- `mesh/lights-mesh.tsx`, `outdoor-object-mesh.tsx` (needs default case), `stairsMesh.tsx` (own railing impl, unchanged), `string-lights-mesh.tsx`.
- `objects/line-walls-3d.tsx` — wall extrusion; single boxGeometry + 6-slot material array (no overlay-plane — z-fighting regression risk).
- `objects/railing-3d.tsx` — Railing3D, shared by partial-railing openings + full-segment railing walls (not by stairs).
- `texture/` — MaterialPicker, materials-registry.ts, universalMaterials.ts (**unconfirmed legacy-vs-canonical vs MATERIAL_REGISTRY**).
- `three/CameraController.tsx` — orbit/topdown/walk modes; orbit & topdown already animate in on mount (`lerpVectors` + `easeOutCubic`, ~1.2–1.5s). **Confirm this is the file `Scene3D` actually uses** (a workspace-typed variant was also seen — disambiguate before extending).
- `three/RoomCeiling.tsx` — does not exist yet.
- `three/NavigationGizmo.tsx`, `RoomGroup.tsx`, `RoomLabel.tsx`, `RoomWall.tsx`, `SceneLighting.tsx` — never viewed this cycle, verify before editing.

---

## 2D rendering — ghosting & redraw

- `scheduleRedraw()` clears canvas once/frame, draws ghost floors
  (`globalAlpha=0.25`, full detail, non-interactive) then active floor at
  full opacity/interactivity.
- Derived data (`flat2D`, `openingsIndex`, `shapesIndex`, `ghostFloorsDerived`)
  each: `useMemo([fp])` → synced to a ref via its own `useEffect`.
- **Fixed — first-shape flash/jitter bug**: mousemove (line/bend tool) called
  `scheduleRedraw()` imperatively, which could fire before derived-data refs
  synced post-`setFp`, painting one stale frame. Fix: added one consolidated
  trigger effect —
  `useEffect(() => scheduleRedraw(), [fp, flat2D, openingsIndex, shapesIndex, ghostFloorsDerived, scheduleRedraw])`
  — guarantees redraw only after all refs are fresh. Per-drag/preview
  `scheduleRedraw()` calls (mousemove) left in place for responsiveness;
  the `ghostFloorsDerived` effect's own `scheduleRedraw()` call was removed
  (now redundant/would double-schedule).
- `shapesIndex` keying: `[...nodeIds].sort().join(',')` — must match
  `2dDraw.tsx`'s lookup exactly or labels fall back to `'Area'`.
- `hitClosedShape` (hit-testing) re-derives `deriveClosedPolygons` fresh
  per call instead of reusing `flat2D.closedPolygons` — duplicate work,
  candidate for perf cleanup if hit-testing runs on every hover/mousemove.
- Drag state (`isDraggingSelection`) set/cleared in exactly one place
  (`dragEntries` dispatch + shared `handleMouseUp`) — never per-tool.

---

## Materials, lighting, floor caps, stairs — key rules

- Wall interior/exterior attach slots are a FIXED constant
  (`material-5`=interior, `material-4`=exterior) — never a per-wall ternary.
- Material resolution (which texture goes on which slot) DOES vary per
  wall piece — branch on `matchingShapes.length`, not on which shape slot
  (`shapeFacingA`/`B`) got populated (winding-direction-dependent, not meaningful).
- Segment-level explicit override always wins over shape-derived default.
- Wall-segment texture picker must write to the field matching the active
  side tab (interior/exterior) — past bug: always wrote `wallMaterial` regardless.
- Shape wall-texture writes (`applyShapeWallTexture`/`applyShapeExteriorMaterial`)
  must resolve by `shape.id`, not a re-derived nodeIds key, or interior/exterior
  picks fork into duplicate `ClosedShape` rows.
- Light `isFree` derived from anchor fields (`!wall && !segmentNodeIds`),
  never a type allowlist.
- Shadow-casting lights capped at 8, computed **scene-wide** in
  stacked/stacked-full (not per-floor) to respect GPU's ~16-unit ceiling.
- Floor cutouts (`ClosedShape.cutout`) punch holes in rect rooms correctly;
  irregular-area polygon-matching still buggy (open item).

---

## Fixed (confirmed by you, this cycle)

- Server-side `scene_json` multi-floor share links.
- Irregular-area floor-cutout hole-punching (polygon-matching).
- Window variant rendering (flat/dark).
- `universalMaterials.ts` vs `MATERIAL_REGISTRY` — resolved.
- 2D redraw perf under many ghost floors — re-profiled, fine at scale.
- `furnitureMesh.tsx` texture cache — migrated to `lib/textureLoader.ts`.
- Shared/partition wall override — two-sided `(segmentId, ownerShapeId)` model shipped.
- Stairs Auto Cutout (+ `RoomCeiling.tsx` now exists), From/To Level UI wiring, railing styles beyond baluster.
- `showUnderlay` — dedicated UI toggle added.

## Known open items

- Camera transition on floor switch — not implemented; `switchToFloor` is
  an instant snap. `CameraController.tsx`'s orbit/topdown mount-animation
  pattern (lerp + easeOutCubic) is the template to extend, once the
  correct (non-workspace) controller file is confirmed.
- View-mode/opacity transitions (`stacked`/`showUnderlay` toggles) — instant
  snap, no interpolation; not yet implemented.
- Custom user-uploaded GLB furniture — future scope, not started.

## Payments, plans & gating — NEW

**Plan model**: Free (1 project, no `export3d`/`glbImport`, basic material
subset) / Pro $30/mo (5 projects, all features) / Custom (contact-sales
card only, not a real `PlanId`, no Dodo product). Superseded the old
storage-tier model (`free`/`basic`/`pro` by `storageGb`) and the earlier
Free/Pro-$19/Studio-$59 pricing-page copy — both dead now.

- `lib/plan.ts` — single source of truth. `PLANS` (`Record<PlanId, Plan>`),
  `PLAN_ORDER`, `planFor()`, `CUSTOM_PLAN` (display-only, no gating).
  `Plan` carries both gating fields (`projectLimit`, `features: Set<FeatureFlag>`)
  and pricing-page display fields (`tag`/`tagline`/`ctaLabel`/`displayFeatures`).
  Also holds a **legacy `PRICING_PLANS`/`LegacyPlanId` compat shim** (old
  `storageGb`/`features:string[]` shape) — marked DO-NOT-USE, kept only so
  any not-yet-migrated `from "@/lib/pricing"` import doesn't hard-break.
  **`lib/pricing.ts` itself should be deleted once all consumers migrated —
  find remaining imports and remove the shim, don't leave both alive.**
- `lib/entitlements.ts` — server-only. `getEntitlements(userId)` reads
  `subscriptions` table (RLS-respecting client), resolves plan with a
  3-day grace period on `past_due` before downgrading to free;
  `canceled`/grace-expired → free immediately. `requireFeature`/
  `requireProjectSlot` throw `PlanLimitError`; `guardFeature`/
  `guardProjectSlot` are the route-handler-friendly wrappers (return a 402
  Response or null). **Plan gating happens per-action inside route
  handlers/server actions — NOT in `proxy.ts`** (DB read cost per request,
  and gating is per-action not per-route).
- `proxy.ts` (project root) — Next.js 16 convention (renamed from
  `middleware.ts`; that old convention still works but is deprecated).
  Handles auth-session gating ONLY (redirect to `/login` if no user on
  `/projects`/`/dashboard`; bounce logged-in users off `/login`) — no plan
  logic here, session-refresh runs in all envs, redirect gating is prod-only.
- **Dodo Payments** — official `@dodopayments/nextjs` adapter.
  - `app/checkout/route.ts` — checkout session handler (`type: "session"`).
  - `app/customer-portal/route.ts` — subscription self-management, needs
    `?customer_id=` — **`subscriptions` table needs a `dodo_customer_id`
    column added** (not present yet); currently the webhook matches users
    by email only, which is fragile — add the column, backfill from the
    first `subscription.active` event, then match on it instead.
  - `app/api/webhook/dodo-payments/route.ts` — maps Dodo subscription
    events (`active`/`renewed`/`planChanged` → active; `onHold`/`failed` →
    past_due; `cancelled`/`expired` → canceled) to `subscriptions` upserts.
    Uses a service-role client (bypasses RLS — webhooks have no user
    session). `DODO_PRODUCT_TO_PLAN` map is still empty — needs your real
    Dodo product ID once created in their dashboard. **Real webhook
    payload field names (`data.customer.email`, `data.product_id`, etc.)
    are unverified against an actual payload — test in `test_mode` and log
    raw `payload.data` before trusting field names, docs don't show a full
    example.**
  - Two service-role client factories exist in the codebase with
    *different* env var names (`SUPABASE_SERVICE_ROLE_KEY` vs
    `SUPABASE_SERVICE_KEY`) — confirm which is actually set in prod env
    before wiring the webhook to either; using the wrong one throws at
    runtime, not at build time.

### Security — open items before production (not yet verified/actioned)

- **RLS on `subscriptions`/`projects`/`plans` — unconfirmed.** Highest
  priority open item: if a user can `UPDATE subscriptions SET plan_id =
  'pro'` via the client SDK directly, `entitlements.ts` is a no-op as a
  security boundary regardless of correctness. `subscriptions` writes
  should be service-role-only (webhook), never user-writable.
- Service-role client usage audit — must never be reachable from a route
  that takes user-supplied `user_id` without independently verifying it
  matches the session first.
- Rate limiting — not implemented. Needed on `export3d`, GLB upload,
  project-creation (all cost-bearing, currently only gated by plan limits,
  not call frequency).
- GLB upload security (size limits, magic-byte MIME validation, parse-time
  crash handling) — relevant once custom GLB import (Pro feature) is built,
  currently future scope per multi-floor doc above.
- Share-link (`projects.share_token`) randomness + scoped read access —
  unconfirmed, worth a explicit check.
- Env var hygiene — confirm no service-role/Dodo secret keys carry a
  `NEXT_PUBLIC_` prefix or get referenced from a `"use client"` file.
- Security headers/CSP — not yet added via `next.config.js`.



- `Scene3D` takes `floors`/`activeFloorId`/`viewMode`/`showUnderlay`/`activeFp` — not a single `fp` prop.
- `ResilientCanvas` remounts only on confirmed-still-lost context, never every `webglcontextrestored`.
- Persistence shape: `{ projectFloorPlan, sceneConfig }`, migrated via `migrateToMultiFloor()`.
- New draggable/selectable/deletable entity types must update: hit-test
  priority, delete-handler chain (≥3 sites), `PropsPanel` guard,
  `pushHistory`'s `hadDrag`, save/load, `dragEntries` table.
- Wall-mounted meshes: offset along wall normal, not raw centerline (invisible-in-3D-only bug).
- Geometry keyed on `${id}-${type}`, not just `id`, for any type-switchable component.
- `ScrollableList`, not `overflowY: auto`, for floating panels.
- Avoid module-level caches (`let _lastX`) in any pure derive-fn shared
  across floors/instances — use `useMemo` at the call site instead
  (see `deriveFlatPlan2D` fix above); worth auditing `getShapesIndex`/
  `getOpeningsIndex`/`computeDerivedFloorData.ts` for the same pattern.