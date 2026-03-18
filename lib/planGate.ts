import { ERRORS, PRICING } from "@/constants/content";
import type { Profile } from "@/lib/models";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const PLAN_LIMITS = {
  free: { renders: 3, videos: 1 },
  pro: { renders: 50, videos: 20 },
} as const;

type Plan = "free" | "pro";
type GateType = "render" | "video";

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isResetNeeded(usageResetAt: string | null): boolean {
  if (!usageResetAt) return true;
  const parsed = new Date(usageResetAt);
  if (Number.isNaN(parsed.getTime())) return true;
  return monthKey(parsed) !== monthKey(new Date());
}

async function ensureProfile(userId: string): Promise<Profile> {
  const admin = createSupabaseAdmin();

  {
    const { error: userUpsertError } = await admin
      .from("users")
      .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
    if (userUpsertError) {
      throw new Error(userUpsertError.message);
    }
  }

  const { data: userRow, error: userRowError } = await admin
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (userRowError) {
    throw new Error(userRowError.message);
  }

  const userEmail = userRow?.email ?? "";

  const { data: existingRaw } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  const existing = (existingRaw ?? null) as Profile | null;

  if (existing) return existing;

  const now = new Date().toISOString();
  const { data: created, error } = await admin
    .from("profiles")
    .insert({
      id: userId,
      email: userEmail,
      plan: "free",
      renders_used: 0,
      videos_used: 0,
      usage_reset_at: now,
    })
    .select("*")
    .single();

  const createdProfile = (created ?? null) as Profile | null;

  if (error || !createdProfile) {
    throw error ?? new Error(ERRORS.profileFailed);
  }

  return createdProfile;
}

async function resetIfNeeded(userId: string, profile: Profile): Promise<Profile> {
  if (!isResetNeeded(profile.usage_reset_at)) return profile;

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("profiles")
    .update({
      renders_used: 0,
      videos_used: 0,
      usage_reset_at: now,
    })
    .eq("id", userId)
    .select("*")
    .single();

  const updated = (data ?? null) as Profile | null;

  if (error || !updated) {
    throw error ?? new Error(ERRORS.profileFailed);
  }

  return updated;
}

export async function checkCanGenerate(
  userId: string,
  type: GateType
): Promise<{ allowed: boolean; reason?: string; profile?: Profile }>
{
  const profile = await resetIfNeeded(userId, await ensureProfile(userId));

  if (process.env.NODE_ENV !== "production") {
    return { allowed: true, profile };
  }

  const plan: Plan = profile.plan;
  const limits = PLAN_LIMITS[plan];

  if (type === "render") {
    if (profile.renders_used >= limits.renders) {
      return { allowed: false, reason: PRICING.limitReachedRender, profile };
    }
    return { allowed: true, profile };
  }

  if (profile.videos_used >= limits.videos) {
    return { allowed: false, reason: PRICING.limitReachedVideo, profile };
  }
  return { allowed: true, profile };
}

export async function incrementUsage(userId: string, type: GateType): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const admin = createSupabaseAdmin();
  const profile = await resetIfNeeded(userId, await ensureProfile(userId));

  const update =
    type === "render"
      ? { renders_used: profile.renders_used + 1 }
      : { videos_used: profile.videos_used + 1 };

  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", userId);

  if (error) throw error;
}
