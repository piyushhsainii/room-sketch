import { isWaitlistMode } from "@/lib/flags";

export default function FinalCta() {
  return (
    <section id="get-started" className="landing-grid px-6 py-16 md:px-10 md:py-20">
      <div className="landing-card mx-auto grid max-w-[1100px] gap-8 rounded-3xl p-7 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="mb-3 text-3xl font-semibold leading-tight md:text-[2.6rem]">
            {isWaitlistMode ? "Be first to walk your plan." : "Your first floor plan is free."}
          </h2>
          <p className="landing-description max-w-[48ch]">
            {isWaitlistMode
              ? "We're onboarding new users in small batches. Join the waitlist and we'll email you the moment you're in."
              : "Open the editor, draw a room, and walk through it in 3D. Your first project is included and you don't need a credit card."}
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <a
            href={isWaitlistMode ? "#waitlist" : "/dashboard"}
            className="rounded-full bg-neutral-950 px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            {isWaitlistMode ? "Join the waitlist →" : "Start sketching free →"}
          </a>
          {!isWaitlistMode && (
            <a
              href="/community"
              className="landing-chip rounded-full px-6 py-3 text-center text-sm font-medium transition-colors hover:bg-neutral-200"
            >
              See example projects
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
