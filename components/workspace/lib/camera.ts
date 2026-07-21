import { FloorPlanState } from "./constants";

export type CameraView = {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  isPreset?: boolean;
};

export function getBuiltInViews(fp: FloorPlanState): CameraView[] {
  const allX = [
    ...fp.rooms.flatMap((r) => [r.x, r.x + r.width]),
    ...fp.lineNodes.map((n) => n.x),
  ];
  const allZ = [
    ...fp.rooms.flatMap((r) => [r.z, r.z + r.depth]),
    ...fp.lineNodes.map((n) => n.z),
  ];
  if (allX.length === 0) return [];

  const minX = Math.min(...allX),
    maxX = Math.max(...allX);
  const minZ = Math.min(...allZ),
    maxZ = Math.max(...allZ);
  const cx = (minX + maxX) / 2,
    cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ, 5);

  return [
    {
      id: "preset-top",
      label: "Top-Down",
      isPreset: true,
      position: [cx, span * 1.6, cz + 0.01],
      target: [cx, 0, cz],
    },
    {
      id: "preset-iso",
      label: "Isometric",
      isPreset: true,
      position: [cx + span, fp.roomHeight * 3, cz + span],
      target: [cx, fp.roomHeight / 2, cz],
    },
    {
      id: "preset-front",
      label: "Front",
      isPreset: true,
      position: [cx, fp.roomHeight * 1.2, cz + span * 1.3],
      target: [cx, fp.roomHeight / 2, cz],
    },
    {
      id: "preset-side",
      label: "Side",
      isPreset: true,
      position: [cx + span * 1.3, fp.roomHeight * 1.2, cz],
      target: [cx, fp.roomHeight / 2, cz],
    },
  ];
}
