// app/api/projects/[id]/star/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // user_id never trusted from the client — same principle as projects.user_id
  const { error } = await supabase
    .from("project_stars")
    .insert({ project_id: id, user_id: user.id });

  // Idempotent: re-starring an already-starred project isn't an error,
  // it's a no-op (primary key conflict = already starred).
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ starred: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("project_stars")
    .delete()
    .eq("project_id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ starred: false });
}
