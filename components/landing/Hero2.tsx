import { isWaitlistMode } from "@/lib/flags";
import WaitlistForm from "./Waitlistform";
import StartSketchingCta from "./StartSketchingCta";

export default function Hero2() {
    return (
        <div className="w-full">
            <section className="relative px-4 pb-4 sm:px-8">
                <div className="mx-auto flex max-w-[1000px] flex-col items-center px-2 pt-[clamp(6rem,12svh,7.5rem)] text-center">
                    <h1
                        className="mb-5 text-[clamp(2.3rem,7.5vw,3rem)] leading-[1.02] md:text-[clamp(3rem,7svh,4.4rem)]"
                        style={{ color: "#1A1A1A", fontWeight: 500 }}
                    >
                        draw the plan.
                        <br />
                        walk the home <br />
                        before it&apos;s built.
                    </h1>

                    <p
                        className="mb-6 max-w-[660px] text-pretty text-base leading-relaxed md:text-[1.15rem]"
                        style={{ color: "#555" }}
                    >
                        RoomSketch turns a floor plan you sketch in the browser into a
                        live, walkable 3D model instantly. Draw walls, place furniture
                        and lighting, then walk through the result before anything is
                        built.
                    </p>

                    {isWaitlistMode ? (
                        <>
                            <div
                                className="inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.08em] uppercase rounded-full px-[14px] py-[6px] mb-5"
                                style={{
                                    color: "var(--landing-muted)",
                                    background: "var(--landing-paper)",
                                    boxShadow: "-4px -4px 10px rgba(255,255,255,0.7), 4px 4px 12px rgba(0,0,0,0.10)",
                                }}
                            >
                                <span className="w-[5px] h-[5px] rounded-full" style={{ background: "var(--landing-muted)" }} />
                                Coming soon — not yet public
                            </div>
                            <div
                                id="waitlist" className="max-w-[420px] w-full mb-4 p-2 rounded-full"
                                style={{
                                    background: "var(--landing-paper)",
                                    boxShadow: "inset -3px -3px 7px rgba(255,255,255,0.6), inset 3px 3px 8px rgba(0,0,0,0.10)",
                                }}
                            >
                                <WaitlistForm />
                            </div>
                            <p className="mb-5 text-[11.5px] tracking-[0.01em]" style={{ color: "var(--landing-muted)" }}>
                                No spam · one email when we launch
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
                                <StartSketchingCta />
                                <a
                                    href="#how-it-works"
                                    className="text-[14px] tracking-[-0.01em] font-normal px-[24px] py-[13px] rounded-full transition-shadow"
                                    style={{
                                        color: "#444",
                                        background: "var(--landing-paper)",
                                        boxShadow: "-4px -4px 8px rgba(255,255,255,0.7), 4px 4px 10px rgba(0,0,0,0.10)",
                                    }}
                                >
                                    See how it works
                                </a>
                            </div>
                            <p className="mb-5 text-[14px] font-light tracking-[-0.01em]" style={{ color: "var(--landing-muted)" }}>
                                Free to try · <span style={{ color: "var(--landing-muted)" }}>no credit card</span> · 1 project included
                            </p>
                        </>
                    )}
                </div>

                {/* Pre-encoded variants keep the hero off the on-demand image optimizer. */}
                <img
                    src="/hero-floorplan-1440.webp"
                    srcSet="/hero-floorplan-480.webp 480w, /hero-floorplan-960.webp 960w, /hero-floorplan-1440.webp 1440w, /hero-floorplan-2172.webp 2172w"
                    sizes="(min-width: 640px) min(calc(100vw - 64px), 1152px, 96svh), min(calc(100vw - 32px), 96svh)"
                    width={2172}
                    height={724}
                    fetchPriority="high"
                    alt="An apartment floor plan being drawn on the left and the furnished isometric 3D model on the right"
                    className="hero-illustration mx-auto block h-auto"
                />
            </section>
        </div>
    );
}
