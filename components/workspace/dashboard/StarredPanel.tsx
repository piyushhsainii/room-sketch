"use client";

import StarButton from "@/components/workspace/dashboard/StarButton";
import { useEffect, useMemo, useState } from "react";

type StarredProject = {
    id: string;
    name: string;
    thumbnail_url: string | null;
    published_at: string | null;
    author_name: string | null;
    author_avatar: string | null;
};

function SearchIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(15,23,42,0.4)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
        </svg>
    );
}

function EmptyStarIcon() {
    return (
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(15,23,42,0.22)" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M12 2l2.9 6.4 7 .7-5.3 4.7 1.6 6.9L12 17l-6.2 3.7 1.6-6.9L2.1 9.1l7-.7L12 2z" />
        </svg>
    );
}

export default function StarredPanel({
    onOpenProject,
    onBrowseCommunity,
}: {
    onOpenProject?: (id: string) => void;
    onBrowseCommunity?: () => void;
}) {
    const [projects, setProjects] = useState<StarredProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/me/starred");
                if (!res.ok) throw new Error("Failed to load starred projects");
                const body = await res.json();
                if (!cancelled) setProjects(body.projects ?? []);
            } catch (err) {
                if (!cancelled) setError("Failed to load starred projects.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(
        () =>
            projects.filter(
                (p) =>
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    (p.author_name ?? "").toLowerCase().includes(search.toLowerCase()),
            ),
        [projects, search],
    );

    function handleUnstar(projectId: string) {
        // Card disappears immediately once unstarred — this IS the starred
        // list, so an unstarred project doesn't belong in it anymore.
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }

    return (
        <div style={{ padding: "28px 36px 60px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
                <div>
                    <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                        Starred
                    </h1>
                    <p style={{ margin: 0, fontSize: 13.5, color: "rgba(15,23,42,0.5)" }}>
                        Projects you've starred from the community.
                    </p>
                </div>

                <div style={{
                    display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px",
                    borderRadius: 8, border: "1px solid rgba(15,23,42,0.12)", background: "#fff", minWidth: 220,
                }}>
                    <SearchIcon />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search starred..."
                        style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent", color: "#0f172a" }}
                    />
                </div>
            </div>

            {loading && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(15,23,42,0.45)", fontSize: 13.5 }}>
                    Loading starred projects…
                </div>
            )}

            {!loading && error && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "#dc2626", fontSize: 13.5 }}>
                    {error}
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                    padding: "72px 24px", borderRadius: 14, background: "#fafbfe", border: "1px solid rgba(15,23,42,0.06)",
                }}>
                    <EmptyStarIcon />
                    <h4 style={{ margin: "20px 0 8px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                        {search ? "No starred projects match your search" : "No starred projects yet"}
                    </h4>
                    <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "rgba(15,23,42,0.5)", maxWidth: 340, lineHeight: 1.5 }}>
                        Star projects from the community to save them here.
                    </p>
                    {!search && onBrowseCommunity && (
                        <button
                            type="button"
                            onClick={onBrowseCommunity}
                            style={{
                                height: 36, padding: "0 18px", borderRadius: 8, border: "none",
                                background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                            }}
                        >
                            Browse Community
                        </button>
                    )}
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
                    {filtered.map((p) => (
                        <StarredCard key={p.id} project={p} onOpen={() => onOpenProject?.(p.id)} onUnstar={handleUnstar} />
                    ))}
                </div>
            )}
        </div>
    );
}

function StarredCard({
    project, onOpen, onUnstar,
}: {
    project: StarredProject;
    onOpen: () => void;
    onUnstar: (id: string) => void;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div
                onClick={onOpen}
                style={{
                    aspectRatio: "4/3", borderRadius: 12, overflow: "hidden", cursor: "pointer",
                    border: "1px solid rgba(15,23,42,0.08)", background: "#f1f5f9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}
            >
                {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                    <span style={{ fontSize: 12, color: "rgba(15,23,42,0.35)" }}>No preview</span>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginTop: 12 }}>
                <div>
                    <p style={{ margin: "0 0 3px", fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>{project.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(15,23,42,0.5)" }}>
                        {project.author_name ? `by ${project.author_name}` : ""}
                    </p>
                </div>
                <StarButton
                    projectId={project.id}
                    initialStarred={true}
                    initialCount={0 /* count not shown card-side here; server doesn't send it for this endpoint */}
                    onUnstar={onUnstar}
                />
            </div>
        </div>
    );
}