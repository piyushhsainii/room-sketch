"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ShareDialog } from "../ui/ExportShareable";
import { CheckIcon, XIcon } from "lucide-react";

type SortMode = "newest" | "oldest" | "name";

function getStatusColor(status: string) {
    if (status === "completed") return "var(--fp-success)";
    if (status === "rendering") return "#f59e0b";
    if (status === "failed") return "var(--fp-danger)";
    return "rgba(26,26,26,0.25)";
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

function CardMenu({
    onRename,
    onArchive,
    onDelete,
    onClose,
}: {
    onRename: () => void;
    onArchive: () => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={ref}
            onClick={(e) => e.stopPropagation()}
            style={{
                position: "absolute",
                top: 44,
                right: 8,
                background: "#ffffff",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.08)",
                overflow: "hidden",
                minWidth: 130,
                zIndex: 20,
            }}
        >
            <MenuItem onClick={onRename}>Rename</MenuItem>
            <MenuItem onClick={onArchive}>Archive</MenuItem>
            <MenuItem onClick={onDelete} danger>Delete</MenuItem>
        </div>
    );
}

function MenuItem({
    children,
    onClick,
    danger,
}: {
    children: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: danger ? "#dc2626" : "#0f172a",
                background: hovered ? "rgba(15,23,42,0.05)" : "transparent",
                border: "none",
                cursor: "pointer",
            }}
        >
            {children}
        </button>
    );
}

function MoreIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
        </svg>
    );
}


function formatDate(dateStr?: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}


// ---- Claymorphism theme tokens ----
const CLAY = {
    canvas: "#E5E5E5",
    surface: "#EAEAEA",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    font: "'General Sans', system-ui, -apple-system, sans-serif",
};

// Dual soft-extrusion shadow used on chips, pills, and the card itself
const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`
        : `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`;

export function ProjectCard({
    project,
    onOpen,
    onRename,
    onArchive,
    onDelete,
}: {
    project: any;
    onOpen: () => void;
    onRename: (newName: string) => void;
    onArchive?: () => void;
    onDelete?: () => void;
    onEditLayout?: () => void;
    onViewRenders?: () => void;
    onApproveSelection?: () => void;
    onAddTask?: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(project.name || "Untitled");
    const [shareOpen, setShareOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const shareButtonRef = useRef<HTMLButtonElement>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    // Community publish state
    const [published, setPublished] = useState(!!project.published);
    const [publishBusy, setPublishBusy] = useState(false);
    const [publishHovered, setPublishHovered] = useState(false);

    // Star state (rendered where "$111" sits in the reference)
    const [starred, setStarred] = useState(!!project.starred);
    const [starCount, setStarCount] = useState(project.star_count ?? 0);
    const [starBusy, setStarBusy] = useState(false);
    const [starHovered, setStarHovered] = useState(false);

    const [shareHovered, setShareHovered] = useState(false);
    const [moreHovered, setMoreHovered] = useState(false);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isEditing) setEditValue(project.name || "Untitled");
    }, [project.name, isEditing]);

    // Keep publish state in sync if the parent re-fetches/refreshes project
    useEffect(() => {
        setPublished(!!project.published);
    }, [project.published]);

    useEffect(() => {
        setStarred(!!project.starred);
        setStarCount(project.star_count ?? 0);
    }, [project.starred, project.star_count]);

    function commit() {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== project.name) onRename(trimmed);
        setIsEditing(false);
    }

    function cancelEdit() {
        setEditValue(project.name || "Untitled");
        setIsEditing(false);
    }

    async function handleTogglePublish(e: React.MouseEvent) {
        e.stopPropagation(); // don't trigger onOpen()
        if (publishBusy) return;
        const next = !published;
        setPublishBusy(true);
        try {
            const res = await fetch(`/api/projects/${project.id}/publish`, {
                method: next ? "POST" : "DELETE",
            });
            if (!res.ok) throw new Error("Failed to update publish status");
            setPublished(next);
        } catch (err) {
            console.error("[ProjectCard] publish toggle failed:", err);
        } finally {
            setPublishBusy(false);
        }
    }

    async function handleToggleStar(e: React.MouseEvent) {
        e.stopPropagation(); // don't trigger onOpen()
        if (starBusy) return;
        const next = !starred;
        const prevCount = starCount;
        setStarBusy(true);
        setStarred(next);
        setStarCount((c: number) => Math.max(0, c + (next ? 1 : -1)));
        try {
            const res = await fetch(`/api/projects/${project.id}/star`, {
                method: next ? "POST" : "DELETE",
            });
            if (!res.ok) throw new Error("Failed to update star status");
        } catch (err) {
            console.error("[ProjectCard] star toggle failed:", err);
            setStarred(!next);
            setStarCount(prevCount);
        } finally {
            setStarBusy(false);
        }
    }

    const thumbnail = project.thumbnail_url || project.render_url || project.floorplan_url;
    const renderCount = Array.isArray(project.renders) ? project.renders.length : 1;
    const subtitle = project.subtitle || (project.status ? formatStatusLabel(project.status) : "Layout project");
    const description = project.description || "A floorplan project ready to explore, refine, and share.";

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => { if (!isEditing) onOpen(); }}
            style={{
                position: "relative",
                border: "none",
                borderRadius: 30,
                overflow: "hidden",
                background: CLAY.surface,
                cursor: isEditing ? "default" : "pointer",
                boxShadow: hovered
                    ? "0 24px 44px rgba(0,0,0,0.14), -6px -6px 14px rgba(255,255,255,0.65), 6px 6px 16px rgba(0,0,0,0.12)"
                    : "0 20px 40px rgba(0,0,0,0.10), -6px -6px 12px rgba(255,255,255,0.6), 6px 6px 14px rgba(0,0,0,0.10)",
                transform: hovered ? "translateY(-3px)" : "translateY(0)",
                transition: "box-shadow 220ms ease, transform 220ms ease",
                display: "flex",
                flexDirection: "column",
                maxWidth: 340,
                fontFamily: CLAY.font,
                fontWeight: 400,
                letterSpacing: "normal",
            }}
        >
            <style>{`@import url("https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700&display=swap");`}</style>

            {/* Thumbnail */}
            <div style={{
                position: "relative", aspectRatio: "1/1", background: "#DEDEDE", overflow: "hidden", flexShrink: 0,
                margin: 14, borderRadius: 22,
                boxShadow: `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`,
            }}>
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt=""
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            transform: hovered ? "scale(1.03)" : "scale(1)",
                            transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
                        }}
                    />
                ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FloorplanIcon />
                    </div>
                )}

                {/* Top-left status badge — soft glassy gradient wash pill, like "Suggest for you" */}
                {project.status && (
                    <div style={{
                        position: "absolute", top: 12, left: 12,
                        padding: "6px 14px", borderRadius: 999,
                        background: "linear-gradient(120deg, rgba(167,243,208,0.55), rgba(191,219,254,0.55))",
                        backdropFilter: "blur(8px)",
                        color: "#3f3f46", fontSize: 12, fontWeight: 500, letterSpacing: "normal",
                        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.6)",
                    }}>
                        {formatStatusLabel(project.status)}
                    </div>
                )}

                {/* Top-right action chips — circular, claymorphic */}
                <div style={{
                    position: "absolute", top: 12, right: 12,
                    display: "flex", gap: 8,
                    opacity: hovered || menuOpen ? 1 : 0,
                    transform: hovered || menuOpen ? "translateY(0)" : "translateY(-4px)",
                    transition: "opacity 180ms ease, transform 180ms ease",
                    pointerEvents: hovered || menuOpen ? "auto" : "none",
                }}>
                    <ClayIconChip
                        title="Export / Share"
                        onClick={e => { e.stopPropagation(); setShareOpen(true); }}
                        hovered={shareHovered}
                        onHoverChange={setShareHovered}
                        buttonRef={shareButtonRef}
                    >
                        <ShareIcon />
                    </ClayIconChip>
                    <ClayIconChip
                        title="More"
                        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                        hovered={moreHovered}
                        onHoverChange={setMoreHovered}
                    >
                        <MoreIcon />
                    </ClayIconChip>
                </div>

                {menuOpen && (
                    <CardMenu
                        onRename={() => { setMenuOpen(false); setIsEditing(true); }}
                        onArchive={() => { setMenuOpen(false); onArchive?.(); }}
                        onDelete={() => { setMenuOpen(false); setConfirmingDelete(true); }}
                        onClose={() => setMenuOpen(false)}
                    />
                )}
                {confirmingDelete && (
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: "absolute", inset: 14, borderRadius: 22,
                            background: "rgba(20,20,20,0.72)", backdropFilter: "blur(3px)",
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", gap: 12, padding: 20, zIndex: 21,
                            textAlign: "center",
                        }}
                    >
                        <span style={{ color: "#fff", fontSize: 13.5, fontWeight: 500, lineHeight: 1.4 }}>
                            Delete "{project.name || "Untitled"}"? This can't be undone.
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setConfirmingDelete(false)}
                                style={{ padding: "7px 14px", borderRadius: 999, border: "none", background: "rgba(255,255,255,0.9)", color: "#1A1A1A", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => { setConfirmingDelete(false); onDelete?.(); }}
                                style={{ padding: "7px 14px", borderRadius: 999, border: "none", background: "#dc2626", color: "#fff", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )}
                {/* Pagination dots */}
                {renderCount > 1 && (
                    <div style={{
                        position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                        display: "flex", gap: 5,
                    }}>
                        {Array.from({ length: Math.min(renderCount, 5) }).map((_, i) => (
                            <span key={i} style={{
                                width: i === 0 ? 6 : 5,
                                height: i === 0 ? 6 : 5,
                                borderRadius: "50%",
                                background: i === 0 ? "#ffffff" : "rgba(255,255,255,0.55)",
                            }} />
                        ))}
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ padding: "8px 22px 22px", display: "flex", flexDirection: "column", gap: 6 }}>
                {isEditing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                            ref={inputRef}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => {
                                if (e.key === "Enter") commit();
                                if (e.key === "Escape") cancelEdit();
                            }}
                            style={{
                                fontFamily: CLAY.font, fontSize: 18, fontWeight: 500,
                                color: CLAY.textPrimary, border: "none",
                                borderBottom: "1px solid rgba(0,0,0,0.15)",
                                background: "transparent", outline: "none",
                                padding: "0 0 3px", flex: 1, minWidth: 0,
                            }}
                        />
                        <button
                            type="button"
                            title="Save"
                            onClick={e => { e.stopPropagation(); commit(); }}
                            style={{ border: "none", background: "none", cursor: "pointer", color: "#16a34a", display: "flex", flexShrink: 0 }}
                        >
                            <CheckIcon />
                        </button>
                        <button
                            type="button"
                            title="Cancel"
                            onClick={e => { e.stopPropagation(); cancelEdit(); }}
                            style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", display: "flex", flexShrink: 0 }}
                        >
                            <XIcon />
                        </button>
                    </div>
                ) : (
                    <span /* ...unchanged display span... */ >
                        {project.name || "Untitled"}
                    </span>
                )}

                <span style={{ fontSize: 13, color: CLAY.textMuted, fontWeight: 400, lineHeight: 1.4 }}>
                    {subtitle}
                </span>

                <p style={{
                    fontSize: 14, color: CLAY.textMuted, lineHeight: 1.5, margin: "2px 0 4px",
                    fontWeight: 400, letterSpacing: "normal",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                }}>
                    {description}
                </p>

                {/* Bottom row — star where the reference shows price, CTA where it shows "Buy Now" */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                    <button
                        onClick={handleToggleStar}
                        onMouseEnter={e => { e.stopPropagation(); setStarHovered(true); }}
                        onMouseLeave={e => { e.stopPropagation(); setStarHovered(false); }}
                        title={starred ? "Unstar" : "Star"}
                        style={{
                            display: "flex", alignItems: "center", gap: 8,
                            border: "none", borderRadius: 999,
                            background: CLAY.surface,
                            padding: "8px 14px 8px 10px",
                            cursor: "pointer", color: CLAY.textPrimary,
                            fontFamily: CLAY.font,
                            boxShadow: starHovered
                                ? `${clayRaised(false)}, 0 0 14px rgba(245,158,11,0.45)`
                                : clayRaised(true),
                            transition: "box-shadow 220ms ease",
                        }}
                    >
                        <StarIcon filled={starred} glow={starHovered} />
                        <span style={{ fontSize: 15, fontWeight: 500, color: CLAY.textPrimary }}>
                            {starCount}
                        </span>
                    </button>

                    <button
                        onClick={handleTogglePublish}
                        onMouseEnter={e => { e.stopPropagation(); setPublishHovered(true); }}
                        onMouseLeave={e => { e.stopPropagation(); setPublishHovered(false); }}
                        disabled={publishBusy}
                        title={published ? "Remove from Community" : "Post to Community"}
                        style={{
                            display: "flex", alignItems: "center", gap: 7,
                            border: "none", borderRadius: 999,
                            background: published
                                ? (publishHovered
                                    ? "linear-gradient(145deg, #f28b8b, #e35d5d)"
                                    : "linear-gradient(145deg, #8fe3c0, #5fcf9e)")
                                : CLAY.surface,
                            color: "#1A1A1A",
                            padding: "10px 16px",
                            fontSize: 13, fontWeight: 500, letterSpacing: "normal",
                            fontFamily: CLAY.font,
                            cursor: publishBusy ? "default" : "pointer",
                            opacity: publishBusy ? 0.7 : 1,
                            boxShadow: published
                                ? (publishHovered
                                    ? "0 6px 14px -4px rgba(227,93,93,0.45), inset 0 1px 1px rgba(255,255,255,0.4)"
                                    : "0 6px 14px -4px rgba(95,207,158,0.45), inset 0 1px 1px rgba(255,255,255,0.4)")
                                : (publishHovered ? clayRaised(true) : clayRaised(false)),
                            transform: publishHovered ? "translateY(-1px)" : "translateY(0)",
                            transition: "background 200ms ease, box-shadow 200ms ease, transform 200ms ease, opacity 160ms ease",
                        }}
                    >
                        {publishBusy ? (
                            <SpinnerIcon />
                        ) : (
                            <GlobeIcon color="#333" size={13} />
                        )}
                        {published
                            ? (publishHovered ? "Remove from Community" : "Posted to Community")
                            : "Post to Community"}
                        {!published && <ArrowIcon color="#333" />}
                    </button>
                </div>
            </div>

            {shareOpen && (
                <ShareDialog
                    projectId={project.id}
                    onClose={() => setShareOpen(false)}
                    anchorEl={shareButtonRef.current}
                />
            )}
        </div>
    );
}

function ClayIconChip({
    children,
    title,
    onClick,
    hovered,
    onHoverChange,
    buttonRef,
}: {
    children: React.ReactNode;
    title: string;
    onClick: (e: React.MouseEvent) => void;
    hovered: boolean;
    onHoverChange: (v: boolean) => void;
    buttonRef?: React.RefObject<HTMLButtonElement | null>;
}) {
    return (
        <button
            ref={buttonRef}
            title={title}
            onClick={onClick}
            onMouseEnter={e => { e.stopPropagation(); onHoverChange(true); }}
            onMouseLeave={e => { e.stopPropagation(); onHoverChange(false); }}
            style={{
                width: 34, height: 34, borderRadius: "50%",
                border: "none",
                background: "#F5F5F5",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                boxShadow: hovered
                    ? "inset 2px 2px 6px rgba(0,0,0,0.14), inset -2px -2px 6px rgba(255,255,255,0.7)"
                    : "-3px -3px 7px rgba(255,255,255,0.75), 3px 3px 8px rgba(0,0,0,0.16)",
                transition: "box-shadow 180ms ease",
            }}
        >
            {children}
        </button>
    );
}
function formatStatusLabel(status: string) {
    return status
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function StarIcon({ filled, glow }: { filled: boolean; glow?: boolean }) {
    const color = filled || glow ? "#F59E0B" : "#333333";
    return (
        <svg
            width="17" height="17" viewBox="0 0 24 24"
            fill={filled || glow ? "#F59E0B" : "none"}
            stroke={color}
            strokeWidth="1.7"
            style={{
                filter: glow ? "drop-shadow(0 0 5px rgba(245,158,11,0.75))" : "none",
                transition: "filter 200ms ease, fill 200ms ease, stroke 200ms ease",
            }}
        >
            <path d="M12 2.5l2.9 6.24 6.6.62-5.1 4.53 1.55 6.61L12 17.9l-5.95 3.6 1.55-6.61-5.1-4.53 6.6-.62L12 2.5z" strokeLinejoin="round" />
        </svg>
    );
}

function ArrowIcon({ color = "#fff" }: { color?: string }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M9 7h8v8" />
        </svg>
    );
}


function GlobeIcon({ color, size = 14 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 4 6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6-4-9s1.5-6.3 4-9z" />
        </svg>
    );
}

function SpinnerIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(100,116,139,0.25)" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

export function ProjectCardSkeleton() {
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
    projects: any[];
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

            {!error && (
                <h3 style={{
                    margin: "0 0 14px",
                    fontSize: 15,
                    fontWeight: 500,
                    color: "rgba(26,26,26,0.88)",
                    letterSpacing: "-0.01em",
                }}>
                    Recent Activity
                </h3>
            )}

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