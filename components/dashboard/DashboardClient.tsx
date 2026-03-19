"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { APP, DASHBOARD, EMPTY_STATE, ERRORS } from "@/constants/content";
import type { GenerationType, Project, ProjectGeneration } from "@/lib/models";

import Sidebar from "@/components/sidebar/Sidebar";
import UploadZone from "@/components/upload/UploadZone";
import GeneratePanel from "@/components/generate/GeneratePanel";
import RenderViewer from "@/components/viewer/RenderViewer";
import MarqueeSection from "@/components/marquee/MarqueeSection";
import AuthDialog from "@/components/ui/AuthDialog";
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
  const [editorOpen, setEditorOpen] = useState(false)
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

  return (
    <div className="ra-app">
      {/* Sidebar — no generateControls, purely navigation */}
      <Sidebar
        open={sidebarOpen}
        projects={projects}
        activeProjectId={activeProjectId}
        userEmail={userEmail}
        plan={plan}
        authed={authed}
        generateControls={null}
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
              // Reload projects — or push the new project into state
              window.location.reload()
            }
          } catch (err) {
            console.error('Failed to create project', err)
          }
        }}
      />

      {sidebarOpen && (
        <div className="ra-sidebarOverlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="ra-content">
        <div className="ra-mobileTopbar">
          <button type="button" className="ra-iconBtn" aria-label={APP.menu}
            onClick={() => setSidebarOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="ra-logoText">{APP.name}</div>
          <div style={{ width: 40 }} />
        </div>

        <main className="ra-main">
          <div className="ra-mainInner fade-up">
            <div className="ra-pageHeader">
              <h1 className="ra-pageTitle">{DASHBOARD.headline}</h1>
              <p className="ra-pageSub">{DASHBOARD.subheadline}</p>
            </div>

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

            {activeProject ? (
              <>
                <GeneratePanel
                  project={activeProject}
                  value={styleContext}
                  onChange={setStyleContext}
                  running={genRunning}
                  runningType={genRunningType}
                  stepIndex={stepIndex}
                  elapsedSeconds={elapsedSeconds}
                  // ── Generate CTA props ──
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
                />

                <RenderViewer
                  project={activeProject}
                  onRegenerated={async () => { await refreshProjects(activeProject.id); }}
                  onUnauthorized={() => setAuthDialogOpen(true)}
                />
              </>
            ) : (
              <div className="ra-emptyMain">
                <div className="ra-emptyMainTitle">{EMPTY_STATE.title}</div>
                <div className="ra-emptyMainHint">{EMPTY_STATE.hint}</div>
              </div>
            )}
          </div>
          <MarqueeSection projects={projects} />
        </main>
      </div>

      <AuthDialog open={authDialogOpen} onClose={() => { setAuthDialogOpen(false); void refreshMe(); }} />

      {workspaceOpen && activeProject?.id && activeProject.floorplan_url && (
        <WorkspaceContainer
          projectId={activeProject.id}
          floorplanUrl={activeProject.floorplan_url}
          onExit={() => setWorkspaceOpen(false)}
        />
      )}
    </div>
  );
}