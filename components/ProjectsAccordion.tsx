// @ts-nocheck
"use client";

import { useState, useRef, useEffect } from "react";
import type { Project } from "@/lib/models";

type Props = {
    projects: Project[];
    activeProjectId: string | null;
    onSelectProject: (id: string) => void;
    onNewProject?: () => void;
    onRenameProject?: (projectId: string, newName: string) => void;
};

function getStatusColor(status: string) {
    if (status === "completed") return "#10B981";
    if (status === "rendering") return "#F59E0B";
    if (status === "failed") return "#EF4444";
    return "#94A3B8";
}

function formatDate(dateStr: string) {
    try {
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
        return "";
    }
}

function ProjectRow({
    project,
    active,
    onSelect,
    onRename,
}: {
    project: Project;
    active: boolean;
    onSelect: () => void;
    onRename?: (newName: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(project.name || "Untitled");
    const inputRef = useRef<HTMLInputElement>(null);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    function commitRename() {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== project.name && onRename) {
            onRename(trimmed);
        } else {
            setEditValue(project.name || "Untitled");
        }
        setIsEditing(false);
    }

    const thumbnail = project.floorplan_url || project.render_url;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
                background: active
                    ? "rgba(79,70,229,0.08)"
                    : hovered
                        ? "#F8FAFC"
                        : "transparent",
                borderLeft: active ? "2px solid #4F46E5" : "2px solid transparent",
                transition: "all 120ms ease",
                position: "relative",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => {
                if (!isEditing) onSelect();
            }}
        >
            {/* Thumbnail */}
            <div style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                flexShrink: 0,
                overflow: "hidden",
                background: "#F1F5F9",
                border: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                    </svg>
                )}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                    <input
                        ref={inputRef}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onBlur={commitRename}
                        onKeyDown={e => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") {
                                setEditValue(project.name || "Untitled");
                                setIsEditing(false);
                            }
                        }}
                        style={{
                            width: "100%",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#0F172A",
                            border: "none",
                            borderBottom: "1px solid #4F46E5",
                            background: "transparent",
                            outline: "none",
                            padding: "0 0 1px",
                            lineHeight: 1.4,
                        }}
                    />
                ) : (
                    <div style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: active ? "#3730A3" : "#0F172A",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.4,
                    }}>
                        {project.name || "Untitled"}
                    </div>
                )}
                <div style={{
                    fontSize: 10,
                    color: "#94A3B8",
                    marginTop: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                }}>
                    <span style={{
                        display: "inline-block",
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: getStatusColor(project.status),
                        flexShrink: 0,
                    }} />
                    <span>{project.status}</span>
                    {project.created_at && (
                        <>
                            <span style={{ color: "#CBD5E1" }}>·</span>
                            <span>{formatDate(project.created_at)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Rename button — only visible on hover */}
            {hovered && !isEditing && onRename && (
                <button
                    onClick={e => {
                        e.stopPropagation();
                        setIsEditing(true);
                    }}
                    title="Rename"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        border: "none",
                        background: "rgba(100,116,139,0.1)",
                        color: "#64748B",
                        cursor: "pointer",
                        flexShrink: 0,
                        padding: 0,
                        transition: "all 100ms",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(100,116,139,0.2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(100,116,139,0.1)"}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export default function ProjectsAccordion({
    projects,
    activeProjectId,
    onSelectProject,
    onNewProject,
    onRenameProject,
}: Props) {
    // Only the active project's group is open by default
    const [open, setOpen] = useState(true);

    const activeProject = projects.find(p => p.id === activeProjectId);
    const otherProjects = projects.filter(p => p.id !== activeProjectId);

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px 8px",
                flexShrink: 0,
            }}>
                <button
                    onClick={() => setOpen(o => !o)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        color: "#94A3B8",
                    }}
                >
                    <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#94A3B8",
                    }}>
                        Projects
                    </span>
                    <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{
                            transform: open ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 180ms ease",
                            flexShrink: 0,
                        }}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>

                {onNewProject && (
                    <button
                        type="button"
                        onClick={onNewProject}
                        title="New project"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: "rgba(99,102,241,0.08)",
                            border: "1px solid rgba(99,102,241,0.2)",
                            color: "#4F46E5",
                            cursor: "pointer",
                            flexShrink: 0,
                            fontSize: 15,
                            fontWeight: 500,
                            lineHeight: 1,
                            padding: 0,
                            transition: "all 120ms ease",
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(99,102,241,0.16)";
                            e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                    >
                        +
                    </button>
                )}
            </div>

            {/* Accordion body */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 8px 8px",
                opacity: open ? 1 : 0,
                maxHeight: open ? "100%" : 0,
                overflow: open ? "auto" : "hidden",
                transition: "opacity 180ms ease",
            }}>
                {projects.length === 0 ? (
                    <div style={{
                        padding: "12px 8px",
                        fontSize: 12,
                        color: "#94A3B8",
                        textAlign: "center",
                    }}>
                        No projects yet. Click + to start.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {/* Active project always on top */}
                        {activeProject && (
                            <ProjectRow
                                key={activeProject.id}
                                project={activeProject}
                                active={true}
                                onSelect={() => onSelectProject(activeProject.id)}
                                onRename={onRenameProject
                                    ? (name) => onRenameProject(activeProject.id, name)
                                    : undefined}
                            />
                        )}

                        {/* Divider if there are other projects */}
                        {activeProject && otherProjects.length > 0 && (
                            <div style={{
                                height: 1,
                                background: "#F1F5F9",
                                margin: "4px 2px",
                            }} />
                        )}

                        {/* Rest of projects */}
                        {otherProjects.map(project => (
                            <ProjectRow
                                key={project.id}
                                project={project}
                                active={false}
                                onSelect={() => onSelectProject(project.id)}
                                onRename={onRenameProject
                                    ? (name) => onRenameProject(project.id, name)
                                    : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}