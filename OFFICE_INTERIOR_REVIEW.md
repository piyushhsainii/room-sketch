# Modern office interior pass

## Findings

- The office example specified plain floors, white walls and original model
  colours. This made the three floors look like an unfinished layout.
- Single-floor preview rendered only that floor's own stairs. The incoming flight
  from the floor below disappeared even when an opening had been authored.
- Both example stair flights occupied the same shaft. Their level connections were
  implicit, and the upper-floor openings did not describe distinct return flights.
- The woven-carpet registry entry referenced an asset whose image is red brick.
- Rectangular room floors switched from planes to shape geometry without normalising
  their UVs. Combined with default texture dimensions, this over-repeated finishes.
- Wall decorations were mounted at wall centre depth. Plaques and screens became
  buried in the wall; south and west faces also needed their correct inward rotation.

## Implemented

- Retained the current room layout, item IDs, manual furniture positions and room
  dimension locks. Preserved previous versions and a checkpoint before finishing.
- Added oak, exposed-aggregate stone and a verified woven finish; warm neutral walls,
  muted green feature walls, charcoal metalwork and coordinated upholstered seating.
- Added editable RoomSketch studio signage, meeting-room screens and dressed desks
  with monitors, stands, keyboards and mice. Furniture height now supports explicit
  physical dimensions while old items retain their existing scale behaviour.
- Connected alternating stair flights to explicit destination floors, persisted
  matching cutouts, and added glass guards with an open landing edge.
- Added derived destination openings for legacy stairs and incoming-flight rendering
  in Single view. This avoids loading lower-floor rooms/furniture solely for a stair.
- Kept added ceiling lights free of additional shadow maps. Reused existing model
  assets and material loading. Disposed instance materials and generated geometry/
  sign textures when replaced.

## Verification

- 30 tests across seven suites pass; TypeScript passes.
- Regression tests cover level inference, explicit destinations, disabled openings,
  idempotent cutouts/finish application, preservation of user edits, and local texture
  asset availability.
- Browser checked both upper-floor openings and incoming flights in Single view,
  all three furnished floors, signage/screens, and upper-floor Walk Mode/Escape.
- Saved project 94b462b6-b3fc-4784-8ecb-c7e6c95f0def and verified its finished state
  survives reload. Local alternative 05 is named Modern studio — oak, sage and
  connected stairwells. Previous alternatives remain available in this browser.
- This pass does not establish a frame-rate benchmark or verify full stair traversal
  under every input/device combination. The existing model assets remain stylised;
  the improvements are materials, proportions, furnishing details and lighting.
