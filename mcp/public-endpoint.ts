/** Public client configuration must not accidentally inherit a local preview URL. */
export function resolvePublicMcpEndpoint(configured?: string) {
  const url = new URL(configured || 'https://roomsketch.vercel.app/api/mcp');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) {
    throw new Error('NEXT_PUBLIC_MCP_URL must be an HTTPS endpoint, or an explicit loopback development endpoint, without credentials or query parameters.');
  }
  return url.href;
}

export const PUBLIC_MCP_ENDPOINT = resolvePublicMcpEndpoint(process.env.NEXT_PUBLIC_MCP_URL);
