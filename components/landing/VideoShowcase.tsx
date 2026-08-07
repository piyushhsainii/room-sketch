"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoShowcase() {
    const sectionRef = useRef<HTMLElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [focus, setFocus] = useState(0); // 0 = unfocused, 1 = fully focused

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;

        const handleScroll = () => {
            const rect = section.getBoundingClientRect();
            const vh = window.innerHeight;

            const sectionCenter = rect.top + rect.height / 2;
            const viewportCenter = vh / 2;
            const distance = Math.abs(sectionCenter - viewportCenter);
            const maxDistance = vh / 2 + rect.height / 2;

            const proximity = 1 - Math.min(distance / maxDistance, 1);

            // Stiffen the curve: hold near-full focus across the middle of the
            // scroll range and only fall off sharply near the edges, instead of
            // a soft linear fade the whole way.
            const stiff = proximity < 0.6 ? proximity / 0.6 * 0.15 : 0.15 + ((proximity - 0.6) / 0.4) * 0.85;

            setFocus(Math.max(0, Math.min(1, stiff)));
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
        };
    }, []);

    // Play/pause based on visibility so it's not burning cycles off-screen.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (focus > 0.35) {
            video.play().catch(() => { });
        } else {
            video.pause();
        }
    }, [focus]);

    const scale = 0.94 + focus * 0.06; // 0.94 -> 1.0
    const blur = (1 - focus) * 6; // up to 6px blur when unfocused
    const opacity = 0.6 + focus * 0.4; // 0.6 -> 1
    const dim = 0.55 + focus * 0.45; // 0.55 -> 1.0 brightness, never fully dark

    return (
        <section
            ref={sectionRef}
            className="relative bg-white py-16 md:py-20"
        >
            <div className="max-w-[1000px] mx-auto px-6 md:px-10 text-center mb-8">
                <p className="font-mono text-[10px] font-medium text-blue tracking-[0.08em] uppercase mb-3">
                    Walk Mode
                </p>
                <h2 className="font-sans text-[2.4rem] md:text-[3.2rem] leading-[1.05] tracking-[-0.02em] text-ink">
                    See it before it&apos;s built
                </h2>
            </div>

            <div className="sticky top-[8vh] h-[84vh] flex items-center justify-center px-6">
                <div
                    className="relative w-full max-w-[1100px] aspect-[16/9] rounded-[16px] overflow-hidden border border-line-strong shadow-sheetLg bg-[#0E0E10]"
                    style={{
                        transform: `scale(${scale})`,
                        filter: `blur(${blur}px) brightness(${dim})`,
                        opacity,
                        transition: "transform 0.05s linear, filter 0.05s linear, opacity 0.05s linear",
                    }}
                >
                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover"
                        src="/initial-hero-video.mp4"
                        muted
                        loop
                        playsInline
                        preload="auto"
                        aria-label="RoomSketch walk mode — walking through a finished 3D model"
                    />
                </div>
            </div>

            {/* Small scroll runway so the sticky video has a little room to focus/unfocus */}
            <div className="h-[20vh]" aria-hidden="true" />
        </section>
    );
}