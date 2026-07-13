// @ts-nocheck

// UI REVAMP - frontend only, no logic changes
"use client";

import type { Project } from "@/lib/models";
import { formatProjectDate } from "@/lib/format";

import { WORKSPACE } from "@/constants/content";
import StatusBadge from "@/components/ui/StatusBadge";

type Props = {
  project: Project;
  active: boolean;
  onClick: () => void;
};

function FloorplanIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 4h14v16H5V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 20v-6h6v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 10h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ProjectItem({ project, active, onClick }: Props) {
  const hasStyleContext = Boolean(project.style_context && project.style_context.trim().length > 0);

  // Status dot color
  const statusColor =
    project.status === "completed" ? "#10B981" :
      project.status === "rendering" ? "#F59E0B" :
        project.status === "failed" ? "#EF4444" :
          "#94A3B8";

  return (
    <div
      className="ra-projectItem"
      data-active={active ? "true" : "false"}
      data-hasstyle={hasStyleContext ? "true" : "false"}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 100ms ease",
        borderLeft: active ? "3px solid #4F46E5" : "3px solid transparent",
        background: active ? "#EEF2FF" : "transparent",
        marginBottom: 2,
        height: "auto",
        minHeight: 52,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "#F8FAFC";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        {project.render_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.render_url}
            alt=""
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              objectFit: "cover",
              border: "1px solid rgba(15,23,42,0.08)",
              display: "block",
            }}
          />
        ) : (
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "#F1F5F9",
            border: "1px solid rgba(15,23,42,0.08)",
            display: "grid",
            placeItems: "center",
            color: "#94A3B8",
          }}>
            <FloorplanIcon />
          </div>
        )}
        {hasStyleContext ? (
          <span className="ra-styleDot" aria-hidden="true" style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 9,
            height: 9,
            borderRadius: 999,
            background: "conic-gradient(from 180deg, #4f46e5, #0ea5e9, #22c55e, #4f46e5)",
            border: "2px solid white",
          }} />
        ) : null}
        {project.workspace_enabled ? (
          <div
            style={{
              position: "absolute",
              bottom: 1,
              right: 1,
              width: 14,
              height: 14,
              borderRadius: 4,
              background: "rgba(79,70,229,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={WORKSPACE.buttonTooltip}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
        ) : null}
      </div>

      {/* Meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#0F172A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 120,
          }}>
            {project.name}
          </div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 3,
        }}>
          {/* Status indicator */}
          <span style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: statusColor,
            flexShrink: 0,
            animation: project.status === "rendering" ? "dot-pulse 1s ease-in-out infinite" : "none",
          }} />
          <span style={{
            fontSize: 11,
            color: statusColor,
            fontWeight: 500,
          }}>
            {project.status}
          </span>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            · {formatProjectDate(project.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
