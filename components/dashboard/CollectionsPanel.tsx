"use client";

import { useEffect, useMemo, useState } from "react";
import StarButton from "../workspace/dashboard/StarButton";

// ---- Claymorphism theme tokens (shared with ProjectCard) ----
const CLAY = {
    canvas: "#E5E5E5",
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    font: "'General Sans', system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`
        : `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`;

function SearchIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
        </svg>
    );
}

function PlusIcon({ color = "#1A1A1A" }: { color?: string }) {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.28)" strokeWidth="1.6" strokeLinecap="round">
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
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.22)" strokeWidth="1.4" strokeLinejoin="round">
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
    const [searchFocused, setSearchFocused] = useState(false);
    const [newCollectionHovered, setNewCollectionHovered] = useState(false);
    const [browseHovered, setBrowseHovered] = useState(false);

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
        <div
            className="ra-collections-pad"
            style={{ background: CLAY.canvas, fontFamily: CLAY.font, minHeight: "100%" }}
            onClick={() => setOpenMenuId(null)}
        >
            <style>{`
                .ra-collections-pad { padding: 28px 36px 60px; }
                @media (max-width: 860px) {
                    .ra-collections-pad { padding: 18px 16px 40px; }
                }
            `}</style>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
                <div>
                    <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 400, color: CLAY.textPrimary, letterSpacing: "normal" }}>
                        Collections
                    </h1>
                    <p style={{ margin: 0, fontSize: 13.5, color: CLAY.textMuted }}>
                        Organize your spatial concepts and blueprints.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 14px",
                        borderRadius: 999, border: "none", background: CLAY.surface, minWidth: 220,
                        boxShadow: searchFocused ? clayRaised(true) : clayRaised(true),
                    }}>
                        <SearchIcon />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            placeholder={activeTab === "starred" ? "Search starred..." : "Search collections..."}
                            style={{ border: "none", outline: "none", fontSize: 13.5, flex: 1, background: "transparent", color: CLAY.textPrimary, fontFamily: CLAY.font }}
                        />
                    </div>
                    {activeTab !== "starred" && (
                        <button
                            type="button"
                            onClick={onCreateCollection}
                            onMouseEnter={() => setNewCollectionHovered(true)}
                            onMouseLeave={() => setNewCollectionHovered(false)}
                            style={{
                                display: "flex", alignItems: "center", gap: 7, height: 40, padding: "0 18px",
                                borderRadius: 999, border: "none", background: CLAY.surface, color: CLAY.textPrimary,
                                fontSize: 13.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                                fontFamily: CLAY.font,
                                boxShadow: newCollectionHovered ? clayRaised(true) : clayRaised(false),
                                transition: "box-shadow 180ms ease",
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
                <div style={{
                    display: "flex", alignItems: "center", gap: 4, padding: 5, borderRadius: 999,
                    background: CLAY.surface, boxShadow: clayRaised(true),
                }}>
                    {TABS.map((tab) => {
                        const active = tab.id === activeTab;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    height: 32, padding: "0 16px", borderRadius: 999, border: "none",
                                    background: active ? CLAY.surfaceChip : "transparent",
                                    color: active ? CLAY.textPrimary : CLAY.textMuted,
                                    fontSize: 13, fontWeight: active ? 500 : 400, cursor: "pointer",
                                    fontFamily: CLAY.font,
                                    boxShadow: active ? clayRaised(false) : "none",
                                    transition: "box-shadow 180ms ease, background 180ms ease",
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
                            color: CLAY.textMuted, fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
                            fontFamily: CLAY.font,
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
                    padding: "72px 24px", borderRadius: 24, background: CLAY.surface,
                    boxShadow: `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`,
                }}>
                    <ComingSoonIcon />
                    <h4 style={{ margin: "20px 0 8px", fontSize: 17, fontWeight: 400, color: CLAY.textPrimary }}>
                        Shared collaboration is coming soon
                    </h4>
                    <p style={{ margin: 0, fontSize: 13.5, color: CLAY.textMuted, maxWidth: 340, lineHeight: 1.5 }}>
                        Invite teammates, share collections, and co-edit floorplans in real time — we&apos;re building it now.
                    </p>
                </div>
            )}

            {/* Starred tab */}
            {activeTab === "starred" && (
                <>
                    {starredLoading && (
                        <div style={{ textAlign: "center", padding: "48px 0", color: CLAY.textMuted, fontSize: 13.5 }}>
                            Loading starred projects…
                        </div>
                    )}

                    {!starredLoading && starredError && (
                        <div style={{ textAlign: "center", padding: "48px 0", color: "#c2483f", fontSize: 13.5 }}>
                            {starredError}
                        </div>
                    )}

                    {!starredLoading && !starredError && filteredStarred.length === 0 && (
                        <div style={{
                            display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                            padding: "72px 24px", borderRadius: 24, background: CLAY.surface,
                            boxShadow: `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`,
                        }}>
                            <EmptyStarIcon />
                            <h4 style={{ margin: "20px 0 8px", fontSize: 17, fontWeight: 400, color: CLAY.textPrimary }}>
                                {search ? "No starred projects match your search" : "No starred projects yet"}
                            </h4>
                            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: CLAY.textMuted, maxWidth: 340, lineHeight: 1.5 }}>
                                Star projects from the community to save them here.
                            </p>
                            {!search && (
                                <button
                                    type="button"
                                    onClick={() => onNavigate?.("3d_viewer")}
                                    onMouseEnter={() => setBrowseHovered(true)}
                                    onMouseLeave={() => setBrowseHovered(false)}
                                    style={{
                                        height: 38, padding: "0 20px", borderRadius: 999, border: "none",
                                        background: CLAY.surface, color: CLAY.textPrimary, fontSize: 13, fontWeight: 500,
                                        cursor: "pointer", fontFamily: CLAY.font,
                                        boxShadow: browseHovered ? clayRaised(true) : clayRaised(false),
                                        transition: "box-shadow 180ms ease",
                                    }}
                                >
                                    Browse Community
                                </button>
                            )}
                        </div>
                    )}

                    {!starredLoading && !starredError && filteredStarred.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 24 }}>
                            {filteredStarred.map((p) => (
                                <StarredCard key={p.id} project={p} onOpen={() => onOpenStarredProject?.(p.id)} onUnstar={handleUnstar} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* All / Recent: real project grid */}
            {activeTab !== "shared" && activeTab !== "starred" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 24 }}>
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
                            color: CLAY.textMuted, fontSize: 13.5,
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
    const [hovered, setHovered] = useState(false);
    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div
                onClick={onOpen}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    aspectRatio: "4/3", borderRadius: 20, overflow: "hidden", cursor: "pointer",
                    background: CLAY.surface,
                    boxShadow: hovered
                        ? `inset 4px 4px 10px ${CLAY.darkShadow}, inset -4px -4px 10px ${CLAY.lightShadow}`
                        : `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`,
                    transition: "box-shadow 180ms ease",
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
                    <p style={{ margin: "0 0 3px", fontSize: 14.5, fontWeight: 500, color: CLAY.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.name}
                    </p>
                    <p style={{ margin: "0 0 2px", fontSize: 12, color: CLAY.textMuted }}>
                        {project.author_name ? `by ${project.author_name}` : ""}
                    </p>
                    <p style={{ margin: 0, fontSize: 11.5, color: CLAY.textPlaceholder }}>
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
    const [hovered, setHovered] = useState(false);
    const [dotsHovered, setDotsHovered] = useState(false);

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div
                onClick={onOpen}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    aspectRatio: "4/3", borderRadius: 20, overflow: "hidden", cursor: "pointer",
                    background: CLAY.surface,
                    boxShadow: hovered
                        ? `inset 4px 4px 10px ${CLAY.darkShadow}, inset -4px -4px 10px ${CLAY.lightShadow}`
                        : `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`,
                    transition: "box-shadow 180ms ease",
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
                    <p style={{ margin: "0 0 3px", fontSize: 14.5, fontWeight: 500, color: CLAY.textPrimary }}>{collection.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: CLAY.textMuted }}>{collection.meta}</p>
                </div>

                <button
                    type="button"
                    onClick={onToggleMenu}
                    onMouseEnter={() => setDotsHovered(true)}
                    onMouseLeave={() => setDotsHovered(false)}
                    aria-label="More options"
                    style={{
                        background: dotsHovered || menuOpen ? CLAY.surfaceChip : "none",
                        border: "none", cursor: "pointer", color: CLAY.textMuted,
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: dotsHovered || menuOpen
                            ? "inset 2px 2px 5px rgba(0,0,0,0.14), inset -2px -2px 5px rgba(255,255,255,0.7)"
                            : "none",
                        transition: "box-shadow 180ms ease, background 180ms ease",
                    }}
                >
                    <DotsIcon />
                </button>

                {menuOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: "absolute", top: 30, right: 0, background: CLAY.surface, borderRadius: 16,
                            boxShadow: "0 16px 32px rgba(0,0,0,0.14), -4px -4px 10px rgba(255,255,255,0.6), 4px 4px 12px rgba(0,0,0,0.1)",
                            padding: 6, minWidth: 150, zIndex: 20,
                        }}
                    >
                        {["Rename", "Share", "Archive"].map((label) => (
                            <button
                                key={label}
                                type="button"
                                style={{
                                    display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
                                    padding: "9px 12px", fontSize: 13, color: CLAY.textPrimary, cursor: "pointer", borderRadius: 10,
                                    fontFamily: CLAY.font, fontWeight: 500,
                                }}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            type="button"
                            style={{
                                display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
                                padding: "9px 12px", fontSize: 13, color: "#c2483f", cursor: "pointer", borderRadius: 10,
                                fontFamily: CLAY.font, fontWeight: 500,
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
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                aspectRatio: "4/3", borderRadius: 20, cursor: "pointer",
                border: "none", background: CLAY.surface,
                boxShadow: hovered ? clayRaised(true) : clayRaised(false),
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                textAlign: "center", padding: 16,
                transition: "box-shadow 180ms ease",
            }}
        >
            <div style={{
                width: 42, height: 42, borderRadius: "50%", background: CLAY.surfaceChip,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "-3px -3px 7px rgba(255,255,255,0.75), 3px 3px 8px rgba(0,0,0,0.16)",
            }}>
                <PlusIcon />
            </div>
            <div>
                <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 500, color: CLAY.textPrimary }}>Create New Folder</p>
                <p style={{ margin: 0, fontSize: 12, color: CLAY.textMuted }}>Organize your latest work</p>
            </div>
        </div>
    );
}