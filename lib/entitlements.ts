import "server-only";
import { FeatureFlag, Plan, planFor, PLANS } from "./plan";
import { createClient } from "./supabase/client";

export class PlanLimitError extends Error {
  constructor(
    public readonly reason: "projectLimit" | FeatureFlag,
    public readonly plan: Plan,
  ) {
    super(`Plan limit reached: ${reason} (current plan: ${plan.id})`);
    this.name = "PlanLimitError";
  }
}

// A subscription only grants its plan while active/current. past_due gets a
// short grace window (still full access) so a failed card doesn't instantly
// lock someone out mid-edit; canceled or expired past_period_end -> free.
const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export async function getEntitlements(userId: string): Promise<Plan> {
  const supabase = await createClient();
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

  // status === 'active'
  return planFor(sub.plan_id);
}

export async function requireFeature(
  userId: string,
  flag: FeatureFlag,
): Promise<void> {
  const plan = await getEntitlements(userId);
  if (!plan.features.has(flag)) throw new PlanLimitError(flag, plan);
}

export async function requireProjectSlot(userId: string): Promise<void> {
  const plan = await getEntitlements(userId);
  if (plan.projectLimit === Infinity) return;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  if ((count ?? 0) >= plan.projectLimit)
    throw new PlanLimitError("projectLimit", plan);
}

// Convenience for route handlers: returns a Response if blocked, or null if allowed.
// Usage: const blocked = await guardFeature(userId, 'export3d'); if (blocked) return blocked
export async function guardFeature(userId: string, flag: FeatureFlag) {
  try {
    await requireFeature(userId, flag);
    return null;
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return Response.json(
        { error: "plan_limit", reason: e.reason, plan: e.plan.id },
        { status: 402 }, // Payment Required
      );
    }
    throw e;
  }
}

export async function guardProjectSlot(userId: string) {
  try {
    await requireProjectSlot(userId);
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
