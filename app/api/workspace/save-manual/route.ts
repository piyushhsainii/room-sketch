/**
 * app/api/workspace/save-manual/route.ts
 *
 * Saves a manually drawn floor plan (SceneJSON) to the DB.
 * Separate from extract/route.ts so the AI extraction logic stays untouched.
 * Uses the same DB schema column: scene_json + workspace_enabled.
 */

import { NextResponse } from "next/server";
import type { SceneJSON } from "@/types/workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  project_id: string;
  scene_json: SceneJSON;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Body>;

    if (!body.project_id || !body.scene_json) {
      return NextResponse.json(
        { error: "Missing project_id or scene_json" },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(body.scene_json.rooms) ||
      body.scene_json.rooms.length === 0
    ) {
      return NextResponse.json(
        { error: "scene_json must have at least one room" },
        { status: 400 },
      );
    }

    const admin = await createServerSupabaseClient();

    // Verify project exists
    const { data: project, error: fetchError } = await admin
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { error: updateError } = await admin
      .from("projects")
      .update({
        scene_json: body.scene_json as unknown,
        workspace_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.project_id);

    if (updateError) {
      console.error("[save-manual] DB update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save to database" },
        { status: 500 },
      );
    }

    console.log(
      "[save-manual] saved manual floor plan for project:",
      body.project_id,
    );
    return NextResponse.json({ ok: true, scene_json: body.scene_json });
  } catch (e) {
    console.error("[save-manual] unhandled error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
