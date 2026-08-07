// // app/api/workspace/share/[token]/route.ts
// import { getSupabaseServerClient } from "@/lib/supabase/server";
// import { NextResponse } from "next/server";

// export const runtime = "nodejs";

// export async function GET(
//   request: Request,
//   { params }: { params: Promise<{ token: string }> },
// ) {
//   const { token } = await params;

//   if (!token)
//     return NextResponse.json({ error: "Missing token" }, { status: 400 });

//   const supabase = getSupabaseServerClient();

//   const { data: project, error } = await supabase
//     .from("projects")
//     .select(
//       "id, name, scene_json, share_enabled, user:users(full_name, avatar_url)",
//     )
//     .eq("share_token", token)
//     .single();

//   if (error || !project || !project.share_enabled) {
//     return NextResponse.json({ error: "Not found" }, { status: 404 });
//   }

//   // `user` comes back as an array from PostgREST embed syntax even for a
//   // to-one relation unless explicitly disambiguated — normalize to a
//   // single object (or null) so the client doesn't need to know that quirk.
//   const builder = Array.isArray(project.user)
//     ? (project.user[0] ?? null)
//     : (project.user ?? null);

//   return NextResponse.json({
//     ok: true,
//     project_name: project.name,
//     scene_json: project.scene_json,
//     builder: builder
//       ? { full_name: builder.full_name, avatar_url: builder.avatar_url }
//       : null,
//   });
// }

// app/api/workspace/share/[token]/route.ts
import { getShareProject } from "@/components/workspace/lib/getShareProject";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const project = await getShareProject(token);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    project_name: project.project_name,
    scene_json: project.scene_json,
    builder: project.builder,
  });
}
