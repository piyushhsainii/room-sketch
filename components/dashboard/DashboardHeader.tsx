"use client";

import { dashboardTheme as CLAY } from "@/components/dashboard/dashboard-theme";

import { useState } from "react";

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
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 20,
            marginBottom: 28,
            borderBottom: `1px solid ${CLAY.border}`,
            boxShadow: "none",
            fontFamily: CLAY.font,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: CLAY.textPrimary, letterSpacing: "-0.04em" }}>
                    Projects
                </h1>
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
                        height: 40, padding: "0 18px", borderRadius: 12, border: `1px solid ${CLAY.textPrimary}`,
                        background: hovered ? "#303030" : CLAY.textPrimary, color: "#fff", fontSize: 14, fontWeight: 500,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
                        fontFamily: CLAY.font,
                        boxShadow: "none",
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
