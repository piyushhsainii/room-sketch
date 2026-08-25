export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; archived?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, archived } = body;

  if (name === undefined && archived === undefined) {
    return NextResponse.json(
      { error: "Nothing to update — provide 'name' and/or 'archived'" },
      { status: 400 },
    );
  }

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "'name' must be a non-empty string" },
        { status: 400 },
      );
    }
    if (name.length > 200) {
      return NextResponse.json(
        { error: "'name' is too long (max 200 chars)" },
        { status: 400 },
      );
    }
  }

  if (archived !== undefined && typeof archived !== "boolean") {
    return NextResponse.json(
      { error: "'archived' must be a boolean" },
      { status: 400 },
    );
  }

  const { data: project, error: fetchErr } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (fetchErr || !project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.user_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) patch.name = name.trim();
  if (archived !== undefined) {
    patch.archived = archived;
    patch.archived_at = archived ? new Date().toISOString() : null;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ project: updated });
}

// app/api/projects/[id]/publish/route.ts
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
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project, error: fetchErr } = await supabase
    .from("projects")
    .select("id, user_id, published")
    .eq("id", id)
    .single();

  if (fetchErr || !project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.user_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Idempotent — publishing an already-published project just returns it
  // as-is rather than erroring or bumping published_at again.
  if (project.published) {
    const { data: current, error: reFetchErr } = await supabase
      .from("projects")
      .select()
      .eq("id", id)
      .single();
    if (reFetchErr)
      return NextResponse.json({ error: reFetchErr.message }, { status: 500 });
    return NextResponse.json({ project: current });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("projects")
    .update({
      published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ project: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Unpublish — same route, same ownership rules, so "publish"/"unpublish"
  // stay symmetric under one file rather than needing a second endpoint.
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project, error: fetchErr } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (fetchErr || !project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.user_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: updated, error: updateErr } = await supabase
    .from("projects")
    .update({
      published: false,
      published_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ project: updated });
}
