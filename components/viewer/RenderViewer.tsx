"use client";

import { useEffect, useMemo, useState } from "react";

import { ERRORS, VIEWER } from "@/constants/content";
import type { Project, ProjectGeneration } from "@/lib/models";

import CarouselViewer from "@/components/viewer/CarouselViewer";
import ProjectAssets from "@/components/viewer/ProjectAssets";

type GenerateResponse = {
  render_url: string | null;
  video_url: string | null;
  status: "completed";
};

type Props = {
  project: Project;
  onRegenerated: () => void | Promise<void>;
  onUnauthorized?: () => void;
};

type GenerationsResponse = {
  generations: ProjectGeneration[];
};

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M8.5 10.5 12 13.9l3.5-3.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
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
        d="M20 12a8 8 0 1 1-2.3-5.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 4v6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RenderViewer({ project, onRegenerated, onUnauthorized }: Props) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>("");
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [generations, setGenerations] = useState<ProjectGeneration[]>([]);
  const [activeGenerationId, setActiveGenerationId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/generations?project_id=${encodeURIComponent(project.id)}`, {
          cache: "no-store",
        });
        if (res.status === 401) return;
        const body = (await res.json()) as Partial<GenerationsResponse> & { error?: string };
        if (!res.ok) return;
        const list = Array.isArray(body.generations) ? body.generations : [];
        if (!cancelled) {
          setGenerations(list);
          if (list.length > 0) {
            setActiveGenerationId((prev) => (list.some((g) => g.id === prev) ? prev : (list[0]?.id ?? "")));
          }
        }
      } catch {
        // ignore
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // Re-load when render/video changes so the UI picks up new generations.
  }, [project.id, project.render_url, project.video_url]);

  const activeGeneration = useMemo<ProjectGeneration | null>(() => {
    if (!activeGenerationId) return generations[0] ?? null;
    return generations.find((g) => g.id === activeGenerationId) ?? generations[0] ?? null;
  }, [activeGenerationId, generations]);

  const renderUrl = activeGeneration?.render_url ?? project.render_url;
  const videoUrl = activeGeneration?.video_url ?? project.video_url;

  async function applyEdit() {
    const prompt = editPrompt.trim();
    if (!prompt) return;
    if (!activeGeneration?.id) return;

    setError("");
    setEditing(true);
    try {
      const res = await fetch("/api/render/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          source_generation_id: activeGeneration.id,
          edit_prompt: prompt,
        }),
      });

      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }

      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? ERRORS.generateFailed);
        return;
      }

      setEditPrompt("");
      await onRegenerated();
    } catch {
      setError(ERRORS.generateFailed);
    } finally {
      setEditing(false);
    }
  }

  async function regenerate() {
    setError("");
    setRunning(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          generation_type: project.generation_type,
        }),
      });

      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }

      const body = (await res.json()) as Partial<GenerateResponse> & { error?: string };
      if (!res.ok) {
        setError(body.error ?? ERRORS.generateFailed);
        return;
      }

      await onRegenerated();
    } catch {
      setError(ERRORS.generateFailed);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="ra-viewerWrap">
      {project.floorplan_url ? (
        <>
          {generations.length > 0 ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Generations</div>
                <div className="text-xs text-gray-400 tabular-nums">{generations.length}</div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {generations.map((g, idx) => {
                  const isActive = g.id === (activeGeneration?.id ?? "");
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setActiveGenerationId(g.id);
                        window.dispatchEvent(
                          new CustomEvent("renderai:selected-generation", {
                            detail: { generationId: g.id },
                          })
                        );
                      }}
                      className={
                        `
                        relative
                        h-14 w-20
                        flex-shrink-0
                        rounded-xl
                        border
                        overflow-hidden
                        bg-white
                        transition-all
                        ${
                          isActive
                            ? "border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
                            : "border-gray-200 hover:border-gray-300"
                        }
                      `
                      }
                      title={`Generation ${generations.length - idx}`}
                    >
                      {g.render_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.render_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-xs text-gray-400">—</div>
                      )}
                      <div className="absolute left-1.5 bottom-1.5 flex items-center gap-1">
                        <span className="rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{generations.length - idx}</span>
                        {g.video_url ? (
                          <span className="rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white">VID</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="ra-renderStage">
            <CarouselViewer
              floorplanUrl={project.floorplan_url}
              renderUrl={renderUrl}
              videoUrl={videoUrl}
              projectName={project.name}
            />

            {renderUrl ? (
              <div className="ra-renderEditOverlay" aria-label="Edit render">
                <div className="ra-renderEditTitle">Edit render</div>
                <div className="ra-renderEditRow">
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.currentTarget.value)}
                    rows={2}
                    className="ra-renderEditTextarea"
                    placeholder="E.g. make the furniture more Scandinavian, lighter wood, brighter daylight"
                    maxLength={500}
                  />
                  <button
                    type="button"
                    className="ra-renderEditBtn"
                    disabled={editing || editPrompt.trim().length === 0 || !activeGeneration?.id}
                    onClick={applyEdit}
                  >
                    {editing ? "Applying..." : "Apply changes"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="ra-actionRow">
            {renderUrl ? (
              <a className="ra-ghostBtn" href={renderUrl} download>
                <DownloadIcon />
                {VIEWER.downloadRender}
              </a>
            ) : null}
            <button
              type="button"
              className="ra-ghostBtn"
              onClick={regenerate}
              disabled={running}
            >
              <RefreshIcon />
              {VIEWER.regenerate}
            </button>
          </div>

          <ProjectAssets
            projectId={project.id}
            floorplanUrl={project.floorplan_url}
            renderUrl={renderUrl}
            videoUrl={videoUrl}
            projectName={project.name}
          />
        </>
      ) : (
        <div className="skeleton" style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 16 }} />
      )}

      {error ? <div className="ra-inlineError">{error}</div> : null}
    </div>
  );
}
