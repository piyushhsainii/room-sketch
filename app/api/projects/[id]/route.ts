import { NextRequest, NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSessionFromCookies();
  if (!session || !session.userId)
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

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("projects")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
