import { NextResponse } from "next/server";
import { floorPlanStateToSceneJSON } from "@/lib/workspace/floorPlanConvertor";
import { sceneConfigToWorkspaceConfig } from "@/lib/workspace/sceneConfigToWorkspaceConfig";
import type { SceneConfig } from "@/components/workspace/FloorPlanEditor";
import type { FloorPlanState } from "@/components/workspace/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type FloorplanEditorState = {
    floorPlanState: FloorPlanState;
    sceneConfig: SceneConfig;
};

export async function GET(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("project_id");
        if (!projectId)
            return NextResponse.json(
                { error: "Missing project_id" },
                { status: 400 },
            );

        const { data, error } = await supabase
            .from("projects")
            .select("floorplan_editor_state")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (error || !data)
            return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({
            floorplan_editor_state: data.floorplan_editor_state ?? null,
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to load floorplan editor state" },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const projectId = body.project_id as string | undefined;
        const state = body.state as FloorplanEditorState | undefined;
        const thumbnailUrl = body.thumbnail_url as string | undefined;

        if (!projectId)
            return NextResponse.json(
                { error: "Missing project_id" },
                { status: 400 },
            );
        if (!state?.floorPlanState || !state?.sceneConfig)
            return NextResponse.json(
                { error: "Missing floorPlanState or sceneConfig" },
                { status: 400 },
            );

        const sceneJSON = floorPlanStateToSceneJSON(
            state.floorPlanState,
            state.sceneConfig,
        );
        const workspaceConfig = sceneConfigToWorkspaceConfig(state.sceneConfig);

        const updatePayload: Record<string, unknown> = {
            floorplan_editor_state: state,
            scene_json: sceneJSON,
            workspace_config: workspaceConfig,
            workspace_enabled: true,
        };
        if (thumbnailUrl) updatePayload.thumbnail_url = thumbnailUrl;

        const { data, error } = await supabase
            .from("projects")
            .update(updatePayload)
            .eq("id", projectId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error || !data)
            return NextResponse.json(
                { error: error?.message ?? "Not found" },
                { status: error ? 500 : 404 },
            );

        return NextResponse.json({ project: data });
    } catch {
        return NextResponse.json(
            { error: "Failed to save floorplan editor state" },
            { status: 500 },
        );
    }
}