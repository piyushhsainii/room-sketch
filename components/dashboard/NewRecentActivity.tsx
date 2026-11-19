// PATH: components/dashboard/RecentActivity.tsx
"use client";

import { dashboardTheme as CLAY } from "@/components/dashboard/dashboard-theme";

import { Clock } from "lucide-react";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectsGrid";
import type { ActiveFeature } from "@/components/sidebar/Sidebar";
import { useState } from "react";
import { useGatedCreate } from "@/lib/hooks/useGatedCreate";

function CompassIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(15,15,15,0.3)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 15l2-6 4-2-2 6-4 2z" strokeLinejoin="round" />
        </svg>
    );
}

const VISIBLE_LIMIT = 8;

export default function RecentActivity({
    projects, loading, error, onRetry, onOpenProject, onRenameProject,
    onArchiveProject, onDeleteProject,
    onCreateNew, onBrowseTemplates, onNavigate,
}: {
    projects: any[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onOpenProject: (id: string) => void;
    onRenameProject: (id: string, name: string) => void;
    onArchiveProject: (id: string) => void;
    onDeleteProject: (id: string) => void;
    onCreateNew: () => void;
    onBrowseTemplates: () => void;
    onNavigate: (feature: ActiveFeature) => void;
}) {
    const { guard, atProjectLimit, plan } = useGatedCreate();

    return (
        <div style={{ marginTop: 40 }} className="max-w-[1600px]">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div className="flex items-center gap-2">
                    <Clock size={15} />
                    <h3 style={{ margin: 0, fontSize: 16, color: "rgba(15,15,15,0.9)" }} className="tracking-tight">
                        Recent Activity
                    </h3>
                </div>
            </div>

            {
                error && !loading && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0" }}>
                        <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
                        <button type="button" onClick={onRetry} style={{ height: 30, padding: "0 14px", borderRadius: 6, border: "1px solid rgba(15,15,15,0.12)", background: "#fff", color: "rgba(15,15,15,0.5)", fontSize: 12, cursor: "pointer" }}>
                            Try again
                        </button>
                    </div>
                )
            }

            {
                !error && loading && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(270px, 100%), 1fr))", gap: 20 }}>
                        {Array.from({ length: 5 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
                    </div>
                )
            }

            {
                !error && !loading && projects.length === 0 && (
                    <div style={{
                        borderRadius: 16,
                        background: CLAY.surface,
                        border: `1px solid ${CLAY.border}`,
                        boxShadow: "none",
                        padding: "56px 24px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        fontFamily: CLAY.font,
                    }}>
                        <div style={{
                            width: 60, height: 60, borderRadius: "50%", background: CLAY.surfaceChip,
                            border: `1px solid ${CLAY.border}`,
                            boxShadow: "none",
                            display: "flex",
                            alignItems: "center", justifyContent: "center", marginBottom: 18,
                        }}>
                            <CompassIcon />
                        </div>
                        <h4 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 500, color: CLAY.textPrimary }}>
                            No projects yet
                        </h4>
                        <p style={{ margin: "0 0 22px", fontSize: 13.5, color: CLAY.textMuted, maxWidth: 320, lineHeight: 1.5 }}>
                            Start your first 3D floorplan or explore our templates to begin.
                        </p>
                        <div style={{ display: "flex", gap: 12 }}>
                            <CreateNewProjectButton onClick={() => guard(onCreateNew)} />
                            <BrowseTemplatesButton onClick={onBrowseTemplates} />
                        </div>
                    </div>
                )
            }

            {
                !error && !loading && projects.length > 0 && (
                    <>
                        {atProjectLimit && plan && (
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: CLAY.surface,
                                border: `1px solid ${CLAY.border}`,
                                borderRadius: 14, padding: "10px 16px", marginBottom: 16,
                                fontFamily: CLAY.font,
                            }}>
                                <span style={{ fontSize: 12, color: CLAY.textMuted }}>
                                    You've used {plan.projectsUsed}/{plan.projectLimit} projects on the {plan.planLabel} plan.
                                </span>
                                <a href="/pricing" style={{ fontSize: 12, fontWeight: 500, color: "#3D9A5C", textDecoration: "underline" }}>
                                    Upgrade
                                </a>
                            </div>
                        )}

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                            {projects.slice(0, VISIBLE_LIMIT).map(project => (
                                <div key={project.id} style={{ flex: "1 1 270px", maxWidth: 320 }}>
                                    <ProjectCard
                                        project={project}
                                        onOpen={() => onOpenProject(project.id)}
                                        onRename={name => onRenameProject(project.id, name)}
                                        onArchive={() => onArchiveProject(project.id)}
                                        onDelete={() => onDeleteProject(project.id)}
                                    />
                                </div>
                            ))}
                        </div>

                        {projects.length > VISIBLE_LIMIT && (
                            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24 }}>
                                <div style={{ flex: 1, height: 1, background: "rgba(15,23,42,0.08)" }} />
                                <button
                                    type="button"
                                    onClick={() => onNavigate("collections")}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                                        background: "none", border: "none", cursor: "pointer", padding: 0,
                                        fontSize: 12.5, fontWeight: 500, color: "rgba(15,23,42,0.5)",
                                    }}
                                >
                                    +{projects.length - VISIBLE_LIMIT} more in Collections
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M9 6l6 6-6 6" />
                                    </svg>
                                </button>
                                <div style={{ flex: 1, height: 1, background: "rgba(15,23,42,0.08)" }} />
                            </div>
                        )}
                    </>
                )
            }
        </div >
    );
}

function CreateNewProjectButton({ onClick }: { onClick: () => void }) {
    const [hovered, setHovered] = useState(false)
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                height: 40, padding: "0 20px", borderRadius: 12, border: `1px solid ${CLAY.border}`,
                background: CLAY.surface, color: CLAY.textPrimary, fontSize: 13, fontWeight: 500,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
                fontFamily: CLAY.font,
                boxShadow: "none",
                transform: hovered ? "translateY(-1px)" : "translateY(0)",
                transition: "box-shadow 180ms ease, transform 180ms ease",
            }}
        >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create New Project
        </button>
    )
}

function BrowseTemplatesButton({ onClick }: { onClick: () => void }) {
    const [hovered, setHovered] = useState(false)
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                height: 40, padding: "0 20px", borderRadius: 12, border: `1px solid ${CLAY.border}`,
                background: CLAY.surface, color: CLAY.textMuted, fontSize: 13, fontWeight: 500,
                cursor: "pointer",
                fontFamily: CLAY.font,
                boxShadow: "none",
                transform: hovered ? "translateY(-1px)" : "translateY(0)",
                transition: "box-shadow 180ms ease, transform 180ms ease",
            }}
        >
            Browse Templates
        </button>
    )
}
