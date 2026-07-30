"use client";

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
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 20,
            marginBottom: 28,
            borderBottom: "1px solid rgba(15,15,15,0.08)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(15,15,15,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Projects
                </span>
                <span style={{ width: 1, height: 16, background: "rgba(15,15,15,0.12)" }} />
                <span style={{ fontSize: 16, color: "rgba(15,15,15,0.92)" }} className="tracking-tight">
                    {loading ? "Loading…" : `${count} project${count !== 1 ? "s" : ""}`}
                </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                    type="button"
                    onClick={onNewProject}
                    style={{
                        height: 34, padding: "0 16px", borderRadius: 7, border: "none",
                        background: "#111111", color: "#ffffff", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
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