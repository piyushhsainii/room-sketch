"use client";

import { useState } from "react";

function StarIcon({ filled }: { filled: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#f59e0b" : "none"} stroke={filled ? "#f59e0b" : "rgba(15,23,42,0.5)"} strokeWidth="1.8" strokeLinejoin="round">
            <path d="M12 2l2.9 6.4 7 .7-5.3 4.7 1.6 6.9L12 17l-6.2 3.7 1.6-6.9L2.1 9.1l7-.7L12 2z" />
        </svg>
    );
}

// Controlled from the outside via initialStarred/initialCount, but manages
// its own optimistic toggle state internally so callers (grid cards, the
// starred tab, the project page) don't each need to reimplement the
// optimistic-update + rollback-on-failure logic.
export default function StarButton({
    projectId,
    initialStarred,
    initialCount,
    onUnstar,
}: {
    projectId: string;
    initialStarred: boolean;
    initialCount: number;
    // Called after a successful unstar — lets a list (e.g. the Starred tab)
    // remove the card immediately instead of just visually toggling it.
    onUnstar?: (projectId: string) => void;
}) {
    const [starred, setStarred] = useState(initialStarred);
    const [count, setCount] = useState(initialCount);
    const [busy, setBusy] = useState(false);

    async function toggle(e: React.MouseEvent) {
        e.stopPropagation(); // don't trigger a parent card's onClick/navigate
        if (busy) return;
        setBusy(true);

        const nextStarred = !starred;
        const prevStarred = starred;
        const prevCount = count;

        // Optimistic update
        setStarred(nextStarred);
        setCount((c) => c + (nextStarred ? 1 : -1));

        try {
            const res = await fetch(`/api/projects/${projectId}/star`, {
                method: nextStarred ? "POST" : "DELETE",
            });
            if (!res.ok) throw new Error("Star request failed");
            if (!nextStarred) onUnstar?.(projectId);
        } catch (err) {
            console.error("[StarButton] failed, rolling back:", err);
            setStarred(prevStarred);
            setCount(prevCount);
        } finally {
            setBusy(false);
        }
    }

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-label={starred ? "Unstar project" : "Star project"}
            style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                height: 28, padding: "0 10px", borderRadius: 999,
                border: `1px solid ${starred ? "rgba(245,158,11,0.35)" : "rgba(15,23,42,0.12)"}`,
                background: starred ? "rgba(245,158,11,0.08)" : "#fff",
                color: starred ? "#b45309" : "rgba(15,23,42,0.6)",
                fontSize: 12, fontWeight: 600, cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.7 : 1,
            }}
        >
            <StarIcon filled={starred} />
            {count}
        </button>
    );
}