// Tools/presets.ts
//
// Issue 2 (scoped, per plan step 1/2/7): wall-property presets + a small,
// curated set of built-in room templates. Deliberately NOT here: curved
// walls (new geometry, plan step 2 category (b) — separate later feature),
// community/user-submitted assets (plan step 7 — separate later feature).
//
// Both preset kinds are pure data — no new entity types. A wall preset is
// just "start a new line-wall segment with these properties already set"
// (plan step 6). A room template is a relative-coordinate bundle of
// EditorRoom/EditorOpening/PlacedFurniture — cloned with fresh ids and
// translated to the click point at insert time (plan step 4), after which
// it's indistinguishable from anything hand-drawn (plan step 9 — no
// provenance tagging).

import { EditorOpening } from "./constants";
import { FurnitureType } from "./furniture-constants";

// ── Wall variant presets ───────────────────────────────────────────────────

export type WallPreset = {
  id: string;
  label: string;
  thickness: number;
  /** Matches the real WallType union exactly — "solid" | "railing" | "open".
   *  There's no separate "low wall" concept in the data model, so "Low wall"
   *  below maps onto "railing" (already the low/see-through wall type from
   *  the balcony work) rather than inventing a field that doesn't exist. */
  wallType?: "solid" | "railing" | "open";
};

export const WALL_PRESETS: WallPreset[] = [
  { id: "wall-standard", label: "Wall", thickness: 0.15, wallType: "solid" },
  {
    id: "wall-thick-30",
    label: "Thick wall 30cm",
    thickness: 0.3,
    wallType: "solid",
  },
  { id: "wall-low", label: "Low wall", thickness: 0.15, wallType: "railing" },
];

// ── Room templates ──────────────────────────────────────────────────────────
//
// Coordinates are relative to the template's own (0,0) anchor — insertion
// translates every room/furniture position by the click point directly,
// since anchor = (0,0) here (simplest version of plan step 4's "relative
// bundle" requirement; a bbox-based anchor would work identically if a
// template's rooms didn't already start near the origin).

export type TemplateRoom = {
  key: string; // local id, only used to wire up openings within this template
  x: number;
  z: number;
  width: number;
  depth: number;
  label: string;
};

export type TemplateOpening = {
  roomKey: string;
  wall: "north" | "south" | "east" | "west";
  type: EditorOpening["type"];
  variant: string;
  position: number;
  width: number;
  height: number;
  sillHeight: number;
};

export type TemplateFurniture = {
  type: FurnitureType;
  x: number;
  z: number;
  rotation: number;
  scale?: number;
};

export type RoomTemplate = {
  id: string;
  label: string;
  category: "Rooms";
  rooms: TemplateRoom[];
  openings?: TemplateOpening[];
  furniture?: TemplateFurniture[];
};

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: "template-small-bedroom",
    label: "Small Bedroom",
    category: "Rooms",
    rooms: [
      { key: "r1", x: 0, z: 0, width: 3.2, depth: 3.0, label: "Bedroom" },
    ],
    openings: [
      {
        roomKey: "r1",
        wall: "south",
        type: "door",
        variant: "door-swing-single",
        position: 1.6,
        width: 0.9,
        height: 2.1,
        sillHeight: 0,
      },
      {
        roomKey: "r1",
        wall: "north",
        type: "window",
        variant: "window-fixed",
        position: 1.6,
        width: 1.2,
        height: 1.2,
        sillHeight: 0.9,
      },
    ],
    furniture: [
      { type: "bed", x: 1.0, z: 1.2, rotation: 0 },
      { type: "wardrobe", x: 2.6, z: 1.5, rotation: Math.PI / 2 },
      { type: "lamp", x: 0.4, z: 0.4, rotation: 0 },
    ],
  },
  {
    id: "template-bathroom",
    label: "Bathroom",
    category: "Rooms",
    rooms: [
      { key: "r1", x: 0, z: 0, width: 2.2, depth: 2.0, label: "Bathroom" },
    ],
    openings: [
      {
        roomKey: "r1",
        wall: "south",
        type: "door",
        variant: "door-swing-single",
        position: 1.1,
        width: 0.8,
        height: 2.1,
        sillHeight: 0,
      },
    ],
    furniture: [
      { type: "toilet", x: 0.4, z: 0.5, rotation: 0 },
      { type: "shower", x: 1.6, z: 0.6, rotation: 0 },
      { type: "commode", x: 0.4, z: 1.6, rotation: 0 },
    ],
  },
];
