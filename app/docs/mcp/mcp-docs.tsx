'use client';

import Link from 'next/link';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { BookOpen, Check, ChevronDown, Code2, Copy, Download, ExternalLink, KeyRound, Layers3,
  Menu, MessageSquare, Plug, ShieldCheck, Terminal, X } from 'lucide-react';

const SECTIONS = [
  ['overview', 'Overview'], ['quick-start', 'Quick start'], ['cli', 'CLI connection'], ['plugins', 'Plugin & app setup'],
  ['use-cases', 'What you can build'], ['tools', 'Tool reference'], ['permissions', 'Access & limits'], ['troubleshooting', 'Troubleshooting'],
] as const;
const TOOLS = [
  ['get_capabilities', 'Read supported operations, units, and your account limits.'],
  ['list_projects', 'Find your projects, filtered to the access you granted.'],
  ['get_project', 'Inspect floors, rooms, furniture, and the latest revision.'],
  ['create_project', 'Start a blank, editable project within your plan’s allowance.'],
  ['search_catalog', 'Find built-in furniture and materials by their supported IDs.'],
  ['preview_changes', 'Check a proposed edit batch without saving it.'],
  ['apply_changes', 'Save a batch with revision checks and retry protection.'],
  ['validate_project', 'Check room dimensions, opening bounds, and basic placement warnings.'],
  ['get_preview', 'Get a schematic SVG of a saved floor and its revision.'],
];
const USE_CASES = [
  { icon: Layers3, title: 'Start from a brief', description: 'Turn room sizes and a layout idea into an editable starting point.', prompt: 'Create a project with a 4 × 3 metre bedroom and a 3 × 3 metre kitchen. Preview the proposed layout before saving it.' },
  { icon: MessageSquare, title: 'Refine as you think', description: 'Make targeted changes to an existing plan through conversation.', prompt: 'Read my project, find the kitchen, and make it 0.5 metres wider. Check that its doors and windows still fit before saving.' },
  { icon: Plug, title: 'Try a furniture layout', description: 'Search the built-in catalog and place pieces with real dimensions.', prompt: 'Find a desk and chair in the catalog. Place them in my study, leave space near the door, and return a preview for me to review.' },
];

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false), [error, setError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setError(false); setTimeout(() => setCopied(false), 1800); }
    catch { setError(true); }
  }
  return <div className="mcp-code"><div className="mcp-code-bar"><span>{title}</span><button type="button" onClick={() => void copy()} aria-label={`Copy ${title}`}>
    {copied ? <Check size={14} /> : <Copy size={14} />}<span>{copied ? 'Copied' : 'Copy'}</span></button></div>
    <pre tabIndex={0}><code>{code}</code></pre><span className="mcp-visually-hidden" role="status">{copied ? `${title} copied` : ''}</span>{error && <p className="mcp-copy-error" role="status">Select and copy the code manually; clipboard access is unavailable.</p>}</div>;
}

export function McpDocs() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [client, setClient] = useState<'codex' | 'claude'>('codex');
  const [shell, setShell] = useState<'powershell' | 'bash'>('powershell');
  const [origin, setOrigin] = useState('https://roomsketch.vercel.app');
  const [active, setActive] = useState('overview');
  useEffect(() => {
    setOrigin(window.location.origin);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: '-100px 0px -65% 0px' });
    for (const [id] of SECTIONS) { const node = document.getElementById(id); if (node) observer.observe(node); }
    return () => observer.disconnect();
  }, []);
  const endpoint = `${origin}/api/mcp`;
  function tabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'codex' : event.key === 'End' ? 'claude' : client === 'codex' ? 'claude' : 'codex';
    setClient(next); document.getElementById(`${next}-tab`)?.focus();
  }
  const envCode = shell === 'powershell' ? "$env:ROOMSKETCH_MCP_TOKEN = 'paste-your-token-here'" : "export ROOMSKETCH_MCP_TOKEN='paste-your-token-here'";
  const codexConfig = `[mcp_servers.roomsketch]\nurl = "${endpoint}"\nbearer_token_env_var = "ROOMSKETCH_MCP_TOKEN"`;
  const claudeConfig = JSON.stringify({ mcpServers: { roomsketch: { type: 'http', url: endpoint,
    headers: { Authorization: 'Bearer ${ROOMSKETCH_MCP_TOKEN}' } } } }, null, 2);

  return <>
    <a className="mcp-skip" href="#docs-main">Skip to content</a>
    <header className="mcp-header"><Link className="mcp-brand" href="/" aria-label="RoomSketch home">
      <img src="/room-sketch-logo-removebg-preview.png" alt="" width={34} height={34} /><span>roomsketch</span></Link>
      <span className="mcp-header-divider" /><Link href="/docs/mcp" className="mcp-header-label">Documentation</Link>
      <nav aria-label="Main navigation"><Link href="/">Product</Link><Link href="/dashboard">Your projects</Link><Link className="mcp-button mcp-button-dark" href="/mcp">Connect your assistant</Link></nav>
      <button className="mcp-mobile-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close guide navigation' : 'Open guide navigation'} aria-expanded={menuOpen} aria-controls="mcp-guide-navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </header>
    <div className="mcp-docs-layout">
      <aside className={`mcp-sidebar ${menuOpen ? 'is-open' : ''}`} id="mcp-guide-navigation">
        <div className="mcp-sidebar-heading"><BookOpen size={16} /> RoomSketch guides</div>
        <div className="mcp-sidebar-group">MCP integration</div>
        <nav aria-label="MCP guide sections">{SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => { setActive(id); setMenuOpen(false); }}>{label}</a>)}</nav>
        <div className="mcp-sidebar-note"><Plug size={19} /><strong>Included on Free</strong><p>Connect your own assistant. Keep designing in RoomSketch.</p><Link href="/mcp">Manage access tokens</Link></div>
        <a className="mcp-sidebar-source" href="https://modelcontextprotocol.io/introduction" target="_blank" rel="noreferrer">About the protocol <ExternalLink size={12} /></a>
      </aside>

      <main id="docs-main" className="mcp-article">
        <section id="overview" className="mcp-doc-hero">
          <div className="mcp-breadcrumb">Guides <span>/</span> Integrations <span>/</span> MCP</div>
          <div className="mcp-eyebrow"><Plug size={14} /> MODEL CONTEXT PROTOCOL <span className="mcp-free-badge">Free plan included</span></div>
          <h1>Your floor plans.<br /><span>Your assistant.</span></h1>
          <p className="mcp-lead">Describe a room. Refine a layout. Try a new furniture arrangement. Connect Codex or Claude Code to the same editable projects you use in RoomSketch.</p>
          <div className="mcp-actions"><a className="mcp-button mcp-button-dark" href="#quick-start">Make your first connection</a><a className="mcp-button" href="#use-cases">Explore use cases</a></div>
          <div className="mcp-flow" aria-label="Your brief goes to your assistant, which uses MCP to edit a RoomSketch project">
            <div><MessageSquare size={20} /><strong>Your brief</strong><span>“Make room for a study.”</span></div><span className="mcp-flow-line" aria-hidden="true" />
            <div><Terminal size={20} /><strong>Your assistant</strong><span>Codex or Claude Code</span></div><span className="mcp-flow-line" aria-hidden="true" />
            <div><Layers3 size={20} /><strong>Your workspace</strong><span>A saved, editable design</span></div>
          </div>
          <p className="mcp-small">MCP gives your assistant tools to work with RoomSketch. Your assistant plans the changes; RoomSketch checks and saves them.</p>
        </section>

        <section id="quick-start" className="mcp-section"><div className="mcp-section-heading"><KeyRound size={20} /><h2>A few minutes to connect.</h2></div>
          <p>You need a RoomSketch account and an MCP-capable assistant. MCP access is included on Free and Pro; your usual project and material limits still apply. Your assistant provider may have its own subscription or usage costs.</p>
          <ol className="mcp-steps">
            <li><strong>Create your access token</strong><p>Open <Link href="/mcp">Connections</Link>, sign in, and name your connection. Choose read access for inspection, or read and edit access to design. Save the token when it’s shown.</p></li>
            <li><strong>Choose a connection method</strong><p>Use the <a href="#cli">CLI guide</a> for Codex or Claude Code, or the <a href="#plugins">local plugin and app guide</a>. Both connect to the same endpoint.</p></li>
            <li><strong>Ask for a read-only check</strong><p>Start with the prompt below. Once your assistant can see its tools and your projects, try an edit.</p><CodeBlock title="First connection prompt" code="Connect to RoomSketch. Read its capabilities and list my projects. Do not create or change anything yet." /></li>
          </ol>
          <div className="mcp-note"><ShieldCheck size={19} /><p><strong>You choose the access.</strong> Restrict a token to selected projects, set its expiry, and revoke it from Connections whenever you need. A project-restricted token cannot create new projects.</p></div>
        </section>

        <section id="cli" className="mcp-section"><div className="mcp-section-heading"><Terminal size={20} /><h2>Connect from your CLI.</h2></div>
          <p>Set your token in the terminal session you’ll use to start the assistant. The examples use this deployment’s URL.</p>
          <div className="mcp-select-row"><label className="mcp-shell-label">Your shell<select aria-label="Your shell" value={shell} onChange={event => setShell(event.target.value as typeof shell)}><option value="powershell">Windows · PowerShell</option><option value="bash">macOS / Linux · Bash or Zsh</option></select><ChevronDown size={14} aria-hidden="true" /></label></div>
          <CodeBlock title={shell === 'powershell' ? 'PowerShell · current session' : 'Bash / Zsh · current session'} code={envCode} />
          <p className="mcp-small">Replace the placeholder with your token. Keep it out of shared files and screenshots. A token configured in one shell is only inherited by applications launched from that environment.</p>
          <div className="mcp-tabs" role="tablist" aria-label="CLI client">
            <button role="tab" id="codex-tab" aria-controls="codex-panel" aria-selected={client === 'codex'} tabIndex={client === 'codex' ? 0 : -1} onKeyDown={tabKey} onClick={() => setClient('codex')}>Codex</button>
            <button role="tab" id="claude-tab" aria-controls="claude-panel" aria-selected={client === 'claude'} tabIndex={client === 'claude' ? 0 : -1} onKeyDown={tabKey} onClick={() => setClient('claude')}>Claude Code</button>
          </div>
          <div role="tabpanel" id={`${client}-panel`} aria-labelledby={`${client}-tab`}>
            {client === 'codex' ? <><h3>Add the remote server</h3><CodeBlock title="Terminal" code={`codex mcp add roomsketch --url ${endpoint} --bearer-token-env-var ROOMSKETCH_MCP_TOKEN`} />
              <p>Or add the following to <code>~/.codex/config.toml</code>. Use one setup method to avoid a duplicate connection.</p><CodeBlock title="config.toml" code={codexConfig} />
              <CodeBlock title="Start Codex" code="codex" /><p>Restart an already running client so it loads the configuration. Ask it to list RoomSketch’s capabilities and your projects.</p></> :
              <><h3>Add the project configuration</h3><p>Save this as <code>.mcp.json</code> in the project where you run Claude Code. It references your token’s environment variable; the token itself stays outside the file.</p><CodeBlock title=".mcp.json" code={claudeConfig} />
                <CodeBlock title="Start Claude Code" code="claude" /><p>Review the project MCP connection when prompted, then run <code>/mcp</code> inside Claude Code to check its status.</p></>}
          </div>
          <p className="mcp-small">This connection uses a RoomSketch bearer token. It does not use an OAuth login flow. See the official <a href="https://developers.openai.com/codex/mcp" target="_blank" rel="noreferrer">Codex MCP guide</a> or <a href="https://code.claude.com/docs/en/mcp" target="_blank" rel="noreferrer">Claude Code MCP guide</a> for client-specific settings.</p>
        </section>

        <section id="plugins" className="mcp-section"><div className="mcp-section-heading"><Plug size={20} /><h2>Prefer a plugin or an app?</h2></div>
          <p>The connection still uses your RoomSketch token and the same MCP server. Choose the option that fits where you work.</p>
          <div className="mcp-plugin-card"><div className="mcp-card-top"><span className="mcp-icon-tile"><Plug size={21} /></span><span className="mcp-pill">Local plugin template</span></div>
            <h3>Claude Code plugin</h3><p>Download a small plugin folder with the connection manifest already filled in for this deployment. No token is included in the download.</p>
            <a className="mcp-button mcp-button-dark" href="/api/mcp/plugin-template" download><Download size={15} /> Download plugin template</a>
            <ol className="mcp-plugin-steps"><li>Extract the ZIP so you have a <code>roomsketch-plugin</code> folder.</li><li>Set <code>ROOMSKETCH_MCP_TOKEN</code> in your shell using the example above.</li><li>From the directory containing that folder, start Claude Code:</li></ol>
            <CodeBlock title="Local plugin launch" code="claude --plugin-dir ./roomsketch-plugin" />
            <p>Run <code>/mcp</code> to check the connection. If you already configured RoomSketch manually, disable that duplicate connection before using the plugin.</p>
            <p className="mcp-small">This is a local template, not a marketplace listing. Installation and environment support depend on your Claude Code version. <a href="https://code.claude.com/docs/en/plugins" target="_blank" rel="noreferrer">Official plugin guide</a>.</p>
          </div>
          <div className="mcp-app-card"><Code2 size={22} /><div><h3>Codex desktop & IDE clients</h3><p>Use the <a href="#cli">Codex MCP configuration</a> above in the environment used by your app or extension, then restart the client. A RoomSketch directory plugin for Codex has not been published; direct MCP configuration is the available connection path.</p></div></div>
        </section>

        <section id="use-cases" className="mcp-section"><div className="mcp-section-heading"><MessageSquare size={20} /><h2>A conversation with something to show.</h2></div>
          <p>Your assistant can work on real project data, not just describe what a room might look like. Try one of these starting points.</p>
          <div className="mcp-use-case-list">{USE_CASES.map(item => <article key={item.title}><item.icon size={20} /><div><h3>{item.title}</h3><p>{item.description}</p><CodeBlock title="Try this prompt" code={item.prompt} /></div></article>)}</div>
          <div className="mcp-note"><Layers3 size={19} /><p>Open the returned project link to review it in RoomSketch’s 2D and 3D editor. Save any browser edits before working with your assistant, and reload open tabs after MCP changes.</p></div>
        </section>

        <section id="tools" className="mcp-section"><div className="mcp-section-heading"><Code2 size={20} /><h2>The tools behind the conversation.</h2></div>
          <p>Your assistant discovers these tools when it connects. You don’t need to call them by hand.</p>
          <div className="mcp-table-scroll"><table><caption className="mcp-visually-hidden">RoomSketch MCP tools</caption><thead><tr><th scope="col">Tool</th><th scope="col">What it does</th></tr></thead><tbody>{TOOLS.map(([name, description]) => <tr key={name}><th scope="row"><code>{name}</code></th><td>{description}</td></tr>)}</tbody></table></div>
          <h3>What can be edited today?</h3><p>Rectangular rooms, doors and windows, built-in furniture placement, room materials, and new floors. Existing polygon geometry and other editor objects are preserved.</p>
          <p>Previews are schematic SVG files. Custom GLB upload and generation, automatic community publishing, advanced wall edits, and server-rendered 3D exports are not available through this MCP release.</p>
        </section>

        <section id="permissions" className="mcp-section"><div className="mcp-section-heading"><ShieldCheck size={20} /><h2>Free access. Clear boundaries.</h2></div>
          <div className="mcp-access-grid"><article><strong>Free + Pro</strong><p>No separate RoomSketch MCP subscription. Free includes one project; Pro follows its project allowance. Materials follow your plan.</p></article>
            <article><strong>Your account, your projects</strong><p>Read-only or read/edit access. Choose all your projects or restrict the connection to selected project IDs.</p></article>
            <article><strong>Expiry & revocation</strong><p>Tokens default to 30 days and can last up to 90. Revoke a connection from the same page where you created it.</p></article>
            <article><strong>Edits are checked</strong><p>Revision conflicts prevent stale canonical saves. Batch validation checks dimensions and opening bounds; it is not a building-code assessment.</p></article></div>
          <p className="mcp-small">The pilot allows 120 authenticated requests per minute per token and up to 100 operations in one batch. Your assistant’s provider controls its own pricing and tool approvals.</p>
        </section>

        <section id="troubleshooting" className="mcp-section"><div className="mcp-section-heading"><BookOpen size={20} /><h2>Get back to designing.</h2></div>
          <div className="mcp-faq">{[
            ['The server is unavailable or connections are disabled.', 'Check that you are using the deployed RoomSketch URL. If Connections says the integration is disabled, contact the deployment administrator; a token cannot enable a disabled server.'],
            ['My token is not being accepted.', 'Check that it has not expired or been revoked. Set ROOMSKETCH_MCP_TOKEN in the same environment that starts your assistant, then restart it. Create a replacement token if you no longer have the original.'],
            ['My assistant cannot create a project.', 'Check for read and edit access, an account-wide token, and an available project slot. Free has one project. Ask the assistant to inspect an existing project before deciding whether to edit it.'],
            ['The project changed in another session.', 'Ask your assistant to read the latest revision and replan its changes. Save browser work before using MCP; do not force an older design over a newer one.'],
            ['My browser does not show the latest edits.', 'Reload the saved project after MCP changes. Live synchronization with unsaved browser edits is not included in this release.'],
            ['I cannot find RoomSketch in a plugin marketplace.', 'The downloadable Claude Code template runs locally. A public RoomSketch marketplace listing has not been published. Use the documented direct connection or local plugin path.'],
          ].map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={16} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
        </section>
        <footer className="mcp-doc-footer"><div><strong>Ready to make it yours?</strong><p>Create a token and start with a read-only connection check.</p></div><Link className="mcp-button mcp-button-dark" href="/mcp">Open Connections</Link></footer>
      </main>
      <aside className="mcp-toc" aria-label="On this page"><span>ON THIS PAGE</span>{SECTIONS.slice(1).map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>{label}</a>)}<div><ShieldCheck size={16} /><p>Private by default.<br />Access you can revoke.</p></div></aside>
    </div>
  </>;
}
