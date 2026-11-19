/** Public, credential-free local Claude Code plugin scaffold. */
export function claudePluginFiles(endpoint: string): Record<string, string> {
  const url = new URL(endpoint);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Use an HTTP(S) MCP endpoint without embedded credentials.');
  return {
    '.claude-plugin/plugin.json': JSON.stringify({ name: 'roomsketch', version: '0.1.0',
      description: 'Read and edit your RoomSketch floor plans through MCP.', author: { name: 'RoomSketch' } }, null, 2),
    '.mcp.json': JSON.stringify({ mcpServers: { roomsketch: { type: 'http', url: url.href,
      headers: { Authorization: 'Bearer ${ROOMSKETCH_MCP_TOKEN}' } } } }, null, 2),
    'README.md': `# RoomSketch local Claude Code plugin\n\nCreate a token at ${url.origin}/mcp. Set ROOMSKETCH_MCP_TOKEN in the shell from which you launch Claude Code.\n\nExtract this folder, then run:\n\n    claude --plugin-dir ./roomsketch-plugin\n\nRun /mcp in Claude Code to inspect the connection. If your manual configuration already connects RoomSketch, disable that duplicate connection before loading this plugin.\n\nThis is a local plugin template, not a marketplace listing. No token is embedded in these files. Keep the actual token out of source control.\n\nGuide: ${url.origin}/docs/mcp\n`,
  };
}
