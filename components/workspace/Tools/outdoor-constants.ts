export type OutdoorObjectType = "crosswalk" | "dustbin" | "bench" | "mailbox";

export type PlacedOutdoorObject = {
  id: string;
  type: OutdoorObjectType;
  x: number;
  z: number;
  rotation: number;
  scale: number;
  materialId?: string;
};

export const OUTDOOR_OBJECT_FOOTPRINTS: Record<
  OutdoorObjectType,
  { w: number; d: number }
> = {
  crosswalk: { w: 2.0, d: 3.0 },
  dustbin: { w: 0.5, d: 0.5 },
  bench: { w: 1.6, d: 0.5 },
  mailbox: { w: 0.35, d: 0.35 },
};

export const OUTDOOR_OBJECT_LABELS: Record<OutdoorObjectType, string> = {
  crosswalk: "Crosswalk",
  dustbin: "Dustbin",
  bench: "Bench",
  mailbox: "Mailbox",
};

// Which outdoor types render as a flat ground decal (no volume, no
// bounding-box selection outline) vs. a normal freestanding object.
export const OUTDOOR_FLAT_TYPES: Set<OutdoorObjectType> = new Set([
  "crosswalk",
]);
