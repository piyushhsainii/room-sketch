// PATH: app/api/webhook/dodo-payments/route.ts
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Webhooks } from "@dodopayments/nextjs";
import { sendEmail } from "@/lib/resend";
import { proWelcomeEmail } from "@/lib/emails/proWelcome";

function resolvePlanId(productId: string | undefined): "pro" | null {
  if (!productId) return null;
  if (
    productId === process.env.DODO_PAYMENTS_PRO_MONTHLY_PRODUCT_ID ||
    productId === process.env.DODO_PAYMENTS_PRO_YEARLY_PRODUCT_ID
  )
    return "pro";
  return null;
}

async function upsertSubscription(
  payload: any,
  status: "active" | "past_due" | "canceled",
) {
  const supabase = createSupabaseAdmin();
  const data = payload.data;
  const customerEmail: string | undefined = data?.customer?.email;
  const dodoCustomerId: string | undefined =
    data?.customer?.customer_id ?? data?.customer_id;
  const dodoSubscriptionId: string | undefined = data?.subscription_id;
  const productId: string | undefined =
    data?.product_id ?? data?.recurring_pre_tax_amount?.product_id;
  const currentPeriodEnd: string | undefined =
    data?.next_billing_date ?? data?.current_period_end;
  const billingCycle =
    data?.payment_frequency_interval === "Year" ? "yearly" : "monthly";
  // Reflects a SCHEDULED cancellation (still active until period end) —
  // separate from `status`, which only flips to 'canceled' once Dodo's
  // subscription.cancelled event fires at the actual period boundary.
  const cancelAtPeriodEnd: boolean = data?.cancel_at_next_billing_date ?? false;

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
      dodo_subscription_id: dodoSubscriptionId ?? null,
      cancel_at_period_end: cancelAtPeriodEnd,
      // dodo_customer_id: dodoCustomerId, // add this column too if not already present
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

  onSubscriptionActive: async (payload) => {
    const result = await upsertSubscription(payload, "active");
    if (result?.planId === "pro") {
      const { subject, html } = proWelcomeEmail();
      await sendEmail({ to: result.customerEmail, subject, html });
    }
  },

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

  // This fires when a cancellation ACTUALLY TAKES EFFECT — whether it was
  // immediate or scheduled via cancel_at_next_billing_date. This is what
  // performs the real downgrade to free; the scheduled-cancel API call
  // itself (below) only sets cancel_at_period_end=true and leaves status
  // as 'active' until this event lands.
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
