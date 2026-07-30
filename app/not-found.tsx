"use client";

import { useEffect } from "react";

/**
 * Special Next.js file: save this as app/not-found.tsx to have it render
 * automatically for unmatched routes and notFound() calls.
 */

export default function NotFound() {
    useEffect(() => {
        function handleMouseMove(e: MouseEvent) {
            const lines = document.querySelectorAll<HTMLElement>(".blueprint-line");
            const x = e.clientX / window.innerWidth - 0.5;
            const y = e.clientY / window.innerHeight - 0.5;

            lines.forEach((line, index) => {
                const depth = (index + 1) * 10;
                (line as HTMLElement).style.transform = `translate(${x * depth}px, ${y * depth}px)`;
            });
        }
        document.addEventListener("mousemove", handleMouseMove);
        return () => document.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-paper text-ink">
            {/* Nav — matches site header */}
            <nav className="fixed top-0 left-0 right-0 z-[200] h-[60px] flex items-center justify-between px-6 md:px-10 bg-paper/95 backdrop-blur-md border-b border-line">
                <a href="/" className="flex items-center gap-2 font-display text-[19px] tracking-tight text-ink">
                    <img src="/room-sketch-logo.jpg" alt="" className="w-14 h-14 select-none" />
                    <img src="/room-sketch-text.jpg" alt="" className="w-28 select-none" />
                </a>
                <div className="hidden md:flex items-center gap-8">
                    <a href="/#how-it-works" className="text-[13.5px] text-graphite hover:text-ink transition-colors">How it works</a>
                    <a href="/#capabilities" className="text-[13.5px] text-graphite hover:text-ink transition-colors">Capabilities</a>
                    <a href="/#pricing" className="text-[13.5px] text-graphite hover:text-ink transition-colors">Pricing</a>
                </div>
                <div />
            </nav>

            {/* Main */}
            <main className="flex-grow flex items-center justify-center relative overflow-hidden pt-16 min-h-screen">
                {/* Blueprint grid background */}
                <div
                    className="absolute inset-0 opacity-60 z-0"
                    style={{
                        backgroundSize: "40px 40px",
                        backgroundImage: `
              linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(15,23,42,0.05) 1px, transparent 1px)
            `,
                    }}
                />

                {/* Blueprint crosshair lines + annotations */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="blueprint-line absolute w-px h-full left-1/4 bg-line-strong opacity-40" />
                    <div className="blueprint-line absolute w-px h-full left-3/4 bg-line-strong opacity-40" />
                    <div className="blueprint-line absolute h-px w-full top-1/3 bg-line-strong opacity-40" />
                    <div className="blueprint-line absolute h-px w-full top-2/3 bg-line-strong opacity-40" />

                    <div className="absolute top-1/4 left-6 md:left-16 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
                        SEC_A-A [VOID]
                    </div>
                    <div className="absolute bottom-1/4 right-6 md:right-16 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
                        SCALE 1:404
                    </div>
                    <div className="absolute top-1/2 left-[10%] rotate-90 origin-left font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
                        NULL_REFERENCE_PLAN
                    </div>
                </div>

                {/* 404 content */}
                <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 font-mono text-[10px] font-medium text-blue tracking-[0.08em] uppercase border border-blue-border bg-blue-soft rounded-[4px] px-[10px] py-[4px] mb-6">
                        <span className="w-[5px] h-[5px] rounded-full bg-blue" />
                        Spatial anomaly detected
                    </div>

                    <h1 className="font-display text-[2.6rem] md:text-[3.6rem] leading-[1.04] tracking-[-0.02em] text-ink mb-5">
                        This wing isn&apos;t
                        <br />
                        on the <em className="italic">plan</em>.
                    </h1>

                    <p className="text-[1rem] font-light text-graphite max-w-[420px] mx-auto mb-9 leading-[1.8] tracking-[-0.01em]">
                        The page you&apos;re looking for hasn&apos;t been built yet, or the coordinates you followed don&apos;t exist in this project.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-9">
                        <a
                            href="/"
                            className="group inline-flex items-center gap-2 bg-ink text-white text-[14px] font-medium px-7 py-3 rounded-[7px] hover:bg-[#0E0E10] transition-colors"
                            style={{ backgroundColor: "#12213E" }}
                        >
                            Return home
                            <span className="transition-transform group-hover:translate-x-0.5">→</span>
                        </a>
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="border border-line-strong text-graphite text-[14px] px-[22px] py-[11px] rounded-[7px] hover:border-ink hover:text-ink transition-colors"
                        >
                            Go back
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-5 pt-6 border-t border-line">
                        <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
                            Status: Unresolved
                        </span>
                        <div className="w-px h-[14px] bg-line" />
                        <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
                            Error 404
                        </span>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-line bg-paper">
                <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 md:px-16 py-8 mx-auto max-w-[1280px]">
                    <div className="flex items-center gap-2 mb-6 md:mb-0">
                        <img src="/room-sketch-logo.jpg" alt="" className="w-8 h-8 select-none" />
                        <span className="font-mono text-[11.5px] text-muted tracking-[0.01em]">
                            © 2026 RoomSketch. All rights reserved.
                        </span>
                    </div>
                    <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                        {["Privacy Policy", "Terms of Service", "Help Center", "Contact"].map((label) => (
                            <a key={label} href="#" className="font-mono text-[11px] text-muted tracking-[0.01em] hover:text-ink transition-colors">
                                {label}
                            </a>
                        ))}
                    </nav>
                </div>
            </footer>
        </div>
    );
}