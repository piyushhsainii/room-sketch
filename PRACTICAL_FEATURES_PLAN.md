# Practical feature rollout

Enhance the existing editor and project document. Preserve existing tools, saved
plans, exports, authentication and the structural work in IMPLEMENTATION_PLAN.md.

## Scope and acceptance

- [x] Measurements and quantities. Show room areas, perimeters, opening and
  furnishing counts across floors. Export a CSV. Report gross space areas, exclude
  standalone cutout regions, and label overlapping spaces and shared perimeters.
- [x] Scene quality. Offer performance, balanced and high settings through Display.
  Persist the device preference and apply it without changing saved plan content.
- [x] Calibrated imports. Import a local raster plan, mark two reference points,
  enter their actual distance, and position a translucent tracing image in metres.
  Retain the image locally and handle missing local files explicitly.
- [x] Persistent dimensions and guides. Lock rectangular room dimensions through
  the existing update boundary. Show alignment guides against other rooms. Retain
  old document compatibility and make changes undoable.
- [x] Local recovery. Keep recoverable checkpoints by project identity, with bounded
  retention and explicit storage errors. Complement guest drafts.
- [x] Design alternatives. Name a local project snapshot, preview its summary and
  explicitly restore it after preserving the current work.
- [x] Revision comparison. Compare named/local checkpoints by entity and floor,
  reporting additions, removals and changes before restore.
- [ ] Client reviews. Add persistent comments linked to a shared project/floor.
  Include author identity, resolution by the project owner and explicit error
  handling. Record required database migration separately from verified deployment.

## Delivery order

1. Pure measurements and snapshot helpers, then the editor tools entry point.
2. Local checkpoints, alternatives and comparison.
3. Image calibration and tracing.
4. Dimension constraints and alignment feedback.
5. Quality settings.
6. Shared reviews and database migration.
7. Focused regression tests, TypeScript, build and UI checks.

## Validation

- Implemented local tools through Display > Project tools. Display also provides
  device-level quality settings, applied in the editor and public shared viewer.
- IndexedDB retains 20 named alternatives and five automatic checkpoints, with
  current-work backup before restore. Images are stored locally and missing images
  produce an explicit reimport message.
- Browser verified the normal editor entry point, Display menu, tools dialog,
  IndexedDB alternative creation, and unchanged-plan comparison.
- Regression coverage includes quantities, CSV escaping, calibration, locked
  resize versus translation/unlock, plan diffs, and review authorization failures.
- Verification completed with 24 passing tests across five suites, strict UTF-8
  checks, TypeScript and a successful Next.js production build. The first build
  hit a sandbox output-directory permission error; the authorized retry passed.
- Client review UI/API and migration are implemented. The migration
  supabase/migrations/202611190001_project_review_comments.sql has NOT been applied
  to a remote database. No linked database or database connection variables were
  present in this checkout. Reviews return an explicit unavailable response if the
  table is missing. Production persistence and resolution remain unverified.
- Constraints currently cover rectangular room width and depth. Guides provide
  alignment feedback between rectangular rooms. Polygon edge constraints, geometric
  boolean area unions, cross-device alternative sync and collaborative live editing
  are follow-up capabilities, outside the initial implementations above.
- Browser demo completed on saved project
  `94b462b6-b3fc-4784-8ecb-c7e6c95f0def`: furnished three-floor office, four named
  alternatives (Baseline, Collaboration, Focus and Presentation), calibrated
  tracing placement, dimension locks, quantities CSV download, quality switching,
  checkpoint comparison and restore with a current-work safety checkpoint.
- Final office was saved to the account and survived a browser reload. Named
  alternatives and tracing image bytes remain local to this browser.
- Browser inspection exposed duplicate furniture flyouts, overly dark room fills,
  restore framing and false revision changes after database JSON reordering or
  equivalent wall-segment normalization; these were corrected incrementally.
- Current focused validation passes 26 tests across five suites and TypeScript.
  Walk mode entry, movement, minimap and Escape exit were exercised on this office;
  broader stair traversal, polygon constraints and cross-device coverage remain.
