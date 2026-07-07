export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[200] h-[60px] flex items-center justify-between px-6 md:px-10 bg-paper/95 backdrop-blur-md border-b border-line">
      <div className="flex items-center gap-2 font-display text-[19px] tracking-tight text-ink">
        <span className="w-[22px] h-[22px] rounded-[4px] bg-blue flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L6 3.5V10L1 8.2V1Z" stroke="white" strokeWidth="1" fill="none" />
            <path d="M6 3.5L11 1V8.2L6 10V3.5Z" stroke="white" strokeWidth="1" fill="none" />
          </svg>
        </span>
        RenderAI
      </div>
      <div className="hidden md:flex items-center gap-8">
        <a href="#how-it-works" className="text-[13.5px] text-graphite hover:text-ink transition-colors">How it works</a>
        <a href="#capabilities" className="text-[13.5px] text-graphite hover:text-ink transition-colors">Capabilities</a>
        <a href="#pricing" className="text-[13.5px] text-graphite hover:text-ink transition-colors">Pricing</a>
      </div>
      <button className="bg-blue text-white text-[13.5px] font-medium px-[18px] py-2 rounded-[6px] hover:opacity-85 transition-opacity">
        Try free →
      </button>
    </nav>
  );
}
