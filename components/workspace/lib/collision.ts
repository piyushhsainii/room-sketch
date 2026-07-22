// lib/collision.ts
//
// Rotated-rectangle overlap detection for furniture placement.
// Reuses the same cosR/sinR local-space transform already used throughout
// handleMouseDown/handleMouseMove for hit-testing (see FURNITURE_FOOTPRINTS
// usage there) — this is the same "is rect A inside rotated rect B" problem,
// just generalized to rect-vs-rect via the Separating Axis Theorem (SAT)
// instead of point-vs-rect.

// --- FurnitureMesh.tsx integration (apply by hand — file not uploaded as editable) ---
// 1. Add prop:  overlapping?: boolean   to FurnitureMesh's props type
// 2. After the existing "Selection / hover highlight" block at the bottom,
//    add a second, independent overlay that ignores selected/hovered/interactive
//    entirely — a collision warning should show even while just dragging,
//    not only when the piece happens to be selected:
//
//    {overlapping && highlightH > 0 && (
//        <mesh position={[0, highlightH / 2, 0]} renderOrder={1000}>
//            <boxGeometry args={[fp2.w * s * 1.1, highlightH * 1.08, fp2.d * s * 1.1]} />
//            <meshBasicMaterial
//                color="#EF4444"
//                wireframe
//                transparent
//                opacity={0.85}
//                depthTest={false}
//            />
//        </mesh>
//    )}
//
// 3. In Scene3D.tsx, pass it through where FurnitureMesh is rendered:
//    <FurnitureMesh f={f} selected={...} overlapping={overlappingIds?.has(f.id)} />
//    where overlappingIds is a new optional Scene3DProps field, Set<string> | undefined.

export type RotRect = {
  cx: number; // center x
  cz: number; // center z
  hw: number; // half-width (local x extent)
  hd: number; // half-depth (local z extent)
  rotation: number; // radians
};

/** Corners of a rotated rect in world space, going clockwise. */
function corners(r: RotRect): [number, number][] {
  const cosR = Math.cos(r.rotation),
    sinR = Math.sin(r.rotation);
  const pts: [number, number][] = [
    [-r.hw, -r.hd],
    [r.hw, -r.hd],
    [r.hw, r.hd],
    [-r.hw, r.hd],
  ];
  return pts.map(([lx, lz]) => [
    r.cx + lx * cosR - lz * sinR,
    r.cz + lx * sinR + lz * cosR,
  ]);
}

/** Project all corners onto an axis, return [min, max]. */
function project(
  pts: [number, number][],
  ax: number,
  az: number,
): [number, number] {
  let min = Infinity,
    max = -Infinity;
  for (const [x, z] of pts) {
    const p = x * ax + z * az;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return [min, max];
}

/**
 * SAT overlap test between two rotated rectangles.
 * Cheap: 4 axes total (2 unique per rect, since opposite edges share an axis),
 * each axis needs one projection pass over 4 corners. Fine to call per-pixel
 * during a drag for a handful of furniture pieces.
 */
export function rotRectsOverlap(a: RotRect, b: RotRect): boolean {
  // Fast reject: circle-radius check using the rect diagonals, avoids full
  // SAT for pieces that are obviously nowhere near each other. Cheap
  // insurance if a plan grows to many furniture pieces.
  const ra = Math.hypot(a.hw, a.hd);
  const rb = Math.hypot(b.hw, b.hd);
  const dx = a.cx - b.cx,
    dz = a.cz - b.cz;
  if (dx * dx + dz * dz > (ra + rb) * (ra + rb)) return false;

  const ca = corners(a);
  const cb = corners(b);

  // Candidate separating axes: the (normalized-direction, but we don't
  // actually need to normalize for a min/max overlap test) edge normals of
  // each rect. Two per rect since opposite edges are parallel.
  const axes: [number, number][] = [
    [Math.cos(a.rotation), Math.sin(a.rotation)],
    [-Math.sin(a.rotation), Math.cos(a.rotation)],
    [Math.cos(b.rotation), Math.sin(b.rotation)],
    [-Math.sin(b.rotation), Math.cos(b.rotation)],
  ];

  for (const [ax, az] of axes) {
    const [aMin, aMax] = project(ca, ax, az);
    const [bMin, bMax] = project(cb, ax, az);
    if (aMax < bMin || bMax < aMin) return false; // found a separating axis
  }
  return true; // no separating axis found on any candidate axis -> overlapping
}

/**
 * Convenience wrapper: build a RotRect from the {x, z, rotation, scale}
 * shape furniture/stairs pieces already use, plus a {w, d} footprint.
 */
export function furnitureToRect(
  x: number,
  z: number,
  rotation: number,
  footprint: { w: number; d: number },
  scale = 1,
): RotRect {
  return {
    cx: x,
    cz: z,
    hw: (footprint.w * scale) / 2,
    hd: (footprint.d * scale) / 2,
    rotation,
  };
}

/**
 * Rect-vs-axis-aligned-wall-segment overlap: treat the wall segment as a
 * thin rotated rect (length x thickness) and reuse the same SAT test —
 * per step 5 of the design doc, this avoids building a separate
 * wall-collision system.
 */
export function furnitureIntersectsWallSegment(
  rect: RotRect,
  ax: number,
  az: number,
  bx: number,
  bz: number, // segment endpoints
  thickness = 0.15,
): boolean {
  const dx = bx - ax,
    dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.001) return false;
  const angle = Math.atan2(dz, dx);
  const wallRect: RotRect = {
    cx: (ax + bx) / 2,
    cz: (az + bz) / 2,
    hw: len / 2,
    hd: thickness / 2,
    rotation: angle,
  };
  return rotRectsOverlap(rect, wallRect);
}
