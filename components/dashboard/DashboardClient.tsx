"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar, type ActiveFeature } from "@/components/sidebar/Sidebar";
import AuthDialog from "@/components/ui/AuthDialog";
import ProjectsGrid from "./ProjectsGrid";
import { useRouter } from "next/navigation";

export default function DashboardClient() {
  const [projects, setProjects] = useState<any>([]);
  const [activeProjectId, setActiveProjectId] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>("3d_viewer");
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const router = useRouter();

  const activeProject = useMemo(
    () => projects.find((p: any) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  async function refreshProjects(selectProjectId?: string) {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await fetch("/api/projects", { method: "GET" });
      if (res.status === 401) { setProjects([]); setActiveProjectId(null); return; }
      if (!res.ok) { setProjectsError("Failed to load projects."); return; }
      const body = await res.json();
      setProjects(body.projects);
      if (selectProjectId) { setActiveProjectId(selectProjectId); return; }
    } catch {
      setProjectsError("Failed to load projects.");
    } finally {
      setProjectsLoading(false);
    }
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

  async function handleRenameProject(projectId: string, newName: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setProjects((prev: any) =>
          prev.map((p: any) => p.id === projectId ? { ...p, name: newName } : p)
        );
      }
    } catch (err) {
      console.error('Failed to rename project', err);
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
    return null;
  }

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
        onFeatureChange={(f: any) => { setActiveFeature(f); }}
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
    </div>
  );
}