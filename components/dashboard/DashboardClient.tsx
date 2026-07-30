"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar, type ActiveFeature } from "@/components/sidebar/Sidebar";
import AuthDialog from "@/components/ui/AuthDialog";
import ProjectsGrid from "./ProjectsGrid";
import QuickStart from "@/components/dashboard/QuickStart";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCache, invalidateCache, isStale, setCache } from "@/lib/projectCache";
import { WorkspaceTemplate } from "./workspaceTemplates";
import DashboardHeader from "./DashboardHeader";
import RecentActivity from "./NewRecentActivity";
import SettingsPanel from "./SettingsPanel";
import CollectionsPanel from "./CollectionsPanel";
import type { PlanId } from "@/lib/pricing";

export default function DashboardClient() {
  const [projects, setProjects] = useState<any>([]);
  const [activeProjectId, setActiveProjectId] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [plan, setPlan] = useState<PlanId>("free");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>("3d_viewer");
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "name">("newest");
  const quickStartRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function refreshProjects(selectProjectId?: string) {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await fetch("/api/projects", { method: "GET" });
      if (res.status === 401) { setProjects([]); setActiveProjectId(null); return; }
      if (!res.ok) { setProjectsError("Failed to load projects."); return; }
      const body = await res.json();
      setProjects(body.projects);
      setCache({ projects: body.projects, me: { authed, email: userEmail, plan } });
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
      // Hydrate synchronously from cache if fresh — no spinner, no fetch.
      const cached = getCache();
      if (cached && !isStale()) {
        setAuthed(cached.me.authed);
        setUserEmail(cached.me.email);
        setPlan(cached.me.plan);
        setProjects(cached.projects);
        setProjectsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/me", { method: "GET" });
        if (!res.ok) return;
        const body = (await res.json()) as { authed: boolean; email: string; plan: PlanId };
        if (cancelled) return;
        setAuthed(body.authed); setUserEmail(body.email); setPlan(body.plan);
        if (body.authed) {
          await refreshProjects();
        } else {
          setProjects([]);
          setActiveProjectId(null);
          setProjectsLoading(false);
        }
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
      const body = (await res.json()) as { authed: boolean; email: string; plan: PlanId };
      setAuthed(body.authed); setUserEmail(body.email); setPlan(body.plan);
      if (body.authed) { await refreshProjects(); }
      else { setProjects([]); setActiveProjectId(null); }
    } catch { /* ignore */ }
  }

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      invalidateCache();
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
        setProjects((prev: any) => {
          const next = prev.map((p: any) => p.id === projectId ? { ...p, name: newName } : p);
          setCache({ projects: next, me: { authed, email: userEmail, plan } });
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to rename project', err);
    }
  }

  async function handleNewProject() {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Project' }),
      });
      if (res.ok) {
        const data = await res.json();
        // Cache is now stale relative to the server (new project exists there
        // but not yet reflected here) — next dashboard visit will refetch.
        invalidateCache();
        router.push(`/projects/${data.project?.id ?? data.id}`);
      }
    } catch (err) {
      console.error('Failed to create project', err);
    }
  }

  // Requires POST /api/projects to accept an optional `initialState` param —
  // see Part 1 Step 3 in the spec. Verify that route change is in before
  // wiring this up, or template clicks will silently behave like Blank Canvas.
  async function handleCreateFromTemplate(template: WorkspaceTemplate) {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: template.label, initialState: template.config }),
      });
      if (res.ok) {
        const data = await res.json();
        invalidateCache();
        router.push(`/projects/${data.project?.id ?? data.id}`);
      }
    } catch (err) {
      console.error('Failed to create project from template', err);
    }
  }

  function renderContent() {
    if (activeFeature === "3d_viewer") {
      return (
        <div style={{ padding: "28px 36px 40px" }}>
          <DashboardHeader
            count={projects.length}
            loading={projectsLoading}
            sortMode={sortMode}
            onSortChange={setSortMode}
            onNewProject={handleNewProject}
          />
          <QuickStart
            onCreateFromTemplate={handleCreateFromTemplate}
            onBlankCanvas={handleNewProject}
          />
          <RecentActivity
            projects={projects}
            loading={projectsLoading}
            error={projectsError}
            onRetry={() => void refreshProjects()}
            onOpenProject={(id) => router.push(`/projects/${id}`)}
            onRenameProject={handleRenameProject}
            onCreateNew={handleNewProject}
            onBrowseTemplates={() => quickStartRef.current?.scrollIntoView({ behavior: "smooth" })}
            onNavigate={setActiveFeature}
          />
        </div>
      );
    }
    if (activeFeature === "collections") {
      return (
        <CollectionsPanel
          projects={projects}
          onOpenCollection={(id) => router.push(`/collections/${id}`)}
          onNavigate={setActiveFeature}
        />
      );
    }
    if (activeFeature === "settings") {
      return (
        <SettingsPanel
          userEmail={userEmail}
          plan={plan}
          onNavigate={setActiveFeature}
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