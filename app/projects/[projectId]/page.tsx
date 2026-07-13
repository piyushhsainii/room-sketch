"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const WorkspaceContainer = dynamic(
    () => import("@/components/workspace/WorkspaceContainer"),
    { ssr: false, loading: () => null }
);

const FloorPlanEditor = dynamic(
    () => import("@/components/workspace/FloorPlanEditor"),
    { ssr: false, loading: () => null }
);

export default function ProjectViewerPage() {
    const params = useParams<{ projectId: string }>();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        console.log("[ProjectViewer] effect fired, params.id =", params.projectId);
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/projects/${params.projectId}`, { cache: "no-store" });
                console.log("[ProjectViewer] fetch resolved, status =", res.status, "cancelled =", cancelled);
                if (cancelled) return;
                if (res.status === 401) {
                    setLoading(false);
                    router.push("/");
                    return;
                }
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    setError(body.error ?? "Failed to load project.");
                    return;
                }
                const body = await res.json();
                console.log("[ProjectViewer] setting project", body);
                setProject(body.project ?? body);
            } catch (err) {
                console.error("Failed to load project:", err);
                if (!cancelled) setError("Failed to load project.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (params.projectId) void load();
        else setLoading(false);
        return () => {
            console.log("[ProjectViewer] cleanup, cancelled = true");
            cancelled = true;
        };
    }, [params.projectId, router]);

    if (loading) {
        return (
            <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#0F0E0C", color: "rgba(148,163,184,0.6)", fontSize: 13 }}>
                Loading project…
            </div>
        );
    }

    if (error || !project) {
        return (
            <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#0F0E0C", color: "#EF4444", fontSize: 13, gap: 12, flexDirection: "column" }}>
                <div>{error ?? "Project not found."}</div>
                <button
                    onClick={() => router.push("/")}
                    style={{ height: 32, padding: "0 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94A3B8", fontSize: 12.5, cursor: "pointer" }}
                >
                    Back to Projects
                </button>
            </div>
        );
    }
    if (!project.floorplan_editor_state && !project.floorplan_url) {
        return (
            <FloorPlanEditor
                onSave={async (fp, cfg) => {
                    try {
                        const res = await fetch("/api/workspace/floorplan-editor-state", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                project_id: project.id,
                                state: { floorPlanState: fp, sceneConfig: cfg },
                            }),
                        });
                        if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            throw new Error(body.error ?? "Save failed");
                        }
                    } catch (err) {
                        console.error("[ProjectViewer] save failed:", err);
                    }
                }}
                onClose={() => router.push("/")}
            />
        );
    }

    if (project.floorplan_editor_state) {

        const { floorPlanState, sceneConfig } = project.floorplan_editor_state as {
            floorPlanState: any;
            sceneConfig: any;
        };

        return (
            <FloorPlanEditor
                initialState={floorPlanState}
                initialSceneConfig={sceneConfig}
                onSave={async (fp, cfg) => {
                    try {
                        const res = await fetch("/api/workspace/floorplan-editor-state", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                project_id: project.id,
                                state: { floorPlanState: fp, sceneConfig: cfg },
                            }),
                        });
                        if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            throw new Error(body.error ?? "Save failed");
                        }
                    } catch (err) {
                        console.error("[ProjectViewer] save failed:", err);
                    }
                }}
                onClose={() => router.push("/")}
            />
        );
    }

    // AI-extracted floor plan — original extraction flow, unchanged
    return (
        <WorkspaceContainer
            projectId={project.id}
            floorplanUrl={project.floorplan_url}
            onExit={() => router.push("/")}
        />
    );
}