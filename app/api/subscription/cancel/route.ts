// PATH: app/api/subscription/cancel/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: sub, error } = await admin
    .from("subscriptions")
    .select("dodo_subscription_id, status, plan_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!sub?.dodo_subscription_id) {
    return Response.json(
      { error: "No active subscription found" },
      { status: 400 },
    );
  }
  if (sub.plan_id === "free" || sub.status === "canceled") {
    return Response.json(
      { error: "No paid subscription to cancel" },
      { status: 400 },
    );
  }

  // Scheduled cancellation — keeps Pro access until the current billing
  // period ends, then Dodo fires subscription.cancelled automatically,
  // which the webhook uses to flip status to 'canceled' (-> free) for real.
  const res = await fetch(
    `https://${process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live" : "test"}.dodopayments.com/subscriptions/${sub.dodo_subscription_id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancel_at_next_billing_date: true }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Dodo cancel request failed:", res.status, body);
    return Response.json(
      { error: "Failed to cancel subscription with Dodo" },
      { status: 502 },
    );
  }

  // Optimistic local update — the webhook is still the source of truth
  // for the eventual full downgrade, this just reflects "cancellation
  // scheduled" immediately in the UI without waiting on a webhook round-trip.
  await admin
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("user_id", user.id);

  return Response.json({ ok: true });
}
