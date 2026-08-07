import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ShareProject = {
  id: string;
  project_name: string;
  scene_json: unknown;
  // NEW — the real multi-floor save. { projectFloorPlan, sceneConfig } per
  // context.md §8. This is what the editor actually writes on every save;
  // scene_json is a derived single-floor snapshot and lags behind it.
  floorplan_editor_state: unknown;
  thumbnail_url: string | null;
  render_url: string | null;
  builder: { full_name: string | null; avatar_url: string | null } | null;
};

export async function getShareProject(
  token: string,
): Promise<ShareProject | null> {
  if (!token) return null;

  const supabase = getSupabaseServerClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, name, scene_json, floorplan_editor_state, share_enabled, thumbnail_url, render_url, user:users(full_name, avatar_url)",
    )
    .eq("share_token", token)
    .single();

  if (error || !project || !project.share_enabled) return null;

  const builder = Array.isArray(project.user)
    ? (project.user[0] ?? null)
    : (project.user ?? null);

  return {
    id: project.id,
    project_name: project.name,
    scene_json: project.scene_json,
    floorplan_editor_state: project.floorplan_editor_state,
    thumbnail_url: project.thumbnail_url,
    render_url: project.render_url,
    builder: builder
      ? { full_name: builder.full_name, avatar_url: builder.avatar_url }
      : null,
  };
}
