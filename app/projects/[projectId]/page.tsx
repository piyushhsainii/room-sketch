"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { FloorPlanState } from "@/components/workspace/lib/constants";
import type { ProjectFloorPlan } from "@/components/workspace/lib/floor-data";
import type { SceneConfig } from "@/components/workspace/lib/scene-config"
import { migrateToMultiFloor } from "@/components/workspace/lib/migrateToMultiFloor";
import { SaveAuthError } from "@/lib/workspace/save-auth-error";
import PageFailure from "@/components/ui/PageFailure";


const WorkspaceContainer = dynamic(
    () => import("@/components/workspace/WorkspaceContainer"),
    { ssr: false, loading: () => <ProjectLoading label="Opening workspace..." /> }
);

const FloorPlanEditor = dynamic(
    () => import("@/components/workspace/FloorPlanEditor"),
    { ssr: false, loading: () => <ProjectLoading label="Opening floor plan editor…" /> }
);

function ProjectLoading({ label }: { label: string }) {
    return <div role="status" className="grid min-h-screen place-items-center">{label}</div>;
}

export default function ProjectViewerPage() {
    const params = useParams<{ projectId: string }>();
    const router = useRouter();
    const revisionRef = useRef<string | null>(null);
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const loginHref = `/login?${new URLSearchParams({ redirectTo: `/projects/${params.projectId}` })}`;

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        async function load() {
            setLoading(true);
            setError(null);
            setErrorStatus(null);
            setProject(null);
            try {
                const res = await fetch(`/api/projects/${params.projectId}?view=editor`, { cache: "no-store", signal: controller.signal });
                if (cancelled) return;
                if (res.status === 401) {
                    setErrorStatus(401);
                    setError("Your session has expired. Sign in to reopen this project.");
                    router.replace(loginHref);
                    return;
                }
                if (!res.ok) {
                    setErrorStatus(res.status);
                    setError(res.status === 404 || res.status === 403
                        ? "This project may have been removed, or your account does not have access to it."
                        : "We could not load this project. Please try again in a moment.");
                    return;
                }
                const body = await res.json();
                if (cancelled) return;
                const loadedProject = body.project ?? body;
                revisionRef.current = loadedProject.floorplan_editor_state?.revision ?? null;
                setProject(loadedProject);
            } catch (err) {
                if (cancelled) return;
                console.error("Failed to load project:", err);
                if (!cancelled) setError("Failed to load project.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (params.projectId) void load();
        else setLoading(false);
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [params.projectId, router, loginHref, loadAttempt]);

    if (loading) {
        return (
            <ProjectLoading label="Loading floor plan…" />
        );
    }

    if (error || !project) {
        return (
            <PageFailure
                title={errorStatus === 401 ? "Sign in to open this project" : errorStatus === 404 || errorStatus === 403 ? "Project unavailable" : "Could not load this project"}
                message={error ?? "This project could not be found."}
                onRetry={() => setLoadAttempt(attempt => attempt + 1)}
                signInHref={errorStatus === 401 ? loginHref : undefined}
            />
        );
    }

    async function saveProject(projectFloorPlan: ProjectFloorPlan, cfg: SceneConfig) {
        const res = await fetch("/api/workspace/floorplan-editor-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project_id: project.id,
                base_revision: revisionRef.current,
                state: { projectFloorPlan, sceneConfig: cfg },
            }),
        });
        if (res.status === 401) {
            throw new SaveAuthError();
        }
        const body = await res.json();
        if (!res.ok) {
            throw new Error(body.error ?? "Save failed. Try again.");
        }
        revisionRef.current = body.revision;
        return { projectId: project.id as string, revision: body.revision as string };
    }

    if (!project.floorplan_editor_state && !project.floorplan_url) {
        return (
            <FloorPlanEditor
                projectId={project.id}
                onSave={saveProject}
                onClose={() => router.push("/dashboard")}
            />
        );
    }

    if (project.floorplan_editor_state) {

        const rawState = project.floorplan_editor_state as {
            projectFloorPlan?: ProjectFloorPlan;
            floorPlanState?: FloorPlanState;
            sceneConfig: SceneConfig;
        };

        const projectFloorPlan: ProjectFloorPlan =
            rawState.projectFloorPlan ?? migrateToMultiFloor(rawState.floorPlanState!);
        const sceneConfig = rawState.sceneConfig;

        return (
            <FloorPlanEditor
                projectId={project.id}
                initialProjectFloorPlan={projectFloorPlan}
                initialSceneConfig={sceneConfig}
                onSave={saveProject}
                onClose={() => router.push("/dashboard")}
            />
        );
    }

    // AI-extracted floor plan — original extraction flow, unchanged, out of
    // multi-floor scope per Phase 3 discussion.
    return (
        <WorkspaceContainer
            projectId={project.id}
            floorplanUrl={project.floorplan_url}
            onExit={() => router.push("/dashboard")}
        />
    );
}
