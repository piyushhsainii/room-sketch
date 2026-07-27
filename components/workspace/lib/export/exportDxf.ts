// lib/export/exportDxf.ts
//
// STEP 4 — DXF (2D) exporter. No prior exporter of any kind existed for
// this format. Requires a new dependency:
//
//   npm install dxf-writer
//
// (`dxf-writer` is a small, dependency-free DXF R12 writer — sufficient
// for the geometry-plus-labels scope below. three.js's own exporters do
// not cover DXF at all, so this can't reuse anything from Step 3.)
//
// Scope, per Plan 3 Step 4: geometry + labels only. This does NOT attempt
// CAD-convention-compliant layer naming, line-type standards, or block
// libraries beyond what's needed to make wallType visually distinguishable
// on import. That's flagged as a explicit non-goal for v1.
//
// wallType handling: each wallType gets its own DXF layer
// (WALLS_SOLID / WALLS_RAILING / WALLS_OPEN) so a CAD user can toggle or
// re-style them independently — solid, railing, and open walls are never
// exported as visually identical geometry.

import Drawing from "dxf-writer";
import { deriveFlatPlan2D, FlatPlan2D } from "./flatten2d";
import { FloorPlanState } from "@/components/workspace/lib/constants";

const LAYER_BY_WALLTYPE: Record<string, string> = {
  solid: "WALLS_SOLID",
  railing: "WALLS_RAILING",
  open: "WALLS_OPEN",
};

const OPENING_LAYER: Record<string, string> = {
  door: "OPENINGS_DOOR",
  window: "OPENINGS_WINDOW",
  opening: "OPENINGS_PASSAGE",
};

function perpendicular(dx: number, dz: number): [number, number] {
  const len = Math.hypot(dx, dz) || 1;
  return [-dz / len, dx / len];
}

export function buildDxfDocument(fp: FloorPlanState): string {
  const flat: FlatPlan2D = deriveFlatPlan2D(fp);
  const d = new Drawing();

  d.setUnits("Meters");
  d.addLayer("WALLS_SOLID", Drawing.ACI.WHITE, "CONTINUOUS");
  d.addLayer("WALLS_RAILING", Drawing.ACI.CYAN, "DASHED");
  d.addLayer("WALLS_OPEN", Drawing.ACI.WHITE, "DOTTED");
  d.addLayer("OPENINGS_DOOR", Drawing.ACI.YELLOW, "CONTINUOUS");
  d.addLayer("OPENINGS_WINDOW", Drawing.ACI.BLUE, "CONTINUOUS");
  d.addLayer("OPENINGS_PASSAGE", Drawing.ACI.MAGENTA, "DASHED");
  d.addLayer("LABELS", Drawing.ACI.GREEN, "CONTINUOUS");
  d.addLayer("HEIGHT_LABELS", Drawing.ACI.RED, "CONTINUOUS");

  // ── Walls: centerline + thickness -> a simple rectangular polyline per
  // piece (a lightweight stand-in for a true hatch entity, keeping the
  // dependency surface small for v1). ────────────────────────────────────
  for (const piece of flat.wallPieces) {
    const layer = LAYER_BY_WALLTYPE[piece.wallType] ?? "WALLS_SOLID";
    d.setActiveLayer(layer);

    if (piece.wallType === "open") {
      // True gap — represent as a centerline only, on its own layer, so
      // it's visually and structurally distinct from a solid wall.
      d.drawLine(piece.a.x, piece.a.z, piece.b.x, piece.b.z);
      continue;
    }

    const dx = piece.b.x - piece.a.x;
    const dz = piece.b.z - piece.a.z;
    const [nx, nz] = perpendicular(dx, dz);
    const hw = piece.thickness / 2;
    const p1 = [piece.a.x + nx * hw, piece.a.z + nz * hw];
    const p2 = [piece.b.x + nx * hw, piece.b.z + nz * hw];
    const p3 = [piece.b.x - nx * hw, piece.b.z - nz * hw];
    const p4 = [piece.a.x - nx * hw, piece.a.z - nz * hw];
    d.drawPolyline([p1, p2, p3, p4], true);

    // Non-default per-segment height (Plan 1) — reflected as a text label
    // next to the piece, same convention as draw2D's on-screen "H: x.xxm" tag.
    if (piece.height !== fp.roomHeight) {
      d.setActiveLayer("HEIGHT_LABELS");
      const midX = (piece.a.x + piece.b.x) / 2;
      const midZ = (piece.a.z + piece.b.z) / 2;
      d.drawText(midX, midZ, 0.12, 0, `H: ${piece.height.toFixed(2)}m`);
      d.setActiveLayer(layer);
    }
  }

  // ── Openings: simple rectangle per opening, sized to width, centered on
  // its resolved world position, rotated to the wall angle. ───────────────
  for (const op of flat.openings) {
    const layer = OPENING_LAYER[op.kind] ?? "OPENINGS_PASSAGE";
    d.setActiveLayer(layer);
    const hw = op.width / 2;
    const cosA = Math.cos(op.angle),
      sinA = Math.sin(op.angle);
    const depth = 0.1; // nominal opening-rectangle thickness across the wall
    const corners = [
      [-hw, -depth / 2],
      [hw, -depth / 2],
      [hw, depth / 2],
      [-hw, depth / 2],
    ].map(([lx, lz]) => [
      op.wx + lx * cosA - lz * sinA,
      op.wz + lx * sinA + lz * cosA,
    ]);
    d.drawPolyline(corners as [number, number][], true);
  }

  // ── Room/shape labels ─────────────────────────────────────────────────
  d.setActiveLayer("LABELS");
  for (const label of flat.labels) {
    d.drawText(label.x, label.z, 0.2, 0, label.text);
  }
  // Room dimension labels, matching the "W×D" text already shown in draw2D
  for (const r of flat.roomRects) {
    d.drawText(
      r.x + r.width / 2,
      r.z + r.depth / 2 - 0.3,
      0.14,
      0,
      `${r.width.toFixed(1)}m x ${r.depth.toFixed(1)}m`,
    );
  }

  return d.toDxfString();
}

export function exportDXF(
  fp: FloorPlanState,
  filename = "floor-plan.dxf",
): void {
  const dxfString = buildDxfDocument(fp);
  const blob = new Blob([dxfString], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
