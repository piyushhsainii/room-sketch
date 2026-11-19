import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { authorize, type McpPrincipal } from './auth';
import { furnitureCatalog, materialCatalog } from './catalog';
import { applyOperations, summarize, validateDocument } from './document';
import { publicError } from './errors';
import { renderPreview } from './preview';
import { operationsSchema, projectIdSchema, requestIdSchema, revisionSchema } from './schemas';
import { payloadHash, planError, ProjectService } from './service';

export const INSTRUCTIONS = `RoomSketch edits real saved projects. Read get_capabilities and get_project first. Use metres, X/Z floor coordinates, degrees for furniture rotation. Use returned IDs, never invent catalog IDs. Preview batches before applying. Every write requires a UUID request_id; retry identical arguments with the same ID. On revision_conflict read again and replan. Never publish or share implicitly. Browser tabs require reload and may have unsaved edits. Only advertised operations are supported; custom GLB upload/generation is not implemented.`;

export function createServer(principal: McpPrincipal, origin: string) {
  const server = new McpServer({ name: 'roomsketch', version: '0.1.0' }, { instructions: INSTRUCTIONS });
  const service = new ProjectService(principal);
  const read = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  const write = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };
  const result = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: { result: value } });
  const safe = <T,>(fn: (input: T) => Promise<unknown>) => async (input: T) => {
    try { return result(await fn(input)); }
    catch (error) { return { ...result({ error: publicError(planError(error)) }), isError: true }; }
  };
  const link = (id: string) => `${origin}/projects/${encodeURIComponent(id)}`;

  server.registerTool('get_capabilities', { description: 'Read supported operations, units, limitations, and current account entitlements.', inputSchema: {}, annotations: read }, safe(async () => {
    authorize(principal, 'projects:read');
    const plan = await service.plan();
    return { version: '0.1.0', units: 'metres', axes: { x: 'right/east on plan', z: 'down/south on plan' },
      rotation: 'degrees; matches editor furniture rotation', plan: plan.id, scopes: principal.scopes,
      project_ids: principal.projectIds, operations: ['add_room', 'update_room', 'add_opening', 'place_furniture',
        'move_furniture', 'set_room_material', 'remove_entity', 'add_floor'], max_batch_operations: 100,
      limitations: ['Rectangular room edits only; existing polygon geometry is preserved.',
        'Room overlaps are warnings; no architectural-code certification or automatic shared-wall repair.',
        'Preview is schematic SVG; furniture footprints are approximate.',
        'Reload open editor tabs after remote edits. Unsaved browser edits are not synchronized.',
        'No custom GLB generation, publication, 3D rendering, or export jobs in this release.'] };
  }));
  server.registerTool('list_projects', { description: 'List only projects owned by this account and permitted by this token.',
    inputSchema: { offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(50).default(20) }, annotations: read },
    safe(async ({ offset, limit }) => service.list(offset, limit)));
  server.registerTool('get_project', { description: 'Read latest revision and room/opening/furniture IDs. Filter to a floor to reduce context.',
    inputSchema: { project_id: projectIdSchema, floor_id: z.string().max(100).optional() }, annotations: read }, safe(async ({ project_id, floor_id }) => {
      const project = await service.get(project_id), summary = summarize(project.document);
      if (floor_id) summary.floors = summary.floors.filter(floor => floor.id === floor_id);
      return { project_id, name: project.name, editor_url: link(project_id), ...summary };
    }));
  server.registerTool('create_project', { description: 'Create a blank editable project. Requires write scope and account-wide project access; respects plan project limits.',
    inputSchema: { name: z.string().trim().min(1).max(120), request_id: requestIdSchema }, annotations: { ...write, destructiveHint: false } },
    safe(async ({ name, request_id }) => { const saved = await service.create(name, request_id); return { ...saved, editor_url: link(saved.project_id) }; }));
  server.registerTool('search_catalog', { description: 'Find supported furniture asset IDs and material IDs with dimensions or allowed domains. Only use returned IDs.',
    inputSchema: { kind: z.enum(['furniture', 'materials']), query: z.string().max(100).default(''),
      offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(50).default(20) }, annotations: read },
    safe(async ({ kind, query, offset, limit }) => {
      authorize(principal, 'projects:read');
      const plan = await service.plan();
      const entries = kind === 'furniture' ? furnitureCatalog() : materialCatalog(plan.features.has('fullMaterials'));
      const matches = entries.filter(entry => JSON.stringify(entry).toLowerCase().includes(query.toLowerCase()));
      return { entries: matches.slice(offset, offset + limit), next_offset: matches.length > offset + limit ? offset + limit : null };
    }));
  server.registerTool('preview_changes', { description: 'Validate a batch without saving. refs name newly created entities and may be used by later operations in this batch. Preview IDs are provisional.',
    inputSchema: { project_id: projectIdSchema, operations: operationsSchema }, annotations: read }, safe(async ({ project_id, operations }) => {
      const project = await service.get(project_id), plan = await service.plan();
      const preview = applyOperations(project.document, operations, plan.features.has('fullMaterials'));
      return { base_revision: project.document.revision, refs: preview.refs, changes: preview.changes,
        diagnostics: preview.diagnostics, proposed: summarize(preview.document) };
    }));
  server.registerTool('apply_changes', { description: 'Atomically apply a validated batch to a saved project at base_revision. Use preview_changes first. Retries must reuse request_id and identical arguments. Removes can be destructive.',
    inputSchema: { project_id: projectIdSchema, base_revision: revisionSchema, request_id: requestIdSchema, operations: operationsSchema }, annotations: write },
    safe(async ({ project_id, base_revision, request_id, operations }) => {
      authorize(principal, 'projects:write', project_id);
      const hash = payloadHash({ tool: 'apply_changes', project_id, base_revision, operations });
      const receipt = await service.receipt(request_id, hash);
      if (receipt) return { ...receipt, editor_url: link(project_id), replayed: true };
      const project = await service.get(project_id), plan = await service.plan();
      const changed = applyOperations(project.document, operations, plan.features.has('fullMaterials'));
      const saved = await service.write({ requestId: request_id, hash, projectId: project_id, baseRevision: base_revision,
        document: changed.document, result: { refs: changed.refs, changes: changed.changes, diagnostics: changed.diagnostics } });
      return { ...saved, editor_url: link(project_id) };
    }));
  server.registerTool('validate_project', { description: 'Check rectangular room dimensions, hosted openings, and basic placement warnings. This is not a building-code assessment.',
    inputSchema: { project_id: projectIdSchema }, annotations: read }, safe(async ({ project_id }) => {
      const { document } = await service.get(project_id);
      return { revision: document.revision, diagnostics: validateDocument(document) };
    }));
  server.registerTool('get_preview', { description: 'Return a revision-bound schematic 2D SVG as text. Save it to an .svg file to view it. Includes rooms, line walls, openings, and approximate furniture footprints.',
    inputSchema: { project_id: projectIdSchema, floor_id: z.string().min(1).max(100) }, annotations: read }, safe(async ({ project_id, floor_id }) => {
      const { document } = await service.get(project_id);
      return { revision: document.revision, floor_id, mime_type: 'image/svg+xml', svg: renderPreview(document, floor_id), editor_url: link(project_id) };
    }));
  server.registerResource('roomsketch-guide', 'roomsketch://guide', { description: 'Coordinate conventions, edit workflow, and limitations.', mimeType: 'text/plain' },
    async () => ({ contents: [{ uri: 'roomsketch://guide', text: INSTRUCTIONS, mimeType: 'text/plain' }] }));
  server.registerPrompt('design_house', { description: 'Start a RoomSketch design brief.', argsSchema: { brief: z.string().min(1).max(4000) } },
    async ({ brief }) => ({ messages: [{ role: 'user', content: { type: 'text', text: `Design this in RoomSketch: ${brief}\nFirst read capabilities. Clarify plot versus building dimensions, units, frontage, and floors. Record assumptions. Use catalog IDs, preview and validate batches, then save and return the private editor URL.` } }] }));
  return server;
}
