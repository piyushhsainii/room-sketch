import { requireAdmin } from "@/lib/emails/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server"; // ← the cookie-based one, not getSupabaseServerClient

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient(); // reads actual session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const blocked = requireAdmin(user?.email);
  if (blocked) return blocked;

  const admin = createSupabaseAdmin(); // service-role, only for the privileged read
  const { data, error } = await admin
    .from("waitlist")
    .select("id, email, created_at")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ entries: data ?? [] });
}
