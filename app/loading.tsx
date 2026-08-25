"use client";

import { useEffect, useState } from "react";

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
  canvas: "#E5E5E5",
  surface: "#EAEAEA",
  surfaceChip: "#F5F5F5",
  textPrimary: "#1A1A1A",
  textMuted: "#5A5A5A",
  textPlaceholder: "#999999",
  lightShadow: "rgba(255,255,255,0.75)",
  darkShadow: "rgba(0,0,0,0.14)",
  accentText: "#4C4FBF",
  font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

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
    <div
      className="relative flex h-screen w-full flex-col justify-between overflow-hidden antialiased"
      style={{ background: CLAY.canvas, color: CLAY.textPrimary, fontFamily: CLAY.font }}
    >
      {/* Architectural background grid */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundSize: "40px 40px",
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
        }}
      />

      {/* Header / brand */}
      <header className="relative z-10 mt-16 flex w-full justify-center p-6">
        <div className="flex items-center gap-3">
          <img
            src="/room-sketch-logo-removebg-preview.png"
            alt=""
            className="w-12"
            style={{ filter: "drop-shadow(0 1px 1px rgba(255,255,255,0.5))" }}
          />
          <span style={{ fontFamily: CLAY.font, fontSize: 24, fontWeight: 500, letterSpacing: "normal", color: CLAY.textPrimary }}>
            RoomSketch
          </span>
        </div>
      </header>

      {/* Main loading area */}
      <main className="relative z-10 -mt-20 flex flex-grow flex-col items-center justify-center">
        {/* 3D wireframe cube, sitting in a soft clay well so it reads
                    as embedded in the surface rather than floating on a flat
                    background */}
        <div
          className="mb-12 flex h-32 w-32 items-center justify-center rounded-full"
          style={{
            perspective: "800px",
            background: CLAY.surface,
            boxShadow: `inset 4px 4px 10px ${CLAY.darkShadow}, inset -4px -4px 10px ${CLAY.lightShadow}`,
          }}
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
            <div className="cube-face bottom" style={{ background: CLAY.textPrimary }} />
          </div>
        </div>

        {/* Main status */}
        <h1
          className="mb-4 px-4 text-center"
          style={{ fontFamily: CLAY.font, fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: CLAY.textPrimary, letterSpacing: "normal" }}
        >
          Materializing Workspace
        </h1>

        {/* Technical sub-status */}
        <div className="status-text flex h-6 items-center justify-center text-[12px] uppercase tracking-widest" style={{ color: CLAY.textMuted }}>
          <span style={{ opacity: visible ? 1 : 0, transition: "opacity 150ms" }}>
            {STATUSES[index]}
          </span>
        </div>

        {/* Progress line — recessed clay track with a raised sliding pip */}
        <div
          className="relative mt-8 h-2 w-64 overflow-hidden rounded-full"
          style={{ boxShadow: `inset 2px 2px 5px ${CLAY.darkShadow}, inset -2px -2px 5px ${CLAY.lightShadow}` }}
        >
          <div
            className="progress-slide absolute left-0 top-0 h-full w-1/3 rounded-full"
            style={{ background: CLAY.accentText }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex w-full justify-center p-6 pb-16">
        <p style={{ fontSize: 12, letterSpacing: "0.08em", color: CLAY.textPlaceholder, fontFamily: CLAY.font }}>
          PRECISE BY DESIGN © {new Date().getFullYear()}
        </p>
      </footer>

      <style jsx global>{`
        @import url("https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700&display=swap");

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
          border: 1px solid ${CLAY.textPrimary};
          background: rgba(234, 234, 234, 0.6);
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
          background-color: ${CLAY.accentText};
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
            opacity: 0.12;
          }
          100% {
            height: 100%;
            opacity: 0.35;
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