'use client';

import { useCallback, useEffect, useState } from 'react';
import { PUBLIC_MCP_ENDPOINT } from '@/mcp/public-endpoint';

type Token = { id: string; name: string; scopes: string[]; expires_at: string; revoked_at: string | null };
const field = { display: 'block', width: '100%', padding: 10, border: '1px solid #aaa', borderRadius: 6, marginTop: 6 };
const button = { border: '1px solid #888', borderRadius: 6, padding: '10px 16px', cursor: 'pointer' };

export function TokenManager() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState('My assistant');
  const [access, setAccess] = useState('read');
  const [projects, setProjects] = useState('');
  const [days, setDays] = useState(30);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/mcp/tokens', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setTokens(body.tokens);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to load connections.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSecret('');
    try {
      const response = await fetch('/api/mcp/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes: access === 'write' ? ['projects:read', 'projects:write'] : ['projects:read'],
          project_ids: projects.trim() ? projects.split(',').map(id => id.trim()) : null, expires_in_days: days }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setSecret(body.token); await load();
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to create token.'); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/mcp/tokens', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setSecret(''); await load();
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to revoke token.'); }
    finally { setBusy(false); }
  }
  return <>
    <form onSubmit={create} style={{ display: 'grid', gap: 18, margin: '24px 0' }}>
      <label>Connection name<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} style={field} /></label>
      <label>Access<select value={access} onChange={e => setAccess(e.target.value)} style={field}>
        <option value="read">Read projects</option><option value="write">Read and edit projects</option>
      </select></label>
      <label>Project IDs (optional, comma separated)<input value={projects} onChange={e => setProjects(e.target.value)} style={field} />
        <small>Leave empty for all your projects, including creating new projects when edit access is enabled.</small></label>
      <label>Expires after (days)<input type="number" min={1} max={90} required value={days} onChange={e => setDays(Number(e.target.value))} style={field} /></label>
      <button disabled={busy} style={button}>{busy ? 'Working…' : 'Create access token'}</button>
    </form>
    {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}
    {secret && <section style={{ padding: 18, border: '1px solid #aaa', borderRadius: 8, marginBottom: 24 }}>
      <h2>Save your token</h2><p>This is the only time it is shown. Treat it like a password.</p>
      <code style={{ display: 'block', overflowWrap: 'anywhere', margin: '12px 0' }}>{secret}</code>
      <button type="button" style={button} onClick={async () => { try { await navigator.clipboard.writeText(secret); } catch { setError('Copy the token manually. Clipboard access is unavailable.'); } }}>Copy token</button>
      <button type="button" style={{ ...button, marginLeft: 8 }} onClick={() => setSecret('')}>Hide token</button>
    </section>}
    <h2 style={{ fontSize: 22 }}>Connect your client</h2>
    <p style={{ margin: '12px 0' }}>Set ROOMSKETCH_MCP_TOKEN in your local environment to the token above.</p>
    <p>Codex configuration:</p><pre style={{ whiteSpace: 'pre-wrap', padding: 14, border: '1px solid #aaa', margin: '10px 0' }}>{`[mcp_servers.roomsketch]\nurl = "${PUBLIC_MCP_ENDPOINT}"\nbearer_token_env_var = "ROOMSKETCH_MCP_TOKEN"`}</pre>
    <p>Claude Code project configuration (<code>.mcp.json</code>):</p>
    <pre style={{ whiteSpace: 'pre-wrap', padding: 14, border: '1px solid #aaa', margin: '10px 0' }}>{JSON.stringify({ mcpServers: { roomsketch: {
      type: 'http', url: PUBLIC_MCP_ENDPOINT, headers: { Authorization: 'Bearer ${ROOMSKETCH_MCP_TOKEN}' },
    } } }, null, 2)}</pre>
    <h2 style={{ fontSize: 22, marginTop: 28 }}>Your connections</h2>
    {tokens.length === 0 && <p>No connections yet.</p>}
    <ul style={{ padding: 0, listStyle: 'none' }}>{tokens.map(token => <li key={token.id} style={{ padding: '16px 0', borderBottom: '1px solid #aaa' }}>
      <strong>{token.name}</strong> — {token.revoked_at ? 'Revoked' : new Date(token.expires_at) <= new Date() ? 'Expired' : 'Active'}
      <p style={{ margin: '6px 0' }}>{token.scopes.join(', ')} · Expires {new Date(token.expires_at).toLocaleDateString()}</p>
      {!token.revoked_at && <button disabled={busy} style={button} onClick={() => void revoke(token.id)}>Revoke</button>}
    </li>)}</ul>
  </>;
}
