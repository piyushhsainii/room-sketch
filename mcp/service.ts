import { createHash, randomUUID } from 'node:crypto';
import { getEntitlements, PlanLimitError } from '@/lib/entitlements';
import { projectFloorPlanToSceneJSON } from '@/lib/workspace/floorPlanConvertor';
import { sceneConfigToWorkspaceConfig } from '@/lib/workspace/sceneConfigToWorkspaceConfig';
import { migrateToMultiFloor } from '@/components/workspace/lib/migrateToMultiFloor';
import { adminClient, authorize, type McpPrincipal } from './auth';
import { emptyDocument, type DesignDocument } from './document';
import { McpToolError } from './errors';
import { parseDocument } from './document-schema';

export type WriteResult = { project_id: string; revision: string; refs?: Record<string, string>; changes?: string[]; diagnostics?: unknown[] };
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
export function payloadHash(value: unknown) { return createHash('sha256').update(canonical(value)).digest('hex'); }

export class ProjectService {
  private db = adminClient();
  constructor(readonly principal: McpPrincipal) {}

  async plan() { return getEntitlements(this.db, this.principal.userId); }

  async list(offset: number, limit: number) {
    authorize(this.principal, 'projects:read');
    let query = this.db.from('projects').select('id,name,updated_at').eq('user_id', this.principal.userId);
    if (this.principal.projectIds) query = query.in('id', this.principal.projectIds);
    const { data, error } = await query.order('updated_at', { ascending: false }).order('id').range(offset, offset + limit);
    if (error) throw new Error(error.message);
    return { projects: (data ?? []).slice(0, limit), next_offset: (data?.length ?? 0) > limit ? offset + limit : null };
  }

  async get(projectId: string) {
    authorize(this.principal, 'projects:read', projectId);
    const { data, error } = await this.db.from('projects').select('id,name,floorplan_editor_state')
      .eq('user_id', this.principal.userId).eq('id', projectId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new McpToolError('not_found', 'Project not found or not authorized.');
    const state = data.floorplan_editor_state;
    if (!state?.sceneConfig || (!state.projectFloorPlan && !state.floorPlanState))
      throw new McpToolError('unsupported_document', 'Open and save this project in the RoomSketch editor before using MCP.');
    const document = parseDocument({ revision: state.revision ?? null,
      projectFloorPlan: migrateToMultiFloor(state.projectFloorPlan ?? state.floorPlanState), sceneConfig: state.sceneConfig });
    return { id: data.id as string, name: data.name as string, document };
  }

  async receipt(requestId: string, hash: string): Promise<WriteResult | null> {
    authorize(this.principal, 'projects:write');
    const { data, error } = await this.db.from('mcp_operations').select('payload_hash,result')
      .eq('token_id', this.principal.tokenId).eq('request_id', requestId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    if (data.payload_hash !== hash) throw new McpToolError('idempotency_conflict', 'request_id was already used with different arguments.');
    return data.result as WriteResult;
  }

  async write(args: { requestId: string; hash: string; projectId: string; name?: string;
    baseRevision: string | null; document: DesignDocument; result?: Partial<WriteResult>; create?: boolean }) {
    authorize(this.principal, 'projects:write', args.create ? undefined : args.projectId);
    if (args.create && this.principal.projectIds) throw new McpToolError('insufficient_scope', 'Project-restricted tokens cannot create projects.');
    const plan = await this.plan();
    const revision = randomUUID();
    const document = { ...args.document, revision };
    const result = { ...args.result, project_id: args.projectId, revision,
      ...(args.create ? { floor_id: document.projectFloorPlan.floors[0].id } : {}) };
    const { data, error } = await this.db.rpc('mcp_write_project', {
      p_token_id: this.principal.tokenId, p_request_id: args.requestId, p_hash: args.hash,
      p_project_id: args.projectId, p_create: args.create ?? false, p_name: args.name ?? '',
      p_base_revision: args.baseRevision, p_document: document,
      p_scene: projectFloorPlanToSceneJSON(document.projectFloorPlan, document.sceneConfig),
      p_config: sceneConfigToWorkspaceConfig(document.sceneConfig), p_result: result,
      p_project_limit: Number.isFinite(plan.projectLimit) ? plan.projectLimit : 1000000,
    });
    if (error) {
      const codes = ['revision_conflict', 'not_found', 'insufficient_scope', 'idempotency_conflict', 'unauthorized', 'project_limit'];
      const code = codes.find(code => error.message.includes(code));
      if (code) throw new McpToolError(code, code === 'revision_conflict'
        ? 'Project changed. Read the current revision and replan your edits.' : code.replaceAll('_', ' '));
      throw new Error(error.message);
    }
    return data as WriteResult;
  }

  async create(name: string, requestId: string) {
    authorize(this.principal, 'projects:write');
    const hash = payloadHash({ tool: 'create_project', name });
    const receipt = await this.receipt(requestId, hash);
    if (receipt) return receipt;
    const document = emptyDocument();
    document.projectFloorPlan.activeFloorId = document.projectFloorPlan.floors[0].id;
    const result = await this.write({ requestId, hash, projectId: randomUUID(), name, baseRevision: null, document, create: true });
    return result;
  }
}

export function planError(error: unknown) {
  if (error instanceof PlanLimitError) return new McpToolError('plan_limit', error.message);
  return error;
}
