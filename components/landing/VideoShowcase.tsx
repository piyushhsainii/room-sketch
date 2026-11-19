"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoShowcase() {
    const frameRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        const frame = frameRef.current;
        const video = videoRef.current;
        if (!frame || !video) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let inFocus = false;
        let autoplay = false;

        const syncPlayback = () => {
            const shouldPlay = inFocus && !reducedMotion.matches && !document.hidden;
            if (autoplay === shouldPlay) return;

            autoplay = shouldPlay;
            if (shouldPlay) {
                void video.play().catch(() => {
                    // Native controls remain available if the browser blocks autoplay.
                });
            } else {
                video.pause();
            }
        };

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !video.hasAttribute("poster")) {
                video.poster = "/walk-mode-poster.webp";
            }

            // Use separate thresholds so small scrolls near the edge do not toggle playback.
            inFocus = entry.isIntersecting && entry.intersectionRatio >= (inFocus ? 0.45 : 0.75);
            setFocused(inFocus);
            syncPlayback();
        }, {
            rootMargin: "-96px 0px -16px",
            threshold: [0, 0.45, 0.75],
        });

        observer.observe(frame);
        document.addEventListener("visibilitychange", syncPlayback);
        reducedMotion.addEventListener("change", syncPlayback);
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", syncPlayback);
            reducedMotion.removeEventListener("change", syncPlayback);
            video.pause();
        };
    }, []);

    return (
        <section id="walk-mode" className="px-4 py-12 sm:px-8 md:py-16">
            <div className="mx-auto mb-6 max-w-[1000px] text-center">
                <p className="mb-3 text-[11px] font-medium tracking-[0.08em] text-neutral-600 uppercase">
                    Walk Mode
                </p>
                <h2 className="text-[2.4rem] leading-[1.05] tracking-tight text-neutral-950 md:text-[3.2rem]">
                    See it before it&apos;s built
                </h2>
            </div>

            <div>
                <div className="walk-video-sticky">
                    <div ref={frameRef} className="walk-video-frame">
                        <div
                            className="walk-video-panel h-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950"
                            data-focused={focused}
                        >
                            <video
                                ref={videoRef}
                                className="block h-full w-full object-contain"
                                src="/initial-hero-video.mp4"
                                muted
                                loop
                                playsInline
                                controls
                                preload="none"
                                aria-label="RoomSketch walk mode — walking through a finished 3D model"
                            />
                        </div>
                    </div>
                </div>
                <div className="walk-video-runway" aria-hidden="true" />
            </div>
        </section>
    );
}
