// UI REVAMP - frontend only, no logic changes
"use client";

import { APP } from "@/constants/content";
import type { Project } from "@/lib/models";
import { useState, useRef, useEffect } from "react";

export type ActiveFeature = "3d_viewer" | "generate_render" | "sketchup_render";

type FeatureTab = {
  id: ActiveFeature;
  label: string;
  icon: React.ReactNode;
};

const FEATURE_TABS: FeatureTab[] = [
  {
    id: "3d_viewer",
    label: "Open 3D Viewer",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: "generate_render",
    label: "Generate Render",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "sketchup_render",
    label: "SketchUp → Render",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" strokeLinejoin="round" />
        <path d="M12 12v6" strokeLinecap="round" />
        <path d="M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  if (status === "completed") return "#10B981";
  if (status === "rendering") return "#F59E0B";
  if (status === "failed") return "#EF4444";
  return "#CBD5E1";
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// ── ProjectRow ────────────────────────────────────────────────────────────────

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
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Keep editValue in sync if project.name changes externally
  useEffect(() => {
    if (!isEditing) setEditValue(project.name || "Untitled");
  }, [project.name, isEditing]);

  function commitRename() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== project.name && onRename) {
      onRename(trimmed);
    } else {
      setEditValue(project.name || "Untitled");
    }
    setIsEditing(false);
  }

  const thumbnail = project.render_url || project.floorplan_url;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 8px",
        borderRadius: 8,
        cursor: "pointer",
        background: active
          ? "#EEF2FF"
          : hovered
            ? "#F8FAFC"
            : "transparent",
        borderLeft: active ? "2px solid #4F46E5" : "2px solid transparent",
        transition: "background 120ms ease, border-color 120ms ease",
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { if (!isEditing) onSelect(); }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 32,
        height: 32,
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#CBD5E1" strokeWidth="1.5">
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
              borderBottom: "1.5px solid #4F46E5",
              background: "transparent",
              outline: "none",
              padding: "0 0 1px",
              lineHeight: 1.4,
            }}
          />
        ) : (
          <div style={{
            fontSize: 12,
            fontWeight: active ? 600 : 500,
            color: active ? "#3730A3" : "#1E293B",
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
          marginTop: 2,
          display: "flex",
          alignItems: "center",
          gap: 4,
          lineHeight: 1,
        }}>
          <span style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: getStatusColor(project.status),
            flexShrink: 0,
          }} />
          <span style={{ color: "#94A3B8" }}>{project.status}</span>
          {(project as any).created_at && (
            <>
              <span style={{ color: "#E2E8F0" }}>·</span>
              <span>{formatDate((project as any).created_at)}</span>
            </>
          )}
        </div>
      </div>

      {/* Rename button — only on hover, only if rename is supported */}
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
            transition: "background 100ms",
          }}
          onMouseEnter={e =>
            (e.currentTarget.style.background = "rgba(100,116,139,0.2)")
          }
          onMouseLeave={e =>
            (e.currentTarget.style.background = "rgba(100,116,139,0.1)")
          }
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── ProjectsAccordion ─────────────────────────────────────────────────────────

function ProjectsAccordion({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onRenameProject,
}: {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject?: () => void;
  onRenameProject?: (projectId: string, newName: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;
  const otherProjects = projects.filter(p => p.id !== activeProjectId);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>

      {/* Header row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px 6px",
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
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
              transition: "transform 200ms ease",
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
        overflowY: open ? "auto" : "hidden",
        maxHeight: open ? "100%" : 0,
        opacity: open ? 1 : 0,
        transition: "opacity 180ms ease, max-height 200ms ease",
        padding: "2px 8px 8px",
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

            {/* Active project pinned at top */}
            {activeProject && (
              <ProjectRow
                project={activeProject}
                active={true}
                onSelect={() => onSelectProject(activeProject.id)}
                onRename={
                  onRenameProject
                    ? name => onRenameProject(activeProject.id, name)
                    : undefined
                }
              />
            )}

            {/* Thin divider between active and rest */}
            {activeProject && otherProjects.length > 0 && (
              <div style={{
                height: 1,
                background: "#F1F5F9",
                margin: "4px 2px",
              }} />
            )}

            {/* All other projects */}
            {otherProjects.map(project => (
              <ProjectRow
                key={project.id}
                project={project}
                active={false}
                onSelect={() => onSelectProject(project.id)}
                onRename={
                  onRenameProject
                    ? name => onRenameProject(project.id, name)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar Props ─────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  projects: Project[];
  activeProjectId: string | null;
  userEmail: string;
  plan: "free" | "pro";
  authed: boolean;
  activeFeature: ActiveFeature;
  onFeatureChange: (feature: ActiveFeature) => void;
  onSelectProject: (projectId: string) => void;
  onSignOut: () => void;
  onSignIn: () => void;
  onNewProject?: () => void;
  onRenameProject?: (projectId: string, newName: string) => void;
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({
  open,
  projects,
  activeProjectId,
  userEmail,
  plan,
  authed,
  activeFeature,
  onFeatureChange,
  onSelectProject,
  onSignOut,
  onSignIn,
  onNewProject,
  onRenameProject,
}: Props) {
  return (
    <aside
      className="ra-sidebar"
      data-open={open ? "true" : "false"}
      style={{
        width: 220,
        background: "#FFFFFF",
        borderRight: "1px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: "18px 16px 14px",
        borderBottom: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 2.6 20.6 7.6v8.8L12 21.4 3.4 16.4V7.6L12 2.6Z"
            fill="#4F46E5"
            opacity="0.95"
          />
          <path
            d="M12 2.6 20.6 7.6v8.8L12 21.4 3.4 16.4V7.6L12 2.6Z"
            stroke="rgba(15,23,42,0.18)"
          />
        </svg>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#0F172A",
          letterSpacing: "-0.01em",
        }}>
          {APP.name}
        </div>
      </div>

      {/* ── Feature Tabs ──────────────────────────────────────────────── */}
      <div style={{
        padding: "12px 10px 0",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        flexShrink: 0,
      }}>
        {FEATURE_TABS.map(tab => {
          const isActive = activeFeature === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFeatureChange(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                height: 40,
                padding: "0 10px",
                borderRadius: 8,
                border: "none",
                borderLeft: isActive ? "2.5px solid #4F46E5" : "2.5px solid transparent",
                background: isActive ? "#4F46E5" : "transparent",
                color: isActive ? "#FFFFFF" : "#64748B",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition: "all 140ms ease",
                textAlign: "left",
                letterSpacing: "-0.005em",
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = "rgba(99,102,241,0.07)";
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                flexShrink: 0,
                opacity: isActive ? 1 : 0.65,
              }}>
                {tab.icon}
              </span>
              <span style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div style={{
        height: 1,
        background: "#F1F5F9",
        margin: "12px 14px 0",
        flexShrink: 0,
      }} />

      {/* ── Projects Accordion ────────────────────────────────────────── */}
      <ProjectsAccordion
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={onSelectProject}
        onNewProject={onNewProject}
        onRenameProject={onRenameProject}
      />

      {/* ── Bottom: user info ─────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid #E2E8F0",
        padding: "10px 12px 12px",
        flexShrink: 0,
      }}>
        {authed ? (
          <>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}>
              <div style={{
                minWidth: 0,
                flex: 1,
                fontSize: 11,
                color: "#64748B",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {userEmail}
              </div>
              <span style={{
                fontSize: 10,
                lineHeight: 1,
                padding: "3px 7px",
                borderRadius: 999,
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                color: "#64748B",
                whiteSpace: "nowrap",
                fontWeight: 500,
                flexShrink: 0,
              }}>
                {plan === "pro" ? APP.proPlan : APP.freePlan}
              </span>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              style={{
                width: "100%",
                height: 32,
                borderRadius: 7,
                border: "1px solid #E2E8F0",
                background: "transparent",
                color: "#64748B",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 120ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {APP.signOut}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            style={{
              width: "100%",
              height: 32,
              borderRadius: 7,
              border: "1px solid #E2E8F0",
              background: "transparent",
              color: "#64748B",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 120ms ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {APP.signIn}
          </button>
        )}
      </div>
    </aside>
  );
}