# RoomSketch implementation progress

This is the progress record for incremental improvements. Preserve the existing
uncommitted work, public entry points, saved documents, geometry representations,
opening anchors, and revision-checked saves. No remote migration is implied by
local validation. All new and edited text is UTF-8.

## Phase 1 — structure (in progress)

- [x] Inspect working tree, repository instructions, editor state and callers.
  No applicable AGENTS.md found in the repository or checked parent directories.
  Substantial pre-existing edits and untracked assets are present; do not reset.
- [x] Move scene configuration types to a canonical non-UI module; keep compatible
  exports while updating consumers. Acceptance: no runtime dependency on the editor
  for configuration types; TypeScript and Next compilation pass.
- [x] Make the project document own active-floor data, retaining the existing
  setFp interface and input-handler refs. Extract meaningful document operations.
  Acceptance: switching, adding, deleting and reordering floors retain edits;
  inactive state identities survive edits; height changes update elevations;
  snapshots contain every floor. Verify per-floor history and dirty/save behavior.
- [x] Review remaining history, persistence and tool responsibilities after state
  ownership is stable; extract only cohesive responsibilities. FloorHistory now
  owns snapshot cloning and per-floor undo/redo stacks. Document mutation lives in
  project-document.ts and useProjectDocument. Keep tool/selection/drag cleanup
  together for this checkpoint; persistence still uses the existing external API
  callbacks. Further extraction depends on broader boundary/interaction tests.
- [x] Compare rectangular-room and wall-network ownership/calculations without
  changing representations. Trace manual and legacy uploaded-plan renderers.
  Initial finding: project page still calls WorkspaceContainer for uploaded plans;
  it calls /api/workspace/extract, for which no implementation was found.
  Manual renderer: EditorPreview -> 3DScene -> FloorGeometry -> Room3D and
  LineWalls3D. Legacy renderer: WorkspaceContainer -> WorkspaceCanvas -> three/*.
  The existing conversion core handles both room-wall and segment-node opening
  anchors; retain it. Existing normalization/splitting and polygon helpers remain
  in use. No graph migration or renderer consolidation is justified at this stage.

## Phase 2 — correctness and persistence (depends on Phase 1)

- [ ] Atomic database project quota and idempotent creation/retry migration.
  Acceptance: concurrent attempts respect existing plan limits; preserve limit UX.
  Record local SQL checks separately from verified remote application.
- [ ] Repair supported import routing using existing capabilities; explicitly
  record unavailable extraction integrations without inventing a service.
- [ ] Version and validate load/import/save documents (finite dimensions, collection
  bounds, unique floor IDs, references); lossless legacy migration and 409 saves.
- [ ] Define backwards-compatible ground/basement, height, cutout and stair semantics.
- [ ] Unify entitlement reads; test webhook errors, replay and ordering locally.
- [ ] Per-draft local recovery identity, including legacy keys and expired sessions.
- [ ] Bound per-floor history and define project-level undo boundaries.

## Phase 3 — performance (depends on correctness)

- [ ] Apply web-perf skill and measure small, furnished and multi-floor workloads;
  distinguish production results from development overhead and tool limitations.
- [ ] Validate demand rendering, invalidation, Walk Mode and screenshot capture.
- [ ] Coalesce expensive drag work with final-state guarantees on release/cancel/save.
- [ ] Measure derived polygon/index reuse before adding per-floor/revision caching.
- [ ] Exclude public model/font assets from auth refresh; retain route protection.
- [ ] Inspect GLTF traversals, bounds, material clones and resource disposal.
- [ ] Project metadata projection/pagination and stored star_count consistency.
- [ ] Add measured quality adaptation/diagnostics; no unsupported FPS/INP claims.

## Phase 4 — textures and assets (depends on performance baseline)

- [ ] Verify registry paths, fallbacks, thumbnails, priorities, formats, repeat and
  color spaces. Library disk size is not page transfer size.
- [ ] Bound source-cache retention with reference-safe ownership and retries.
- [ ] Consider thumbnails/color-map-first tiers; compressed GPU formats require
  validated pipeline/browser fallback. Preserve unrelated source assets.

## Phase 5 — predictable editing and walking (depends on document/scene stability)

- [ ] Lightweight derived wall/door collision, floor edges, stair transitions and
  recovery. Preserve look controls, pointer lock, FOV zoom, fullscreen, minimap,
  floor/heading and Escape behavior.
- [ ] Furniture collision prefilter based on both scaled object bounds and stairs;
  add spatial indexing only if measurements justify it.
- [ ] Check 2D/3D, save/reload, sharing and exports on multi-floor furniture fixtures.

## Validation evidence and pending work

- Initial inspection: package.json had no test script; Jest and TypeScript were
  installed; existing migration test was entirely commented out. Added npm test
  using the installed TypeScript compiler and Jest; replaced that inert test.
- 2026-11-19: baseline TypeScript passed. After structural changes, 14 tests pass
  across document workflows, legacy migration and history. Tests cover stale
  reorder data, active/inactive deletion, last-floor protection, state identities,
  height undo, mixed opening anchors, multi-floor conversion/reload, extension
  fields, history isolation, snapshot ownership, invalidated redo and clearing
  all previous history when restoring a different document.
- 2026-11-19: strict UTF-8 decoding and NUL checks passed for 259 source/config files.
- Production webpack build passed (Next 16.1.6, all 35 static pages). The first
  sandboxed attempt failed creating .next/types/app/api; rerunning the authorized
  local build outside that sandbox succeeded. The final post-history build also
  passed compilation, TypeScript, prerendering and trace collection on the
  combined working tree. No checkout key fragments appeared after the log fix.
- Chrome production checks on isolated origin http://127.0.0.1:3101: drew a room,
  added a floor, switched back, edited again, exercised undo/redo, checked empty
  upper-floor undo isolation, changed upper ceiling height to 3.1 m, reloaded the
  local draft, verified two ground-floor rooms in both 2D/3D and upper height
  recovery. The existing saved-project tab and database were not edited. Browser
  checks precede the final history extraction; that extraction has regression
  coverage. Test server stopped after checks.
- Code inspection caught a new potential regression from authoritative floors:
  active edits would rebuild all inactive indexes. Ghost-floor derivations now
  reuse already displayed indexes when the inactive state identity is unchanged;
  no global cache was added and no measured performance claim is made.
- Removed checkout module debug output that printed payment-key fragments during
  builds; payment configuration and requests are unchanged. No payment was made.
- Other work is actively changing the shared tree (PRACTICAL_FEATURES_PLAN.md and
  related editor integrations). Preserve it separately from this checkpoint's
  scope. Adapted its newly added clear-history call to FloorHistory.clear and
  removed an identical duplicate tracingImage type property. TypeScript passes
  on that combined state; final production build passed on the checked snapshot.
  A final strict UTF-8/NUL check also passed for 260 source files after concurrent
  additions, and git diff --check passed.
- Pending: actual database saves/conflicts, remote quota concurrency/migrations,
  all-tool and multi-floor export UI coverage, sharing and Walk Mode regression
  fixtures. This structural checkpoint creates no migration and applies none to
  a remote database; any concurrently added migration belongs to its own work.
- Use narrow behavioral regressions for document operations, migration, geometry,
  concurrency/quota and navigation as each area changes. Avoid tests that repeat
  implementation details. Never use the user's saved plan as a destructive fixture.
- Future product features (constraints, calibrated imports, quantities, comments,
  alternatives and collaboration) remain outside these phases.
