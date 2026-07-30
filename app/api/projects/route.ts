// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { floorPlanStateToSceneJSON } from "@/lib/workspace/floorPlanConvertor";
import { sceneConfigToWorkspaceConfig } from "@/lib/workspace/sceneConfigToWorkspaceConfig";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET — unchanged in shape, now authed via Supabase Auth instead of the
// custom renderai_session JWT. RLS (auth.uid() = user_id) does the
// filtering now; the explicit .eq("user_id", ...) is kept as a belt-and-
// braces filter, not the sole line of defense.
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log(authError);

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body.name as string) || "New Project";
  const state = body.state as
    | { floorPlanState: any; sceneConfig: any }
    | undefined;
  const thumbnailUrl = body.thumbnail_url as string | undefined;

  // user_id intentionally omitted — the `user_id` column now defaults to
  // auth.uid() at the DB level (see migration SQL), so the client/server
  // never needs to state it, and RLS's `with check (user_id = auth.uid())`
  // can't be defeated by a route that forgets to set it.
  const insertPayload: Record<string, unknown> = {
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

  const { data, error } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
