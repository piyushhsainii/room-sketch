"use client";

import { useEffect, useRef } from "react";

/**
 * Fonts required: Hanken Grotesk, Inter, Geist, Material Symbols Outlined.
 * Add these to your root layout (e.g. via next/font or a <link> tag in <head>):
 *
 * https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@100..900&family=Inter:wght@100..900&family=Geist:wght@100..900&display=swap
 * https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap
 */

const COLORS = {
    primary: "#00030c",
    primaryContainer: "#101d33",
    primaryFixed: "#d7e3ff",
    onPrimary: "#ffffff",
    secondary: "#006c47",
    secondaryFixedDim: "#60dda2",
    surface: "#f8f9ff",
    background: "#f8f9ff",
    onSurfaceVariant: "#45474d",
    onBackground: "#0b1c30",
    outline: "#75777e",
    outlineVariant: "#c5c6cd",
    surfaceContainerHigh: "#dce9ff",
};

export default function BlueprintLoadingScreen() {
    const trackerRef = useRef<HTMLDivElement>(null);
    const coordsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let coordTimeout: ReturnType<typeof setTimeout>;

        function handleMouseMove(e: MouseEvent) {
            const tracker = trackerRef.current;
            const coords = coordsRef.current;
            if (!tracker || !coords) return;

            tracker.style.left = `${e.clientX}px`;
            tracker.style.top = `${e.clientY}px`;
            coords.textContent = `${Math.round(e.clientX)}, ${Math.round(e.clientY)}`;
            coords.style.opacity = "1";

            clearTimeout(coordTimeout);
            coordTimeout = setTimeout(() => {
                coords.style.opacity = "0";
            }, 1000);
        }

        document.addEventListener("mousemove", handleMouseMove);

        const glitchInterval = setInterval(() => {
            const wireframes = document.querySelectorAll<HTMLElement>(".wireframe-line");
            if (wireframes.length === 0) return;
            const randomLine = wireframes[Math.floor(Math.random() * wireframes.length)];
            randomLine.style.opacity = "0.3";
            setTimeout(() => {
                randomLine.style.opacity = "1";
            }, 50);
        }, 3000);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            clearTimeout(coordTimeout);
            clearInterval(glitchInterval);
        };
    }, []);

    return (
        <div
            className="min-h-screen overflow-hidden"
            style={{
                backgroundColor: "#f8f9ff",
                color: COLORS.onBackground,
                fontFamily: "'Inter', sans-serif",
                backgroundImage: `
          linear-gradient(to right, #e5eeff 1px, transparent 1px),
          linear-gradient(to bottom, #e5eeff 1px, transparent 1px),
          linear-gradient(to right, #d3e4fe 1px, transparent 1px),
          linear-gradient(to bottom, #d3e4fe 1px, transparent 1px)
        `,
                backgroundSize: "20px 20px, 20px 20px, 100px 100px, 100px 100px",
            }}
        >
            {/* Header */}
            <header
                className="fixed top-0 left-0 right-0 z-50 border-b"
                style={{ backgroundColor: COLORS.surface, borderColor: COLORS.outlineVariant }}
            >
                <div className="flex justify-between items-center w-full px-6 md:px-16 py-4 mx-auto max-w-[1280px]">
                    <div className="text-2xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: COLORS.primary }}>
                        roomsketch
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        {["How it works", "Capabilities", "Pricing"].map((label) => (
                            <a
                                key={label}
                                href="#"
                                className="text-[16px] transition-colors duration-200 hover:opacity-70"
                                style={{ color: COLORS.onSurfaceVariant }}
                            >
                                {label}
                            </a>
                        ))}
                    </nav>
                    <div className="flex items-center gap-4">
                        <button
                            className="text-[16px] transition-all active:opacity-80 active:scale-95"
                            style={{ color: COLORS.onSurfaceVariant }}
                        >
                            Log In
                        </button>
                        <button
                            className="px-4 py-1.5 rounded-lg border text-[16px] transition-all active:opacity-80 active:scale-95"
                            style={{ color: COLORS.primary, borderColor: COLORS.primary }}
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="relative h-screen flex flex-col items-center justify-center">
                <div className="relative w-full max-w-md h-96 flex items-center justify-center" style={{ perspective: "1000px" }}>
                    <svg
                        className="room-skeleton w-80 h-80 overflow-visible"
                        viewBox="0 0 200 200"
                    >
                        <rect className="wireframe-line" fill="none" height="160" stroke={COLORS.primary} strokeOpacity={0.2} strokeWidth="0.5" width="160" x="20" y="20" />
                        <path className="wireframe-line" d="M20 20 L180 20 L180 180 L20 180 Z" fill="none" stroke={COLORS.primary} strokeWidth="1.5" />
                        <path className="wireframe-line" d="M20 20 L20 80 L180 80 L180 20 Z" fill="none" stroke={COLORS.primary} strokeOpacity={0.4} strokeWidth="1" transform="translate(0, -40)" />
                        <path className="wireframe-line" d="M20 180 L20 120 L180 120 L180 180" fill="none" stroke={COLORS.primary} strokeWidth="1.5" />
                        <line className="wireframe-line" stroke={COLORS.outlineVariant} strokeDasharray="4 4" strokeWidth="0.5" x1="20" x2="20" y1="20" y2="180" />
                        <line className="wireframe-line" stroke={COLORS.outlineVariant} strokeDasharray="4 4" strokeWidth="0.5" x1="180" x2="180" y1="20" y2="180" />
                        <circle className="wireframe-line" cx="100" cy="100" fill="none" r="40" stroke={COLORS.secondaryFixedDim} strokeDasharray="2 2" strokeWidth="0.75" />
                        <path className="wireframe-line" d="M60 100 L140 100 M100 60 L100 140" stroke={COLORS.outlineVariant} strokeWidth="0.5" />
                        <text style={{ fontFamily: "'Geist', sans-serif", fontSize: 8, fontWeight: 500, fill: COLORS.primaryContainer }} x="25" y="15">
                            WALL_A_EXT_01
                        </text>
                        <text style={{ fontFamily: "'Geist', sans-serif", fontSize: 8, fontWeight: 500, fill: COLORS.primaryContainer }} x="145" y="175">
                            COORD_X: 180.00
                        </text>
                    </svg>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-30">
                        <div className="absolute top-1/4 left-10 w-20 h-px" style={{ backgroundColor: COLORS.secondary }} />
                        <div className="absolute bottom-1/4 right-10 w-32 h-px" style={{ backgroundColor: COLORS.secondary }} />
                        <div className="absolute top-10 right-1/4 w-px h-24" style={{ backgroundColor: COLORS.secondary }} />
                    </div>
                </div>

                <div className="text-center mt-12 z-10">
                    <h1
                        className="text-[48px] tracking-tight mb-2 flex items-center justify-center gap-1"
                        style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 500, letterSpacing: "-0.01em", color: COLORS.primary }}
                    >
                        Drafting your workspace
                        <span className="loading-dot">.</span>
                        <span className="loading-dot">.</span>
                        <span className="loading-dot">.</span>
                    </h1>
                    <p className="text-[18px] font-medium" style={{ color: COLORS.onSurfaceVariant }}>
                        Setting up the foundation.
                    </p>
                </div>

                <div className="mt-8 flex gap-3">
                    <div
                        className="px-4 py-1.5 border flex items-center gap-2 rounded-full"
                        style={{ backgroundColor: COLORS.surfaceContainerHigh, borderColor: COLORS.outlineVariant }}
                    >
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: COLORS.secondary }} />
                        <span className="text-[12px] uppercase tracking-widest" style={{ fontFamily: "'Geist', sans-serif", color: COLORS.onSurfaceVariant }}>
                            Grid System Active
                        </span>
                    </div>
                    <div
                        className="px-4 py-1.5 border flex items-center gap-2 rounded-full"
                        style={{ backgroundColor: COLORS.surfaceContainerHigh, borderColor: COLORS.outlineVariant }}
                    >
                        <span className="material-symbols-outlined text-[14px]" style={{ color: COLORS.primary }}>
                            architecture
                        </span>
                        <span className="text-[12px] uppercase tracking-widest" style={{ fontFamily: "'Geist', sans-serif", color: COLORS.onSurfaceVariant }}>
                            Metric Scaling
                        </span>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer
                className="fixed bottom-0 left-0 right-0 z-50 border-t"
                style={{ backgroundColor: COLORS.surface, borderColor: COLORS.outlineVariant }}
            >
                <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 md:px-16 py-8 mx-auto max-w-[1280px]">
                    <div className="text-2xl font-bold mb-4 md:mb-0" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: COLORS.primary }}>
                        roomsketch
                    </div>
                    <div className="flex gap-6 mb-4 md:mb-0">
                        {["Privacy Policy", "Terms of Service", "Help Center", "Contact"].map((label) => (
                            <a key={label} href="#" className="text-[12px] tracking-wide hover:opacity-70 transition-opacity" style={{ fontFamily: "'Geist', sans-serif", color: COLORS.onSurfaceVariant }}>
                                {label}
                            </a>
                        ))}
                    </div>
                    <div className="text-[12px]" style={{ fontFamily: "'Geist', sans-serif", color: COLORS.onSurfaceVariant }}>
                        © 2024 RoomSketch. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* Cursor tracker */}
            <div ref={trackerRef} className="fixed pointer-events-none z-50 flex flex-col gap-1 items-start">
                <div className="w-4 h-4 border flex items-center justify-center" style={{ borderColor: COLORS.primary }}>
                    <div className="w-1 h-1" style={{ backgroundColor: COLORS.primary }} />
                </div>
                <div
                    ref={coordsRef}
                    className="text-white text-[12px] px-1.5 py-0.5 rounded-sm opacity-0 transition-opacity"
                    style={{ backgroundColor: COLORS.primary, fontFamily: "'Geist', sans-serif" }}
                >
                    0, 0
                </div>
            </div>

            <style jsx global>{`
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotateX(60deg) rotateZ(45deg);
          }
          50% {
            transform: translateY(-20px) rotateX(60deg) rotateZ(45deg);
          }
        }
        @keyframes blink {
          0% {
            opacity: 0.2;
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0.2;
          }
        }
        .wireframe-line {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawLine 4s ease-in-out forwards infinite;
        }
        .room-skeleton {
          transform: rotateX(60deg) rotateZ(45deg);
          animation: float 6s ease-in-out infinite;
        }
        .loading-dot {
          animation: blink 1.4s infinite both;
        }
        .loading-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loading-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
      `}</style>
        </div>
    );
}