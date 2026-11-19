import JSZip from 'jszip';
import { claudePluginFiles } from '@/mcp/plugin-template';
import { requestOrigin } from '@/mcp/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const zip = new JSZip();
  const folder = zip.folder('roomsketch-plugin')!;
  for (const [path, content] of Object.entries(claudePluginFiles(`${requestOrigin(request)}/api/mcp`))) folder.file(path, content);
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return new Response(new Uint8Array(bytes).buffer, { headers: { 'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="roomsketch-claude-plugin.zip"', 'Cache-Control': 'no-store' } });
}
