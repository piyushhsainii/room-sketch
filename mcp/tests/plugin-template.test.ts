import JSZip from 'jszip';
import { GET } from '@/app/api/mcp/plugin-template/route';
import { claudePluginFiles } from '../plugin-template';
import { PUBLIC_MCP_ENDPOINT, resolvePublicMcpEndpoint } from '../public-endpoint';

test('plugin download is a valid archive with deployment-bound MCP config and no embedded secret', async () => {
  const response = await GET(new Request('https://localhost/api/mcp/plugin-template', { headers: { Host: 'test.roomsketch.example' } }));
  expect(response.headers.get('content-type')).toBe('application/zip');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const manifest = JSON.parse(await zip.file('roomsketch-plugin/.claude-plugin/plugin.json')!.async('string'));
  const config = JSON.parse(await zip.file('roomsketch-plugin/.mcp.json')!.async('string'));
  expect(manifest.name).toBe('roomsketch');
  expect(config.mcpServers.roomsketch.url).toBe(PUBLIC_MCP_ENDPOINT);
  expect(config.mcpServers.roomsketch.headers.Authorization).toBe('Bearer ${ROOMSKETCH_MCP_TOKEN}');
  expect(await zip.file('roomsketch-plugin/README.md')!.async('string')).toContain('--plugin-dir');
});

test('plugin templates reject non-HTTP endpoints and credentials embedded in URLs', () => {
  expect(() => claudePluginFiles('file:///private')).toThrow();
  expect(() => claudePluginFiles('https://secret:password@example.com/api/mcp')).toThrow();
});

test('public setup defaults to production and accepts explicit development overrides only', () => {
  expect(resolvePublicMcpEndpoint()).toBe('https://roomsketch.vercel.app/api/mcp');
  expect(resolvePublicMcpEndpoint('http://localhost:3000/api/mcp')).toBe('http://localhost:3000/api/mcp');
  expect(() => resolvePublicMcpEndpoint('http://external.example/api/mcp')).toThrow();
  expect(() => resolvePublicMcpEndpoint('https://example.com/api/mcp?token=secret')).toThrow();
});
