import { z } from 'zod';

const id = z.string().min(1).max(100);
const coordinate = z.number().finite().min(-1000).max(1000);
const length = z.number().finite().min(0.05).max(100);
const label = z.string().trim().min(1).max(120);
export const projectIdSchema = z.string().uuid();
export const requestIdSchema = z.string().uuid().describe('A unique UUID for this write. Reuse it only when retrying the identical request.');
export const revisionSchema = z.string().uuid().nullable().describe('Latest revision from get_project, or null for a legacy unversioned document.');
const roomFields = { x: coordinate, z: coordinate, width: length, depth: length };
const operations = [
  z.object({ op: z.literal('add_room'), floor_id: id, ref: id, label, ...roomFields }).strict(),
  z.object({ op: z.literal('update_room'), floor_id: id, id,
    label: label.optional(), x: coordinate.optional(), z: coordinate.optional(),
    width: length.optional(), depth: length.optional() }).strict(),
  z.object({ op: z.literal('add_opening'), floor_id: id, ref: id, room_id: id,
    type: z.enum(['door', 'window']), wall: z.enum(['north', 'south', 'east', 'west']),
    position: coordinate.describe('Centre offset in metres along wall from its room origin.'), width: length,
    height: length, sill_height: z.number().finite().min(0).max(20).default(0) }).strict(),
  z.object({ op: z.literal('place_furniture'), floor_id: id, ref: id, asset_id: id,
    x: coordinate, z: coordinate, rotation: z.number().finite().min(-360).max(360).default(0),
    width: length.optional(), depth: length.optional(), height: length.optional() }).strict(),
  z.object({ op: z.literal('move_furniture'), floor_id: id, id, x: coordinate, z: coordinate,
    rotation: z.number().finite().min(-360).max(360).optional() }).strict(),
  z.object({ op: z.literal('set_room_material'), floor_id: id, room_id: id,
    domain: z.enum(['floor', 'wall']), material_id: id }).strict(),
  z.object({ op: z.literal('remove_entity'), floor_id: id, id,
    kind: z.enum(['room', 'opening', 'furniture']) }).strict(),
  z.object({ op: z.literal('add_floor'), ref: id, label,
    height: z.number().finite().min(2).max(10).default(2.7) }).strict(),
] as const;
export const operationSchema = z.discriminatedUnion('op', operations);
export const operationsSchema = z.array(operationSchema).min(1).max(100);
export type Operation = z.infer<typeof operationSchema>;

export const tokenInputSchema = z.object({
  name: label,
  scopes: z.array(z.enum(['projects:read', 'projects:write'])).min(1).max(2),
  project_ids: z.array(projectIdSchema).min(1).max(50).nullable().default(null),
  expires_in_days: z.number().int().min(1).max(90).default(30),
}).strict().refine(input => !input.scopes.includes('projects:write') || input.scopes.includes('projects:read'), {
  message: 'Write access also requires read access.',
});
