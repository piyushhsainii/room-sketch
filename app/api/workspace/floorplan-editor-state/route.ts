import { NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/auth/session";
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
    const session = await readSessionFromCookies();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    if (!projectId)
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 },
      );

    const admin = await createServerSupabaseClient();
    const { data, error } = await admin
      .from("projects")
      .select("floorplan_editor_state")
      .eq("id", projectId)
      .eq("user_id", session.userId)
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
    const session = await readSessionFromCookies();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      project_id: string;
      state: FloorplanEditorState;
      thumbnail_url?: string;
    };

    if (
      !body.project_id ||
      !body.state?.floorPlanState ||
      !body.state?.sceneConfig
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const admin = await createServerSupabaseClient();

    const { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("user_id", session.userId)
      .single();

    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sceneJSON = floorPlanStateToSceneJSON(
      body.state.floorPlanState,
      body.state.sceneConfig,
    );
    const workspaceConfig = sceneConfigToWorkspaceConfig(
      body.state.sceneConfig,
    );

    const updatePayload: Record<string, unknown> = {
      floorplan_editor_state: body.state,
      scene_json: sceneJSON,
      workspace_config: workspaceConfig,
      workspace_enabled: true,
      updated_at: new Date().toISOString(),
    };
    if (body.thumbnail_url) {
      updatePayload.thumbnail_url = body.thumbnail_url;
    }

    const { error } = await admin
      .from("projects")
      .update(updatePayload)
      .eq("id", body.project_id)
      .eq("user_id", session.userId);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      scene_json: sceneJSON,
      workspace_config: workspaceConfig,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to save floorplan editor state" },
      { status: 500 },
    );
  }
}
