// app/projects/new/page.tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { WORKSPACE_TEMPLATES } from "@/components/dashboard/workspaceTemplates";
import type { FloorPlanState } from "@/components/workspace/lib/constants";
import { SceneConfig } from "@/components/workspace/FloorPlanEditor";

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

    return (
        <FloorPlanEditor
            initialState={template ? (templateFloorPlanState as FloorPlanState) : undefined}
            initialSceneConfig={template ? (templateSceneConfig as SceneConfig) : undefined}
            onSave={async (fp, cfg, thumbnailUrl) => {
                const res = await fetch("/api/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: template?.label ?? "New Project",
                        state: { floorPlanState: fp, sceneConfig: cfg },
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
            }}
            onClose={() => router.push("/")}
        />
    );
}