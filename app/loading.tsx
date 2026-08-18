"use client";

import { useEffect, useState } from "react";

const STATUSES = [
    "Calculating lighting vectors...",
    "Loading material shaders...",
    "Aligning structural coordinates...",
    "Initializing render engine...",
    "Syncing drafting layers...",
    "Validating spatial geometry...",
];

export default function Loading() {
    const [index, setIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible(false);
            const timeout = setTimeout(() => {
                setIndex((prev) => (prev + 1) % STATUSES.length);
                setVisible(true);
            }, 150);
            return () => clearTimeout(timeout);
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative flex h-screen w-full flex-col justify-between overflow-hidden bg-[#f8f9ff] font-sans text-[#0b1c30] antialiased">
            {/* Architectural background grid */}
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    backgroundSize: "40px 40px",
                    backgroundImage:
                        "linear-gradient(to right, rgba(197,198,205,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(197,198,205,0.15) 1px, transparent 1px)",
                }}
            />

            {/* Header / brand */}
            <header className="relative z-10 mt-16 flex w-full justify-center p-6">
                <div className="flex items-center gap-3">
                    <img src="/room-sketch-logo-removebg-preview.png" alt="" className="w-12" />
                    <span className="font-semibold tracking-tight text-[#00030c]" style={{ fontFamily: "Hanken Grotesk", fontSize: 24 }}>
                        RoomSketch
                    </span>
                </div>
            </header>

            {/* Main loading area */}
            <main className="relative z-10 -mt-20 flex flex-grow flex-col items-center justify-center">
                {/* 3D wireframe cube */}
                <div
                    className="mb-12 flex h-32 w-32 items-center justify-center"
                    style={{ perspective: "800px" }}
                >
                    <div className="wireframe-cube">
                        <div className="cube-face front">
                            <div className="fill-layer" />
                        </div>
                        <div className="cube-face right">
                            <div className="fill-layer" />
                        </div>
                        <div className="cube-face back">
                            <div className="fill-layer" />
                        </div>
                        <div className="cube-face left">
                            <div className="fill-layer" />
                        </div>
                        <div className="cube-face top" />
                        <div className="cube-face bottom bg-[#00030c]" />
                    </div>
                </div>

                {/* Main status */}
                <h1
                    className="mb-4 px-4 text-center text-[#00030c]"
                    style={{ fontFamily: "Hanken Grotesk", fontSize: 32, fontWeight: 500, lineHeight: 1.25 }}
                >
                    Materializing Workspace
                </h1>

                {/* Technical sub-status */}
                <div className="status-text flex h-6 items-center justify-center text-[12px] uppercase tracking-widest text-[#45474d]">
                    <span style={{ opacity: visible ? 1 : 0, transition: "opacity 150ms" }}>
                        {STATUSES[index]}
                    </span>
                </div>

                {/* Progress line */}
                <div className="relative mt-8 h-px w-64 overflow-hidden bg-[#c5c6cd]/30">
                    <div className="progress-slide absolute left-0 top-0 h-full w-1/3 bg-[#00030c]" />
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 flex w-full justify-center p-6 pb-16">
                <p className="text-[12px] tracking-wider text-[#75777e]">PRECISE BY DESIGN © {new Date().getFullYear()}</p>
            </footer>

            <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Geist:wght@400;500;600&display=swap");
        @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

        .wireframe-cube {
          width: 80px;
          height: 80px;
          position: relative;
          transform-style: preserve-3d;
          animation: rotate 8s infinite linear;
        }

        .cube-face {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 1px solid #00030c;
          background: rgba(248, 249, 255, 0.8);
        }

        .front {
          transform: rotateY(0deg) translateZ(40px);
        }
        .right {
          transform: rotateY(90deg) translateZ(40px);
        }
        .back {
          transform: rotateY(180deg) translateZ(40px);
        }
        .left {
          transform: rotateY(-90deg) translateZ(40px);
        }
        .top {
          transform: rotateX(90deg) translateZ(40px);
        }
        .bottom {
          transform: rotateX(-90deg) translateZ(40px);
        }

        .fill-layer {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background-color: #00030c;
          animation: fillUp 4s infinite ease-in-out alternate;
        }

        @keyframes rotate {
          0% {
            transform: rotateX(-30deg) rotateY(0deg);
          }
          100% {
            transform: rotateX(-30deg) rotateY(360deg);
          }
        }

        @keyframes fillUp {
          0% {
            height: 0%;
            opacity: 0.1;
          }
          100% {
            height: 100%;
            opacity: 0.3;
          }
        }

        .status-text {
          animation: pulseFade 2s infinite;
        }

        @keyframes pulseFade {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        .progress-slide {
          animation: slide 2s ease-in-out infinite alternate;
        }

        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
        </div>
    );
}