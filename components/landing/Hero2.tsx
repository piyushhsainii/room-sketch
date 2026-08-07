import { isWaitlistMode } from "@/lib/flags";
import WaitlistForm from "./Waitlistform";

export default function Hero2() {
    return (
        <div className="bg-[#FBF6EC] w-full">

            <section className="relative  overflow-hidden bg-[#FBF6EC] max-w-[2000px] mx-auto">
                <div className="relative z-10 pt-[110px] pb-0 max-w-[1000px] mx-auto px-6 md:px-10 flex flex-col items-center text-center">
                    <h1 className="font-sans text-[3rem] md:text-[4.4rem] leading-[0.9] tracking-tighter text-ink mb-7">
                        draw the plan.
                        <br />
                        walk the home <br />
                        before it&apos;s built.
                    </h1>

                    <p className="text-[1.3rem] font-normal font-sans text-black font-sans max-w-[600px] mb-9 leading-[1.3] tracking-tighter text-pretty text-center">
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
                            <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
                                <a
                                    href="/dashboard"
                                    className="group inline-flex items-center gap-2 bg-blue-950 font-sans text-white text-[14px] font-normal tracking-tight px-7 py-3 rounded-full hover:opacity-90 transition-opacity"
                                >
                                    Start sketching free
                                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                                </a>
                                <a
                                    href="#how-it-works"
                                    className="text-black text-[14px] font-sans tracking-tight font-normal bg-white px-[22px] py-[11px] rounded-full transition-colors hover:bg-[#fafafa]"
                                >
                                    See how it works
                                </a>
                            </div>
                            <p className="font-sans font-light text-[14px] text-black/50 tracking-tighter mb-9">
                                Free to try · <span className="text-blue">no credit card</span> · 1 project included
                            </p>
                        </>
                    )}
                </div>

                {/* Image banner — pulled up so it overlaps the hero content and reads as merged */}
                <div className="relative z-0 w-full -mt-40 md:-mt-56 max-h-[900px]">
                    <svg viewBox="0 0 1440 560" className="w-full h-auto block">
                        <defs>
                            <clipPath id="heroImageArc" clipPathUnits="objectBoundingBox">
                                <path d="M0,0.08 C0.3,0 0.7,0 1,0.08 L1,1 L0,1 Z" />
                            </clipPath>
                        </defs>
                        <image
                            href="/hero-image-banner.png"
                            width="1440"
                            height="560"
                            preserveAspectRatio="xMidYMid slice"
                            clipPath="url(#heroImageArc)"
                        />
                    </svg>
                </div>
            </section>
        </div>

    );
}