"use client";

import { useEffect, useMemo, useState } from "react";
import StarButton from "../workspace/dashboard/StarButton";

function SearchIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(15,23,42,0.4)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
        </svg>
    );
}

function PlusIcon({ color = "#fff" }: { color?: string }) {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
        </svg>
    );
}

function DotsIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" />
        </svg>
    );
}

function DraftsIcon() {
    return (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(15,23,42,0.28)" strokeWidth="1.6" strokeLinecap="round">
            <line x1="4" y1="7" x2="16" y2="7" />
            <line x1="4" y1="12" x2="14" y2="12" />
            <line x1="4" y1="17" x2="11" y2="17" />
            <path d="M16 19l4-4-2.5-2.5-4 4V19h2.5z" />
        </svg>
    );
}

function ComingSoonIcon() {
    return (
        <svg width="72" height="72" viewBox="0 0 96 96" fill="none">
            <circle cx="48" cy="48" r="40" stroke="rgba(99,102,241,0.25)" strokeWidth="2" strokeDasharray="4 6" />
            <circle cx="30" cy="40" r="12" fill="#e0e7ff" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
            <circle cx="30" cy="40" r="4" fill="#818cf8" />
            <circle cx="62" cy="48" r="16" fill="#eef2ff" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
            <circle cx="62" cy="48" r="5.5" fill="#6366f1" />
            <path d="M40 40h10M56 48h-4" stroke="rgba(99,102,241,0.5)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 5" />
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

function timeAgo(dateInput?: string | number | Date) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Updated just now";
    if (mins < 60) return `Updated ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Updated ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Updated yesterday";
    if (days < 7) return `Updated ${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return "Updated last week";
    return `Updated ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function starredAgo(dateInput?: string | number | Date) {
    // Same relative-time logic as timeAgo, different label prefix — kept
    // as a separate function rather than a param flag so callers stay
    // readable at the call site.
    const base = timeAgo(dateInput);
    return base.replace(/^Updated/, "Starred");
}

const TABS = [
    { id: "all", label: "All" },
    { id: "recent", label: "Recent" },
    { id: "starred", label: "Starred" },
    { id: "shared", label: "Shared" },
] as const;

type StarredProject = {
    id: string;
    name: string;
    thumbnail_url: string | null;
    author_name: string | null;
    starred_at: string;
    star_count: number;
};

export default function CollectionsPanel({
    projects = [],
    onCreateCollection,
    onOpenCollection,
    onOpenStarredProject,
    onNavigate,
}: {
    projects?: any[];
    onCreateCollection?: () => void;
    onOpenCollection?: (id: string) => void;
    // Starred items are OTHER users' published community projects, not
    // the current user's own collections — needs its own route (/community/[id]).
    onOpenStarredProject?: (id: string) => void;
    onNavigate?: (feature: "3d_viewer" | "collections" | "settings") => void;
}) {
    const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("all");
    const [search, setSearch] = useState("");
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Starred tab has its own data source (community stars, not the
    // user's own projects prop) — fetched lazily on first visit to the
    // tab, not on mount, since most sessions won't open it.
    const [starredProjects, setStarredProjects] = useState<StarredProject[]>([]);
    const [starredLoading, setStarredLoading] = useState(false);
    const [starredError, setStarredError] = useState<string | null>(null);
    const [starredFetched, setStarredFetched] = useState(false);

    useEffect(() => {
        if (activeTab !== "starred" || starredFetched) return;
        let cancelled = false;
        async function load() {
            setStarredLoading(true);
            setStarredError(null);
            try {
                const res = await fetch("/api/me/starred");
                if (!res.ok) throw new Error("Failed to load starred projects");
                const body = await res.json();
                if (!cancelled) {
                    setStarredProjects(body.projects ?? []);
                    setStarredFetched(true);
                }
            } catch {
                if (!cancelled) setStarredError("Failed to load starred projects.");
            } finally {
                if (!cancelled) setStarredLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [activeTab, starredFetched]);

    function handleUnstar(projectId: string) {
        setStarredProjects((prev) => prev.filter((p) => p.id !== projectId));
    }

    const normalized = useMemo(
        () =>
            (projects ?? []).map((p) => ({
                id: p.id,
                name: p.name ?? "Untitled Project",
                meta: timeAgo(p.updatedAt ?? p.updated_at ?? p.createdAt ?? p.created_at),
                thumbnail: p.thumbnailUrl ?? p.thumbnail_url ?? p.thumbnail ?? null,
                updatedAt: new Date(p.updatedAt ?? p.updated_at ?? p.createdAt ?? p.created_at ?? 0).getTime(),
            })),
        [projects]
    );

    const filteredStarred = useMemo(
        () =>
            starredProjects.filter(
                (p) =>
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    (p.author_name ?? "").toLowerCase().includes(search.toLowerCase()),
            ),
        [starredProjects, search],
    );

    const filtered = useMemo(() => {
        let list = normalized.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
        if (activeTab === "recent") {
            list = [...list].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12);
        }
        return list;
    }, [normalized, search, activeTab]);

    return (
        <div style={{ padding: "28px 36px 60px" }} onClick={() => setOpenMenuId(null)}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
                <div>
                    <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                        Collections
                    </h1>
                    <p style={{ margin: 0, fontSize: 13.5, color: "rgba(15,23,42,0.5)" }}>
                        Organize your spatial concepts and blueprints.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px",
                        borderRadius: 8, border: "1px solid rgba(15,23,42,0.12)", background: "#fff", minWidth: 220,
                    }}>
                        <SearchIcon />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={activeTab === "starred" ? "Search starred..." : "Search collections..."}
                            style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent", color: "#0f172a" }}
                        />
                    </div>
                    {activeTab !== "starred" && (
                        <button
                            type="button"
                            onClick={onCreateCollection}
                            style={{
                                display: "flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px",
                                borderRadius: 8, border: "none", background: "#0f172a", color: "#fff",
                                fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                            }}
                        >
                            <PlusIcon />
                            New Collection
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs + sort */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {TABS.map((tab) => {
                        const active = tab.id === activeTab;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    height: 32, padding: "0 16px", borderRadius: 999, border: "none",
                                    background: active ? "#0f172a" : "transparent",
                                    color: active ? "#fff" : "rgba(15,23,42,0.55)",
                                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {activeTab !== "shared" && activeTab !== "starred" && (
                    <button
                        type="button"
                        style={{
                            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                            color: "rgba(15,23,42,0.6)", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
                        }}
                    >
                        Sort by Name
                        <ChevronDownIcon />
                    </button>
                )}
            </div>

            {/* Shared tab: coming soon */}
            {activeTab === "shared" && (
                <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                    padding: "72px 24px", borderRadius: 14, background: "#fafbfe", border: "1px solid rgba(15,23,42,0.06)",
                }}>
                    <ComingSoonIcon />
                    <h4 style={{ margin: "20px 0 8px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                        Shared collaboration is coming soon
                    </h4>
                    <p style={{ margin: 0, fontSize: 13.5, color: "rgba(15,23,42,0.5)", maxWidth: 340, lineHeight: 1.5 }}>
                        Invite teammates, share collections, and co-edit floorplans in real time — we&apos;re building it now.
                    </p>
                </div>
            )}

            {/* Starred tab */}
            {activeTab === "starred" && (
                <>
                    {starredLoading && (
                        <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(15,23,42,0.45)", fontSize: 13.5 }}>
                            Loading starred projects…
                        </div>
                    )}

                    {!starredLoading && starredError && (
                        <div style={{ textAlign: "center", padding: "48px 0", color: "#dc2626", fontSize: 13.5 }}>
                            {starredError}
                        </div>
                    )}

                    {!starredLoading && !starredError && filteredStarred.length === 0 && (
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
                            {!search && (
                                <button
                                    type="button"
                                    onClick={() => onNavigate?.("3d_viewer")}
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

                    {!starredLoading && !starredError && filteredStarred.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
                            {filteredStarred.map((p) => (
                                <StarredCard key={p.id} project={p} onOpen={() => onOpenStarredProject?.(p.id)} onUnstar={handleUnstar} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* All / Recent: real project grid */}
            {activeTab !== "shared" && activeTab !== "starred" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
                    {filtered.map((c) => (
                        <CollectionCard
                            key={c.id}
                            collection={c}
                            menuOpen={openMenuId === c.id}
                            onToggleMenu={(e) => {
                                e.stopPropagation();
                                setOpenMenuId((id) => (id === c.id ? null : c.id));
                            }}
                            onOpen={() => onOpenCollection?.(c.id)}
                        />
                    ))}

                    {filtered.length === 0 && (
                        <div style={{
                            gridColumn: "1 / -1", textAlign: "center", padding: "48px 0",
                            color: "rgba(15,23,42,0.45)", fontSize: 13.5,
                        }}>
                            {search ? "No collections match your search." : "No projects yet — create one to get started."}
                        </div>
                    )}

                    <NewFolderCard onClick={onCreateCollection} />
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
                    border: "1px solid rgba(15,23,42,0.08)",
                    background: project.thumbnail_url ? "#f1f5f9" : "#e7ebfb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}
            >
                {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                    <DraftsIcon />
                )}
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginTop: 12 }}>
                <div style={{ minWidth: 0 }}>
                    <p style={{ margin: "0 0 3px", fontSize: 14.5, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.name}
                    </p>
                    <p style={{ margin: "0 0 2px", fontSize: 12, color: "rgba(15,23,42,0.5)" }}>
                        {project.author_name ? `by ${project.author_name}` : ""}
                    </p>
                    <p style={{ margin: 0, fontSize: 11.5, color: "rgba(15,23,42,0.38)" }}>
                        {starredAgo(project.starred_at)}
                    </p>
                </div>
                <div style={{ flexShrink: 0 }}>
                    <StarButton
                        projectId={project.id}
                        initialStarred={true}
                        initialCount={project.star_count}
                        onUnstar={onUnstar}
                    />
                </div>
            </div>
        </div>
    );
}

function CollectionCard({
    collection, menuOpen, onToggleMenu, onOpen,
}: {
    collection: { id: string; name: string; meta: string; thumbnail: string | null };
    menuOpen: boolean;
    onToggleMenu: (e: React.MouseEvent) => void;
    onOpen: () => void;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div
                onClick={onOpen}
                style={{
                    aspectRatio: "4/3", borderRadius: 12, overflow: "hidden", cursor: "pointer",
                    border: "1px solid rgba(15,23,42,0.08)",
                    background: collection.thumbnail ? "#f1f5f9" : "#e7ebfb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}
            >
                {collection.thumbnail ? (
                    <img src={collection.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                    <DraftsIcon />
                )}
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginTop: 12, position: "relative" }}>
                <div>
                    <p style={{ margin: "0 0 3px", fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>{collection.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(15,23,42,0.5)" }}>{collection.meta}</p>
                </div>

                <button
                    type="button"
                    onClick={onToggleMenu}
                    aria-label="More options"
                    style={{
                        background: "none", border: "none", cursor: "pointer", color: "rgba(15,23,42,0.4)",
                        padding: 4, borderRadius: 6, flexShrink: 0,
                    }}
                >
                    <DotsIcon />
                </button>

                {menuOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: "absolute", top: 26, right: 0, background: "#fff", borderRadius: 10,
                            border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                            padding: 6, minWidth: 140, zIndex: 20,
                        }}
                    >
                        {["Rename", "Share", "Archive"].map((label) => (
                            <button
                                key={label}
                                type="button"
                                style={{
                                    display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
                                    padding: "8px 10px", fontSize: 13, color: "#0f172a", cursor: "pointer", borderRadius: 6,
                                }}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            type="button"
                            style={{
                                display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
                                padding: "8px 10px", fontSize: 13, color: "#dc2626", cursor: "pointer", borderRadius: 6,
                            }}
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function NewFolderCard({ onClick }: { onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            style={{
                aspectRatio: "4/3", borderRadius: 12, cursor: "pointer",
                border: "1.5px dashed rgba(100,116,139,0.3)", background: "#fafbfe",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                textAlign: "center", padding: 16,
            }}
        >
            <div style={{
                width: 40, height: 40, borderRadius: 10, background: "#e0e7ff",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <PlusIcon color="#0f172a" />
            </div>
            <div>
                <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Create New Folder</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(15,23,42,0.5)" }}>Organize your latest work</p>
            </div>
        </div>
    );
}