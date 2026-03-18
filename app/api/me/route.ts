import { NextResponse } from "next/server";

import { readSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type MeResponse = {
  authed: boolean;
  email: string;
  plan: "free" | "pro";
};

export async function GET() {
  const session = await readSessionFromCookies();
  if (!session) {
    const body: MeResponse = { authed: false, email: "", plan: "free" };
    return NextResponse.json(body);
  }

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", session.userId)
    .maybeSingle();

  const plan = profile?.plan === "pro" ? "pro" : "free";
  const body: MeResponse = { authed: true, email: session.email, plan };
  return NextResponse.json(body);
}
