import { DoorStyle } from "../lib/constants";

const LEGACY_DOOR_STYLE_MAP: Record<string, DoorStyle> = {
  natural: "wood_oak",
  white: "wood_white",
  dark: "wood_dark",
  glass: "glass_clear",
};

const VALID_DOOR_STYLES = new Set<DoorStyle>([
  "wood_oak",
  "wood_dark",
  "wood_white",
  "glass_frosted",
  "glass_clear",
  "metal_steel",
  "panel_white",
]);

/**
 * Normalizes any DoorStyle value that may have come from persisted data
 * (old vocabulary, or anything unrecognized) into a valid current DoorStyle.
 * Safe to call on already-valid values — they pass through unchanged.
 */
export function normalizeDoorStyle(
  value: string | undefined | null,
): DoorStyle {
  if (!value) return "wood_oak";
  if (VALID_DOOR_STYLES.has(value as DoorStyle)) return value as DoorStyle;
  return LEGACY_DOOR_STYLE_MAP[value] ?? "wood_oak";
}

/**
 * Same idea, for a per-door material override (RoomDoor.material /
 * EditorOpening.material) where the value is optional and 'no override,
 * use the wall/scene default' must stay distinguishable from 'a real but
 * legacy style was set'.
 */
export function normalizeDoorMaterialOverride(
  value: string | undefined | null,
): DoorStyle | undefined {
  if (!value) return undefined;
  return normalizeDoorStyle(value);
}
