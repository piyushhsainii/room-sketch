import { NextResponse } from "next/server";

import { ERRORS } from "@/constants/content";
import { readSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const session = await readSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: ERRORS.unauthorized }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data: projects, error: projectsError } = await admin
      .from("projects")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    return NextResponse.json({ projects: projects ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
