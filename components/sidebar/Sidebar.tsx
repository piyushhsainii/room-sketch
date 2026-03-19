"use client";

import { APP, GENERATE, SIDEBAR_GENERATE, WORKSPACE } from "@/constants/content";
import type { Project } from "@/lib/models";

import ProjectItem from "@/components/sidebar/ProjectItem";
import type { GenerateOptionType } from "@/components/generate/GenerateOptions";

type Props = {
  open: boolean;
  projects: Project[];
  activeProjectId: string | null;
  userEmail: string;
  plan: "free" | "pro";
  authed: boolean;
  generateControls?: {
    selected: GenerateOptionType;
    running: boolean;
    canGenerate: boolean;
    error: string;
    videoChoiceOpen: boolean;
    canUseSelectedRender: boolean;
    onSelect: (type: GenerateOptionType) => void;
    onGenerate: () => void;
    onUseSelectedRender: () => void;
    onGenerateRenderAndVideo: () => void;
    onCancelVideoChoice: () => void;
  } | null;
  onSelectProject: (projectId: string) => void;
  onSignOut: () => void;
  onSignIn: () => void;
  onNewProject?: () => void;
};

export default function Sidebar({
  open,
  projects,
  activeProjectId,
  userEmail,
  plan,
  authed,
  generateControls,
  onSelectProject,
  onSignOut,
  onSignIn,
  onNewProject,
}: Props) {
  const renderOnly = GENERATE.options.renderOnly;
  const renderVideo = GENERATE.options.renderVideo;

  return (
    <aside className="ra-sidebar" data-open={open ? "true" : "false"}>
      <div className="ra-sidebarTop">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 2.6 20.6 7.6v8.8L12 21.4 3.4 16.4V7.6L12 2.6Z"
            fill="var(--color-accent)"
            opacity="0.95"
          />
          <path
            d="M12 2.6 20.6 7.6v8.8L12 21.4 3.4 16.4V7.6L12 2.6Z"
            stroke="rgba(15,23,42,0.18)"
          />
        </svg>
        <div className="ra-logoText">{APP.name}</div>
      </div>

      <div className="ra-projectsLabel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 }}>
        <span>{APP.projectsLabel}</span>
        {onNewProject && (
          <button
            type="button"
            onClick={onNewProject}
            title="New project"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 5,
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: 'rgba(99,102,241,0.9)',
              cursor: 'pointer', flexShrink: 0, fontSize: 15, lineHeight: 1,
              padding: 0,
            }}
          >
            +
          </button>
        )}
      </div>

      <div className="ra-projectList">
        {projects.length === 0 ? (
          <div className="ra-emptyProjects">{APP.noProjects}</div>
        ) : (
          projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              active={project.id === activeProjectId}
              onClick={() => onSelectProject(project.id)}
            />
          ))
        )}
      </div>

      {/* {generateControls ? (
        <div className="ra-sidebarGen">
          <div className="ra-sidebarSectionLabel">{SIDEBAR_GENERATE.sectionLabel}</div>

          <div className="ra-sidebarOptionList">
            <button
              type="button"
              className="ra-sidebarOption"
              data-selected={generateControls.selected === renderOnly.id ? "true" : "false"}
              onClick={() => generateControls.onSelect(renderOnly.id)}
              disabled={generateControls.running}
            >
              <span className="ra-sidebarOptionIcon" aria-hidden="true">
                {renderOnly.icon}
              </span>
              <span className="ra-sidebarOptionText">
                <span className="ra-sidebarOptionTitle">{renderOnly.label}</span>
              </span>
            </button>

            <button
              type="button"
              className="ra-sidebarOption"
              data-selected={generateControls.selected === renderVideo.id ? "true" : "false"}
              onClick={() => generateControls.onSelect(renderVideo.id)}
              disabled={generateControls.running}
            >
              <span className="ra-sidebarOptionIcon" aria-hidden="true">
                {renderVideo.icon}
              </span>
              <span className="ra-sidebarOptionText">
                <span className="ra-sidebarOptionTitle">{renderVideo.label}</span>
              </span>
            </button>

            <button
              type="button"
              className="ra-sidebarOption"
              data-selected={generateControls.selected === "workspace" ? "true" : "false"}
              onClick={() => generateControls.onSelect("workspace")}
              disabled={generateControls.running}
              title={WORKSPACE.buttonTooltip}
            >
              <span className="ra-sidebarOptionIcon" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </span>
              <span className="ra-sidebarOptionText">
                <span className="ra-sidebarOptionTitle">{WORKSPACE.buttonLabel}</span>
              </span>
            </button>
          </div>

          {!generateControls.running &&
          generateControls.selected === "render_video" &&
          generateControls.videoChoiceOpen ? (
            <div className="ra-sidebarChoice">
              <div className="ra-sidebarChoiceTitle">{SIDEBAR_GENERATE.videoChoiceTitle}</div>
              <div className="ra-sidebarChoiceBody">{SIDEBAR_GENERATE.videoChoiceBody}</div>
              <div className="ra-sidebarChoiceActions">
                <button
                  type="button"
                  className="ra-button ra-buttonGhost"
                  disabled={!generateControls.canUseSelectedRender}
                  onClick={generateControls.onUseSelectedRender}
                >
                  {SIDEBAR_GENERATE.useSelectedRender}
                </button>
                <button
                  type="button"
                  className="ra-button ra-buttonPrimary"
                  onClick={generateControls.onGenerateRenderAndVideo}
                >
                  {SIDEBAR_GENERATE.generateRenderAndVideo}
                </button>
              </div>
              <button type="button" className="ra-sidebarChoiceCancel" onClick={generateControls.onCancelVideoChoice}>
                {SIDEBAR_GENERATE.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="ra-button ra-buttonPrimary"
              disabled={!generateControls.canGenerate}
              onClick={generateControls.onGenerate}
            >
              {generateControls.running ? SIDEBAR_GENERATE.generatingLabel : SIDEBAR_GENERATE.generateLabel}
            </button>
          )}

          {generateControls.error ? <div className="ra-inlineError">{generateControls.error}</div> : null}
        </div>
      ) : null} */}

      <div className="ra-sidebarBottom">
        {authed ? (
          <>
            <div className="ra-userRow">
              <div className="ra-userEmail">{userEmail}</div>
              <div className="ra-pill">{plan === "pro" ? APP.proPlan : APP.freePlan}</div>
            </div>
            <button
              type="button"
              className="ra-button ra-buttonGhost"
              onClick={onSignOut}
            >
              {APP.signOut}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ra-button ra-buttonGhost"
            onClick={onSignIn}
          >
            {APP.signIn}
          </button>
        )}
      </div>
    </aside>
  );
}
