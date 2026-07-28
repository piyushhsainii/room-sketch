"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function LiveDemo() {
    const containerRef = useRef<HTMLDivElement>(null);
    const sectionRef = useRef<HTMLElement>(null);
    const [split, setSplit] = useState(52); // % width of left pane
    const [dragging, setDragging] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const updateSplit = useCallback((clientX: number) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const pct = ((clientX - rect.left) / rect.width) * 100;
        setSplit(Math.min(78, Math.max(22, pct)));
    }, []);

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: PointerEvent) => updateSplit(e.clientX);
        const onUp = () => setDragging(false);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    }, [dragging, updateSplit]);

    const nudge = (dir: -1 | 1) => setSplit((s) => Math.min(78, Math.max(22, s + dir * 6)));

    return (
        <section ref={sectionRef} className={`demo ${visible ? "demo-visible" : ""}`} aria-label="Try it in your browser">
            <div className="demo-wrap">
                <div className="demo-head">
                    <span className="demo-eyebrow">Try it yourself</span>
                    <h2>Resize it. Drag it. It&apos;s a real editor, not a screenshot.</h2>
                    <p>
                        The 2D canvas and 3D preview live in the same resizable split view —
                        drag the divider below to see it happen.
                    </p>
                </div>

                <div className="demo-frame">
                    <div className="demo-frame-bar">
                        <span className="demo-dot" />
                        <span className="demo-dot" />
                        <span className="demo-dot" />
                        <span className="demo-frame-label">app.roomsketch.com/editor</span>
                    </div>

                    <div className="demo-split" ref={containerRef}>
                        <div className="demo-pane demo-pane-2d" style={{ width: `${split}%` }}>
                            <span className="demo-pane-chip">2D plan</span>
                            {/* Replace with your looping 2D-canvas gif/video */}
                            <video className="demo-media" autoPlay muted loop playsInline poster="/room-sketch-full-logo.jpg">
                                <source src="/demo-2d-canvas.mp4" type="video/mp4" />
                            </video>
                        </div>

                        <div
                            className="demo-divider"
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize 2D and 3D panes"
                            tabIndex={0}
                            onPointerDown={(e) => {
                                setDragging(true);
                                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "ArrowLeft") nudge(-1);
                                if (e.key === "ArrowRight") nudge(1);
                            }}
                        >
                            <span className="demo-divider-handle" />
                        </div>

                        <div className="demo-pane demo-pane-3d" style={{ width: `${100 - split}%` }}>
                            <span className="demo-pane-chip demo-pane-chip-dark">3D preview</span>
                            {/* Replace with your looping 3D-preview gif/video */}
                            <video className="demo-media" autoPlay muted loop playsInline poster="/room-sketch-full-logo.jpg">
                                <source src="/demo-3d-preview.mp4" type="video/mp4" />
                            </video>
                        </div>
                    </div>
                </div>

                <div className="demo-footer">
                    <a href="/community" className="demo-community-link">
                        <span>Browse the community gallery</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                    </a>
                    <p>See floor plans other people have made public — or mark your own as public once you&apos;re ready to share.</p>
                </div>
            </div>

            <style jsx>{`
        .demo {
          --ink: #12213e;
          --ink-2: #1b2e52;
          --paper: #f7f6f1;
          --paper-2: #efede4;
          --line: #c9c3b4;
          --amber: #f2a81d;
          --amber-2: #d98e0b;
          --teal: #3fa8a0;
          background: var(--paper-2);
          padding: 96px 0;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .demo-wrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 28px;
        }
        .demo-head {
          max-width: 620px;
          margin: 0 0 40px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .demo-visible .demo-head {
          opacity: 1;
          transform: translateY(0);
        }
        .demo-eyebrow {
          font-family: "JetBrains Mono", monospace;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--amber-2);
        }
        .demo-head h2 {
          font-family: "Space Grotesk", sans-serif;
          font-size: clamp(26px, 3vw, 36px);
          color: var(--ink);
          margin: 12px 0 12px;
          letter-spacing: -0.01em;
        }
        .demo-head p {
          font-size: 16.5px;
          color: #4b5875;
          margin: 0;
          line-height: 1.55;
        }

        .demo-frame {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--line);
          background: var(--ink);
          box-shadow: 0 30px 60px -30px rgba(18, 33, 62, 0.4);
          opacity: 0;
          transform: translateY(22px) scale(0.99);
          transition: opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s;
        }
        .demo-visible .demo-frame {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .demo-frame-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--ink-2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .demo-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.18);
        }
        .demo-frame-label {
          margin-left: 10px;
          font-family: "JetBrains Mono", monospace;
          font-size: 11.5px;
          color: rgba(247, 246, 241, 0.45);
        }

        .demo-split {
          display: flex;
          height: 420px;
          position: relative;
          user-select: none;
        }
        .demo-pane {
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
          transition: width 0.05s linear;
        }
        .demo-pane-2d {
          background: #eae7dd;
        }
        .demo-pane-3d {
          background: #0d1730;
        }
        .demo-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .demo-pane-chip {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 2;
          font-family: "JetBrains Mono", monospace;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(18, 33, 62, 0.85);
          color: var(--amber);
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid rgba(242, 168, 29, 0.4);
        }
        .demo-pane-chip-dark {
          background: rgba(247, 246, 241, 0.1);
          color: var(--teal);
          border-color: rgba(63, 168, 160, 0.4);
        }

        .demo-divider {
          width: 14px;
          flex-shrink: 0;
          background: var(--ink-2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: col-resize;
          touch-action: none;
        }
        .demo-divider-handle {
          width: 3px;
          height: 44px;
          border-radius: 999px;
          background: rgba(247, 246, 241, 0.3);
          transition: background 0.15s ease, height 0.15s ease;
        }
        .demo-divider:hover .demo-divider-handle,
        .demo-divider:focus-visible .demo-divider-handle {
          background: var(--amber);
          height: 60px;
        }
        .demo-divider:focus-visible {
          outline: none;
        }

        .demo-footer {
          margin-top: 28px;
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s ease 0.25s, transform 0.6s ease 0.25s;
        }
        .demo-visible .demo-footer {
          opacity: 1;
          transform: translateY(0);
        }
        .demo-community-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14.5px;
          color: var(--ink);
          text-decoration: none;
          padding: 11px 18px;
          border-radius: 999px;
          border: 1.5px solid var(--ink);
          transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
        }
        .demo-community-link:hover {
          background: var(--ink);
          color: var(--paper);
          transform: translateY(-1px);
        }
        .demo-footer p {
          margin: 0;
          font-size: 14px;
          color: #57627e;
          max-width: 420px;
        }

        @media (max-width: 640px) {
          .demo-split {
            height: 320px;
          }
        }
      `}</style>
        </section>
    );
}