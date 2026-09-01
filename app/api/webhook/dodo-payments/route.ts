// PATH: app/api/webhook/dodo-payments/route.ts
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Webhooks } from "@dodopayments/nextjs";
import { sendEmail } from "@/lib/resend";
import { proWelcomeEmail } from "@/lib/emails/proWelcome";

// Maps a Dodo product_id -> your internal plan_id ('free' | 'pro').
// Monthly and yearly are SEPARATE Dodo products (see Pricing.tsx for why),
// both resolve to the same internal plan_id — billing_cycle is derived
// separately below from payment_frequency_interval, not from which
// product matched here.
function resolvePlanId(productId: string | undefined): "pro" | null {
  if (!productId) return null;
  if (
    productId === process.env.DODO_PAYMENTS_PRO_MONTHLY_PRODUCT_ID ||
    productId === process.env.DODO_PAYMENTS_PRO_YEARLY_PRODUCT_ID
  )
    return "pro";
  return null;
}

// Dodo's payload shape (per docs) nests subscription/customer data under
// `payload.data`. Field names below (customer.email, product_id, etc.) are
// the documented shape as of writing — re-check against a real payload in
// test_mode before going live, since this is the part most likely to drift.
async function upsertSubscription(
  payload: any,
  status: "active" | "past_due" | "canceled",
) {
  const supabase = createSupabaseAdmin();
  const data = payload.data;
  const customerEmail: string | undefined = data?.customer?.email;
  const dodoCustomerId: string | undefined =
    data?.customer?.customer_id ?? data?.customer_id;
  const productId: string | undefined =
    data?.product_id ?? data?.recurring_pre_tax_amount?.product_id;
  const currentPeriodEnd: string | undefined =
    data?.next_billing_date ?? data?.current_period_end;
  const billingCycle =
    data?.payment_frequency_interval === "Year" ? "yearly" : "monthly";

  if (!customerEmail) {
    console.error("dodo webhook: no customer email in payload", payload);
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", customerEmail)
    .maybeSingle();

  if (!user) {
    console.error("dodo webhook: no matching user for email", customerEmail);
    return;
  }

  const planId = resolvePlanId(productId) ?? "free";

  await supabase.from("subscriptions").upsert(
    {
      user_id: user.id,
      plan_id: planId,
      status,
      billing_cycle: billingCycle,
      current_period_end: currentPeriodEnd ?? null,
      // dodo_customer_id: dodoCustomerId, // add this column — see reply
    },
    { onConflict: "user_id" },
  );

  return { customerEmail, planId };
}

if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
  throw new Error(
    "DODO_PAYMENTS_WEBHOOK_KEY is not set — check .env.local (or your " +
      "deployment platform's env vars). Get it from Dodo dashboard → " +
      "Settings → Webhooks → your endpoint → signing secret (starts with whsec_).",
  );
}

export const POST = Webhooks({
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,

  // "Active" fires on a genuinely NEW subscription — this is the only
  // event that should send the Pro welcome email. Renewals and plan
  // changes reuse upsertSubscription for the DB write but deliberately
  // do NOT send this email again (see their handlers below).
  onSubscriptionActive: async (payload) => {
    const result = await upsertSubscription(payload, "active");
    if (result?.planId === "pro") {
      const { subject, html } = proWelcomeEmail();
      await sendEmail({ to: result.customerEmail, subject, html });
    }
  },

  // Renewals/plan-changes: keep subscriptions table in sync, but no
  // welcome email — they're already a Pro user, this isn't a new upgrade.
  onSubscriptionRenewed: async (payload) => {
    await upsertSubscription(payload, "active");
  },
  onSubscriptionPlanChanged: async (payload) => {
    await upsertSubscription(payload, "active");
  },

  onSubscriptionOnHold: async (payload) => {
    await upsertSubscription(payload, "past_due");
  },
  onSubscriptionFailed: async (payload) => {
    await upsertSubscription(payload, "past_due");
  },
  onSubscriptionCancelled: async (payload) => {
    await upsertSubscription(payload, "canceled");
  },
  onSubscriptionExpired: async (payload) => {
    await upsertSubscription(payload, "canceled");
  },

  onPayload: async (payload) => {
    console.log("dodo webhook (unhandled type logged):", payload.type);
  },
});
