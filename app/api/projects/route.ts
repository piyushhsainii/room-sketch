// PATH: app/api/projects/route.ts
import { floorPlanStateToSceneJSON } from "@/lib/workspace/floorPlanConvertor";
import { sceneConfigToWorkspaceConfig } from "@/lib/workspace/sceneConfigToWorkspaceConfig";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { guardProjectSlot } from "@/lib/entitlements";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const projects = data ?? [];

  const projectIds = projects.map((p) => p.id);
  const starredSet = new Set<string>();
  const counts: Record<string, number> = {};

  if (projectIds.length > 0) {
    const { data: starRows } = await supabase
      .from("project_stars")
      .select("project_id, user_id")
      .in("project_id", projectIds);

    for (const row of starRows ?? []) {
      counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
      if (row.user_id === user.id) starredSet.add(row.project_id);
    }
  }

  const projectsWithStars = projects.map((p) => ({
    ...p,
    starred: starredSet.has(p.id),
    star_count: counts[p.id] ?? 0,
  }));

  return NextResponse.json({ projects: projectsWithStars });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Project-limit gate — the actual server-side enforcement. Returns a
  // 402 with { error: "plan_limit", reason: "projectLimit", plan } if the
  // user's already at their plan's limit. Must run before the insert, not
  // after — otherwise a race (two rapid clicks) could let someone briefly
  // exceed their limit before the check catches up.
  const blocked = await guardProjectSlot(user.id);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const name = (body.name as string) || "New Project";
  const state = body.state as
    | { floorPlanState: any; sceneConfig: any }
    | undefined;
  const thumbnailUrl = body.thumbnail_url as string | undefined;

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
