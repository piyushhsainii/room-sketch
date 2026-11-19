import { applyOperations, emptyDocument, validateDocument } from '../document';
import { renderPreview } from '../preview';
import { furnitureCatalog } from '../catalog';
import { tokenInputSchema } from '../schemas';
import type { Operation } from '../schemas';
import { projectFloorPlanToSceneJSON } from '@/lib/workspace/floorPlanConvertor';
import { parseDocument } from '../document-schema';

function blank() {
  const doc = emptyDocument(); doc.projectFloorPlan.activeFloorId = doc.projectFloorPlan.floors[0].id; return doc;
}
function room(floor_id: string): Extract<Operation, { op: 'add_room' }> {
  return { op: 'add_room', floor_id, ref: 'bedroom', label: 'Bedroom', x: 0, z: 0, width: 4, depth: 3 };
}

test('a dependent room/opening/furniture batch produces editable canonical and derived state', () => {
  const source = blank(), floor = source.projectFloorPlan.floors[0];
  const result = applyOperations(source, [room(floor.id),
    { op: 'add_opening', floor_id: floor.id, ref: 'door', room_id: 'bedroom', type: 'door', wall: 'north', position: 1, width: 0.9, height: 2.1, sill_height: 0 },
    { op: 'place_furniture', floor_id: floor.id, ref: 'chair', asset_id: furnitureCatalog()[0].id, x: 2, z: 2, rotation: 0 },
  ]);
  const fp = result.document.projectFloorPlan.floors[0].state;
  expect(source.projectFloorPlan.floors[0].state.rooms).toHaveLength(0);
  expect(fp.openings[0].roomId).toBe(result.refs.bedroom);
  expect(fp.furniture).toHaveLength(1);
  const scene = projectFloorPlanToSceneJSON(result.document.projectFloorPlan, result.document.sceneConfig);
  expect(scene.rooms).toHaveLength(1);
  expect(scene.rooms[0].doors).toHaveLength(1);
});

test('invalid openings reject the entire batch without changing input', () => {
  const doc = blank(), id = doc.projectFloorPlan.floors[0].id;
  expect(() => applyOperations(doc, [room(id), { op: 'add_opening', floor_id: id, ref: 'bad', room_id: 'bedroom',
    type: 'window', wall: 'east', position: 2.9, width: 2, height: 2, sill_height: 1 }])).toThrow('invalid geometry');
  expect(doc.projectFloorPlan.floors[0].state.rooms).toHaveLength(0);
});

test('shrinking a room cannot strand an attached opening', () => {
  const doc = blank(), id = doc.projectFloorPlan.floors[0].id;
  const { document, refs } = applyOperations(doc, [room(id), { op: 'add_opening', floor_id: id, ref: 'door',
    room_id: 'bedroom', type: 'door', wall: 'north', position: 3, width: 1, height: 2, sill_height: 0 }]);
  expect(() => applyOperations(document, [{ op: 'update_room', floor_id: id, id: refs.bedroom, width: 2 }])).toThrow('invalid geometry');
});

test('dimension locks and dependent openings are respected', () => {
  const doc = blank(), id = doc.projectFloorPlan.floors[0].id;
  const { document, refs } = applyOperations(doc, [room(id)]);
  document.projectFloorPlan.floors[0].state.rooms[0].dimensionLock = { width: 4 };
  expect(() => applyOperations(document, [{ op: 'update_room', floor_id: id, id: refs.bedroom, width: 5 }])).toThrow('locked');
});

test('remove room rejects dangling references, and explicit removal order succeeds', () => {
  const doc = blank(), id = doc.projectFloorPlan.floors[0].id;
  const { document, refs } = applyOperations(doc, [room(id), { op: 'add_opening', floor_id: id, ref: 'door',
    room_id: 'bedroom', type: 'door', wall: 'north', position: 1, width: 1, height: 2, sill_height: 0 }]);
  expect(() => applyOperations(document, [{ op: 'remove_entity', floor_id: id, id: refs.bedroom, kind: 'room' }])).toThrow('openings');
  const next = applyOperations(document, [
    { op: 'remove_entity', floor_id: id, id: refs.door, kind: 'opening' },
    { op: 'remove_entity', floor_id: id, id: refs.bedroom, kind: 'room' },
  ]);
  expect(next.document.projectFloorPlan.floors[0].state.rooms).toHaveLength(0);
});

test('unknown assets and unauthorized premium materials are rejected', () => {
  const doc = blank(), id = doc.projectFloorPlan.floors[0].id;
  expect(() => applyOperations(doc, [{ op: 'place_furniture', floor_id: id, ref: 'x', asset_id: 'invented', x: 0, z: 0, rotation: 0 }])).toThrow('asset ID');
  expect(() => applyOperations(doc, [room(id), { op: 'set_room_material', floor_id: id, room_id: 'bedroom', domain: 'floor', material_id: 'wood-walnut' }])).toThrow('unavailable');
});

test('batch references can target newly added floors and do not resolve Object prototype keys', () => {
  const doc = blank();
  const result = applyOperations(doc, [{ op: 'add_floor', ref: 'upper', label: 'Upper', height: 3 }, room('upper')]);
  expect(result.document.projectFloorPlan.floors[1].elevation).toBe(2.7);
  expect(result.document.projectFloorPlan.floors[1].state.rooms).toHaveLength(1);
  expect(() => applyOperations(doc, [room('toString')])).toThrow('Floor not found');
});

test('negative dimensions, unknown fields, and oversized batches fail runtime validation', () => {
  const doc = blank(), id = doc.projectFloorPlan.floors[0].id;
  expect(() => applyOperations(doc, [{ ...room(id), width: -1 } as Operation])).toThrow();
  expect(() => applyOperations(doc, [{ ...room(id), arbitrary: 'value' } as unknown as Operation])).toThrow();
  expect(() => applyOperations(doc, Array.from({ length: 101 }, () => room(id)))).toThrow();
});

test('duplicate references are rejected', () => {
  const doc = blank(), id = doc.projectFloorPlan.floors[0].id;
  expect(() => applyOperations(doc, [room(id), room(id)])).toThrow('Duplicate batch reference');
});

test('SVG preview escapes text, includes openings, and binds to the requested floor', () => {
  const doc = blank(), id = doc.projectFloorPlan.floors[0].id;
  const { document } = applyOperations(doc, [{ ...room(id), label: '<script>alert(1)</script>' } as Operation]);
  const svg = renderPreview(document, id);
  expect(svg).toContain('&lt;script&gt;'); expect(svg).not.toContain('<script>');
  expect(() => renderPreview(document, 'absent')).toThrow('Floor not found');
});

test('overlapping legacy rooms report warnings rather than silently changing geometry', () => {
  const doc = blank(), id = doc.projectFloorPlan.floors[0].id;
  const { document } = applyOperations(doc, [room(id), { ...room(id), ref: 'other' }]);
  expect(validateDocument(document)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'room_overlap', severity: 'warning' })]));
});

test('token schema requires read scope alongside write and bounds expiry', () => {
  expect(tokenInputSchema.safeParse({ name: 'test', scopes: ['projects:write'] }).success).toBe(false);
  expect(tokenInputSchema.safeParse({ name: 'test', scopes: ['projects:read'], expires_in_days: 91 }).success).toBe(false);
  expect(tokenInputSchema.parse({ name: 'test', scopes: ['projects:read'] }).expires_in_days).toBe(30);
});

test('public furniture degrees and dimensions round-trip into the existing renderer contract', () => {
  const doc = blank(), floor_id = doc.projectFloorPlan.floors[0].id;
  const { document } = applyOperations(doc, [{ op: 'place_furniture', floor_id, ref: 'chair',
    asset_id: furnitureCatalog()[0].id, x: 0, z: 0, rotation: 90, width: 2, depth: 1, height: 0.8 }]);
  const item = document.projectFloorPlan.floors[0].state.furniture[0];
  expect(item.rotation).toBeCloseTo(Math.PI / 2);
  expect(item.targetWidth! * 1.3).toBeCloseTo(2);
  expect(item.targetDepth! * 1.3).toBeCloseTo(1);
  expect(parseDocument(document).projectFloorPlan.floors[0].state.furniture).toHaveLength(1);
});

test('saved document validation rejects untrusted numeric markup before preview serialization', () => {
  const doc = blank(), floor_id = doc.projectFloorPlan.floors[0].id;
  const { document } = applyOperations(doc, [room(floor_id)]);
  const corrupted = JSON.parse(JSON.stringify(document));
  corrupted.projectFloorPlan.floors[0].state.rooms[0].x = '0" onload="alert(1)';
  expect(() => parseDocument(corrupted)).toThrow('unsupported or invalid');
});
