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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
            </svg>
        );
    }
    if (verdict === "no") {
        return (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" />
            </svg>
        );
    }
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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

                <div className="cmp-panel">
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
          --canvas: #e5e5e5;
          --surface: #eaeaea;
          --ink: #1a1a1a;
          --muted: #666;
          --meta: #999;
          --shadow-light: rgba(255, 255, 255, 0.7);
          --shadow-dark: rgba(0, 0, 0, 0.12);
          background: var(--canvas);
          padding: 96px 0;
          font-family: "Quicksand", "Nunito", sans-serif;
        }
        .cmp-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .cmp-head {
          max-width: 640px;
          margin: 0 0 40px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .cmp-visible .cmp-head {
          opacity: 1;
          transform: translateY(0);
        }
        .cmp-eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #556;
          margin-bottom: 14px;
          padding: 6px 16px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(163, 224, 193, 0.28), rgba(168, 178, 230, 0.28)), var(--surface);
          box-shadow: -4px -4px 10px var(--shadow-light), 4px 4px 12px var(--shadow-dark);
        }
        .cmp-head h2 {
          font-size: clamp(26px, 3vw, 38px);
          font-weight: 500;
          color: var(--ink);
          margin: 4px 0 12px;
          letter-spacing: -0.02em;
        }
        .cmp-head p {
          font-size: 15px;
          color: var(--muted);
          margin: 0;
          line-height: 1.6;
        }

        .cmp-panel {
          overflow-x: auto;
          border-radius: 30px;
          background: var(--surface);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .cmp-table {
          min-width: 720px;
        }
        .cmp-row {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr;
          align-items: center;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .cmp-visible .cmp-row {
          opacity: 1;
          transform: translateY(0);
        }
        .cmp-row:last-child {
          border-bottom: none;
        }
        .cmp-row-head {
          background: transparent;
        }
        .cmp-cell {
          padding: 18px 20px;
          font-size: 13.5px;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cmp-cell-label {
          font-weight: 500;
          font-size: 14px;
          color: var(--ink);
        }
        .cmp-cell-col {
          font-weight: 500;
          font-size: 13.5px;
          color: var(--meta);
        }
        .cmp-col-primary {
          color: var(--ink);
        }
        .cmp-row-head .cmp-col-primary {
          color: #1a1a1a;
          font-weight: 600;
        }
        .cmp-label-text {
          color: var(--muted);
        }
        .cmp-col-primary .cmp-label-text {
          color: var(--ink);
          font-weight: 500;
        }

        .cmp-badge {
          flex: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          box-shadow: -3px -3px 6px var(--shadow-light), 3px 3px 8px var(--shadow-dark);
        }
        .cmp-yes {
          color: #3fa88a;
        }
        .cmp-no {
          color: #c65b4e;
        }
        .cmp-partial {
          color: #999;
        }

        @media (max-width: 720px) {
          .cmp-cell {
            padding: 14px 14px;
            font-size: 12.5px;
          }
          .cmp-label-text {
            display: none;
          }
        }
      `}</style>
        </section>
    );
}