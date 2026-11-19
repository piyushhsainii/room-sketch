// Real SDK and HTTP transport; only persistence and token lookup are replaced.
jest.mock('../auth', () => {
  const actual = jest.requireActual('../auth');
  const { McpToolError } = jest.requireActual('../errors');
  return { ...actual, authenticate: jest.fn(async (request: Request) => {
    const token = request.headers.get('authorization');
    if (token !== 'Bearer test-write' && token !== 'Bearer test-read')
      throw new McpToolError('unauthorized', 'Invalid token.');
    return { tokenId: 'token', userId: 'owner', scopes: token === 'Bearer test-read' ? ['projects:read'] : ['projects:read', 'projects:write'], projectIds: null };
  }) };
});
jest.mock('../service', () => {
  const { emptyDocument } = jest.requireActual('../document');
  const { McpToolError } = jest.requireActual('../errors');
  const document = emptyDocument(); document.revision = '00000000-0000-4000-8000-000000000001';
  document.projectFloorPlan.activeFloorId = document.projectFloorPlan.floors[0].id;
  const receipts = new Map();
  return { payloadHash: (input: unknown) => JSON.stringify(input), planError: (e: unknown) => e,
    ProjectService: class {
      async plan() { return { id: 'free', features: new Set() }; }
      async list() { return { projects: [{ id: '00000000-0000-4000-8000-000000000002', name: 'Test' }], next_offset: null }; }
      async get() { return { name: 'Test', document: structuredClone(document) }; }
      async receipt(id: string) { return receipts.get(id) ?? null; }
      async write(args: { baseRevision: string; document: typeof document; projectId: string; result: object; requestId: string }) {
        if (args.baseRevision !== document.revision) throw new McpToolError('revision_conflict', 'Read the latest project.');
        Object.assign(document, args.document, { revision: '00000000-0000-4000-8000-000000000003' });
        const result = { ...args.result, revision: document.revision, project_id: args.projectId };
        receipts.set(args.requestId, result); return result;
      }
    } };
});

import { handleMcp } from '../handler';
import { McpToolError } from '../errors';
import { authenticate } from '../auth';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

let sequence = 0;
async function rpc(method: string, params: unknown, token = 'test-write') {
  const response = await handleMcp(new Request('https://roomsketch.example/api/mcp', { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++sequence, method, params }) }));
  return { status: response.status, body: await response.json() };
}
function value(response: Awaited<ReturnType<typeof rpc>>) { return JSON.parse(response.body.result.content[0].text); }
beforeAll(() => { process.env.MCP_ENABLED = 'true'; });
afterAll(() => { delete process.env.MCP_ENABLED; });

test('official SDK client connects, negotiates, and calls a tool over the HTTP adapter', async () => {
  const client = new Client({ name: 'integration-test', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('https://roomsketch.example/api/mcp'), {
      fetch: async (url, init) => handleMcp(new Request(url, init)),
      requestInit: { headers: { Authorization: 'Bearer test-read' } },
    }));
    expect((await client.listTools()).tools).toHaveLength(9);
    const result = await client.callTool({ name: 'get_capabilities', arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.content)).toContain('metres');
  } finally { await client.close(); }
});

test('HTTP initialization, tool discovery, resources and prompts work through the SDK', async () => {
  const init = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  expect(init.status).toBe(200); expect(init.body.result.serverInfo.name).toBe('roomsketch');
  const tools = await rpc('tools/list', {});
  expect(tools.body.result.tools.map((tool: { name: string }) => tool.name)).toContain('apply_changes');
  const resources = await rpc('resources/read', { uri: 'roomsketch://guide' });
  expect(resources.body.result.contents[0].text).toContain('revision_conflict');
  const prompt = await rpc('prompts/get', { name: 'design_house', arguments: { brief: 'Two bedrooms' } });
  expect(prompt.body.result.messages[0].content.text).toContain('Two bedrooms');
});

test('real MCP workflow previews, saves, replays a retry, and refuses a stale revision', async () => {
  const project_id = '00000000-0000-4000-8000-000000000002';
  const project = value(await rpc('tools/call', { name: 'get_project', arguments: { project_id } }));
  const operations = [{ op: 'add_room', floor_id: project.floors[0].id, ref: 'kitchen', label: 'Kitchen', x: 0, z: 0, width: 4, depth: 3 }];
  const preview = value(await rpc('tools/call', { name: 'preview_changes', arguments: { project_id, operations } }));
  expect(preview.proposed.floors[0].rooms).toHaveLength(1);
  const before = value(await rpc('tools/call', { name: 'get_project', arguments: { project_id } }));
  expect(before.floors[0].rooms).toHaveLength(0);
  const args = { project_id, operations, base_revision: project.revision, request_id: '00000000-0000-4000-8000-000000000004' };
  const saved = value(await rpc('tools/call', { name: 'apply_changes', arguments: args }));
  expect(saved.revision).not.toBe(project.revision);
  const retry = value(await rpc('tools/call', { name: 'apply_changes', arguments: args }));
  expect(retry.revision).toBe(saved.revision); expect(retry.replayed).toBe(true);
  const conflict = value(await rpc('tools/call', { name: 'apply_changes', arguments: { ...args, request_id: '00000000-0000-4000-8000-000000000005' } }));
  expect(conflict.error.code).toBe('revision_conflict');
  const after = value(await rpc('tools/call', { name: 'get_project', arguments: { project_id } }));
  expect(after.floors[0].rooms).toHaveLength(1);
});

test('read-only tokens cannot mutate and invalid tool arguments are rejected', async () => {
  const response = await rpc('tools/call', { name: 'apply_changes', arguments: {
    project_id: '00000000-0000-4000-8000-000000000002', base_revision: null,
    request_id: '00000000-0000-4000-8000-000000000006',
    operations: [{ op: 'add_floor', ref: 'upper', label: 'Upper', height: 3 }],
  } }, 'test-read');
  expect(response.body.result.isError).toBe(true); expect(value(response).error.code).toBe('insufficient_scope');
  const invalid = await rpc('tools/call', { name: 'get_project', arguments: { project_id: 'not-a-uuid' } });
  expect(invalid.body.result?.isError || invalid.body.error).toBeTruthy();
});

test('HTTP denies missing credentials, foreign origins, oversized payloads, and disabled deployments', async () => {
  jest.mocked(authenticate).mockRejectedValueOnce(new McpToolError('unauthorized', 'Invalid token.'));
  expect((await rpc('tools/list', {}, 'invalid')).status).toBe(401);
  const origin = await handleMcp(new Request('https://roomsketch.example/api/mcp', { method: 'POST', headers: { Origin: 'https://evil.example' } }));
  expect(origin.status).toBe(403);
  const large = await handleMcp(new Request('https://roomsketch.example/api/mcp', { method: 'POST', headers: { Authorization: 'Bearer test-write' }, body: 'a'.repeat(256 * 1024 + 1) }));
  expect(large.status).toBe(413);
  process.env.MCP_ENABLED = 'false';
  expect((await rpc('tools/list', {})).status).toBe(503);
  process.env.MCP_ENABLED = 'true';
});
