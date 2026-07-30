// app/api/workspace/share/[token]/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const admin = await createServerSupabaseClient();

  const { data: project, error } = await admin
    .from("projects")
    .select("id, name, scene_json, share_enabled")
    .eq("share_token", token)
    .single();

  if (error || !project || !project.share_enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    project_name: project.name,
    scene_json: project.scene_json,
  });
}
