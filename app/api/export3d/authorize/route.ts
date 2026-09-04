// PATH: app/api/export3d/authorize/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { guardFeature } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const blocked = await guardFeature(supabase, user.id, "export3d");
  if (blocked) return blocked; // 402 with { error: "plan_limit", reason: "export3d", plan: "free" }

  return Response.json({ ok: true });
}
