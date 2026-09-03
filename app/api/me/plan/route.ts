// PATH: app/api/me/plan/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlements";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic"; // same GET-caching gotcha as the admin routes — don't drop this

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const plan = await getEntitlements(supabase, user.id);

  const admin = createSupabaseAdmin();
  const { count, error } = await admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    planId: plan.id,
    planLabel: plan.label,
    projectLimit: plan.projectLimit === Infinity ? null : plan.projectLimit,
    projectsUsed: count ?? 0,
    features: Array.from(plan.features),
  });
}
