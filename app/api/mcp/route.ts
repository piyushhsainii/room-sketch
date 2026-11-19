import { handleMcp } from '@/mcp/handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const POST = handleMcp;
export const GET = handleMcp;
export const DELETE = handleMcp;
