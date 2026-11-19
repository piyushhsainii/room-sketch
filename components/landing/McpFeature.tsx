import Link from 'next/link';
import { Layers3, MessageSquare, Plug, Terminal } from 'lucide-react';

export default function McpFeature() {
  return <section id="mcp" className="landing-mcp" aria-labelledby="landing-mcp-title">
    <div className="landing-mcp-copy"><div className="landing-mcp-eyebrow"><Plug size={15} /> ROOMSKETCH MCP <span>Included on Free</span></div>
      <h2 id="landing-mcp-title">A little conversation.<br />A whole new room.</h2>
      <p>Bring Codex or Claude Code into your design process. Start a floor plan, adjust room sizes, and try furniture layouts through conversation. Every saved change is editable in RoomSketch.</p>
      <ul><li>Start from a brief and real dimensions</li><li>Refine rooms, doors, windows, and furniture</li><li>Preview changes before your assistant saves them</li></ul>
      <div className="landing-mcp-actions"><Link href="/docs/mcp">Read the connection guide</Link><Link href="/docs/mcp#plugins">CLI + local plugin setup</Link></div>
      <p className="landing-mcp-fine">No separate RoomSketch MCP fee. Your plan limits and assistant provider’s costs still apply.</p>
    </div>
    <div className="landing-mcp-demo" aria-label="Illustrative MCP design workflow">
      <div className="landing-mcp-demo-bar"><span><Terminal size={14} /> Your assistant</span><span>Connected with MCP</span></div>
      <div className="landing-mcp-message"><MessageSquare size={16} /><p>Add a study with a desk by the window.<br />Show me the plan before saving.</p></div>
      <div className="landing-mcp-tool"><span>preview_changes</span><span>Proposed layout</span></div>
      <svg viewBox="0 0 380 230" role="img" aria-label="Illustrative floor plan with a study and living room">
        <defs><pattern id="mcp-plan-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M 16 0 L 0 0 0 16" fill="none" stroke="#e1e4db" strokeWidth=".5" /></pattern></defs>
        <rect width="380" height="230" fill="url(#mcp-plan-grid)" />
        <path d="M50 35H330V195H50Z M195 35V112 M195 151V195" fill="#f5f6f0" stroke="#6c7960" strokeWidth="3" />
        <path d="M195 151A39 39 0 0 1 234 112H195" fill="none" stroke="#a4ad95" strokeWidth="1" />
        <rect x="65" y="60" width="77" height="32" rx="2" fill="#e0e6d4" stroke="#8e9f79" /><rect x="91" y="101" width="25" height="23" rx="5" fill="#e6e9df" stroke="#94a285" />
        <path d="M80 35H145" stroke="#a4bad0" strokeWidth="5" /><path d="M330 70V122" stroke="#a4bad0" strokeWidth="5" />
        <rect x="235" y="151" width="68" height="24" rx="5" fill="#dddcd2" stroke="#a4a28f" /><rect x="250" y="108" width="39" height="25" rx="5" fill="#ebe9df" stroke="#b3b09e" />
        <text x="120" y="155" textAnchor="middle" fontSize="11" fill="#66735a" fontFamily="Arial">STUDY</text><text x="263" y="87" textAnchor="middle" fontSize="11" fill="#777b6e" fontFamily="Arial">LIVING</text>
      </svg>
      <div className="landing-mcp-demo-footer"><Layers3 size={15} /><span>Your project. Still yours to edit.</span><span>Illustrative preview</span></div>
    </div>
  </section>;
}
