"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { Project } from "@/lib/models";
import { ShareDialog } from "../ui/ExportShareable";

type SortMode = "newest" | "oldest" | "name";

function getStatusColor(status: string) {
    if (status === "completed") return "var(--fp-success)";
    if (status === "rendering") return "#f59e0b";
    if (status === "failed") return "var(--fp-danger)";
    return "rgba(26,26,26,0.25)";
}

function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function FloorplanIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="24" height="24" stroke="rgba(26,26,26,0.2)" strokeWidth="1" />
            <path d="M4 13h14M13 13v15M18 4v24" stroke="rgba(26,26,26,0.2)" strokeWidth="1" />
            <path d="M18 20h10" stroke="rgba(26,26,26,0.2)" strokeWidth="1" />
        </svg>
    );
}

function ShareIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
    );
}

function RenameIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function ActionButton({
    title,
    onClick,
    children,
}: {
    title: string;
    onClick: (e: React.MouseEvent) => void;
    children: React.ReactNode;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            title={title}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 5,
                border: "none",
                background: hovered ? "rgba(26,26,26,0.1)" : "rgba(26,26,26,0.05)",
                // Always a visible dark color — never transparent
                color: hovered ? "rgba(26,26,26,0.85)" : "rgba(26,26,26,0.5)",
                cursor: "pointer",
                transition: "background 120ms ease, color 120ms ease",
                flexShrink: 0,
                padding: 0,
            }}
        >
            {children}
        </button>
    );
}

function ProjectCard({
    project,
    onOpen,
    onRename,
}: {
    project: Project;
    onOpen: () => void;
    onRename: (newName: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(project.name || "Untitled");
    const [shareOpen, setShareOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isEditing) setEditValue(project.name || "Untitled");
    }, [project.name, isEditing]);

    function commit() {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== project.name) onRename(trimmed);
        else setEditValue(project.name || "Untitled");
        setIsEditing(false);
    }

    const thumbnail = project.render_url || project.floorplan_url;

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => { if (!isEditing) onOpen(); }}
            style={{
                border: `1px solid ${hovered ? "rgba(15,15,15,0.18)" : "rgba(15,15,15,0.1)"}`,
                borderRadius: 8,
                overflow: "hidden",
                background: "var(--fp-bg)",
                cursor: isEditing ? "default" : "pointer",
                transition: "box-shadow 180ms ease, border-color 180ms ease",
                boxShadow: hovered
                    ? "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)"
                    : "none",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Thumbnail */}
            <div style={{
                aspectRatio: "4/3",
                background: "#f7f7f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
            }}>
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                ) : (
                    <FloorplanIcon />
                )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(15,15,15,0.07)", flexShrink: 0 }} />

            {/* Info */}
            <div style={{ padding: "11px 12px 13px", display: "flex", flexDirection: "column", gap: 5 }}>
                {isEditing ? (
                    <input
                        ref={inputRef}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onBlur={commit}
                        onKeyDown={e => {
                            if (e.key === "Enter") commit();
                            if (e.key === "Escape") { setEditValue(project.name || "Untitled"); setIsEditing(false); }
                        }}
                        style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "rgba(26,26,26,1)",
                            border: "none",
                            borderBottom: "1px solid rgba(99,102,241,0.5)",
                            background: "transparent",
                            outline: "none",
                            padding: "0 0 2px",
                            width: "100%",
                            letterSpacing: "-0.01em",
                        }}
                    />
                ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, minHeight: 24 }}>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "rgba(26,26,26,0.9)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            letterSpacing: "-0.01em",
                        }}>
                            {project.name || "Untitled"}
                        </span>

                        {/* Actions — fade in on card hover */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            opacity: hovered ? 1 : 0,
                            transition: "opacity 150ms ease",
                            flexShrink: 0,
                        }}>
                            <ActionButton
                                title="Export / Share"
                                onClick={e => { e.stopPropagation(); setShareOpen(true); }}
                            >
                                <ShareIcon />
                            </ActionButton>
                            <ActionButton
                                title="Rename"
                                onClick={e => { e.stopPropagation(); setIsEditing(true); }}
                            >
                                <RenameIcon />
                            </ActionButton>
                        </div>
                    </div>
                )}

                {/* Meta */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: "rgba(26,26,26,0.45)",
                    fontWeight: 300,
                }}>
                    <span style={{
                        display: "inline-block",
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: getStatusColor(project.status),
                        flexShrink: 0,
                    }} />
                    <span style={{ textTransform: "capitalize" }}>{project.status}</span>
                    <span style={{ color: "rgba(26,26,26,0.18)" }}>·</span>
                    <span>{formatDate((project as any).created_at)}</span>
                </div>
            </div>

            {shareOpen && (
                <div onClick={e => e.stopPropagation()}>
                    <ShareDialog projectId={project.id} onClose={() => setShareOpen(false)} />
                </div>
            )}
        </div>
    );
}

function ProjectCardSkeleton() {
    return (
        <div style={{
            border: "1px solid rgba(15,15,15,0.1)",
            borderRadius: 8,
            overflow: "hidden",
            background: "#ffffff",
        }}>
            <div style={{
                aspectRatio: "4/3",
                background: "linear-gradient(90deg, #f0f0ee 25%, #e8e8e6 37%, #f0f0ee 63%)",
                backgroundSize: "400% 100%",
                animation: "raShimmer 1.4s ease infinite",
            }} />
            <div style={{ height: 1, background: "rgba(15,15,15,0.07)" }} />
            <div style={{ padding: "11px 12px 13px", display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ height: 12, width: "55%", borderRadius: 3, background: "#f0f0ee" }} />
                <div style={{ height: 10, width: "38%", borderRadius: 3, background: "#f0f0ee" }} />
            </div>
            <style>{`@keyframes raShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }`}</style>
        </div>
    );
}

function NewProjectButton({ onClick }: { onClick: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                height: 32,
                padding: "0 14px",
                borderRadius: 6,
                border: "none",
                background: "rgba(26,26,26,0.9)",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                letterSpacing: "-0.01em",
                opacity: hovered ? 0.78 : 1,
                transition: "opacity 150ms ease",
            }}
        >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
        </button>
    );
}

export default function ProjectsGrid({
    projects,
    loading,
    error,
    onRetry,
    onOpenProject,
    onRenameProject,
    onNewProject,
}: {
    projects: Project[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onOpenProject: (projectId: string) => void;
    onRenameProject: (projectId: string, newName: string) => void;
    onNewProject: () => void;
}) {
    const [sortMode, setSortMode] = useState<SortMode>("newest");

    const sorted = useMemo(() => {
        const list = [...projects];
        if (sortMode === "newest") {
            list.sort((a, b) => new Date((b as any).created_at ?? 0).getTime() - new Date((a as any).created_at ?? 0).getTime());
        } else if (sortMode === "oldest") {
            list.sort((a, b) => new Date((a as any).created_at ?? 0).getTime() - new Date((b as any).created_at ?? 0).getTime());
        } else {
            list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        }
        return list;
    }, [projects, sortMode]);

    return (
        <div style={{
            flex: 1,
            padding: "32px 36px",
            overflowY: "auto",
            background: "#fafaf8",
            minHeight: "100%",
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: 28,
                paddingBottom: 20,
                borderBottom: "1px solid rgba(15,15,15,0.1)",
            }}>
                <div>
                    <span style={{
                        display: "block",
                        fontSize: 9.5,
                        fontWeight: 500,
                        color: "rgba(26,26,26,0.32)",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        marginBottom: 6,
                    }}>
                        Projects
                    </span>
                    <h2 style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 300,
                        color: "rgba(26,26,26,0.88)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                    }}>
                        {loading
                            ? "Loading…"
                            : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
                    </h2>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Sort */}
                    <div style={{ position: "relative" }}>
                        <select
                            value={sortMode}
                            onChange={e => setSortMode(e.target.value as SortMode)}
                            style={{
                                height: 32,
                                padding: "0 28px 0 10px",
                                borderRadius: 6,
                                border: "1px solid rgba(15,15,15,0.12)",
                                background: "#ffffff",
                                color: "rgba(26,26,26,0.5)",
                                fontSize: 12,
                                fontWeight: 300,
                                cursor: "pointer",
                                outline: "none",
                                appearance: "none",
                                WebkitAppearance: "none",
                            }}
                        >
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                            <option value="name">Name (A–Z)</option>
                        </select>
                        <svg
                            width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="rgba(26,26,26,0.3)" strokeWidth="2" strokeLinecap="round"
                            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                        >
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </div>

                    <NewProjectButton onClick={onNewProject} />
                </div>
            </div>

            {/* Error */}
            {error && !loading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0" }}>
                    <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 400 }}>{error}</span>
                    <button
                        type="button"
                        onClick={onRetry}
                        style={{
                            height: 30,
                            padding: "0 14px",
                            borderRadius: 6,
                            border: "1px solid rgba(15,15,15,0.12)",
                            background: "#ffffff",
                            color: "rgba(26,26,26,0.5)",
                            fontSize: 12,
                            fontWeight: 300,
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Skeletons */}
            {!error && loading && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
                    {Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
                </div>
            )}

            {/* Empty state */}
            {!error && !loading && sorted.length === 0 && (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: "80px 0",
                    textAlign: "center",
                }}>
                    <div style={{ marginBottom: 4 }}>
                        <FloorplanIcon />
                    </div>
                    <p style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 400,
                        color: "rgba(26,26,26,0.75)",
                        letterSpacing: "-0.02em",
                    }}>
                        No projects yet
                    </p>
                    <p style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 300,
                        color: "rgba(26,26,26,0.4)",
                    }}>
                        Click <em>New Project</em> to get started.
                    </p>
                </div>
            )}

            {/* Grid */}
            {!error && !loading && sorted.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
                    {sorted.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onOpen={() => onOpenProject(project.id)}
                            onRename={name => onRenameProject(project.id, name)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}