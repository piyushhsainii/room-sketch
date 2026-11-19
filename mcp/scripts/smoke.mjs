import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = process.env.ROOMSKETCH_MCP_URL ?? 'http://localhost:3000/api/mcp';
const token = process.env.ROOMSKETCH_MCP_TOKEN;
if (!token) throw new Error('Set ROOMSKETCH_MCP_TOKEN to a token created at /mcp.');
const client = new Client({ name: 'roomsketch-smoke', version: '0.1.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  const tools = await client.listTools();
  console.log('Connected. Tools:', tools.tools.map(tool => tool.name).join(', '));
  for (const name of ['get_capabilities', 'list_projects']) {
    const result = await client.callTool({ name, arguments: {} });
    if (result.isError) throw new Error(JSON.stringify(result.content));
    console.log(name, JSON.stringify(result.content));
  }
  console.log('Read-only smoke check passed. No projects were created or changed.');
} finally { await client.close(); }
