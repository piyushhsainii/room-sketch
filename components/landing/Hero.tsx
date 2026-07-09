export default function Hero() {
  return (
    <section className="border-b border-line bg-paper">
      <div className="pt-[60px] max-w-[1240px] mx-auto px-6 md:px-10 grid lg:grid-cols-[0.92fr_1.08fr] gap-12 items-center min-h-screen">
        {/* Left */}
        <div className="pt-10 pb-14">
          <div className="inline-flex items-center gap-2 font-mono text-[10px] font-medium text-blue tracking-[0.08em] uppercase border border-blue-border bg-blue-soft rounded-[4px] px-[10px] py-[4px] mb-6">
            <span className="w-[5px] h-[5px] rounded-full bg-blue" />
            Sketch to walkable 3D
          </div>
          <h1 className="font-display text-[2.6rem] md:text-[3.6rem] leading-[1.04] tracking-[-0.02em] text-ink mb-5">
            Draw the plan.
            <br />
            Walk the <em className="italic">home</em>
            <br />
            before it's built.
          </h1>
          <p className="text-[1rem] font-light text-graphite max-w-[420px] mb-9 leading-[1.8] tracking-[-0.01em]">
            RenderAI turns a floor plan you sketch in the browser into a live,
            walkable 3D model — instantly. Your clients stop imagining the
            future home and start seeing it.
          </p>
          <div className="flex items-center gap-3 flex-wrap mb-8">
            <a href="/dashboard" className="bg-[#F2F0EA] text-black text-[14px] font-medium px-7 py-3 rounded-[7px] hover:opacity-85 transition-opacity">
              Start drawing free →
            </a>
            <a href="#how-it-works" className="border border-line-strong text-graphite text-[14px] px-[22px] py-[11px] rounded-[7px] hover:border-ink hover:text-ink transition-colors">
              See how it works
            </a>
          </div>
          <p className="font-mono text-[11.5px] text-muted tracking-[0.01em] mb-9">
            Free to try · <span className="text-blue">1 project included</span> · no credit card
          </p>

          <div className="flex items-center gap-5 pt-6 border-t border-line">
            <Stat num="90%" label="cheaper than a 3D studio" />
            <div className="w-px h-[26px] bg-line" />
            <Stat num="0" label="software to install" />
            <div className="w-px h-[26px] bg-line" />
            <Stat num="3" label="views — orbit, walk, top-down" />
          </div>
        </div>

        {/* Right — editor mockup */}
        <div className="pt-8 pb-14">
          <div className="rounded-[10px] overflow-hidden border border-line-strong shadow-sheetLg bg-[#0E0E10]">
            {/* title bar */}
            <div className="h-9 bg-[#17171A] border-b border-[#26262A] flex items-center px-3 gap-2">
              <span className="w-[9px] h-[9px] rounded-full bg-[#4A4A50]" />
              <span className="w-[9px] h-[9px] rounded-full bg-[#4A4A50]" />
              <span className="w-[9px] h-[9px] rounded-full bg-[#4A4A50]" />
              <span className="font-mono text-[10px] text-[#68686F] tracking-[0.05em] ml-2">
                FLOOR PLAN EDITOR — Level 01
              </span>
              <span className="ml-auto font-mono text-[9px] text-[#55555C]">Ceiling 2.7m</span>
            </div>

            <div className="grid grid-cols-[44px_1fr_1fr] h-[360px]">
              {/* toolbar */}
              <div className="bg-[#131315] border-r border-[#232326] flex flex-col items-center pt-3 gap-1">
                <ToolIcon active>
                  <rect x="2" y="2" width="9" height="9" stroke="#fff" strokeWidth="1.2" fill="none" />
                </ToolIcon>
                <ToolIcon>
                  <path d="M2 2l3.5 9 1.3-3.6L10 6 2 2z" stroke="#666" strokeWidth="1.1" fill="none" />
                </ToolIcon>
                <ToolIcon>
                  <line x1="2" y1="6.5" x2="11" y2="6.5" stroke="#666" strokeWidth="1.3" />
                </ToolIcon>
                <ToolIcon>
                  <path d="M3.5 10.5V2.5h5.5v8" stroke="#666" strokeWidth="1.1" fill="none" />
                </ToolIcon>
                <ToolIcon>
                  <rect x="2.5" y="4" width="7.5" height="4.5" stroke="#666" strokeWidth="1.1" fill="none" />
                  <line x1="6.25" y1="4" x2="6.25" y2="8.5" stroke="#666" strokeWidth="0.9" />
                </ToolIcon>
                <ToolIcon>
                  <path d="M3 3h6.5v4.5l-2 2H3V3z" stroke="#666" strokeWidth="1" fill="none" />
                </ToolIcon>
                <div className="mt-auto mb-3">
                  <ToolIcon>
                    <path d="M3 4h6M4 4V3h4v1M4 4v6h4V4" stroke="#555" strokeWidth="1" fill="none" />
                  </ToolIcon>
                </div>
              </div>

              {/* blueprint canvas */}
              <div className="relative bg-[#0E0E10] blueprint-grid border-r border-[#232326] overflow-hidden">
                <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full">
                  {/* outer envelope */}
                  <rect x="26" y="30" width="248" height="240" fill="none" stroke="#5B7FD6" strokeWidth="1.5" />
                  {/* room divisions */}
                  <line x1="150" y1="30" x2="150" y2="150" stroke="#3E4A66" strokeWidth="1" />
                  <line x1="150" y1="150" x2="274" y2="150" stroke="#3E4A66" strokeWidth="1" />
                  <line x1="26" y1="190" x2="150" y2="190" stroke="#3E4A66" strokeWidth="1" />
                  <line x1="100" y1="190" x2="100" y2="270" stroke="#3E4A66" strokeWidth="1" />

                  {/* labels */}
                  <text x="36" y="46" fill="#6E86C9" fontSize="7" fontFamily="var(--font-mono)" letterSpacing="0.5">LIVING</text>
                  <text x="158" y="46" fill="#6E86C9" fontSize="7" fontFamily="var(--font-mono)" letterSpacing="0.5">KITCHEN</text>
                  <text x="158" y="166" fill="#6E86C9" fontSize="7" fontFamily="var(--font-mono)" letterSpacing="0.5">BEDROOM</text>
                  <text x="34" y="206" fill="#6E86C9" fontSize="6.5" fontFamily="var(--font-mono)" letterSpacing="0.5">STAIRS</text>
                  <text x="108" y="206" fill="#6E86C9" fontSize="6.5" fontFamily="var(--font-mono)" letterSpacing="0.5">LIFT</text>

                  {/* sofa */}
                  <rect x="36" y="60" width="42" height="16" rx="2" fill="none" stroke="#4A5A82" strokeWidth="1" />
                  <rect x="36" y="60" width="42" height="6" rx="2" fill="none" stroke="#4A5A82" strokeWidth="0.8" />

                  {/* stair treads */}
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <line key={i} x1="34" y1={214 + i * 7} x2="92" y2={214 + i * 7} stroke="#3E4A66" strokeWidth="0.8" />
                  ))}
                  <path d="M34 214 L34 260 M92 214 L92 260" stroke="#3E4A66" strokeWidth="0.8" />

                  {/* elevator (X box) */}
                  <rect x="108" y="200" width="34" height="60" fill="none" stroke="#3E4A66" strokeWidth="1" />
                  <line x1="108" y1="200" x2="142" y2="260" stroke="#3E4A66" strokeWidth="0.6" />
                  <line x1="142" y1="200" x2="108" y2="260" stroke="#3E4A66" strokeWidth="0.6" />

                  {/* spiral stair (concentric arcs) */}
                  <g transform="translate(212,232)">
                    <circle r="26" fill="none" stroke="#3E4A66" strokeWidth="0.8" />
                    <circle r="18" fill="none" stroke="#3E4A66" strokeWidth="0.8" />
                    <circle r="10" fill="none" stroke="#3E4A66" strokeWidth="0.8" />
                    <line x1="0" y1="0" x2="0" y2="-26" stroke="#3E4A66" strokeWidth="0.8" />
                    <line x1="0" y1="0" x2="22" y2="14" stroke="#3E4A66" strokeWidth="0.8" />
                  </g>
                  <text x="192" y="266" fill="#6E86C9" fontSize="6.5" fontFamily="var(--font-mono)" letterSpacing="0.5">SPIRAL</text>

                  {/* corner nodes */}
                  {[[26, 30], [150, 30], [274, 30], [26, 270], [274, 150]].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="3" fill="#2A56C6" stroke="#fff" strokeWidth="1" />
                  ))}

                  {/* dimension line */}
                  <line x1="26" y1="20" x2="274" y2="20" stroke="#555" strokeWidth="0.6" />
                  <text x="130" y="16" fill="#555" fontSize="6" fontFamily="var(--font-mono)">9.4 m</text>

                  {/* cursor */}
                  <circle cx="105" cy="200" r="4" fill="#fff" stroke="#2A56C6" strokeWidth="1.5" />
                </svg>
              </div>

              {/* 3D preview */}
              <div className="relative bg-[#131315] overflow-hidden">
                <span className="absolute top-[10px] left-3 font-mono text-[9px] text-white/35 tracking-[0.08em] uppercase z-10">
                  3D preview
                </span>
                <span className="absolute top-[10px] right-3 font-mono text-[9px] text-blue-dim tracking-[0.04em] border border-blue/30 bg-blue/10 rounded-full px-2 py-[2px] z-10">
                  Walk mode
                </span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <IsoBuilding />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-7 bg-black/30 backdrop-blur-sm border-t border-white/5 flex items-center px-3 gap-2">
                  <span className="w-[5px] h-[5px] rounded-full bg-[#5FBF7A]" style={{ animation: "blink 1.6s step-end infinite" }} />
                  <span className="font-mono text-[8px] text-white/35">live sync</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 font-mono text-[11.5px] text-muted">
            <span className="w-[5px] h-[5px] rounded-full bg-[#5FBF7A]" />
            3D updates the instant you draw
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[17px] font-medium text-ink tracking-[-0.03em] leading-none">{num}</span>
      <span className="text-[11px] font-light text-muted leading-tight max-w-[110px]">{label}</span>
    </div>
  );
}

function ToolIcon({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div className={`w-[32px] h-[32px] rounded-[6px] flex items-center justify-center ${active ? "bg-blue" : ""}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        {children}
      </svg>
    </div>
  );
}

function IsoBuilding() {
  return (
    <div
      className="relative"
      style={{
        width: 210,
        height: 150,
        transform: "perspective(340px) rotateX(27deg) rotateZ(-9deg) scale(0.92)",
      }}
    >
      {/* floor slab */}
      <div className="absolute inset-0" style={{ background: "#B7AE9C", boxShadow: "8px 8px 0 #8A8270" }} />
      {/* back wall */}
      <div className="absolute left-0 right-0" style={{ top: -74, height: 78, background: "#D9D4C6" }} />
      {/* right wall */}
      <div
        className="absolute"
        style={{ top: -74, right: -46, width: 48, height: 78, background: "#C9C4B6", transformOrigin: "left", transform: "skewY(-28deg)" }}
      />
      {/* window */}
      <div
        className="absolute"
        style={{ top: -50, left: 30, width: 42, height: 32, background: "rgba(122,164,214,0.28)", border: "1.5px solid rgba(255,255,255,0.5)" }}
      />
      {/* stair block */}
      <div className="absolute" style={{ bottom: 10, right: 16, width: 34, height: 40 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute bg-[#8F8672]"
            style={{ bottom: i * 7, left: 0, width: 34 - i * 4, height: 6, boxShadow: "2px 2px 0 #6E6656" }}
          />
        ))}
      </div>
      {/* sofa */}
      <div className="absolute" style={{ bottom: 16, left: 16, width: 66, height: 26, background: "#5B6A8F", borderRadius: "3px 3px 0 0" }} />
      <div className="absolute" style={{ bottom: 24, left: 16, width: 66, height: 12, background: "#6C7BA0", borderRadius: 3 }} />
      {/* elevator shaft accent */}
      <div className="absolute" style={{ top: -56, right: 4, width: 14, height: 60, background: "rgba(42,86,198,0.16)", border: "1px solid rgba(42,86,198,0.4)" }} />
    </div>
  );
}
