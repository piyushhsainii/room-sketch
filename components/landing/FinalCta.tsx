import { isWaitlistMode } from "@/lib/flags";

export default function FinalCta() {
  return (
    <div className="px-6 md:px-10 pb-20 bg-paper">
      <div
        className="max-w-[1100px] mx-auto rounded-[16px] bg-ink relative overflow-hidden px-8 md:px-16 py-14 grid md:grid-cols-[1fr_auto] gap-12 items-center"
        style={{ backgroundColor: "#12213E" }}
      >
        {/* corner glow — single source of truth, blends into the ink panel */}
        <div
          className="absolute -top-24 -right-24 w-[420px] h-[420px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(91,127,214,0.28) 0%, rgba(91,127,214,0.12) 35%, transparent 70%)",
          }}
        />
        {/* faint secondary glow, lower-left, keeps the panel from reading as flat */}
        <div
          className="absolute -bottom-32 -left-16 w-[320px] h-[320px] pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(91,127,214,0.1) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10">
          <span className="font-mono text-[10px] font-medium text-white/40 uppercase tracking-[0.1em] block mb-3">
            {isWaitlistMode ? "Not yet public" : "No credit card required"}
          </span>
          <h2 className="font-display text-[1.9rem] md:text-[2.6rem] tracking-[-0.03em] text-white leading-[1.1] mb-3">
            {isWaitlistMode ? (
              <>Be first to walk your <em className="italic text-blue-dim">plan.</em></>
            ) : (
              <>Your first floor plan is <em className="italic text-blue-dim">free.</em></>
            )}
          </h2>
          <p className="text-[0.95rem] font-light text-white/55 leading-[1.75] max-w-[380px]">
            {isWaitlistMode
              ? "We're onboarding new users in small batches. Join the waitlist and we'll email you the moment you're in."
              : "Open the editor, draw a room, and walk through it in 3D in under two minutes."}
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-2.5">
          <a
            href={isWaitlistMode ? "#waitlist" : "/dashboard"}
            className="bg-blue text-white text-[14px] font-medium px-8 py-[13px] rounded-[8px] hover:opacity-85 transition-opacity text-center whitespace-nowrap"
          >
            {isWaitlistMode ? "Join waitlist →" : "Start sketching free →"}
          </a>
          {!isWaitlistMode && (
            <a
              href="#"
              className="bg-white/[0.06] text-white/70 border border-white/10 text-[13.5px] px-6 py-3 rounded-[8px] hover:bg-white/10 hover:text-white transition-colors text-center whitespace-nowrap"
            >
              See example projects
            </a>
          )}
          <span className="font-mono text-[10px] text-white/35 text-center tracking-[0.04em]">
            {isWaitlistMode ? "No spam · unsubscribe anytime" : "Free · no credit card · 1 project included"}
          </span>
        </div>
      </div>
    </div>
  );
}