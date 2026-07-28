"use client";

import { useEffect, useRef, useState } from "react";

type Verdict = "yes" | "no" | "partial";

interface Row {
    capability: string;
    roomsketch: { label: string; verdict: Verdict };
    cad: { label: string; verdict: Verdict };
    staticTool: { label: string; verdict: Verdict };
}

const ROWS: Row[] = [
    {
        capability: "Runs in the browser",
        roomsketch: { label: "Yes", verdict: "yes" },
        cad: { label: "Usually a desktop install", verdict: "no" },
        staticTool: { label: "Yes", verdict: "yes" },
    },
    {
        capability: "Learning curve",
        roomsketch: { label: "Minutes", verdict: "yes" },
        cad: { label: "Weeks", verdict: "no" },
        staticTool: { label: "Minutes", verdict: "yes" },
    },
    {
        capability: "2D plan & 3D model stay in sync",
        roomsketch: { label: "Live, same canvas", verdict: "yes" },
        cad: { label: "Manual re-model", verdict: "partial" },
        staticTool: { label: "No 3D at all", verdict: "no" },
    },
    {
        capability: "Walk through the space in 3D",
        roomsketch: { label: "Built-in Walk Mode", verdict: "yes" },
        cad: { label: "Needs a separate renderer", verdict: "partial" },
        staticTool: { label: "Not possible", verdict: "no" },
    },
    {
        capability: "Wall types — solid, railing, open",
        roomsketch: { label: "Per-segment control", verdict: "yes" },
        cad: { label: "Manual geometry work", verdict: "partial" },
        staticTool: { label: "Flat lines only", verdict: "no" },
    },
    {
        capability: "Material & lighting control",
        roomsketch: { label: "60+ materials, 4 light types", verdict: "yes" },
        cad: { label: "Yes, steep setup", verdict: "partial" },
        staticTool: { label: "Color fills only", verdict: "no" },
    },
    {
        capability: "Exportable, dimensioned plan",
        roomsketch: { label: "To-scale SVG", verdict: "yes" },
        cad: { label: "Yes", verdict: "yes" },
        staticTool: { label: "Sometimes", verdict: "partial" },
    },
    {
        capability: "Cost to start",
        roomsketch: { label: "Free to start", verdict: "yes" },
        cad: { label: "License required", verdict: "no" },
        staticTool: { label: "Often free", verdict: "yes" },
    },
];

function VerdictIcon({ verdict }: { verdict: Verdict }) {
    if (verdict === "yes") {
        return (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
            </svg>
        );
    }
    if (verdict === "no") {
        return (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
            </svg>
        );
    }
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14" />
        </svg>
    );
}

export default function ComparisonStrip() {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = ref.current;
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

    return (
        <section ref={ref} className={`cmp ${visible ? "cmp-visible" : ""}`} aria-label="Comparison">
            <div className="cmp-wrap">
                <div className="cmp-head">
                    <span className="cmp-eyebrow">How it stacks up</span>
                    <h2>One tool instead of three</h2>
                    <p>
                        What you&apos;d otherwise stitch together across a CAD app, a static
                        floor-plan tool, and a separate 3D renderer.
                    </p>
                </div>

                <div className="cmp-table-scroll">
                    <div className="cmp-table" role="table">
                        <div className="cmp-row cmp-row-head" role="row">
                            <div className="cmp-cell cmp-cell-label" role="columnheader" />
                            <div className="cmp-cell cmp-cell-col cmp-col-primary" role="columnheader">
                                RoomSketch
                            </div>
                            <div className="cmp-cell cmp-cell-col" role="columnheader">
                                Traditional CAD
                            </div>
                            <div className="cmp-cell cmp-cell-col" role="columnheader">
                                Static floor-plan tools
                            </div>
                        </div>

                        {ROWS.map((row, i) => (
                            <div
                                className="cmp-row"
                                role="row"
                                key={row.capability}
                                style={{ transitionDelay: visible ? `${i * 45}ms` : "0ms" }}
                            >
                                <div className="cmp-cell cmp-cell-label" role="cell">
                                    {row.capability}
                                </div>
                                <div className="cmp-cell cmp-col-primary" role="cell">
                                    <span className={`cmp-badge cmp-${row.roomsketch.verdict}`}>
                                        <VerdictIcon verdict={row.roomsketch.verdict} />
                                    </span>
                                    <span className="cmp-label-text">{row.roomsketch.label}</span>
                                </div>
                                <div className="cmp-cell" role="cell">
                                    <span className={`cmp-badge cmp-${row.cad.verdict}`}>
                                        <VerdictIcon verdict={row.cad.verdict} />
                                    </span>
                                    <span className="cmp-label-text">{row.cad.label}</span>
                                </div>
                                <div className="cmp-cell" role="cell">
                                    <span className={`cmp-badge cmp-${row.staticTool.verdict}`}>
                                        <VerdictIcon verdict={row.staticTool.verdict} />
                                    </span>
                                    <span className="cmp-label-text">{row.staticTool.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
        .cmp {
          --ink: #12213e;
          --ink-2: #1b2e52;
          --paper: #f7f6f1;
          --line: #c9c3b4;
          --amber: #f2a81d;
          --amber-2: #d98e0b;
          --teal: #3fa8a0;
          --bad: #c65b4e;
          background: var(--paper);
          padding: 96px 0;
        }
        .cmp-wrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 28px;
        }
        .cmp-head {
          max-width: 640px;
          margin: 0 0 44px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .cmp-visible .cmp-head {
          opacity: 1;
          transform: translateY(0);
        }
        .cmp-eyebrow {
          font-family: "JetBrains Mono", monospace;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--amber-2);
        }
        .cmp-head h2 {
          font-family: "Space Grotesk", sans-serif;
          font-size: clamp(26px, 3vw, 38px);
          color: var(--ink);
          margin: 12px 0 14px;
          letter-spacing: -0.01em;
        }
        .cmp-head p {
          font-size: 16.5px;
          color: #4b5875;
          margin: 0;
          line-height: 1.55;
        }

        .cmp-table-scroll {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: #fff;
        }
        .cmp-table {
          min-width: 720px;
        }
        .cmp-row {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr;
          align-items: center;
          border-bottom: 1px solid var(--line);
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.5s ease, transform 0.5s ease, background 0.15s ease;
        }
        .cmp-visible .cmp-row {
          opacity: 1;
          transform: translateY(0);
        }
        .cmp-row:last-child {
          border-bottom: none;
        }
        .cmp-row:not(.cmp-row-head):hover {
          background: #faf9f5;
        }
        .cmp-row-head {
          background: var(--ink);
          border-bottom: none;
        }
        .cmp-cell {
          padding: 16px 20px;
          font-size: 14px;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cmp-cell-label {
          font-weight: 600;
          font-size: 14.5px;
          color: var(--ink);
        }
        .cmp-cell-col {
          font-family: "Space Grotesk", sans-serif;
          font-weight: 600;
          font-size: 15px;
          color: var(--paper);
        }
        .cmp-col-primary {
          background: rgba(242, 168, 29, 0.08);
          position: relative;
        }
        .cmp-row-head .cmp-col-primary {
          background: rgba(242, 168, 29, 0.16);
          color: var(--amber);
        }
        .cmp-label-text {
          color: #4b5875;
        }
        .cmp-col-primary .cmp-label-text {
          color: var(--ink);
          font-weight: 500;
        }

        .cmp-badge {
          flex: none;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .cmp-yes {
          background: rgba(63, 168, 160, 0.14);
          color: var(--teal);
        }
        .cmp-no {
          background: rgba(198, 91, 78, 0.12);
          color: var(--bad);
        }
        .cmp-partial {
          background: rgba(18, 33, 62, 0.08);
          color: #7b869e;
        }

        @media (max-width: 720px) {
          .cmp-cell {
            padding: 14px 14px;
            font-size: 13px;
          }
          .cmp-label-text {
            display: none;
          }
        }
      `}</style>
        </section>
    );
}