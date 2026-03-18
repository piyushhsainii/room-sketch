"use client";

import type { Project } from "@/lib/models";
import { formatProjectDate } from "@/lib/format";

import { VIEWER, WORKSPACE } from "@/constants/content";

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
    >
      <div className="ra-thumbShell">
        {project.render_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ra-thumb" src={project.render_url} alt="" />
        ) : (
          <div className="ra-thumb">
            <FloorplanIcon />
          </div>
        )}
        {hasStyleContext ? <span className="ra-styleDot" aria-hidden="true" /> : null}
        {project.workspace_enabled ? (
          <div
            className="absolute bottom-1 right-1 w-4 h-4 rounded bg-indigo-500/80 flex items-center justify-center"
            title={WORKSPACE.buttonTooltip}
          >
            <svg
              width="10"
              height="10"
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

      <div className="ra-projectMeta">
        <div className="ra-projectNameRow">
          {project.status === "rendering" ? (
            <span className="ra-renderingDot" aria-hidden="true" />
          ) : null}
          <div className="ra-projectName">{project.name}</div>
        </div>

        <div className="ra-assetDots" aria-hidden="true">
          {project.floorplan_url ? (
            <span className="ra-assetDot" data-kind="floorplan" title={VIEWER.assets.floorplanLabel} />
          ) : null}
          {project.render_url ? (
            <span className="ra-assetDot" data-kind="render" title={VIEWER.assets.renderLabel} />
          ) : null}
          {project.video_url ? (
            <span className="ra-assetDot" data-kind="video" title={VIEWER.assets.videoLabel} />
          ) : null}
        </div>

        <div className="ra-projectDate">{formatProjectDate(project.created_at)}</div>
      </div>

      <StatusBadge status={project.status} />
    </div>
  );
}
