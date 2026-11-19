import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { McpToolError } from './errors';
import { requestOrigin } from './origin';

export type McpPrincipal = { tokenId: string; userId: string; scopes: string[]; projectIds: string[] | null };

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new McpToolError('unavailable', 'MCP storage is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function newToken() { return `rsmcp_${randomBytes(32).toString('base64url')}`; }

export async function authenticate(request: Request): Promise<McpPrincipal> {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer (rsmcp_[A-Za-z0-9_-]{43})$/i.exec(header);
  if (!match) throw new McpToolError('unauthorized', 'Provide a RoomSketch MCP access token.');
  const { data, error } = await adminClient().rpc('mcp_authenticate', { p_hash: hashToken(match[1]) });
  if (error) throw new McpToolError('unavailable', 'MCP authorization is unavailable. Check the MCP migration.');
  if (!data) throw new McpToolError('unauthorized', 'Token is invalid, expired, or revoked.');
  if (data.rate_limited) throw new McpToolError('rate_limited', 'MCP request limit reached. Retry in one minute.');
  return { tokenId: data.id, userId: data.user_id, scopes: data.scopes, projectIds: data.project_ids };
}

export function authorize(principal: McpPrincipal, scope: string, projectId?: string) {
  if (!principal.scopes.includes(scope)) throw new McpToolError('insufficient_scope', `Token requires ${scope}.`);
  if (projectId && principal.projectIds && !principal.projectIds.includes(projectId))
    throw new McpToolError('not_found', 'Project not found or not authorized.');
}

/** Browsers must originate from this deployment. Native MCP clients generally omit Origin. */
export function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === requestOrigin(request) ||
    (process.env.MCP_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean).includes(origin);
}
