import { NextResponse } from "next/server";
import { floorPlanStateToSceneJSON } from "@/lib/workspace/floorPlanConvertor";
import { sceneConfigToWorkspaceConfig } from "@/lib/workspace/sceneConfigToWorkspaceConfig";
import type { SceneConfig } from "@/components/workspace/FloorPlanEditor";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProjectFloorPlan } from "@/components/workspace/lib/floor-data";
import { migrateToMultiFloor } from "@/components/workspace/lib/migrateToMultiFloor";
import {
  DEFAULT_FP,
  FloorPlanState,
} from "@/components/workspace/lib/constants";

export const runtime = "nodejs";

type FloorplanEditorState = {
  projectFloorPlan?: ProjectFloorPlan;
  floorPlanState?: FloorPlanState;
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

    const body = (await request.json()) as {
      project_id: string;
      state: FloorplanEditorState;
      thumbnail_url?: string;
    };

    if (
      !body.project_id ||
      !body.state?.sceneConfig ||
      (!body.state.projectFloorPlan && !body.state.floorPlanState)
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Ownership check now happens via RLS on the update below (using the
    // user-session client), but we still verify existence explicitly for
    // a clean 404 vs. a silent no-op update.
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("user_id", user.id)
      .single();

    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const projectFloorPlan: ProjectFloorPlan =
      body.state.projectFloorPlan ??
      migrateToMultiFloor(body.state.floorPlanState ?? DEFAULT_FP);

    const activeFloor = projectFloorPlan.floors.find(
      (f) => f.id === projectFloorPlan.activeFloorId,
    );
    const sceneJSON = floorPlanStateToSceneJSON(
      activeFloor?.state ?? DEFAULT_FP,
      body.state.sceneConfig,
    );
    const workspaceConfig = sceneConfigToWorkspaceConfig(
      body.state.sceneConfig,
    );

    const updatePayload: Record<string, unknown> = {
      floorplan_editor_state: {
        projectFloorPlan,
        sceneConfig: body.state.sceneConfig,
      },
      scene_json: sceneJSON,
      workspace_config: workspaceConfig,
      workspace_enabled: true,
      updated_at: new Date().toISOString(),
    };
    if (body.thumbnail_url) {
      updatePayload.thumbnail_url = body.thumbnail_url;
    }

    const { error } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", body.project_id)
      .eq("user_id", user.id);

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
