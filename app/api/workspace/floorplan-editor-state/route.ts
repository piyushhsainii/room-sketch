import { NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { floorPlanStateToSceneJSON } from "@/lib/workspace/floorPlanConvertor";
import { sceneConfigToWorkspaceConfig } from "@/lib/workspace/sceneConfigToWorkspaceConfig";
import type { SceneConfig } from "@/components/workspace/FloorPlanEditor";
import type { FloorPlanState } from "@/components/workspace/lib/constants";

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

    const admin = createSupabaseAdmin();
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
    };

    if (
      !body.project_id ||
      !body.state?.floorPlanState ||
      !body.state?.sceneConfig
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("user_id", session.userId)
      .single();

    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Single source of truth: derive scene_json AND workspace_config from
    // the same floorPlanState/sceneConfig in the same request. There is
    // now exactly one writer for all three fields — they cannot diverge.
    const sceneJSON = floorPlanStateToSceneJSON(
      body.state.floorPlanState,
      body.state.sceneConfig,
    );
    const workspaceConfig = sceneConfigToWorkspaceConfig(
      body.state.sceneConfig,
    );

    const { error } = await admin
      .from("projects")
      .update({
        floorplan_editor_state: body.state,
        scene_json: sceneJSON,
        workspace_config: workspaceConfig,
        workspace_enabled: true,
        updated_at: new Date().toISOString(),
      })
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
