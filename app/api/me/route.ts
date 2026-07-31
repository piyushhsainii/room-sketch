import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PlanId = "free" | "basic" | "pro";

type MeResponse = {
  authed: boolean;
  email: string;
  plan: PlanId;
};

const VALID_PLANS: PlanId[] = ["free", "basic", "pro"];

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const body: MeResponse = { authed: false, email: "", plan: "free" };
    return NextResponse.json(body);
  }

  // Sourced from the user_account_overview view (users + subscriptions +
  // plans join) introduced in the pricing-table migration — replaces the
  // old profiles.plan lookup, which only ever supported "free" | "pro".
  const { data: account } = await supabase
    .from("user_account_overview")
    .select("plan_id, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan: PlanId = VALID_PLANS.includes(account?.plan_id as PlanId)
    ? (account!.plan_id as PlanId)
    : "free";

  const body: MeResponse = {
    authed: true,
    email: account?.email || user.email || "",
    plan,
  };
  return NextResponse.json(body);
}
