// lib/export/exportSvg.ts
//
// STEP 5 — SVG (2D) exporter, v2.
//
// Changes from the shipped version:
//   1. Walls are now drawn as TRUE double-line offset polygons (using
//      each piece's `thickness`), not thick centerline strokes. This
//      matches how architectural floor plans read and how the 3D scene
//      actually looks from above, instead of an approximation.
//   2. Door/window openings get real arc/swing symbols instead of a
//      flat rect — door = swing arc + leaf line, window = double-line
//      break in the wall with a thin sill line.
//   3. Every wall piece gets a thickness label (in cm) in addition to
//      the existing length label. Non-default height keeps its existing
//      "H: x.xxm" tag.
//   4. Bottom-right watermark: app monogram + name. Swap-in point for a
//      real logo image is marked below (`WATERMARK_LOGO_HREF`).
//
// Still reads from the single shared `deriveFlatPlan2D()` (Step 6), so
// this stays in sync with draw2D and the DXF exporter automatically.

import {
  deriveFlatPlan2D,
  FlatPlan2D,
  FlatWallSegmentPiece,
} from "./flatten2d";
import { FloorPlanState } from "@/components/workspace/lib/constants";

const PX_PER_M = 60; // export-time scale; independent of the live canvas's zoom/pan
const MARGIN = 40; // extra canvas padding so the watermark never overlaps geometry

// ── Watermark config ──────────────────────────────────────────────────
// If/when you have a real logo file, base64-encode it and set this to
// `data:image/png;base64,...` (or `.svg+xml`) — buildWatermark() will
// switch to an <image> tag automatically instead of the monogram.
const WATERMARK_LOGO_HREF: string | null = null;
const WATERMARK_APP_NAME = "FloorPlan Studio"; // TODO: replace with actual app name

export function wallDashArray(
  wallType: FlatWallSegmentPiece["wallType"],
): string {
  // Mirrors draw2D's ctx.setLineDash([8, 4]) for railing and ([3, 5]) for open.
  if (wallType === "railing") return "8,4";
  if (wallType === "open") return "3,5";
  return "";
}

export function wallStrokeColor(
  wallType: FlatWallSegmentPiece["wallType"],
): string {
  if (wallType === "railing") return "#788CA0";
  if (wallType === "open") return "#B4B4B4";
  return "#94A3B8";
}

export function wallFillColor(
  wallType: FlatWallSegmentPiece["wallType"],
): string {
  if (wallType === "railing") return "none";
  if (wallType === "open") return "none";
  return "#E2E8F0";
}

function heightLabelFor(
  piece: FlatWallSegmentPiece,
  roomHeight: number,
): string | null {
  if (piece.height === roomHeight) return null;
  return `H: ${piece.height.toFixed(2)}m`;
}

function thicknessLabelFor(piece: FlatWallSegmentPiece): string {
  return `${Math.round(piece.thickness * 100)}cm`;
}

// Offset a centerline segment a→b by `halfT` on both sides, returning the
// four corners of the wall polygon (in the same coordinate space as a/b —
// caller projects to px afterward).
function offsetWallPolygon(
  a: { x: number; z: number },
  b: { x: number; z: number },
  thickness: number,
): { x: number; z: number }[] {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * (thickness / 2);
  const nz = (dx / len) * (thickness / 2);
  return [
    { x: a.x + nx, z: a.z + nz },
    { x: b.x + nx, z: b.z + nz },
    { x: b.x - nx, z: b.z - nz },
    { x: a.x - nx, z: a.z - nz },
  ];
}

export function buildSvgDocument(fp: FloorPlanState): string {
  const flat: FlatPlan2D = deriveFlatPlan2D(fp);

  const allX = flat.wallPieces.flatMap((p) => [p.a.x, p.b.x]);
  const allZ = flat.wallPieces.flatMap((p) => [p.a.z, p.b.z]);
  const minX = Math.min(0, ...allX) - 1;
  const minZ = Math.min(0, ...allZ) - 1;
  const maxX = Math.max(1, ...allX) + 1;
  const maxZ = Math.max(1, ...allZ) + 1;
  const width = (maxX - minX) * PX_PER_M + MARGIN;
  const height = (maxZ - minZ) * PX_PER_M + MARGIN;
  const px = (x: number) => (x - minX) * PX_PER_M;
  const pz = (z: number) => (z - minZ) * PX_PER_M;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui">`,
  );

  // ── Walls: true double-line offset polygons ─────────────────────────
  for (const piece of flat.wallPieces) {
    const poly = offsetWallPolygon(piece.a, piece.b, piece.thickness);
    const pts = poly.map((p) => `${px(p.x)},${pz(p.z)}`).join(" ");
    const dash = wallDashArray(piece.wallType);
    const isOpen = piece.wallType === "open";

    parts.push(
      `<polygon points="${pts}" fill="${wallFillColor(piece.wallType)}" stroke="${wallStrokeColor(
        piece.wallType,
      )}" stroke-width="${isOpen ? 1 : 1.5}"${dash ? ` stroke-dasharray="${dash}"` : ""} />`,
    );

    const x1 = px(piece.a.x),
      z1 = pz(piece.a.z);
    const x2 = px(piece.b.x),
      z2 = pz(piece.b.z);
    const lenM = Math.hypot(piece.b.x - piece.a.x, piece.b.z - piece.a.z);
    const midX = (x1 + x2) / 2,
      midZ = (z1 + z2) / 2;

    // Length + thickness + wall-type, stacked, bold black for legibility
    // against the wall fill (was light gray — hard to read on print/zoom).
    parts.push(
      `<rect x="${midX - 26}" y="${midZ - 15}" width="52" height="13" fill="#FFFFFF" opacity="0.85" />`,
    );
    parts.push(
      `<text x="${midX}" y="${midZ - 5}" font-size="10" font-weight="700" text-anchor="middle" fill="#0F172A">${lenM.toFixed(
        2,
      )}m</text>`,
    );
    const typeTag = piece.wallType !== "solid" ? ` · ${piece.wallType}` : "";
    parts.push(
      `<text x="${midX}" y="${midZ + 10}" font-size="8" font-weight="600" text-anchor="middle" fill="#1E293B">${thicknessLabelFor(
        piece,
      )}${typeTag}</text>`,
    );

    // Non-default height label — mirrors draw2D's "H: x.xxm" tag
    const hLabel = heightLabelFor(piece, fp.roomHeight);
    if (hLabel) {
      parts.push(
        `<rect x="${midX - 22}" y="${midZ + 14}" width="44" height="14" rx="3" fill="#EAB308" opacity="0.9" />`,
      );
      parts.push(
        `<text x="${midX}" y="${midZ + 24}" font-size="9" text-anchor="middle" fill="#1E1B18">${hLabel}</text>`,
      );
    }
  }

  // ── Openings: real door swing arcs / window breaks ──────────────────
  for (const op of flat.openings) {
    const cx = px(op.wx),
      cz = pz(op.wz);
    const w = op.width * PX_PER_M;
    const hw = w / 2;

    parts.push(
      `<g transform="translate(${cx},${cz}) rotate(${(op.angle * 180) / Math.PI})">`,
    );

    if (op.kind === "door") {
      // Break in the wall (white) + leaf + swing arc, matching typical
      // architectural door symbols.
      parts.push(
        `<rect x="${-hw}" y="-8" width="${w}" height="16" fill="#FFFFFF" />`,
      );
      // Leaf (closed position, perpendicular at hinge)
      parts.push(
        `<line x1="${-hw}" y1="0" x2="${-hw}" y2="${-w}" stroke="#818CF8" stroke-width="2" />`,
      );
      // Swing arc from leaf tip to open position along the wall
      parts.push(
        `<path d="M ${-hw} ${-w} A ${w} ${w} 0 0 1 ${hw} 0" fill="none" stroke="#818CF8" stroke-width="1" stroke-dasharray="2,3" />`,
      );
    } else if (op.kind === "window") {
      // Break in wall + double parallel lines (glazing) + sill ticks
      parts.push(
        `<rect x="${-hw}" y="-6" width="${w}" height="12" fill="#FFFFFF" />`,
      );
      parts.push(
        `<line x1="${-hw}" y1="-3" x2="${hw}" y2="-3" stroke="#60A5FA" stroke-width="1.5" />`,
      );
      parts.push(
        `<line x1="${-hw}" y1="3" x2="${hw}" y2="3" stroke="#60A5FA" stroke-width="1.5" />`,
      );
      parts.push(
        `<line x1="${-hw}" y1="-6" x2="${-hw}" y2="6" stroke="#60A5FA" stroke-width="1.5" />`,
      );
      parts.push(
        `<line x1="${hw}" y1="-6" x2="${hw}" y2="6" stroke="#60A5FA" stroke-width="1.5" />`,
      );
    } else {
      // Generic opening — plain break, no swing
      parts.push(
        `<rect x="${-hw}" y="-6" width="${w}" height="12" fill="#FFFFFF" stroke="#C8B896" stroke-dasharray="3,3" />`,
      );
    }

    parts.push(`</g>`);
  }

  // ── Room/area labels ──────────────────────────────────────────────────
  for (const label of flat.labels) {
    parts.push(
      `<text x="${px(label.x)}" y="${pz(label.z)}" font-size="12" text-anchor="middle" fill="#334155">${escapeXml(
        label.text,
      )}</text>`,
    );
  }

  // ── Room dimension labels ────────────────────────────────────────────
  for (const r of flat.roomRects) {
    parts.push(
      `<text x="${px(r.x + r.width / 2)}" y="${pz(r.z + r.depth / 2) + 14}" font-size="10" font-weight="600" text-anchor="middle" fill="#334155">${r.width.toFixed(
        1,
      )}m x ${r.depth.toFixed(1)}m</text>`,
    );
  }

  // ── Legend (bottom-left) — explains door/window/opening/wall-type symbols ──
  parts.push(buildLegend(height));

  // ── Watermark (bottom-right) ─────────────────────────────────────────
  parts.push(buildWatermark(width, height));

  parts.push(`</svg>`);
  return parts.join("\n");
}

function buildLegend(canvasHeight: number): string {
  const x = 16;
  const rowH = 18;
  const startY = canvasHeight - MARGIN - rowH * 5 - 10;
  const entries: { swatch: string; label: string }[] = [
    {
      swatch: `<line x1="0" y1="0" x2="20" y2="0" stroke="#818CF8" stroke-width="2" /><path d="M 0 0 A 14 14 0 0 1 14 -14" fill="none" stroke="#818CF8" stroke-width="1" stroke-dasharray="2,3" />`,
      label: "Door (swing shown)",
    },
    {
      swatch: `<line x1="0" y1="-3" x2="20" y2="-3" stroke="#60A5FA" stroke-width="1.5" /><line x1="0" y1="3" x2="20" y2="3" stroke="#60A5FA" stroke-width="1.5" />`,
      label: "Window",
    },
    {
      swatch: `<rect x="0" y="-5" width="20" height="10" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5" />`,
      label: "Solid wall",
    },
    {
      swatch: `<line x1="0" y1="0" x2="20" y2="0" stroke="#788CA0" stroke-width="2" stroke-dasharray="8,4" />`,
      label: "Railing",
    },
    {
      swatch: `<line x1="0" y1="0" x2="20" y2="0" stroke="#B4B4B4" stroke-width="1.5" stroke-dasharray="3,5" />`,
      label: "Open / stairs edge",
    },
  ];

  const parts: string[] = [];
  parts.push(`<g font-size="10" fill="#1E293B">`);
  parts.push(
    `<rect x="${x - 8}" y="${startY - 14}" width="150" height="${rowH * entries.length + 18}" fill="#FFFFFF" stroke="#E2E8F0" rx="4" />`,
  );
  parts.push(
    `<text x="${x}" y="${startY - 2}" font-size="10" font-weight="700" fill="#0F172A">Legend</text>`,
  );
  entries.forEach((entry, i) => {
    const y = startY + 14 + i * rowH;
    parts.push(`<g transform="translate(${x},${y})">${entry.swatch}</g>`);
    parts.push(
      `<text x="${x + 28}" y="${y + 3}" font-size="9" font-weight="600">${escapeXml(entry.label)}</text>`,
    );
  });
  parts.push(`</g>`);
  return parts.join("\n");
}

function buildWatermark(canvasWidth: number, canvasHeight: number): string {
  const padding = 12;
  const boxW = 150;
  const boxH = 28;
  const x = canvasWidth - boxW - padding;
  const y = canvasHeight - boxH - padding;

  const parts: string[] = [];
  parts.push(`<g opacity="0.55">`);

  if (WATERMARK_LOGO_HREF) {
    // Real logo image path — swap WATERMARK_LOGO_HREF above to activate.
    parts.push(
      `<image x="${x}" y="${y}" width="20" height="20" href="${WATERMARK_LOGO_HREF}" />`,
    );
    parts.push(
      `<text x="${x + 26}" y="${y + 14}" font-size="12" font-weight="600" fill="#334155">${escapeXml(
        WATERMARK_APP_NAME,
      )}</text>`,
    );
  } else {
    // Monogram fallback: circle + first letter, until a real logo is supplied.
    const initial = WATERMARK_APP_NAME.trim().charAt(0).toUpperCase();
    parts.push(
      `<circle cx="${x + 10}" cy="${y + 10}" r="10" fill="#1E293B" />`,
    );
    parts.push(
      `<text x="${x + 10}" y="${y + 14}" font-size="11" font-weight="700" text-anchor="middle" fill="#FFFFFF">${escapeXml(
        initial,
      )}</text>`,
    );
    parts.push(
      `<text x="${x + 26}" y="${y + 14}" font-size="12" font-weight="600" fill="#334155">${escapeXml(
        WATERMARK_APP_NAME,
      )}</text>`,
    );
  }

  parts.push(`</g>`);
  return parts.join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportSVG(
  fp: FloorPlanState,
  filename = "floor-plan.svg",
): void {
  const svgString = buildSvgDocument(fp);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
