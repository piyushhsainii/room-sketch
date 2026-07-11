// app/api/workspace/share/route.ts
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { project_id, enabled } = (await request.json()) as {
      project_id: string;
      enabled: boolean;
    };

    if (!project_id) {
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdmin();

    const { data: project, error: fetchError } = await admin
      .from("projects")
      .select("id, share_token")
      .eq("id", project_id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const token = project.share_token ?? randomBytes(16).toString("hex");

    const { error: updateError } = await admin
      .from("projects")
      .update({ share_token: token, share_enabled: enabled })
      .eq("id", project_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update share settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      share_token: token,
      share_enabled: enabled,
    });
  } catch (e) {
    console.error("[share] unhandled error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
