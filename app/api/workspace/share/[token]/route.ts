// app/api/workspace/share/[token]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { token: string } },
) {
  const admin = createSupabaseAdmin();

  const { data: project, error } = await admin
    .from("projects")
    .select("id, name, scene_json, share_enabled")
    .eq("share_token", params.token)
    .single();

  // Deliberately return the same generic 404 whether the token is invalid OR
  // sharing has been turned off — don't leak "this project exists but sharing
  // is disabled" to an unauthenticated caller poking at tokens.
  if (error || !project || !project.share_enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    project_name: project.name,
    scene_json: project.scene_json,
  });
}
