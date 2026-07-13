// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { APP, ERRORS } from "@/constants/content";
import type { GenerationType, Project, ProjectGeneration } from "@/lib/models";
import { Sidebar, type ActiveFeature } from "@/components/sidebar/Sidebar";
import UploadZone from "@/components/upload/UploadZone";
import GeneratePanel from "@/components/generate/GeneratePanel";
import RenderViewer from "@/components/viewer/RenderViewer";
import AuthDialog from "@/components/ui/AuthDialog";
import EmptyState from "@/components/ui/EmptyState";
import type { GenerateOptionType } from "@/components/generate/GenerateOptions";
import FloorPlanEditorModal from '@/components/workspace/FloorPlanEditorModal'
import ProjectsGrid from "./ProjectsGrid";
import { useRouter } from "next/navigation";

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
  const [floorplanEditorState, setFloorplanEditorState] = useState<{
    floorPlanState: any;
    sceneConfig: any;
  } | null>(null);
  const [floorplanEditorStateLoading, setFloorplanEditorStateLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>("3d_viewer");
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const router = useRouter()
  const [projectsError, setProjectsError] = useState<string | null>(null);
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
  }, [activeProject?.id]);

  useEffect(() => {
    if (!editorOpen || !activeProject?.id) {
      setFloorplanEditorState(null);
      return;
    }
    let cancelled = false;
    setFloorplanEditorStateLoading(true);
    setFloorplanEditorState(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/workspace/floorplan-editor-state?project_id=${encodeURIComponent(activeProject.id)}`,
          { cache: "no-store" }
        );
        if (!res.ok) { if (!cancelled) setFloorplanEditorState(null); return; }
        const body = await res.json();
        if (!cancelled) setFloorplanEditorState(body.floorplan_editor_state ?? null);
      } catch {
        if (!cancelled) setFloorplanEditorState(null);
      } finally {
        if (!cancelled) setFloorplanEditorStateLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editorOpen, activeProject?.id]);

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
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await fetch("/api/projects", { method: "GET" });
      if (res.status === 401) { setProjects([]); setActiveProjectId(null); return; }
      if (!res.ok) { setProjectsError("Failed to load projects."); return; }
      const body = (await res.json()) as ProjectsResponse;
      setProjects(body.projects);
      if (selectProjectId) { setActiveProjectId(selectProjectId); return; }
      // ← removed the auto-select-first-project fallback entirely
    } catch {
      setProjectsError("Failed to load projects.");
    } finally {
      setProjectsLoading(false);
    }
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

  function renderContent() {
    // ── TAB 1: 3D Viewer ────────────────────────
    if (activeFeature === "3d_viewer") {
      return (
        <ProjectsGrid
          projects={projects}
          loading={projectsLoading}
          error={projectsError}
          onRetry={() => void refreshProjects()}
          onOpenProject={(id) => router.push(`/projects/${id}`)}
          onRenameProject={handleRenameProject}
          onNewProject={async () => {
            try {
              const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Project' }),
              });
              if (res.ok) { const data = await res.json(); router.push(`/projects/${data.project?.id ?? data.id}`); }
            } catch (err) { console.error('Failed to create project', err); }
          }}
        />
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
                onProjectSaved={() => void refreshProjects(activeProject.id)}
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


  console.log(`w`, floorplanEditorState)

  return (
    <div className="ra-app" style={{
      display: "flex",
      minHeight: "100vh",
      background: "#F8FAFC",
    }}>

      <Sidebar
        open={sidebarOpen}
        userEmail={userEmail}
        plan={plan}
        authed={authed}
        activeFeature={activeFeature}
        onFeatureChange={(f: any) => { setActiveFeature(f); setEditorOpen(false); setWorkspaceOpen(false); }}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthDialogOpen(true)}
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

      <AuthDialog open={authDialogOpen} onClose={() => { setAuthDialogOpen(false); void refreshMe(); }} />

      {editorOpen && activeProject?.id && floorplanEditorStateLoading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", background: "#0F0E0C", color: "rgba(148,163,184,0.6)", fontSize: 13 }}>
          Loading editor…
        </div>
      )}
      {editorOpen && activeProject?.id && !floorplanEditorStateLoading && (
        <FloorPlanEditorModal
          projectId={activeProject.id}
          initialFloorPlanState={floorplanEditorState?.floorPlanState ?? null}
          initialSceneConfig={floorplanEditorState?.sceneConfig ?? null}
          onSaved={(sceneJSON) => {
            void refreshProjects(activeProject.id);
          }}
          onClose={() => { }}
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