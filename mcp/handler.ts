import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { allowedOrigin, authenticate } from './auth';
import { createServer } from './server';
import { McpToolError, publicError } from './errors';
import { requestOrigin } from './origin';

const MAX_BODY_BYTES = 256 * 1024;

async function boundedBody(request: Request) {
  if (!request.body) throw new McpToolError('invalid_request', 'JSON body required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new McpToolError('payload_too_large', 'Maximum MCP body is 256 KiB.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new McpToolError('invalid_request', 'Invalid JSON.'); }
}

export async function handleMcp(request: Request) {
  if (process.env.MCP_ENABLED !== 'true') return Response.json({ error: 'MCP is disabled.' }, { status: 503 });
  if (!allowedOrigin(request)) return Response.json({ error: 'Origin not allowed.' }, { status: 403 });
  // Stateless transport: no persistent GET stream or session deletion.
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  try {
    const principal = await authenticate(request);
    const body = await boundedBody(request);
    const server = createServer(principal, requestOrigin(request));
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request, { parsedBody: body });
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } finally { await server.close(); }
  } catch (error) {
    const code = error instanceof McpToolError ? error.code : 'internal_error';
    const status = code === 'unauthorized' ? 401 : code === 'rate_limited' ? 429 : code === 'payload_too_large' ? 413 :
      code === 'invalid_request' ? 400 : code === 'unavailable' ? 503 : 500;
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (status === 401) headers['WWW-Authenticate'] = 'Bearer realm="RoomSketch MCP"';
    if (status === 429) headers['Retry-After'] = '60';
    return Response.json({ error: publicError(error) }, { status, headers });
  }
}
