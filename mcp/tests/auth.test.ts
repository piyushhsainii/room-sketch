import { allowedOrigin, authorize, hashToken, newToken, type McpPrincipal } from '../auth';

const principal: McpPrincipal = { tokenId: 'token', userId: 'owner', scopes: ['projects:read'], projectIds: ['allowed'] };

test('write scope and project restrictions are enforced independently', () => {
  expect(() => authorize(principal, 'projects:read', 'allowed')).not.toThrow();
  expect(() => authorize(principal, 'projects:write', 'allowed')).toThrow('requires');
  expect(() => authorize(principal, 'projects:read', 'another')).toThrow('not authorized');
});
test('tokens have 256-bit random secrets and only their SHA-256 digest is persisted', () => {
  const token = newToken();
  expect(token).toMatch(/^rsmcp_[A-Za-z0-9_-]{43}$/);
  expect(newToken()).not.toBe(token);
  expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
});
test('native clients may omit Origin, but arbitrary browser origins are rejected', () => {
  delete process.env.MCP_ALLOWED_ORIGINS;
  expect(allowedOrigin(new Request('https://roomsketch.example/api/mcp'))).toBe(true);
  expect(allowedOrigin(new Request('https://roomsketch.example/api/mcp', { headers: { Origin: 'https://evil.example' } }))).toBe(false);
  expect(allowedOrigin(new Request('https://roomsketch.example/api/mcp', { headers: { Origin: 'https://roomsketch.example' } }))).toBe(true);
});

test('same-origin checks preserve the incoming host when Next reconstructs a localhost URL', () => {
  expect(allowedOrigin(new Request('http://localhost:3012/api/mcp', {
    headers: { Host: '127.0.0.1:3012', Origin: 'http://127.0.0.1:3012' },
  }))).toBe(true);
  expect(allowedOrigin(new Request('http://localhost:3012/api/mcp', {
    headers: { Host: '127.0.0.1:3012', Origin: 'https://foreign.example' },
  }))).toBe(false);
});
