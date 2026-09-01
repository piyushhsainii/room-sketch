// PATH: app/api/admin/recipients/route.ts
import { requireAdmin } from "@/lib/emails/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server"; // confirm this matches your actual export name

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("ADMIN CHECK:", {
    loggedInEmail: user?.email ?? null,
    adminEmailsRaw: process.env.ADMIN_EMAILS ?? null,
  });

  const blocked = requireAdmin(user?.email);
  if (blocked) return blocked;

  const admin = createSupabaseAdmin();

  // ASSUMED shapes — confirm both tables' real column names match.
  const [usersRes, waitlistRes] = await Promise.all([
    admin
      .from("users")
      .select("id, email, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("waitlist")
      .select("id, email, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (usersRes.error)
    return Response.json({ error: usersRes.error.message }, { status: 500 });
  if (waitlistRes.error)
    return Response.json({ error: waitlistRes.error.message }, { status: 500 });

  return Response.json({
    users: usersRes.data ?? [],
    waitlist: waitlistRes.data ?? [],
  });
}
