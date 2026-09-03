// lib/entitlements.ts
import "server-only";
import { FeatureFlag, Plan, planFor, PLANS } from "./plan";
import type { SupabaseClient } from "@supabase/supabase-js";

export class PlanLimitError extends Error {
  constructor(
    public readonly reason: "projectLimit" | FeatureFlag,
    public readonly plan: Plan,
  ) {
    super(`Plan limit reached: ${reason} (current plan: ${plan.id})`);
    this.name = "PlanLimitError";
  }
}

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

export async function getEntitlements(
  supabase: SupabaseClient,
  userId: string,
): Promise<Plan> {
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("plan_id, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !sub) return PLANS.free;

  if (sub.status === "canceled") return PLANS.free;

  if (sub.status === "past_due") {
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end).getTime()
      : 0;
    const withinGrace = Date.now() - periodEnd < GRACE_PERIOD_MS;
    return withinGrace ? planFor(sub.plan_id) : PLANS.free;
  }

  return planFor(sub.plan_id);
}

export async function requireFeature(
  supabase: SupabaseClient,
  userId: string,
  flag: FeatureFlag,
): Promise<void> {
  const plan = await getEntitlements(supabase, userId);
  if (!plan.features.has(flag)) throw new PlanLimitError(flag, plan);
}

export async function requireProjectSlot(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const plan = await getEntitlements(supabase, userId);
  if (plan.projectLimit === Infinity) return;

  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  if ((count ?? 0) >= plan.projectLimit)
    throw new PlanLimitError("projectLimit", plan);
}

export async function guardFeature(supabase: SupabaseClient, userId: string, flag: FeatureFlag) {
  try {
    await requireFeature(supabase, userId, flag);
    return null;
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return Response.json(
        { error: "plan_limit", reason: e.reason, plan: e.plan.id },
        { status: 402 },
      );
    }
    throw e;
  }
}

export async function guardProjectSlot(supabase: SupabaseClient, userId: string) {
  try {
    await requireProjectSlot(supabase, userId);
    return null;
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return Response.json(
        { error: "plan_limit", reason: e.reason, plan: e.plan.id },
        { status: 402 },
      );
    }
    throw e;
  }
}