"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar, type ActiveFeature } from "@/components/sidebar/Sidebar";
import AuthDialog from "@/components/ui/AuthDialog";
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

type InitialUser = { email: string };

interface DashboardClientProps {
  initialUser: InitialUser;
  initialPlan: PlanId;
}

export default function DashboardClient({ initialUser, initialPlan }: DashboardClientProps) {
  const [projects, setProjects] = useState<any>([]);
  const [activeProjectId, setActiveProjectId] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth state now comes from the server component — it's already
  // resolved by the time this renders, so no loading state needed and
  // no client fetch to re-derive it. `authed` is implicitly true: this
  // component only renders for signed-in users (page.tsx redirects
  // otherwise), so there's no unauthenticated branch to model here.
  const [userEmail, setUserEmail] = useState<string>(initialUser.email);
  const [plan, setPlan] = useState<PlanId>(initialPlan);

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
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
      if (res.status === 401) {
        // Session expired mid-session (token revoked, user deleted, etc).
        // Middleware will catch this on next navigation; here we just
        // reflect it locally rather than silently failing.
        setProjects([]);
        setActiveProjectId(null);
        return;
      }
      if (!res.ok) {
        setProjectsError("Failed to load projects.");
        return;
      }
      const body = await res.json();
      setProjects(body.projects);
      setCache({ projects: body.projects, me: { authed: true, email: userEmail, plan } });
      if (selectProjectId) {
        setActiveProjectId(selectProjectId);
        return;
      }
    } catch {
      setProjectsError("Failed to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => {
    // Projects are still fetched client-side (they change more often than
    // auth state and benefit from the existing cache), but we no longer
    // need to resolve *who* the user is first — that's already known.
    const cached = getCache();
    if (cached && !isStale() && cached.me.email === userEmail) {
      setProjects(cached.projects);
      setProjectsLoading(false);
      return;
    }
    void refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshMe() {
    // Used after auth dialog actions (sign in / sign up) where the
    // session changes without a full page navigation. A lightweight
    // client-side refresh is appropriate here since it's event-driven,
    // not a per-load poll.
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.reload();
        return;
      }
      setUserEmail(user.email ?? "");
      await refreshProjects();
    } catch {
      /* ignore */
    }
  }

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      invalidateCache();
      window.location.reload();
    }
  }

  async function handleRenameProject(projectId: string, newName: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setProjects((prev: any) => {
          const next = prev.map((p: any) => (p.id === projectId ? { ...p, name: newName } : p));
          setCache({ projects: next, me: { authed: true, email: userEmail, plan } });
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to rename project", err);
    }
  }

  async function handleNewProject() {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Project" }),
      });
      if (res.ok) {
        const data = await res.json();
        invalidateCache();
        router.push(`/projects/${data.project?.id ?? data.id}`);
      }
    } catch (err) {
      console.error("Failed to create project", err);
    }
  }

  async function handleCreateFromTemplate(template: WorkspaceTemplate) {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: template.label, initialState: template.config }),
      });
      if (res.ok) {
        const data = await res.json();
        invalidateCache();
        router.push(`/projects/${data.project?.id ?? data.id}`);
      }
    } catch (err) {
      console.error("Failed to create project from template", err);
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
      return <SettingsPanel userEmail={userEmail} plan={plan} onNavigate={setActiveFeature} />;
    }
    return null;
  }

  return (
    <div
      className="ra-app"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#F8FAFC",
      }}
    >
      <Sidebar
        open={sidebarOpen}
        userEmail={userEmail}
        plan={plan}
        authed={true}
        activeFeature={activeFeature}
        onFeatureChange={(f: any) => {
          setActiveFeature(f);
        }}
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

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginLeft: 220,
          minWidth: 0,
          transition: "margin-left 200ms ease",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {renderContent()}
        </div>
      </div>

      <AuthDialog
        open={authDialogOpen}
        onClose={() => {
          setAuthDialogOpen(false);
          void refreshMe();
        }}
      />
    </div>
  );
}