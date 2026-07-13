// UI REVAMP - frontend only, no logic changes
"use client";

import { useMemo, useState } from "react";

import { GENERATE, SIDEBAR_GENERATE, WORKSPACE, SKETCHUP } from "@/constants/content";
import type { GenerateOptionType } from "@/components/generate/GenerateOptions";
import type { ActiveFeature } from "@/components/sidebar/Sidebar";

import GenerationLoader from "@/components/generate/GenerationLoader";
import StyleContextInput from "@/components/generate/StyleContextInput";
import FloorPlanEditorModal from "../workspace/FloorPlanEditorModal";

type Props = {
  project: any;
  value: string;
  onChange: (value: string) => void;
  running: boolean;
  runningType: any;
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
  // New: which tab is active
  activeFeature: ActiveFeature;
  onProjectSaved?: () => void;
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
];

function getCtaLabel(selected: GenerateOptionType, running: boolean): string {
  if (running) return SIDEBAR_GENERATE.generatingLabel;
  return SIDEBAR_GENERATE.generateLabel;
}

export default function GeneratePanel({
  project, value, onChange, running, runningType, stepIndex, elapsedSeconds,
  selectedOutput, onSelectOutput, canGenerate, onGenerate,
  videoChoiceOpen, canUseSelectedRender, onUseSelectedRender,
  onGenerateRenderAndVideo, onCancelVideoChoice,
  genError, hasSceneJson, activeFeature, onProjectSaved
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

  const ctaLabel = getCtaLabel(selectedOutput, running);
  const [editorOpen, setEditorOpen] = useState(false);

  const isSketchUp = activeFeature === "sketchup_render";
  const isGenerate = activeFeature === "generate_render";

  // Determine heading text based on active feature
  const heading = isSketchUp
    ? "Turn your SketchUp model into a realistic render"
    : "Generate a photorealistic render";

  const subheading = isSketchUp
    ? "Upload a .skp file and we'll generate a photorealistic render from your 3D model"
    : "Upload your floor plan image, describe your style, and we'll render it in seconds";

  return (
    <div style={{
      width: "100%",
      maxWidth: 640,
      margin: "0 auto",
      animation: "revampFadeIn 180ms ease-out both",
    }}>
      {/* ── Heading ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#0F172A",
          margin: 0,
          lineHeight: 1.2,
        }}>
          {heading}
        </h2>
        <p style={{
          fontSize: 14,
          color: "#64748B",
          margin: "8px 0 0",
          lineHeight: 1.5,
        }}>
          {subheading}
        </p>
      </div>

      {/* ── Style context textarea ────────────────────────────────────── */}
      <StyleContextInput
        value={value}
        onChange={onChange}
        fileNamePreview={fileNamePreview}
      />

      {/* ── Output type selector + Generate CTA ───────────────────────── */}
      {!running && !videoChoiceOpen && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 16,
          width: "100%",
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
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 7,
                    border: "none",
                    background: active ? "white" : "transparent",
                    color: active ? "#4F46E5" : "#64748B",
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 150ms",
                    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ color: active ? "#4F46E5" : "#94A3B8" }}>
                    {opt.icon}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Generate CTA */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            style={{
              height: 44,
              padding: "0 24px",
              borderRadius: 10,
              border: "none",
              background: canGenerate ? "#4F46E5" : "#E2E8F0",
              color: canGenerate ? "white" : "#94A3B8",
              fontSize: 14,
              fontWeight: 700,
              cursor: canGenerate ? "pointer" : "not-allowed",
              transition: "all 120ms ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              letterSpacing: "0.01em",
              boxShadow: canGenerate
                ? "0 2px 12px rgba(79,70,229,0.3)"
                : "none",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              if (!canGenerate) return;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 18px rgba(79,70,229,0.4)";
              e.currentTarget.style.background = "#4338CA";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = canGenerate ? "0 2px 12px rgba(79,70,229,0.3)" : "none";
              e.currentTarget.style.background = canGenerate ? "#4F46E5" : "#E2E8F0";
            }}
            onMouseDown={e => {
              if (!canGenerate) return;
              e.currentTarget.style.transform = "translateY(0) scale(0.98)";
            }}
            onMouseUp={e => {
              if (!canGenerate) return;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
          >
            {/* Spark icon */}
            {canGenerate && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" aria-hidden="true"
                style={{ transition: "transform 200ms" }}
                className="ra-sparkIcon"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                  strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            )}
            {isSketchUp ? "Generate Render" : ctaLabel}
          </button>
        </div>
      )}

      {/* Video choice inline */}
      {videoChoiceOpen && !running && (
        <div style={{
          marginTop: 12,
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
              style={{ fontSize: 12, height: 34 }}
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
      )}

      {/* Error */}
      {genError && (
        <div style={{
          marginTop: 8,
          fontSize: 12,
          color: "#EF4444",
        }}>
          {genError}
        </div>
      )}

      {/* Loader */}
      {running && (
        <div style={{ marginTop: 16 }}>
          <GenerationLoader
            type={runningType}
            currentStep={GENERATE.steps[Math.min(stepIndex, GENERATE.steps.length - 1)] ?? ""}
            elapsedSeconds={elapsedSeconds}
            styleContext={value}
          />
        </div>
      )}

      {/* Floor plan editor modal */}
      {editorOpen && project?.id && (
        <FloorPlanEditorModal
          projectId={project.id}
          initialFloorPlanState={
            (project as any).workspace_config?.floorPlanState ?? null
          }
          initialSceneConfig={
            (project as any).workspace_config?.sceneConfig ?? null
          }
          onSaved={(sceneJSON) => {
            onProjectSaved?.();
          }}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}