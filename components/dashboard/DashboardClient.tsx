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

// ---- Claymorphism theme tokens (shared across dashboard components) ----
const CLAY = {
  canvas: "#E5E5E5",
  surface: "#EAEAEA",
  surfaceChip: "#F5F5F5",
  textPrimary: "#1A1A1A",
  textMuted: "#5A5A5A",
  textPlaceholder: "#999999",
  lightShadow: "rgba(255,255,255,0.75)",
  darkShadow: "rgba(0,0,0,0.14)",
  font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

type InitialUser = { email: string };

interface DashboardClientProps {
  initialUser: InitialUser;
  initialPlan: PlanId;
}

export default function DashboardClient({ initialUser, initialPlan }: DashboardClientProps) {
  const [projects, setProjects] = useState<any>([]);
  const [activeProjectId, setActiveProjectId] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  async function handleArchiveProject(projectId: string) {
    const prev = projects;
    // optimistic: remove from the visible list immediately
    setProjects((p: any[]) => {
      const next = p.filter((proj) => proj.id !== projectId);
      setCache({ projects: next, me: { authed: true, email: userEmail, plan } });
      return next;
    });
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) throw new Error("Archive failed");
    } catch (err) {
      console.error("Failed to archive project", err);
      setProjects(prev); // rollback
      setCache({ projects: prev, me: { authed: true, email: userEmail, plan } });
    }
  }

  async function handleDeleteProject(projectId: string) {
    const prev = projects;
    setProjects((p: any[]) => {
      const next = p.filter((proj) => proj.id !== projectId);
      setCache({ projects: next, me: { authed: true, email: userEmail, plan } });
      return next;
    });
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      console.error("Failed to delete project", err);
      setProjects(prev); // rollback — card reappears if the server rejected it
      setCache({ projects: prev, me: { authed: true, email: userEmail, plan } });
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
        <div className="ra-content-pad">
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
            onArchiveProject={handleArchiveProject}
            onDeleteProject={handleDeleteProject}
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
          onOpenStarredProject={(id) => router.push(`/community/${id}`)}
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
        background: CLAY.canvas,
        fontFamily: CLAY.font,
      }}
    >
      <style>{`
        .ra-sidebar-wrap {
          flex-shrink: 0;
        }
        .ra-main {
          margin-left: 220px;
        }
        .ra-mobile-topbar {
          display: none;
        }
        .ra-content-pad {
          padding: 28px 36px 40px;
        }

        @media (max-width: 860px) {
          .ra-sidebar-wrap {
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            z-index: 20;
            transform: translateX(${sidebarOpen ? "0" : "-100%"});
            transition: transform 220ms ease;
          }
          .ra-main {
            margin-left: 0;
          }
          .ra-mobile-topbar {
            display: flex;
          }
          .ra-content-pad {
            padding: 18px 16px 28px;
          }
        }
      `}</style>

      <div className="ra-sidebar-wrap">
        <Sidebar
          open={sidebarOpen}
          userEmail={userEmail}
          plan={plan}
          authed={true}
          activeFeature={activeFeature}
          onFeatureChange={(f: ActiveFeature) => {
            if (f === "community") {
              router.push("/community");
              return;
            }
            setActiveFeature(f);
            setSidebarOpen(false);
          }}
          onSignOut={handleSignOut}
          onSignIn={() => setAuthDialogOpen(true)}
        />
      </div>

      {sidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.22)",
            zIndex: 19,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className="ra-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          transition: "margin-left 200ms ease",
        }}
      >
        {/* Mobile-only top bar: hamburger to open the drawer, since the
            sidebar has no other entry point once it's off-canvas. */}
        <div
          className="ra-mobile-topbar"
          style={{
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: CLAY.surface,
            boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`,
            position: "sticky",
            top: 0,
            zIndex: 15,
          }}
        >
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none",
              background: CLAY.surfaceChip,
              boxShadow: "-3px -3px 7px rgba(255,255,255,0.75), 3px 3px 8px rgba(0,0,0,0.16)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: CLAY.textPrimary, flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <span style={{ fontSize: 14, fontWeight: 500, color: CLAY.textPrimary, fontFamily: CLAY.font }}>
            roomsketch
          </span>
        </div>

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