import { NextResponse } from "next/server";

import type { WorkspaceConfig } from "@/types/workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    if (!projectId)
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 },
      );

    const { data, error } = await supabase
      .from("projects")
      .select("workspace_config")
      .eq("id", projectId)
      .eq("user_id", user.id)
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
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      project_id: string;
      config: WorkspaceConfig;
    };

    if (!body.project_id || !body.config) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Verify ownership
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("user_id", user.id)
      .single();

    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { error } = await supabase
      .from("projects")
      .update({
        workspace_config: body.config,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.project_id)
      .eq("user_id", user.id);

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
