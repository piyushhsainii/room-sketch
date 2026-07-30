/**
 * app/api/workspace/save-views/route.ts
 *
 * Saves only the camera view presets (savedViews) into a project's
 * scene_json, merged in without touching the rest of the blob. Kept
 * separate from save-manual/route.ts so adding/deleting a saved view
 * doesn't require (or race with) a full manual Save.
 *
 * Same DB schema column as save-manual: projects.scene_json.
 */

import { NextResponse } from "next/server";
import type { SceneJSON } from "@/types/workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SavedViewDTO = {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
};

type Body = {
  project_id: string;
  saved_views: SavedViewDTO[];
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<Body>;

    if (!body.project_id || !Array.isArray(body.saved_views)) {
      return NextResponse.json(
        { error: "Missing project_id or saved_views" },
        { status: 400 },
      );
    }

    const admin = await createServerSupabaseClient();

    // Fetch existing scene_json so we can merge rather than overwrite —
    // this endpoint must never clobber rooms/openings/etc written by
    // save-manual or the AI extraction path.
    const { data: project, error: fetchError } = await admin
      .from("projects")
      .select("id, scene_json")
      .eq("id", body.project_id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const existingSceneJson = (project.scene_json as SceneJSON) ?? {};
    const updatedSceneJson: SceneJSON = {
      ...existingSceneJson,
      saved_views: body.saved_views,
    };

    const { error: updateError } = await admin
      .from("projects")
      .update({
        scene_json: updatedSceneJson as unknown,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.project_id);

    if (updateError) {
      console.error("[save-views] DB update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save views to database" },
        { status: 500 },
      );
    }

    console.log(
      "[save-views] saved",
      body.saved_views.length,
      "view(s) for project:",
      body.project_id,
    );
    return NextResponse.json({ ok: true, saved_views: body.saved_views });
  } catch (e) {
    console.error("[save-views] unhandled error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
