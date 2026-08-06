import { isWaitlistMode } from "@/lib/flags";
import WaitlistForm from "./Waitlistform";
import DotGrid from "./DotGrid";

export default function Hero() {
  return (
    <section className="relative border-b border-line  overflow-hidden">
      {/* <DotGrid /> */}
      <div className="relative z-10 pt-[60px] max-w-[1240px] mx-auto px-6 md:px-10 grid lg:grid-cols-[0.92fr_1.08fr] gap-12 items-center min-h-screen">
        {/* Left */}
        <div className="pt-10 pb-14">

          <h1 className=" text-[2.6rem] font-sans md:text-[3.6rem] leading-[1.04] tracking-[-0.02em] text-ink mb-5">
            draw the plan. <br></br>
            walk the home
            before it&apos;s built.
          </h1>
          <p className="text-[1.1rem] font-normal text-black max-w-[420px] mb-9 leading-[1.] tracking-tight ">
            RoomSketch turns a floor plan you sketch in the browser into a
            live, walkable 3D model — instantly. Draw walls, place furniture
            and lighting, then walk through the result before anything is
            built.
          </p>
          {isWaitlistMode ? (
            <>
              <div className="inline-flex items-center gap-2 font-mono text-[10px] font-medium text-blue tracking-[0.08em] uppercase border border-blue-border bg-blue-soft rounded-[4px] px-[10px] py-[4px] mb-4">
                <span className="w-[5px] h-[5px] rounded-full bg-blue" />
                Coming soon — not yet public
              </div>
              <div className="max-w-[420px] mb-4">
                <WaitlistForm />
              </div>
              <p className="font-mono text-[11.5px] text-muted tracking-[0.01em] mb-9">
                No spam · one email when we launch
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap mb-8">
                <a
                  href="/dashboard"
                  className="group inline-flex items-center gap-2 bg-ink text-white text-[14px] font-normal tracking-tight px-7 py-3 rounded-full hover:bg-[#0E0E10] transition-colors"
                  style={{ backgroundColor: "#12213E" }}
                >
                  Start sketching free
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </a>
                <a href="#how-it-works" className="border border-line-strong text-black text-[14px] tracking-tight font-normal bg-[#fafafa] px-[22px] py-[11px] rounded-full transition-colors">
                  See how it works
                </a>
              </div>
              <p className="font-sans font-light text-[12.5px] text-black tracking-[0.01em] mb-9">
                Free to try · <span className="text-blue">no credit card</span> · 1 project included
              </p>
            </>
          )}

          <div className="flex items-center gap-5 pt-6 border-t border-line">
            <Stat num="60+" label="materials across walls, floors & furniture" />
            <div className="w-px h-[26px] bg-line" />
            <Stat num="4" label="lighting types — wall, strip, ceiling, string" />
            <div className="w-px h-[26px] bg-line" />
            <Stat num="0" label="software to install" />
          </div>
        </div>

        {/* Right — real product recording, full bleed, no fake chrome around it */}
        <div className="pt-8 pb-14">
          <div className="relative aspect-[16/10] rounded-[10px] overflow-hidden border border-line-strong shadow-sheetLg bg-[#0E0E10]">
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src="/initial-hero-video.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label="RoomSketch walkthrough — sketching a floor plan and previewing it live in 3D"
            />
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