import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  if (!id || id === "undefined") {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  // NOTE: this GET previously had no user_id filter at all — any
  // authenticated user could fetch any project by ID, not just their own.
  // .eq("user_id", user.id) is the fix; keep it even if RLS is also
  // enabled on `projects`, as belt-and-braces.
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ project: data });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  if (!id || id === "undefined") {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { name } = body as { name?: string };
  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  const { error } = await supabase
    .from("projects")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
