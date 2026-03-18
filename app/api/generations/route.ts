import { NextResponse } from "next/server";

import { ERRORS } from "@/constants/content";
import { readSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await readSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: ERRORS.unauthorized }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (!projectId) {
      return NextResponse.json({ error: ERRORS.generateFailed }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("project_generations")
      .select("*")
      .eq("user_id", session.userId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { generations: data ?? [] },
      {
        headers: {
          "cache-control": "no-store, max-age=0",
        },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
