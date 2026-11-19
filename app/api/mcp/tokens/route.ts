import { createServerSupabaseClient } from '@/lib/supabase/server';
import { adminClient, hashToken, newToken } from '@/mcp/auth';
import { tokenInputSchema } from '@/mcp/schemas';
import { requestOrigin } from '@/mcp/origin';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

async function owner() {
  const client = await createServerSupabaseClient();
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}
function sameOrigin(request: Request) {
  return request.headers.get('origin') === requestOrigin(request);
}

export async function GET() {
  try {
    const user = await owner();
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401, headers });
    const { data, error } = await adminClient().from('mcp_tokens')
      .select('id,name,scopes,project_ids,created_at,expires_at,revoked_at,last_used_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return Response.json({ tokens: data }, { headers });
  } catch { return Response.json({ error: 'Token storage unavailable. Apply the MCP migration first.' }, { status: 503, headers }); }
}

export async function POST(request: Request) {
  if (process.env.MCP_ENABLED !== 'true') return Response.json({ error: 'MCP is disabled.' }, { status: 503, headers });
  if (!sameOrigin(request)) return Response.json({ error: 'Origin not allowed.' }, { status: 403, headers });
  try {
    const user = await owner();
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401, headers });
    const input = tokenInputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: 'Invalid token settings.', details: input.error.flatten() }, { status: 400, headers });
    const db = adminClient();
    if (input.data.project_ids) {
      const { count, error } = await db.from('projects').select('id', { head: true, count: 'exact' })
        .eq('user_id', user.id).in('id', [...new Set(input.data.project_ids)]);
      if (error) throw error;
      if (count !== new Set(input.data.project_ids).size)
        return Response.json({ error: 'A selected project does not belong to this account.' }, { status: 403, headers });
    }
    const { count, error: countError } = await db.from('mcp_tokens').select('id', { head: true, count: 'exact' })
      .eq('user_id', user.id).is('revoked_at', null).gt('expires_at', new Date().toISOString());
    if (countError) throw countError;
    if ((count ?? 0) >= 20) return Response.json({ error: 'Revoke an existing token first (20 active tokens maximum).' }, { status: 409, headers });
    const token = newToken();
    const { data, error } = await db.from('mcp_tokens').insert({
      user_id: user.id, name: input.data.name, token_hash: hashToken(token), scopes: input.data.scopes,
      project_ids: input.data.project_ids, expires_at: new Date(Date.now() + input.data.expires_in_days * 86400000).toISOString(),
    }).select('id,name,expires_at').single();
    if (error) throw error;
    return Response.json({ ...data, token }, { status: 201, headers });
  } catch { return Response.json({ error: 'Unable to create token. Check MCP storage configuration.' }, { status: 503, headers }); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origin not allowed.' }, { status: 403, headers });
  try {
    const user = await owner();
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401, headers });
    const input = z.object({ id: z.string().uuid() }).strict().safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: 'Invalid token ID.' }, { status: 400, headers });
    const { data, error } = await adminClient().from('mcp_tokens').update({ revoked_at: new Date().toISOString() })
      .eq('id', input.data.id).eq('user_id', user.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: 'Token not found.' }, { status: 404, headers });
    return Response.json({ ok: true }, { headers });
  } catch { return Response.json({ error: 'Unable to revoke token.' }, { status: 503, headers }); }
}
