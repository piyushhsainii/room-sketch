import { randomUUID } from 'node:crypto';
import type { EditorRoom, FloorPlanState, FloorMaterial, WallMaterial } from '@/components/workspace/lib/constants';
import type { ProjectFloorPlan } from '@/components/workspace/lib/floor-data';
import type { SceneConfig } from '@/components/workspace/lib/scene-config';
import type { FurnitureType } from '@/components/workspace/lib/furniture-constants';
import { DEFAULT_FP } from '@/components/workspace/lib/constants';
import { furnitureCatalog, materialCatalog } from './catalog';
import { McpToolError } from './errors';
import { operationsSchema, type Operation } from './schemas';

export type DesignDocument = { revision: string | null; projectFloorPlan: ProjectFloorPlan; sceneConfig: SceneConfig };
export type Diagnostic = { severity: 'error' | 'warning'; code: string; floor_id: string; entity_id: string; message: string };

export function emptyDocument(): DesignDocument {
  const floorId = randomUUID();
  return { revision: null, projectFloorPlan: { floors: [{ id: floorId, label: 'Ground Floor', order: 0,
    elevation: 0, visible: true, state: structuredClone(DEFAULT_FP) }], activeFloorId: floorId,
    viewMode: 'single', showUnderlay: true, roof: { type: 'none', visible: false } },
    sceneConfig: { ambientIntensity: 0.6, wallRoughness: 0.85, wallTextured: true, showFurniture: true,
      showLabels: true, fogEnabled: false, doorStyle: 'wood_oak', globalFloorMaterial: 'plain', rooms: [], lights: [] } };
}

function intersects(a: EditorRoom, b: EditorRoom) {
  return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.001 &&
    Math.min(a.z + a.depth, b.z + b.depth) - Math.max(a.z, b.z) > 0.001;
}

export function validateDocument(document: DesignDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const floor of document.projectFloorPlan.floors) {
    const add = (severity: Diagnostic['severity'], code: string, entity_id: string, message: string) =>
      diagnostics.push({ severity, code, floor_id: floor.id, entity_id, message });
    const fp = floor.state;
    for (const room of fp.rooms) {
      if (![room.x, room.z, room.width, room.depth].every(Number.isFinite) || room.width <= 0 || room.depth <= 0)
        add('error', 'invalid_dimensions', room.id, 'Room coordinates must be finite and dimensions positive.');
    }
    for (let i = 0; i < fp.rooms.length; i++) for (let j = i + 1; j < fp.rooms.length; j++) {
      if (intersects(fp.rooms[i], fp.rooms[j])) add('warning', 'room_overlap', fp.rooms[i].id,
        `Overlaps room ${fp.rooms[j].id}. Review the layout; existing editor rooms may intentionally overlap.`);
    }
    for (const opening of fp.openings.filter(item => !item.segmentNodeIds)) {
      const room = fp.rooms.find(item => item.id === opening.roomId);
      if (!room) { add('error', 'missing_host', opening.id, 'Opening has no host room.'); continue; }
      const wallLength = opening.wall === 'north' || opening.wall === 'south' ? room.width : room.depth;
      if (![opening.position, opening.width, opening.height, opening.sillHeight].every(Number.isFinite) ||
        opening.width <= 0 || opening.height <= 0 || opening.sillHeight < 0 ||
        opening.position - opening.width / 2 < -0.001 || opening.position + opening.width / 2 > wallLength + 0.001 ||
        opening.height + opening.sillHeight > fp.roomHeight + 0.001)
        add('error', 'opening_outside_wall', opening.id, 'Opening must fit horizontally and vertically within its host wall.');
    }
    for (const furniture of fp.furniture) {
      if (!fp.rooms.some(room => furniture.x >= room.x && furniture.x <= room.x + room.width &&
        furniture.z >= room.z && furniture.z <= room.z + room.depth))
        add('warning', 'furniture_outside_room', furniture.id, 'Furniture centre is outside rectangular rooms; check the preview.');
    }
  }
  return diagnostics;
}

/** All operations run on a clone. Invalid batches never mutate the caller's document. */
export function applyOperations(source: DesignDocument, input: Operation[], fullMaterials = false) {
  const operations = operationsSchema.parse(input);
  const document = structuredClone(source);
  const refs: Record<string, string> = Object.create(null);
  const changes: string[] = [];
  const resolve = (id: string) => Object.hasOwn(refs, id) ? refs[id] : id;
  const issueId = (ref: string) => {
    if (Object.hasOwn(refs, ref)) throw new McpToolError('duplicate_reference', `Duplicate batch reference: ${ref}`);
    const id = randomUUID(); refs[ref] = id; return id;
  };
  for (const operation of operations) {
    if (operation.op === 'add_floor') {
      if (document.projectFloorPlan.floors.length >= 20) throw new McpToolError('document_limit', 'Maximum 20 floors.');
      const id = issueId(operation.ref);
      const previous = [...document.projectFloorPlan.floors].sort((a, b) => a.order - b.order).at(-1)!;
      const state = structuredClone(DEFAULT_FP); state.roomHeight = operation.height;
      document.projectFloorPlan.floors.push({ id, label: operation.label, order: previous.order + 1,
        elevation: previous.elevation + previous.state.roomHeight, visible: true, state });
      changes.push(`Added floor ${operation.label}`); continue;
    }
    const floor = document.projectFloorPlan.floors.find(item => item.id === resolve(operation.floor_id));
    if (!floor) throw new McpToolError('not_found', `Floor not found: ${operation.floor_id}`);
    const fp = floor.state;
    const roomById = (id: string) => {
      const room = fp.rooms.find(item => item.id === resolve(id));
      if (!room) throw new McpToolError('not_found', `Rectangular room not found: ${id}`);
      return room;
    };
    switch (operation.op) {
      case 'add_room': {
        const id = issueId(operation.ref);
        fp.rooms.push({ id, label: operation.label, x: operation.x, z: operation.z, width: operation.width, depth: operation.depth });
        changes.push(`Added room ${operation.label}`); break;
      }
      case 'update_room': {
        const room = roomById(operation.id);
        for (const key of ['width', 'depth'] as const) if (operation[key] !== undefined && room.dimensionLock?.[key] !== undefined &&
          operation[key] !== room.dimensionLock[key]) throw new McpToolError('dimension_locked', `${key} is locked for room ${room.id}`);
        const dx = (operation.x ?? room.x) - room.x, dz = (operation.z ?? room.z) - room.z;
        if (dx || dz) {
          const inside = fp.furniture.filter(item => item.x >= room.x && item.x <= room.x + room.width && item.z >= room.z && item.z <= room.z + room.depth);
          if (inside.length) throw new McpToolError('dependent_entities', 'Move the furniture separately before moving this room.');
        }
        for (const key of ['label', 'x', 'z', 'width', 'depth'] as const) {
          const value = operation[key];
          if (value !== undefined) Object.assign(room, { [key]: value });
        }
        changes.push(`Updated room ${room.label}`); break;
      }
      case 'add_opening': {
        const room = roomById(operation.room_id), id = issueId(operation.ref);
        fp.openings.push({ id, roomId: room.id, wall: operation.wall, type: operation.type,
          variant: operation.type === 'door' ? 'door-swing-single' : 'window-fixed', position: operation.position, width: operation.width, height: operation.height,
          sillHeight: operation.sill_height, swingDirection: 'inward' });
        changes.push(`Added ${operation.type} to ${room.label}`); break;
      }
      case 'place_furniture': {
        const asset = furnitureCatalog().find(item => item.id === operation.asset_id);
        if (!asset) throw new McpToolError('unsupported_asset', 'Use an asset ID returned by search_catalog.');
        const id = issueId(operation.ref);
        // Existing renderer multiplies horizontal targets by 1.3. Compensate at this boundary.
        fp.furniture.push({ id, type: asset.id as FurnitureType, x: operation.x, z: operation.z,
          rotation: operation.rotation * Math.PI / 180, scale: 1, targetWidth: (operation.width ?? asset.width) / 1.3,
          targetDepth: (operation.depth ?? asset.depth) / 1.3, targetHeight: operation.height ?? asset.height });
        changes.push(`Placed ${asset.label}`); break;
      }
      case 'move_furniture': {
        const item = fp.furniture.find(item => item.id === resolve(operation.id));
        if (!item) throw new McpToolError('not_found', 'Furniture not found.');
        item.x = operation.x; item.z = operation.z;
        if (operation.rotation !== undefined) item.rotation = operation.rotation * Math.PI / 180;
        changes.push(`Moved furniture ${item.id}`); break;
      }
      case 'set_room_material': {
        const room = roomById(operation.room_id);
        const material = materialCatalog(fullMaterials).find(item => item.id === operation.material_id && item.domains.includes(operation.domain));
        if (!material) throw new McpToolError('unsupported_material', 'Material is unavailable for this domain or account plan.');
        if (operation.domain === 'wall') room.wallMaterial = operation.material_id as WallMaterial;
        let config = document.sceneConfig.rooms.find(item => item.roomId === room.id);
        if (!config) { config = { roomId: room.id }; document.sceneConfig.rooms.push(config); }
        if (operation.domain === 'floor') config.floorMaterial = operation.material_id as FloorMaterial;
        else config.wallMaterial = operation.material_id as WallMaterial;
        changes.push(`Changed ${operation.domain} material for ${room.label}`); break;
      }
      case 'remove_entity': {
        const id = resolve(operation.id);
        const items = operation.kind === 'room' ? fp.rooms : operation.kind === 'opening' ? fp.openings : fp.furniture;
        const index = items.findIndex(item => item.id === id);
        if (index < 0) throw new McpToolError('not_found', `${operation.kind} not found.`);
        if (operation.kind === 'room') {
          if (fp.openings.some(item => item.roomId === id)) throw new McpToolError('dependent_entities', 'Remove the room openings first.');
          document.sceneConfig.rooms = document.sceneConfig.rooms.filter(item => item.roomId !== id);
        }
        items.splice(index, 1); changes.push(`Removed ${operation.kind} ${id}`); break;
      }
    }
    if (fp.rooms.length + fp.furniture.length + fp.openings.length > 2000)
      throw new McpToolError('document_limit', 'Maximum 2000 room/opening/furniture entities per floor.');
  }
  const diagnostics = validateDocument(document);
  const errors = diagnostics.filter(item => item.severity === 'error');
  if (errors.length) throw new McpToolError('invalid_geometry', 'The batch produces invalid geometry.', errors);
  return { document, refs, changes, diagnostics };
}

export function summarize(document: DesignDocument) {
  return { revision: document.revision, units: 'metres', floors: document.projectFloorPlan.floors.map(floor => ({
    id: floor.id, label: floor.label, elevation: floor.elevation, height: floor.state.roomHeight,
    rooms: floor.state.rooms.map(room => ({ ...room, area_m2: room.width * room.depth })),
    openings: floor.state.openings, furniture: floor.state.furniture.map(item => ({ ...item, rotation: item.rotation * 180 / Math.PI,
      targetWidth: item.targetWidth === undefined ? undefined : item.targetWidth * 1.3,
      targetDepth: item.targetDepth === undefined ? undefined : item.targetDepth * 1.3 })),
    other_entities: { polygon_rooms: floor.state.closedShapes.length, wall_segments: floor.state.lineSegments.length,
      stairs: floor.state.stairs.length, lights: floor.state.lights.length, outdoor: floor.state.outdoorObjects.length },
  })) };
}
