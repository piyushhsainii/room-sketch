"use client";

import { useState } from "react";

// ---- Claymorphism theme tokens (shared across dashboard components) ----
const CLAY = {
    canvas: "#E5E5E5",
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`
        : `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`;

export type SortMode = "newest" | "oldest" | "name";

export default function DashboardHeader({
    count, loading, sortMode, onSortChange, onNewProject,
}: {
    count: number;
    loading: boolean;
    sortMode: SortMode;
    onSortChange: (mode: SortMode) => void;
    onNewProject: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 20,
            marginBottom: 28,
            borderBottom: "none",
            boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`,
            fontFamily: CLAY.font,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: CLAY.textPlaceholder, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Projects
                </span>
                <span style={{ width: 1, height: 16, background: "rgba(0,0,0,0.10)" }} />
                <span style={{ fontSize: 16, fontWeight: 400, color: CLAY.textPrimary, letterSpacing: "normal" }}>
                    {loading ? "Loading…" : `${count} project${count !== 1 ? "s" : ""}`}
                </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                    type="button"
                    onClick={onNewProject}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    style={{
                        height: 38, padding: "0 18px", borderRadius: 999, border: "none",
                        background: CLAY.surface, color: CLAY.textPrimary, fontSize: 13, fontWeight: 500,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
                        fontFamily: CLAY.font,
                        boxShadow: hovered ? clayRaised(true) : clayRaised(false),
                        transform: hovered ? "translateY(-1px)" : "translateY(0)",
                        transition: "box-shadow 180ms ease, transform 180ms ease",
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Project
                </button>
            </div>
        </div>
    );
}