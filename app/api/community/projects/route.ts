import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const cursorStarsRaw = searchParams.get("cursor_stars");
  const cursorIdRaw = searchParams.get("cursor_id");

  // Validate cursor params before they touch a raw filter string.
  // star_count -> integer, id -> uuid. Anything else is silently
  // treated as "no cursor" rather than passed through.
  const cursorStars =
    cursorStarsRaw !== null && /^-?\d+$/.test(cursorStarsRaw)
      ? cursorStarsRaw
      : null;
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const cursorId =
    cursorIdRaw !== null && UUID_RE.test(cursorIdRaw) ? cursorIdRaw : null;

  // CHANGED — users only actually has full_name/email (see public.users
  // schema); the old select() asked for name/username/display_name too,
  // which don't exist and made Postgres reject the whole query (single
  // statement, one bad column fails it all — not just that field).
  let query = supabase
    .from("projects")
    .select(
      `
      id, name, thumbnail_url, star_count, share_token,
      users:user_id ( full_name, email )
    `,
    )
    .eq("published", true)
    .order("star_count", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);

  if (cursorStars !== null && cursorId !== null) {
    query = query.or(
      `star_count.lt.${cursorStars},and(star_count.eq.${cursorStars},id.lt.${cursorId})`,
    );
  }

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const projects = (data ?? []).map((p: any) => {
    const u = p.users;
    // CHANGED — dropped name/username/display_name fallbacks, matching
    // the trimmed select() above.
    const authorName =
      u?.full_name || (u?.email ? u.email.split("@")[0] : null) || "Anonymous";
    return {
      id: p.id,
      name: p.name,
      thumbnail_url: p.thumbnail_url,
      star_count: p.star_count,
      share_token: p.share_token,
      author_name: authorName,
    };
  });

  const last = projects[projects.length - 1];
  const nextCursor = last
    ? { cursor_stars: last.star_count, cursor_id: last.id }
    : null;

  return NextResponse.json({ projects, nextCursor });
}

export const revalidate = 60;
