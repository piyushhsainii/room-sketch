// PATH: app/api/webhook/dodo-payments/route.ts
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Webhooks } from "@dodopayments/nextjs";

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
}

console.log("dodo webhook key diagnostic:", {
  webhookKeyLength: process.env.DODO_PAYMENTS_WEBHOOK_KEY?.length,
  webhookKeyStart: process.env.DODO_PAYMENTS_WEBHOOK_KEY?.slice(0, 12),
  webhookKeyIsSet: !!process.env.DODO_PAYMENTS_WEBHOOK_KEY,
});

if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
  throw new Error(
    "DODO_PAYMENTS_WEBHOOK_KEY is not set — check .env.local (or your " +
      "deployment platform's env vars) for this exact variable name. " +
      "Get the value from Dodo dashboard → Settings → Webhooks → " +
      "your endpoint's signing secret.",
  );
}

export const POST = Webhooks({
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,

  onSubscriptionActive: async (payload) => {
    await upsertSubscription(payload, "active");
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
  onSubscriptionCancelled: async (payload) => {
    await upsertSubscription(payload, "canceled");
  },
  onSubscriptionExpired: async (payload) => {
    await upsertSubscription(payload, "canceled");
  },

  onPayload: async (payload) => {
    // Fallback log for any event type not explicitly handled above —
    // useful during test_mode to see the real payload shape.
    console.log("dodo webhook (unhandled type logged):", payload.type);
  },
});
