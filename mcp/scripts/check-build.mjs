import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import JSZip from 'jszip';

// Smoke-test built Next.js boundaries without credentials or database writes.
const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
  cwd: process.cwd(), env: { ...process.env, MCP_ENABLED: 'true', NEXT_TELEMETRY_DISABLED: '1' }, windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { output = (output + data.toString()).slice(-12000); });
const origin = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  let lastResult = '';
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Next.js exited: ${output}`);
    try { const response = await fetch(`${origin}/api/mcp`, { signal: AbortSignal.timeout(1000) }); ready = response.status === 405; lastResult = `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`; }
    catch (error) { lastResult = error.message; }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, `Built endpoint did not start (${lastResult}): ${output}`);
  const missing = await fetch(`${origin}/api/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(missing.status, 401); assert.match(missing.headers.get('www-authenticate'), /Bearer/);
  const foreign = await fetch(`${origin}/api/mcp`, { method: 'POST', headers: { Origin: 'https://untrusted.example' }, body: '{}' });
  assert.equal(foreign.status, 403);
  const csrf = await fetch(`${origin}/api/mcp/tokens`, { method: 'POST', headers: { Origin: 'https://untrusted.example' }, body: '{}' });
  assert.equal(csrf.status, 403);
  const page = await fetch(`${origin}/mcp`);
  assert.equal(page.status, 200); assert.match(await page.text(), /Sign in to create a connection/);
  const docs = await fetch(`${origin}/docs/mcp`);
  assert.equal(docs.status, 200);
  const docsHtml = await docs.text();
  for (const section of ['cli', 'plugins', 'use-cases', 'tools', 'troubleshooting']) assert.ok(docsHtml.includes(`id="${section}"`));
  const download = await fetch(`${origin}/api/mcp/plugin-template`);
  assert.equal(download.status, 200);
  const zip = await JSZip.loadAsync(await download.arrayBuffer());
  const config = JSON.parse(await zip.file('roomsketch-plugin/.mcp.json').async('string'));
  assert.equal(config.mcpServers.roomsketch.url, `${origin}/api/mcp`);
  assert.equal(config.mcpServers.roomsketch.headers.Authorization, 'Bearer ${ROOMSKETCH_MCP_TOKEN}');
  console.log('Built routes passed: MCP auth/origin checks, connection page, public documentation, and downloadable plugin ZIP. No credentials or database writes used.');
} finally { child.kill(); }
