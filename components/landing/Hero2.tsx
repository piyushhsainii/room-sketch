import { isWaitlistMode } from "@/lib/flags";
import WaitlistForm from "./Waitlistform";

export default function Hero2() {
    return (
        <div className="w-full" style={{ background: "#E5E5E5", fontFamily: "'Quicksand','Nunito',sans-serif" }}>
            <section className="relative overflow-hidden max-w-[2000px] mx-auto">
                <div className="relative z-10 pt-[110px] pb-0 max-w-[1000px] mx-auto px-6 md:px-10 flex flex-col items-center text-center">
                    <h1
                        className="text-[3rem] md:text-[4.4rem] leading-[0.95] tracking-[-0.03em] mb-7"
                        style={{ color: "#1A1A1A", fontWeight: 500 }}
                    >
                        draw the plan.
                        <br />
                        walk the home <br />
                        before it&apos;s built.
                    </h1>

                    <p
                        className="text-[1.15rem] md:text-[1.3rem] font-normal max-w-[600px] mb-9 leading-[1.5] tracking-[-0.01em] text-pretty text-center"
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
                                    color: "#556",
                                    background:
                                        "linear-gradient(135deg, rgba(163,224,193,0.28), rgba(168,178,230,0.28)), #EAEAEA",
                                    boxShadow: "-4px -4px 10px rgba(255,255,255,0.7), 4px 4px 12px rgba(0,0,0,0.10)",
                                }}
                            >
                                <span className="w-[5px] h-[5px] rounded-full" style={{ background: "#7B8FD9" }} />
                                Coming soon — not yet public
                            </div>
                            <div
                                className="max-w-[420px] w-full mb-4 p-2 rounded-full"
                                style={{
                                    background: "#EAEAEA",
                                    boxShadow: "inset -3px -3px 7px rgba(255,255,255,0.6), inset 3px 3px 8px rgba(0,0,0,0.10)",
                                }}
                            >
                                <WaitlistForm />
                            </div>
                            <p className="text-[11.5px] tracking-[0.01em] mb-9" style={{ color: "#999" }}>
                                No spam · one email when we launch
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
                                <a
                                    href="/dashboard"
                                    className="group inline-flex items-center gap-2 text-[14px] font-normal tracking-[-0.01em] px-8 py-[13px] rounded-full transition-shadow"
                                    style={{
                                        color: "#1A1A1A",
                                        background: "#F5F5F5",
                                        boxShadow: "-5px -5px 10px rgba(255,255,255,0.8), 5px 5px 14px rgba(0,0,0,0.14)",
                                    }}
                                >
                                    Start sketching free
                                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                                </a>
                                <a
                                    href="#how-it-works"
                                    className="text-[14px] tracking-[-0.01em] font-normal px-[24px] py-[13px] rounded-full transition-shadow"
                                    style={{
                                        color: "#444",
                                        background: "#EAEAEA",
                                        boxShadow: "-4px -4px 8px rgba(255,255,255,0.7), 4px 4px 10px rgba(0,0,0,0.10)",
                                    }}
                                >
                                    See how it works
                                </a>
                            </div>
                            <p className="font-light text-[14px] tracking-[-0.01em] mb-9" style={{ color: "#888" }}>
                                Free to try · <span style={{ color: "#7B8FD9" }}>no credit card</span> · 1 project included
                            </p>
                        </>
                    )}
                </div>

                {/* Image banner — plain floating illustration, no wrapper chrome */}
                <img
                    src="/hero-image-banner3.png"
                    alt="RoomSketch floor plan and 3D model preview"
                    className="relative z-0 w-full h-auto block -mt-24 md:-mt-32"
                />
            </section>
        </div>
    );
}