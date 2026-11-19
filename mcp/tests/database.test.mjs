import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test, before, after, beforeEach } from 'node:test';

// Execute the actual migration/functions against isolated embedded Postgres.
// The minimal fixture represents only the existing tables these functions use.
const db = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const token = '00000000-0000-4000-8000-000000000003';
const project = '00000000-0000-4000-8000-000000000004';
const request = '00000000-0000-4000-8000-000000000005';

before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${owner}'),('${other}');
    create table public.projects(
      id uuid primary key, user_id uuid not null references auth.users(id), name text,
      status text, floorplan_url text, workspace_enabled boolean,
      floorplan_editor_state jsonb, scene_json jsonb, workspace_config jsonb, updated_at timestamptz default now()
    );
    grant all on public.projects to service_role;
  `);
  await db.exec(await readFile(new URL('../../supabase/migrations/202611190002_mcp.sql', import.meta.url), 'utf8'));
});
after(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec('truncate public.mcp_operations, public.mcp_tokens, public.projects;');
  await db.query(`insert into public.mcp_tokens(id,user_id,name,token_hash,scopes,expires_at)
    values($1,$2,'Test','hash',array['projects:read','projects:write'],now()+interval '1 day')`, [token, owner]);
});

async function auth(hash = 'hash') {
  return (await db.query('select public.mcp_authenticate($1) as result', [hash])).rows[0].result;
}
async function write(overrides = {}) {
  const args = { create: true, base: null, hash: 'payload', request, project, token,
    document: { revision: 'revision-1' }, result: { project_id: project, revision: 'revision-1' }, limit: 5, ...overrides };
  return (await db.query(`select public.mcp_write_project($1,$2,$3,$4,$5,'Test',$6,$7,$8,$9,$10,$11) as result`, [
    args.token, args.request, args.hash, args.project, args.create, args.base,
    JSON.stringify(args.document), JSON.stringify({ rooms: [] }), JSON.stringify({}), JSON.stringify(args.result), args.limit,
  ])).rows[0].result;
}

test('migration authenticates active tokens and rejects missing, expired, and revoked credentials', async () => {
  assert.equal((await auth()).user_id, owner);
  assert.equal(await auth('missing'), null);
  await db.query('update public.mcp_tokens set expires_at = now() - interval \'1 second\'');
  assert.equal(await auth(), null);
  await db.query('update public.mcp_tokens set expires_at = now() + interval \'1 day\', revoked_at = now()');
  assert.equal(await auth(), null);
});
test('rate limits persist across invocations and reset after the window', async () => {
  await db.exec('update public.mcp_tokens set rate_count = 120');
  assert.equal((await auth()).rate_limited, true);
  await db.exec("update public.mcp_tokens set rate_window = now() - interval '2 minutes'");
  assert.equal((await auth()).id, token);
});
test('create retries return the same receipt without duplicating projects', async () => {
  const first = await write();
  assert.deepEqual(await write(), first);
  assert.equal((await db.query('select count(*)::int as n from public.projects')).rows[0].n, 1);
  await assert.rejects(write({ hash: 'different' }), /idempotency_conflict/);
});
test('writes atomically update derived documents and reject stale revisions without a receipt', async () => {
  await write();
  const updateRequest = '00000000-0000-4000-8000-000000000006';
  await write({ create: false, request: updateRequest, base: 'revision-1', document: { revision: 'revision-2' }, result: { revision: 'revision-2' } });
  await assert.rejects(write({ create: false, request: '00000000-0000-4000-8000-000000000007', base: 'revision-1' }), /revision_conflict/);
  const saved = (await db.query('select floorplan_editor_state,scene_json from public.projects')).rows[0];
  assert.equal(saved.floorplan_editor_state.revision, 'revision-2');
  assert.deepEqual(saved.scene_json, { rooms: [] });
  assert.equal((await db.query('select count(*)::int as n from public.mcp_operations')).rows[0].n, 2);
});
test('database checks ownership, token scope, project restriction, and revocation at commit', async () => {
  await write();
  await db.query('update public.projects set user_id = $1', [other]);
  await assert.rejects(write({ create: false, request: '00000000-0000-4000-8000-000000000008', base: 'revision-1' }), /not_found/);
  await db.exec("update public.mcp_tokens set scopes = array['projects:read']");
  await assert.rejects(write(), /insufficient_scope/);
  await db.query("update public.mcp_tokens set scopes = array['projects:read','projects:write'], project_ids = array[$1::uuid]", [project]);
  await assert.rejects(write(), /insufficient_scope/);
  await db.exec('update public.mcp_tokens set project_ids = null, revoked_at = now()');
  await assert.rejects(write(), /unauthorized/);
});
test('plan limits reject new projects without inserting partial state', async () => {
  await assert.rejects(write({ limit: 0 }), /project_limit/);
  assert.equal((await db.query('select count(*)::int as n from public.projects')).rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int as n from public.mcp_operations')).rows[0].n, 0);
});
test('browser database roles cannot read token hashes or execute privileged MCP functions', async () => {
  await db.exec('set role authenticated');
  try {
    await assert.rejects(db.query('select token_hash from public.mcp_tokens'), /permission denied/);
    await assert.rejects(db.query("select public.mcp_authenticate('hash')"), /permission denied/);
  } finally { await db.exec('reset role'); }
});
