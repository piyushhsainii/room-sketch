export type SunVector = { x: number; y: number; z: number };

/**
 * Simplified sun position: elevation from time-of-day only (sine curve
 * peaking at solar noon), azimuth driven directly by compass heading input.
 * No lat/lon/date astronomy — good enough for lighting exploration, not
 * real-world accuracy. See sunDate field for future upgrade path.
 */
export function sunPosition(
  timeOfDay: number,
  compassHeading: number,
): { azimuth: number; elevation: number } {
  // Elevation: 0 at 6:00/18:00, peak (~75°) at 12:00, negative (below horizon) outside 6-18.
  const dayFraction = (timeOfDay - 6) / 12; // 0 at 6am, 1 at 6pm
  const elevation = Math.sin(Math.PI * dayFraction) * 75; // degrees, clamps naturally via sin

  // Azimuth: compass heading directly (0 = north, 90 = east, 180 = south, 270 = west)
  const azimuth = compassHeading;

  return { azimuth, elevation };
}

/** Converts azimuth/elevation (degrees) into a normalized direction vector
 *  for positioning a directional light at `distance` from a center point. */
export function sunVectorFromAngles(
  azimuthDeg: number,
  elevationDeg: number,
  distance: number,
): SunVector {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;

  // Three.js convention: +X east, +Z south-ish, +Y up. Azimuth measured from north (+Z... adjust to your world's north).
  const horizontalDist = Math.cos(el) * distance;
  const x = Math.sin(az) * horizontalDist;
  const z = -Math.cos(az) * horizontalDist;
  const y = Math.sin(el) * distance;

  return { x, y, z };
}

export function sunLightColor(timeOfDay: number): string {
  // Warm at sunrise/sunset, neutral-bright at noon, cool/dim at night.
  if (timeOfDay < 5 || timeOfDay > 20) return "#3A4A6B"; // night — cool dim moonlight-ish
  if (timeOfDay < 7 || timeOfDay > 18) return "#FFB877"; // golden hour
  return "#FFF5E8"; // daytime
}

export function sunIntensity(timeOfDay: number): number {
  const { elevation } = sunPosition(timeOfDay, 0);
  return Math.max(0.15, Math.min(2.5, (elevation / 75) * 2.5));
}
