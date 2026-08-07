import type { FloorPlanState } from "../constants";
import type { PlacedLight } from "../../lights-constant";

export type ResolvedLightTransform = {
  pos: [number, number, number];
  rot: number;
} | null;

/**
 * Resolves a non-string-lights PlacedLight's world position/rotation from
 * whichever anchor style it uses (segment, room-wall, or free x/z).
 * Extracted from FloorGeometry's inline light-mapping loop so the same
 * resolution logic can be reused by both the render pass and the
 * shadow-budget distance ranking (see resolveShadowEligibleLightIds),
 * instead of the budget calc needing its own rough approximation.
 */
export function resolveLightTransform(
  light: PlacedLight,
  fp: FloorPlanState,
): ResolvedLightTransform {
  const T = 0.15,
    normalOffset = T / 2 + 0.05;
  const inward = light.facingInward ?? true;
  const faceDir = inward ? 1 : -1;

  if (light.segmentNodeIds) {
    const a = fp.lineNodes.find((n) => n.id === light.segmentNodeIds![0]);
    const b = fp.lineNodes.find((n) => n.id === light.segmentNodeIds![1]);
    if (!a || !b) return null;
    const t = light.segmentT ?? 0;
    const px = a.x + (b.x - a.x) * t;
    const pz = a.z + (b.z - a.z) * t;
    const angle = Math.atan2(b.z - a.z, b.x - a.x);
    const nx = Math.sin(angle),
      nz = -Math.cos(angle);
    return {
      pos: [
        px + nx * normalOffset * faceDir,
        light.heightOffset,
        pz + nz * normalOffset * faceDir,
      ],
      rot: inward ? -angle : -angle + Math.PI,
    };
  }

  if (light.roomId && light.wall) {
    const room = fp.rooms.find((r) => r.id === light.roomId);
    if (!room) return null;
    if (light.wall === "north") {
      return {
        pos: [
          room.x + (light.position ?? 0),
          light.heightOffset,
          room.z + normalOffset * faceDir,
        ],
        rot: inward ? 0 : Math.PI,
      };
    }
    if (light.wall === "south") {
      return {
        pos: [
          room.x + (light.position ?? 0),
          light.heightOffset,
          room.z + room.depth - normalOffset * faceDir,
        ],
        rot: inward ? Math.PI : 0,
      };
    }
    if (light.wall === "west") {
      return {
        pos: [
          room.x + normalOffset * faceDir,
          light.heightOffset,
          room.z + (light.position ?? 0),
        ],
        rot: inward ? Math.PI / 2 : -Math.PI / 2,
      };
    }
    return {
      pos: [
        room.x + room.width - normalOffset * faceDir,
        light.heightOffset,
        room.z + (light.position ?? 0),
      ],
      rot: inward ? -Math.PI / 2 : Math.PI / 2,
    };
  }

  return { pos: [light.x ?? 0, light.heightOffset, light.z ?? 0], rot: 0 };
}

const MAX_SHADOW_LIGHTS = 8;

/**
 * GPU shadow budget — see notes at prior fix. Only the nearest
 * MAX_SHADOW_LIGHTS lights (by distance to the floor's rooms' centroid,
 * as a cheap proxy for "likely visible") get to cast shadows; the rest
 * still light the scene, just without a shadow map. Reuses
 * resolveLightTransform so wall/segment lights are ranked by their real
 * resolved position instead of a rough (0,0) fallback.
 */
export function resolveShadowEligibleLightIds(fp: FloorPlanState): Set<string> {
  const eligible = (fp.lights ?? []).filter(
    (l) => l.type !== "string_lights" && l.castShadow,
  );
  if (eligible.length <= MAX_SHADOW_LIGHTS) {
    return new Set(eligible.map((l) => l.id));
  }

  const cx = fp.rooms.length
    ? fp.rooms.reduce((s, r) => s + r.x + r.width / 2, 0) / fp.rooms.length
    : 0;
  const cz = fp.rooms.length
    ? fp.rooms.reduce((s, r) => s + r.z + r.depth / 2, 0) / fp.rooms.length
    : 0;

  const withDist = eligible.map((l) => {
    const t = resolveLightTransform(l, fp);
    const [lx, , lz] = t ? t.pos : [0, 0, 0];
    return { id: l.id, d: Math.hypot(lx - cx, lz - cz) };
  });
  withDist.sort((a, b) => a.d - b.d);
  return new Set(withDist.slice(0, MAX_SHADOW_LIGHTS).map((x) => x.id));
}

// lib/lights/resolveLightPosition.ts — add a scene-wide variant
export function resolveShadowEligibleLightIdsAcrossFloors(
  floorStates: FloorPlanState[],
): Set<string> {
  const allEligible: { id: string; d: number }[] = [];

  for (const fp of floorStates) {
    const eligible = (fp.lights ?? []).filter(
      (l) => l.type !== "string_lights" && l.castShadow,
    );
    if (eligible.length === 0) continue;

    const cx = fp.rooms.length
      ? fp.rooms.reduce((s, r) => s + r.x + r.width / 2, 0) / fp.rooms.length
      : 0;
    const cz = fp.rooms.length
      ? fp.rooms.reduce((s, r) => s + r.z + r.depth / 2, 0) / fp.rooms.length
      : 0;

    for (const l of eligible) {
      const t = resolveLightTransform(l, fp);
      const [lx, , lz] = t ? t.pos : [0, 0, 0];
      allEligible.push({ id: l.id, d: Math.hypot(lx - cx, lz - cz) });
    }
  }

  allEligible.sort((a, b) => a.d - b.d);
  return new Set(allEligible.slice(0, MAX_SHADOW_LIGHTS).map((x) => x.id));
}
