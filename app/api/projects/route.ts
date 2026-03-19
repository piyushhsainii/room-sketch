// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

// GET — returns user's projects (keep existing logic if this file already exists,
// otherwise this is the full implementation)
export async function GET() {
  const session = await readSessionFromCookies();
  if (!session || !session.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

// POST — create a new blank project
export async function POST(req: NextRequest) {
  const session = await readSessionFromCookies();
  if (!session || !session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body.name as string) || "New Project";

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: session.userId,
      name,
      status: "uploaded",
      floorplan_url: "", // blank — no floor plan uploaded yet
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
