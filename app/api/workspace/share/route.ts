// app/api/workspace/share/route.ts
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function generateShareToken(): string {
  // 24 random bytes → 32-char base64url string. Unguessable, URL-safe,
  // no padding characters to worry about in the /share/[token] route.
  return crypto.randomBytes(24).toString("base64url");
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

    const body = await request.json().catch(() => ({}));
    const projectId = body.project_id as string | undefined;
    const enabled = body.enabled as boolean | undefined;

    if (!projectId || typeof enabled !== "boolean")
      return NextResponse.json(
        { error: "Missing project_id or enabled" },
        { status: 400 },
      );

    // Ownership check + fetch the existing token (if any) in one query —
    // .eq("user_id", user.id) is the actual authorization boundary here,
    // not just a filter; without it any authed user could toggle sharing
    // on any project by guessing an id.
    const { data: existing, error: fetchError } = await supabase
      .from("projects")
      .select("id, share_token")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Reuse the existing token if one was already generated — toggling
    // share off/on repeatedly shouldn't invalidate a link someone already
    // has, since disabling already fully revokes access via
    // share_enabled=false (checked in GET /api/workspace/share/[token]),
    // independent of whether the token value itself changes.
    const shareToken = existing.share_token ?? generateShareToken();

    const { data: updated, error: updateError } = await supabase
      .from("projects")
      .update({
        share_token: shareToken,
        share_enabled: enabled,
      })
      .eq("id", projectId)
      .eq("user_id", user.id)
      .select("share_token, share_enabled")
      .single();

    if (updateError || !updated)
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to update sharing" },
        { status: 500 },
      );

    return NextResponse.json({
      ok: true,
      share_token: updated.share_token,
      share_enabled: updated.share_enabled,
    });
  } catch (err) {
    console.error("[POST /api/workspace/share] failed:", err);
    return NextResponse.json(
      { error: "Failed to update sharing" },
      { status: 500 },
    );
  }
}
