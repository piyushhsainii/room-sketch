import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TokenManager } from './token-manager';
import { inter } from '@/app/fonts/inter';
import '../docs/mcp/docs.css';

export const metadata = { title: 'Connect MCP | RoomSketch', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function McpPage() {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  return <div className={`mcp-docs ${inter.variable}`}><main className="mcp-connect-wrap">
    <Link href="/dashboard">← RoomSketch</Link>
    <h1 style={{ fontSize: 32, marginTop: 28 }}>Connect RoomSketch to your assistant</h1>
    <p style={{ margin: '16px 0', lineHeight: 1.7 }}>Create an access token for Codex or Claude Code to read and edit your saved projects. Tokens expire and can be revoked here.</p>
    <p><Link href="/docs/mcp">Read the MCP connection guide</Link> · Included on Free and Pro</p>
    <div className="mcp-connect-card">
    {process.env.MCP_ENABLED !== 'true' ? <p>MCP connections are currently disabled on this deployment.</p> :
      user ? <TokenManager /> : <Link href="/login?redirectTo=%2Fmcp">Sign in to create a connection</Link>}
    </div>
  </main></div>;
}
