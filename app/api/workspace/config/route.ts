import { NextResponse } from "next/server";

import { readSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { WorkspaceConfig } from "@/types/workspace";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await readSessionFromCookies();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    if (!projectId)
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 },
      );

    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("projects")
      .select("workspace_config")
      .eq("id", projectId)
      .eq("user_id", session.userId)
      .single();

    if (error || !data)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      workspace_config: data.workspace_config ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load config" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await readSessionFromCookies();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      project_id: string;
      config: WorkspaceConfig;
    };

    if (!body.project_id || !body.config) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // Verify ownership
    const { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("user_id", session.userId)
      .single();

    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { error } = await admin
      .from("projects")
      .update({
        workspace_config: body.config,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.project_id)
      .eq("user_id", session.userId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 },
    );
  }
}
