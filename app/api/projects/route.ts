// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { floorPlanStateToSceneJSON } from "@/lib/workspace/floorPlanConvertor";
import { sceneConfigToWorkspaceConfig } from "@/lib/workspace/sceneConfigToWorkspaceConfig";

// GET — unchanged
export async function GET() {
  const session = await readSessionFromCookies();
  if (!session || !session.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

// POST — create a project. Backward compatible with the old { name }-only
// call shape; also accepts an optional { state, thumbnail_url } for the
// Quick Start draft flow, where the project is created WITH content on
// first save rather than blank-then-filled.
export async function POST(req: NextRequest) {
  const session = await readSessionFromCookies();
  if (!session || !session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body.name as string) || "New Project";
  const state = body.state as
    | { floorPlanState: any; sceneConfig: any }
    | undefined;
  const thumbnailUrl = body.thumbnail_url as string | undefined;

  const insertPayload: Record<string, unknown> = {
    user_id: session.userId,
    name,
    status: "uploaded",
    floorplan_url: "",
  };

  if (state?.floorPlanState && state?.sceneConfig) {
    const sceneJSON = floorPlanStateToSceneJSON(
      state.floorPlanState,
      state.sceneConfig,
    );
    const workspaceConfig = sceneConfigToWorkspaceConfig(state.sceneConfig);
    insertPayload.floorplan_editor_state = state;
    insertPayload.scene_json = sceneJSON;
    insertPayload.workspace_config = workspaceConfig;
    insertPayload.workspace_enabled = true;
  }

  if (thumbnailUrl) {
    insertPayload.thumbnail_url = thumbnailUrl;
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
