"use client";

import { useMemo, useState } from "react";

import { GENERATE, SIDEBAR_GENERATE, WORKSPACE } from "@/constants/content";
import type { GenerationType, Project } from "@/lib/models";
import type { GenerateOptionType } from "@/components/generate/GenerateOptions";

import GenerationLoader from "@/components/generate/GenerationLoader";
import StyleContextInput from "@/components/generate/StyleContextInput";
import FloorPlanEditorModal from "../workspace/FloorPlanEditorModal";

type Props = {
  project: Project;
  value: string;
  onChange: (value: string) => void;
  running: boolean;
  runningType: GenerationType;
  stepIndex: number;
  elapsedSeconds: number;
  // Generate CTA
  selectedOutput: GenerateOptionType;
  onSelectOutput: (t: GenerateOptionType) => void;
  canGenerate: boolean;
  onGenerate: () => void;
  videoChoiceOpen: boolean;
  canUseSelectedRender: boolean;
  onUseSelectedRender: () => void;
  onGenerateRenderAndVideo: () => void;
  onCancelVideoChoice: () => void;
  genError: string;
  hasSceneJson: boolean;
};

const OUTPUT_OPTIONS: { id: GenerateOptionType; label: string; icon: React.ReactNode }[] = [
  {
    id: "render",
    label: "Render only",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 8v1M12 15v1M8 12h1M15 12h1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "render_video",
    label: "Render + Video",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="2" y="6" width="15" height="12" rx="2" />
        <path d="M17 9l5-3v12l-5-3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "workspace",
    label: "Explore in 3D",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
];

function getCtaLabel(selected: GenerateOptionType, running: boolean, hasSceneJson: boolean): string {
  if (running) return SIDEBAR_GENERATE.generatingLabel;
  if (selected === "workspace") {
    return hasSceneJson ? WORKSPACE.buttonLabel : "Generate 3D View";
  }
  return SIDEBAR_GENERATE.generateLabel;
}

function getCtaAccent(selected: GenerateOptionType): string {
  if (selected === "workspace") return "#7C3AED";   // violet for 3D
  if (selected === "render_video") return "#0EA5E9"; // sky for video
  return "#4F46E5";                                  // indigo for render
}

export default function GeneratePanel({
  project, value, onChange, running, runningType, stepIndex, elapsedSeconds,
  selectedOutput, onSelectOutput, canGenerate, onGenerate,
  videoChoiceOpen, canUseSelectedRender, onUseSelectedRender,
  onGenerateRenderAndVideo, onCancelVideoChoice,
  genError, hasSceneJson,
}: Props) {
  const fileNamePreview = useMemo(() => {
    const fromName = project.name?.trim();
    if (fromName) return fromName;
    const url = project.floorplan_url;
    try {
      const u = new URL(url);
      const last = u.pathname.split("/").filter(Boolean).pop();
      return last ? decodeURIComponent(last) : url;
    } catch {
      const last = url.split("/").filter(Boolean).pop();
      return last ?? url;
    }
  }, [project.floorplan_url, project.name]);

  const ctaLabel = getCtaLabel(selectedOutput, running, hasSceneJson);
  const ctaAccent = getCtaAccent(selectedOutput);
  const [editorOpen, setEditorOpen] = useState(false)

  return (
    <div className="ra-generateWrap" style={{ width: "100%" }}>

      {/* Style context textarea — full width */}
      <StyleContextInput
        value={value}
        onChange={onChange}
        fileNamePreview={fileNamePreview}
      />

      {/* ── Output type selector + Generate CTA ─────────────────────────── */}
      {!running && !videoChoiceOpen && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          width: "100%",
          maxWidth: 760,
          margin: "12px auto 0",
          flexWrap: "wrap",
        }}>
          {/* Output type pills */}
          <div style={{
            display: "flex",
            gap: 4,
            background: "#F1F5F9",
            borderRadius: 9,
            padding: 3,
            flexShrink: 0,
          }}>
            {OUTPUT_OPTIONS.map((opt) => {
              const active = selectedOutput === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectOutput(opt.id)}
                  title={opt.label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    height: 30,
                    padding: "0 11px",
                    borderRadius: 7,
                    border: "none",
                    background: active ? "white" : "transparent",
                    color: active ? getCtaAccent(opt.id) : "#64748B",
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 150ms",
                    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ color: active ? getCtaAccent(opt.id) : "#94A3B8" }}>
                    {opt.icon}
                  </span>
                  {opt.label}
                </button>
              );
            })}
            {editorOpen && project?.id && (
              <FloorPlanEditorModal
                projectId={project.id}
                initialFloorPlanState={
                  (project as any).workspace_config?.floorPlanState ?? null
                }
                onSaved={(sceneJSON) => {
                  setEditorOpen(false)
                }}
                onClose={() => setEditorOpen(false)}
              />
            )}
          </div>

          {/* Generate CTA */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            style={{
              height: 36,
              padding: "0 20px",
              borderRadius: 9,
              border: "none",
              background: canGenerate ? ctaAccent : "#E2E8F0",
              color: canGenerate ? "white" : "#94A3B8",
              fontSize: 13,
              fontWeight: 700,
              cursor: canGenerate ? "pointer" : "not-allowed",
              transition: "background 200ms, transform 100ms, box-shadow 200ms",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              letterSpacing: "0.01em",
              boxShadow: canGenerate
                ? `0 2px 12px ${ctaAccent}40`
                : "none",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              if (!canGenerate) return;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = `0 4px 18px ${ctaAccent}55`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = canGenerate ? `0 2px 12px ${ctaAccent}40` : "none";
            }}
          >
            {/* Spark icon */}
            {canGenerate && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                  strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            )}
            {ctaLabel}
          </button>
          <button onClick={() => setEditorOpen(true)}>
            ✏️ Draw Floor Plan
          </button>
        </div>
      )}

      {/* Video choice inline */}
      {/* {videoChoiceOpen && !running && (
        <div style={{
          marginTop: 12,
          maxWidth: 760,
          margin: "12px auto 0",
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid #E0E7FF",
          background: "rgba(238,242,255,0.7)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>
            {SIDEBAR_GENERATE.videoChoiceTitle}
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
            {SIDEBAR_GENERATE.videoChoiceBody}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="ra-button ra-buttonGhost"
              disabled={!canUseSelectedRender}
              onClick={onUseSelectedRender}
              style={{ fontSize: 12 }}
            >
              {SIDEBAR_GENERATE.useSelectedRender}
            </button>
            <button
              type="button"
              onClick={onGenerateRenderAndVideo}
              style={{
                height: 34, padding: "0 16px", borderRadius: 8, border: "none",
                background: "#0EA5E9", color: "white", fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {SIDEBAR_GENERATE.generateRenderAndVideo}
            </button>
            <button
              type="button"
              onClick={onCancelVideoChoice}
              style={{
                height: 34, padding: "0 12px", borderRadius: 8, border: "none",
                background: "transparent", color: "#94A3B8", fontSize: 12, cursor: "pointer",
              }}
            >
              {SIDEBAR_GENERATE.cancel}
            </button>
          </div>
        </div>
      )} */}

      {/* Error */}
      {genError && (
        <div style={{
          maxWidth: 760, margin: "8px auto 0",
          fontSize: 12, color: "#EF4444",
        }}>
          {genError}
        </div>
      )}

      {/* Loader */}
      {running && (
        <GenerationLoader
          type={runningType}
          currentStep={GENERATE.steps[Math.min(stepIndex, GENERATE.steps.length - 1)] ?? ""}
          elapsedSeconds={elapsedSeconds}
          styleContext={value}
        />
      )}
    </div>
  );
}