// app/projects/new/page.tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { WORKSPACE_TEMPLATES } from "@/components/dashboard/workspaceTemplates";
import type { FloorPlanState } from "@/components/workspace/lib/constants";
import type { ProjectFloorPlan } from "@/components/workspace/lib/floor-data";
import { SceneConfig } from "@/components/workspace/FloorPlanEditor";
import { migrateToMultiFloor } from "@/components/workspace/lib/migrateToMultiFloor";

const FloorPlanEditor = dynamic(
    () => import("@/components/workspace/FloorPlanEditor"),
    { ssr: false, loading: () => null }
);

export default function NewProjectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const templateId = searchParams.get("template");
    const template = templateId
        ? WORKSPACE_TEMPLATES.find(t => t.id === templateId)
        : null;

    const { sceneConfig: templateSceneConfig, ...templateFloorPlanState } = template?.config ?? {};

    // Templates still ship as a bare single-floor FloorPlanState (per
    // workspaceTemplates.ts's existing shape) — wrap through the same
    // migration helper ProjectViewerPage uses, rather than passing a bare
    // FloorPlanState into initialProjectFloorPlan where a ProjectFloorPlan
    // is expected.
    const initialProjectFloorPlan: ProjectFloorPlan | undefined = template
        ? migrateToMultiFloor(templateFloorPlanState as FloorPlanState)
        : undefined;

    async function saveNewProject(
        projectFloorPlan: ProjectFloorPlan,
        cfg: SceneConfig,
        thumbnailUrl?: string
    ) {
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: template?.label ?? "New Project",
                    state: { projectFloorPlan, sceneConfig: cfg },
                    thumbnail_url: thumbnailUrl,
                }),
            });
            if (!res.ok) {
                console.error("Failed to save new project");
                return;
            }
            const data = await res.json();
            const newId = data.project?.id ?? data.id;
            router.replace(`/projects/${newId}`);
            return { projectId: newId };
        } catch (err) {
            console.error("[NewProject] save failed:", err);
        }
    }

    return (
        <FloorPlanEditor

            initialProjectFloorPlan={initialProjectFloorPlan}
            initialSceneConfig={template ? (templateSceneConfig as SceneConfig) : undefined}
            onSave={saveNewProject}
            onClose={() => router.push("/")}

        />
    );
}