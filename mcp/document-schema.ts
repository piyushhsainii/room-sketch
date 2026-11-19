import { z } from 'zod';
import type { DesignDocument } from './document';
import { McpToolError } from './errors';

// Validate the fields used by tools/preview, preserving unsupported editor fields.
// This is deliberately not an alternate full-document write API.
const id = z.string().min(1).max(200);
const n = z.number().finite().min(-100000).max(100000);
const positive = z.number().finite().positive().max(100000);
const opaqueArray = z.array(z.unknown()).max(10000).default([]);
const point = z.object({ id, x: n, z: n }).passthrough();
const room = point.extend({ label: z.string().max(1000), width: positive, depth: positive }).passthrough();
const furniture = point.extend({ type: id, rotation: n, scale: positive,
  targetWidth: positive.optional(), targetDepth: positive.optional(), targetHeight: positive.optional() }).passthrough();
const opening = z.object({ id, roomId: id, wall: z.enum(['north', 'south', 'east', 'west']), type: id,
  position: n, width: positive, height: positive, sillHeight: n, segmentNodeIds: z.array(id).max(10000).optional() }).passthrough();
const state = z.object({ rooms: z.array(room).max(2000), furniture: z.array(furniture).max(2000),
  openings: z.array(opening).max(2000), roomHeight: positive,
  lineNodes: z.array(point).max(10000), lineSegments: z.array(z.object({ id, nodeIds: z.array(id).max(10000), thickness: positive }).passthrough()).max(10000),
  closedShapes: opaqueArray, annotations: opaqueArray, stairs: opaqueArray, wallDecor: opaqueArray,
  lights: opaqueArray, outdoorObjects: opaqueArray, savedViews: opaqueArray }).passthrough();
const schema = z.object({ revision: z.string().max(200).nullable(),
  projectFloorPlan: z.object({ floors: z.array(z.object({ id, label: z.string().max(1000), order: n,
    elevation: n, visible: z.boolean(), state }).passthrough()).min(1).max(20), activeFloorId: id }).passthrough(),
  sceneConfig: z.object({ rooms: z.array(z.object({ roomId: id }).passthrough()).max(10000), lights: opaqueArray }).passthrough(),
}).passthrough();

export function parseDocument(input: unknown): DesignDocument {
  if (JSON.stringify(input).length > 2 * 1024 * 1024)
    throw new McpToolError('document_limit', 'MCP supports documents up to 2 MiB.');
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new McpToolError('unsupported_document', 'Saved editor document has unsupported or invalid fields. Open and save it in the editor first.');
  return parsed.data as unknown as DesignDocument;
}
