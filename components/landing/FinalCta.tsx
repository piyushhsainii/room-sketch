export default function FinalCta() {
  return (
    <div className="px-6 md:px-10 pb-20 bg-paper">
      <div className="reveal max-w-[1100px] mx-auto rounded-[16px] bg-ink relative overflow-hidden px-8 md:px-16 py-14 grid md:grid-cols-[1fr_auto] gap-12 items-center">
        {/* the one allowed gradient in the whole page */}
        <div
          className="absolute -top-16 bg-black -right-16 w-[300px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(42,86,198,0.2) 0%, transparent 70%)" }}
        />
        <div className="relative z-10">
          <span className="font-mono text-[10px] font-medium /30 uppercase tracking-[0.1em] block mb-3">
            No credit card required
          </span>
          <h2 className="font-display text-[1.9rem] md:text-[2.6rem] tracking-[-0.03em]  leading-[1.1] mb-3">
            Your first floor plan is <em className="italic text-blue-dim">free.</em>
          </h2>
          <p className="text-[0.95rem] font-light /40 leading-[1.75] max-w-[380px]">
            Open the editor, draw a room, and walk through it in 3D in under two minutes.
          </p>
        </div>
        <div className="relative z-10 flex flex-col gap-2.5">
          <a href="#" className="bg-blue  text-[14px] font-medium px-8 py-[13px] rounded-[8px] hover:opacity-85 transition-opacity text-center whitespace-nowrap">
            Open the editor →
          </a>
          <a href="#" className="bg-white/[0.06] /55 border border-white/10 text-[13.5px] px-6 py-3 rounded-[8px] hover:bg-white/10 hover:/80 transition-colors text-center whitespace-nowrap">
            See example projects
          </a>
          <span className="font-mono text-[10px] /20 text-center tracking-[0.04em]">Free · 1 project · No card</span>
        </div>
      </div>
    </div>
  );
}
