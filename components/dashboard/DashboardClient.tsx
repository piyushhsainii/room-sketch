// UI REVAMP - frontend only, no logic changes
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { APP, ERRORS } from "@/constants/content";
import type { GenerationType, Project, ProjectGeneration } from "@/lib/models";

import Sidebar from "@/components/sidebar/Sidebar";
import type { ActiveFeature } from "@/components/sidebar/Sidebar";
import UploadZone from "@/components/upload/UploadZone";
import GeneratePanel from "@/components/generate/GeneratePanel";
import RenderViewer from "@/components/viewer/RenderViewer";
import AuthDialog from "@/components/ui/AuthDialog";
import EmptyState from "@/components/ui/EmptyState";
import type { GenerateOptionType } from "@/components/generate/GenerateOptions";
import FloorPlanEditorModal from '@/components/workspace/FloorPlanEditorModal'

const WorkspaceContainer = dynamic(
  () => import("@/components/workspace/WorkspaceContainer"),
  { ssr: false, loading: () => null }
);

type ProjectsResponse = { projects: Project[] };
type GenerationsResponse = { generations: ProjectGeneration[] };
type GenerateResponse = { render_url: string | null; video_url: string | null; status: "completed" };
type SelectedGenerationEvent = CustomEvent<{ generationId?: string }>;
type GenerateRequestBody = {
  project_id: string;
  generation_type: GenerationType;
  style_context: string;
  source_generation_id?: string;
};

export default function DashboardClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<GenerateOptionType>("render");
  const [styleContext, setStyleContext] = useState<string>("");
  const [generations, setGenerations] = useState<ProjectGeneration[]>([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string>("");
  const [videoChoiceOpen, setVideoChoiceOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [genRunning, setGenRunning] = useState(false);
  const [genRunningType, setGenRunningType] = useState<GenerationType>("render");
  const [genError, setGenError] = useState<string>("");
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>("3d_viewer");
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  useEffect(() => {
    function onSelected(e: Event) {
      const evt = e as SelectedGenerationEvent;
      const id = evt.detail?.generationId;
      if (typeof id === "string" && id.trim().length > 0) setSelectedGenerationId(id);
    }
    window.addEventListener("renderai:selected-generation", onSelected);
    return () => window.removeEventListener("renderai:selected-generation", onSelected);
  }, []);

  useEffect(() => {
    setSelectedOutput(activeProject?.generation_type ?? "render");
    setStyleContext(activeProject?.style_context ?? "");
    setGenerations([]);
    setSelectedGenerationId("");
    setVideoChoiceOpen(false);
    setWorkspaceOpen(false);
    setGenError("");
    setGenRunning(false);
    setGenRunningType(activeProject?.generation_type ?? "render");
    setStepIndex(0);
    setElapsedSeconds(0);
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!activeProject?.id) return;
    const projectId = activeProject.id;
    async function loadGenerations() {
      try {
        const res = await fetch(`/api/generations?project_id=${encodeURIComponent(projectId)}`, { cache: "no-store" });
        if (res.status === 401) return;
        const body = (await res.json()) as Partial<GenerationsResponse> & { error?: string };
        if (!res.ok) return;
        const list = Array.isArray(body.generations) ? body.generations : [];
        if (cancelled) return;
        setGenerations(list);
        if (list.length > 0) {
          setSelectedGenerationId((prev) => (list.some((g) => g.id === prev) ? prev : (list[0]?.id ?? "")));
        }
      } catch { /* ignore */ }
    }
    void loadGenerations();
    return () => { cancelled = true; };
  }, [activeProject?.id, activeProject?.render_url, activeProject?.video_url]);

  async function refreshProjects(selectProjectId?: string) {
    const res = await fetch("/api/projects", { method: "GET" });
    if (res.status === 401) { setProjects([]); setActiveProjectId(null); return; }
    if (!res.ok) return;
    const body = (await res.json()) as ProjectsResponse;
    setProjects(body.projects);
    if (selectProjectId) { setActiveProjectId(selectProjectId); return; }
    setActiveProjectId((current) => {
      if (current && body.projects.some((p) => p.id === current)) return current;
      return body.projects[0]?.id ?? null;
    });
  }

  function clearProgressTimers() {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  function clearPoll() {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startProgressTimers() {
    setStepIndex(0); setElapsedSeconds(0); clearProgressTimers();
    timersRef.current.push(
      window.setTimeout(() => setStepIndex(1), 800),
      window.setTimeout(() => setStepIndex(2), 7200),
      window.setTimeout(() => setStepIndex(3), 15200)
    );
    intervalRef.current = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  }

  async function postGenerate(projectId: string, type: GenerationType, opts?: { sourceGenerationId?: string }): Promise<boolean> {
    const payload: GenerateRequestBody = {
      project_id: projectId,
      generation_type: type,
      style_context: styleContext,
      ...(opts?.sourceGenerationId ? { source_generation_id: opts.sourceGenerationId } : null),
    };
    const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.status === 401) { setAuthDialogOpen(true); return false; }
    const body = (await res.json()) as Partial<GenerateResponse> & { error?: string };
    if (!res.ok) { setGenError(body.error ?? ERRORS.generateFailed); return false; }
    return true;
  }

  async function runGenerate(projectId: string, type: GenerationType, opts?: { sourceGenerationId?: string }) {
    setGenError(""); setGenRunning(true); setGenRunningType(type); startProgressTimers();
    if (type === "render_video") {
      clearPoll();
      pollRef.current = window.setInterval(() => { void refreshProjects(projectId); }, 2000);
    }
    try {
      const ok = await postGenerate(projectId, type, opts);
      if (!ok) return;
      await refreshProjects(projectId);
    } catch {
      setGenError(ERRORS.generateFailed);
    } finally {
      setGenRunning(false); setStepIndex(0); clearProgressTimers(); clearPoll(); setElapsedSeconds(0);
    }
  }

  const canGenerate = Boolean(activeProject?.id) && !genRunning;

  // ── Generate handler (moved out of sidebar) ──────────────────────────────
  function handleGenerate() {
    if (!activeProject?.id) return;
    setGenError("");

    if (selectedOutput === "workspace") {
      if (!activeProject.floorplan_url) return;
      setWorkspaceOpen(true);
      return;
    }

    if (selectedOutput === "render_video" && generations.length > 0) {
      setVideoChoiceOpen(true);
      return;
    }

    void runGenerate(activeProject.id, selectedOutput);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/me", { method: "GET" });
        if (!res.ok) return;
        const body = (await res.json()) as { authed: boolean; email: string; plan: "free" | "pro" };
        if (cancelled) return;
        setAuthed(body.authed); setUserEmail(body.email); setPlan(body.plan);
        if (body.authed) { await refreshProjects(); }
        else { setProjects([]); setActiveProjectId(null); }
      } catch { /* ignore */ }
    }
    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshMe() {
    try {
      const res = await fetch("/api/me", { method: "GET" });
      if (!res.ok) return;
      const body = (await res.json()) as { authed: boolean; email: string; plan: "free" | "pro" };
      setAuthed(body.authed); setUserEmail(body.email); setPlan(body.plan);
      if (body.authed) { await refreshProjects(); }
      else { setProjects([]); setActiveProjectId(null); }
    } catch { /* ignore */ }
  }

  async function handleSignOut() {
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally {
      setAuthed(false); setUserEmail(""); setPlan("free");
      setProjects([]); setActiveProjectId(null);
      window.location.reload();
    }
  }

  // ── Top bar title based on tab ────────────────────────────────────────
  function getTopBarTitle(): string {
    if (activeFeature === "3d_viewer") {
      if (editorOpen) return "Floor Plan Editor";
      if (activeProject) return activeProject.name || "3D Viewer";
      return "Floor Plan Editor";
    }
    if (activeFeature === "generate_render") return "Generate Render";
    if (activeFeature === "sketchup_render") return "SketchUp → Render";
    return "RenderAI";
  }
  // ADD this handler near other handlers:
  async function handleRenameProject(projectId: string, newName: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok) {
        setProjects(prev =>
          prev.map(p => p.id === projectId ? { ...p, name: newName } : p)
        )
      }
    } catch (err) {
      console.error('Failed to rename project', err)
    }
  }
  // ── Render main content based on active feature ───────────────────────
  function renderContent() {
    // ── TAB 1: 3D Viewer ────────────────────────
    if (activeFeature === "3d_viewer") {
      // No project selected and no projects at all: show empty state
      if (projects.length === 0) {
        return (
          <EmptyState onDrawFloorPlan={() => setEditorOpen(true)} />
        );
      }

      // No project selected but projects exist: open editor by default
      if (!activeProject) {
        return (
          <EmptyState onDrawFloorPlan={() => setEditorOpen(true)} />
        );
      }

      // Project IS selected: show Workspace if has scene_json, otherwise editor prompt
      if (activeProject.scene_json || workspaceOpen) {
        // Show workspace — the WorkspaceContainer already renders fullscreen
        // We show a floating "Edit Floor Plan" button
        return (
          <div style={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}>
            {workspaceOpen && activeProject.floorplan_url ? (
              <WorkspaceContainer
                projectId={activeProject.id}
                floorplanUrl={activeProject.floorplan_url}
                onExit={() => setWorkspaceOpen(false)}
              />
            ) : (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: 32,
                animation: "revampFadeIn 180ms ease-out both",
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "rgba(79,70,229,0.08)",
                  display: "grid",
                  placeItems: "center",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="#4F46E5" strokeWidth="1.6" aria-hidden="true">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: 0 }}>
                  3D Workspace Ready
                </h3>
                <p style={{ fontSize: 14, color: "#64748B", margin: 0, textAlign: "center", maxWidth: 360 }}>
                  This project has a 3D scene. Explore it in the interactive workspace or edit the floor plan.
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  {/* <button
                    type="button"
                    onClick={() => setWorkspaceOpen(true)}
                  
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                    Explore in 3D
                  </button> */}
                  <button
                    type="button"
                    onClick={() => setEditorOpen(true)}
                    // style={{
                    //   height: 44, padding: "0 20px", borderRadius: 10,
                    //   border: "1px solid #E2E8F0", background: "white",
                    //   color: "#374151", fontSize: 14, fontWeight: 600,
                    //   cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
                    //   transition: "all 120ms ease",
                    // }}
                    // onMouseEnter={e => {
                    //   e.currentTarget.style.borderColor = "#4F46E5";
                    //   e.currentTarget.style.color = "#4F46E5";
                    // }}
                    // onMouseLeave={e => {
                    //   e.currentTarget.style.borderColor = "#E2E8F0";
                    //   e.currentTarget.style.color = "#374151";
                    // }}
                    style={{
                      height: 44, padding: "0 24px", borderRadius: 10, border: "none",
                      background: "#4F46E5", color: "white", fontSize: 14, fontWeight: 700,
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
                      boxShadow: "0 2px 12px rgba(79,70,229,0.3)",
                      transition: "all 120ms ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.background = "#4338CA";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.background = "#4F46E5";
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M12 19l7-7 3 3-7 7H12v-3z" strokeLinejoin="round" />
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" strokeLinejoin="round" />
                    </svg>
                    Open 3D Viewer
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      // Project selected but no scene_json: show floor plan editor inline
      return (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          animation: "revampFadeIn 180ms ease-out both",
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "rgba(79,70,229,0.08)",
            display: "grid",
            placeItems: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#4F46E5" strokeWidth="1.6" aria-hidden="true">
              <path d="M12 19l7-7 3 3-7 7H12v-3z" strokeLinejoin="round" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Draw your floor plan
          </h3>
          <p style={{ fontSize: 14, color: "#64748B", margin: 0, textAlign: "center", maxWidth: 360 }}>
            Use the interactive editor to draw walls, rooms, and doors — then explore in 3D.
          </p>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            style={{
              marginTop: 8,
              height: 44, padding: "0 24px", borderRadius: 10, border: "none",
              background: "#4F46E5", color: "white", fontSize: 14, fontWeight: 700,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: "0 2px 12px rgba(79,70,229,0.3)",
              transition: "all 120ms ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.background = "#4338CA";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "#4F46E5";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 19l7-7 3 3-7 7H12v-3z" strokeLinejoin="round" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" strokeLinejoin="round" />
            </svg>
            Open Floor Plan Editor
          </button>
        </div>
      );
    }

    // ── TAB 2: Generate Render ──────────────────────
    // ── TAB 3: SketchUp → Render ────────────────────
    if (activeFeature === "generate_render" || activeFeature === "sketchup_render") {
      return (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 24px",
          overflowY: "auto",
          animation: "revampFadeIn 180ms ease-out both",
        }}>
          {/* Upload zone */}
          <div style={{ width: "100%", maxWidth: 640 }}>
            <UploadZone
              onUploaded={async (result) => {
                const now = new Date().toISOString();
                if (result.project_id) {
                  const optimistic: Project = {
                    id: result.project_id, user_id: "",
                    name: result.name ?? "Untitled",
                    floorplan_url: result.floorplan_url,
                    render_url: null, video_url: null, style_context: null,
                    scene_json: null, workspace_enabled: false,
                    status: result.status ?? "uploaded",
                    generation_type: result.generation_type ?? "render",
                    error_message: null,
                    created_at: result.created_at ?? now, updated_at: now,
                  };
                  setProjects((prev) => {
                    const without = prev.filter((p) => p.id !== optimistic.id);
                    return [optimistic, ...without];
                  });
                  setActiveProjectId(optimistic.id);
                }
                await refreshProjects(result.project_id);
              }}
              onUnauthorized={() => setAuthDialogOpen(true)}
            />
          </div>

          {/* Generate panel */}
          {activeProject && (
            <div style={{ width: "100%", maxWidth: 640, marginTop: 24 }}>
              <GeneratePanel
                project={activeProject}
                value={styleContext}
                onChange={setStyleContext}
                running={genRunning}
                runningType={genRunningType}
                stepIndex={stepIndex}
                elapsedSeconds={elapsedSeconds}
                selectedOutput={selectedOutput}
                onSelectOutput={(t) => { setGenError(""); setSelectedOutput(t); }}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                videoChoiceOpen={videoChoiceOpen}
                canUseSelectedRender={Boolean(selectedGenerationId)}
                onUseSelectedRender={() => {
                  if (!activeProject.id || !selectedGenerationId) return;
                  setVideoChoiceOpen(false);
                  void runGenerate(activeProject.id, "render_video", { sourceGenerationId: selectedGenerationId });
                }}
                onGenerateRenderAndVideo={() => {
                  if (!activeProject.id) return;
                  setVideoChoiceOpen(false);
                  void runGenerate(activeProject.id, "render_video");
                }}
                onCancelVideoChoice={() => setVideoChoiceOpen(false)}
                genError={genError}
                hasSceneJson={Boolean(activeProject.scene_json)}
                activeFeature={activeFeature}
              />

              {/* Render viewer */}
              <div style={{ marginTop: 24 }}>
                <RenderViewer
                  project={activeProject}
                  onRegenerated={async () => { await refreshProjects(activeProject.id); }}
                  onUnauthorized={() => setAuthDialogOpen(true)}
                />
              </div>
            </div>
          )}

          {/* No active project */}
          {!activeProject && (
            <div style={{
              marginTop: 32,
              textAlign: "center",
              color: "#94A3B8",
              fontSize: 14,
            }}>
              Upload a file above to get started
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <div className="ra-app" style={{
      display: "flex",
      minHeight: "100vh",
      background: "#F8FAFC",
    }}>
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        projects={projects}
        activeProjectId={activeProjectId}
        userEmail={userEmail}
        plan={plan}
        authed={authed}
        activeFeature={activeFeature}
        onFeatureChange={(f) => {
          setActiveFeature(f);
          setEditorOpen(false);
          setWorkspaceOpen(false);
        }}
        onRenameProject={handleRenameProject}

        onSelectProject={(id) => { setActiveProjectId(id); setSidebarOpen(false); }}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthDialogOpen(true)}
        onNewProject={async () => {
          try {
            const res = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'New Project' }),
            })
            if (res.ok) {
              const data = await res.json()
              window.location.reload()
            }
          } catch (err) {
            console.error('Failed to create project', err)
          }
        }}
      />

      {sidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.22)",
            zIndex: 9,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        marginLeft: 220,
        minWidth: 0,
        transition: "margin-left 200ms ease",
      }}>
        {/* Top bar */}
        <div style={{
          height: 56,
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}>
          {/* Mobile hamburger */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="ra-revamp-hamburger"
              aria-label={APP.menu}
              onClick={() => setSidebarOpen(true)}
              style={{
                display: "none",
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                background: "transparent",
                color: "#374151",
                cursor: "pointer",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <h1 style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#0F172A",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {getTopBarTitle()}
            </h1>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {activeFeature === "3d_viewer" && editorOpen && (
              <button
                type="button"
                style={{
                  height: 34,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#4F46E5",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 120ms ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#4338CA";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#4F46E5";
                }}
              >
                Save
              </button>
            )}
            {activeFeature === "3d_viewer" && !editorOpen && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/projects', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: 'New Project' }),
                    })
                    if (res.ok) {
                      window.location.reload()
                    }
                  } catch (err) {
                    console.error('Failed to create project', err)
                  }
                }}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  background: "transparent",
                  color: "#64748B",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 120ms ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#4F46E5";
                  e.currentTarget.style.color = "#4F46E5";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#E2E8F0";
                  e.currentTarget.style.color = "#64748B";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                </svg>
                New Project
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflowY: "auto",
        }}>
          {renderContent()}
        </div>
      </div>

      {/* Auth dialog */}
      <AuthDialog open={authDialogOpen} onClose={() => { setAuthDialogOpen(false); void refreshMe(); }} />

      {/* Floor Plan Editor Modal - opens over everything */}
      {editorOpen && activeProject?.id && (
        <FloorPlanEditorModal
          projectId={activeProject.id}
          initialFloorPlanState={
            (activeProject as any).workspace_config?.floorPlanState ?? null
          }
          onSaved={(sceneJSON) => {
            setEditorOpen(false);
            void refreshProjects(activeProject.id);
          }}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {/* Workspace modal for non-3d_viewer tabs */}
      {workspaceOpen && activeProject?.id && activeProject.floorplan_url && activeFeature !== "3d_viewer" && (
        <WorkspaceContainer
          projectId={activeProject.id}
          floorplanUrl={activeProject.floorplan_url}
          onExit={() => setWorkspaceOpen(false)}
        />
      )}
    </div>
  );
}