import type { Metadata } from 'next';
import { inter } from '@/app/fonts/inter';
import { McpDocs } from './mcp-docs';
import './docs.css';

export const metadata: Metadata = {
  title: 'MCP documentation',
  description: 'Connect Codex and Claude Code to RoomSketch. Free-plan MCP access, CLI setup, local plugin installation, design workflows, and tool reference.',
  alternates: { canonical: '/docs/mcp' },
  openGraph: { title: 'RoomSketch MCP · Design through conversation', description: 'Your floor plans, connected to your assistant. Get started with CLI and local plugin guides.', url: '/docs/mcp' },
};

export default function McpDocumentationPage() {
  return <div className={`mcp-docs ${inter.variable}`}><McpDocs /></div>;
}
