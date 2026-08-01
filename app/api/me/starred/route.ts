// app/api/me/starred/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // project_stars -> projects -> users, ordered by when the user starred it
  // (not by project update time — this is "my starred list", not "recent").
  const { data, error } = await supabase
    .from("project_stars")
    .select(
      `
      created_at,
      projects (
        id, name, thumbnail_url, published_at,
        users:user_id ( full_name, avatar_url )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).filter((row: any) => row.projects);

  // Star counts fetched separately rather than a per-row subquery in the
  // main select — keeps the primary query simple and this list is
  // typically small (one user's starred projects), so N+1-shaped but
  // over a short list is fine; revisit with a single grouped count query
  // if this list grows large in practice.
  const projectIds = rows.map((row: any) => row.projects.id);
  const counts: Record<string, number> = {};
  if (projectIds.length > 0) {
    const { data: countRows } = await supabase
      .from("project_stars")
      .select("project_id")
      .in("project_id", projectIds);
    for (const row of countRows ?? []) {
      counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
    }
  }

  const projects = rows.map((row: any) => {
    const p = row.projects;
    return {
      id: p.id,
      name: p.name,
      thumbnail_url: p.thumbnail_url,
      published_at: p.published_at,
      author_name: p.users?.full_name ?? null,
      author_avatar: p.users?.avatar_url ?? null,
      starred_at: row.created_at,
      star_count: counts[p.id] ?? 1, // at least 1 — this user starred it
    };
  });

  return NextResponse.json({ projects });
}
