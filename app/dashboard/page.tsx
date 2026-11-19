import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import DashboardAgent from "@/components/dashboard/DashboardAgent";
import { chatGPTConfig, linkCookie, readSealed } from "@/lib/auth/chatgpt";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PlanId } from "@/lib/plan";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ chatgpt?: string | string[] }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/projects/new");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan: PlanId = (profile?.plan as PlanId) ?? "free";
  const config = chatGPTConfig();
  const link = config ? await readSealed(linkCookie, user.id, config.key) : null;
  const { chatgpt } = await searchParams;

  return (
    <>
      <DashboardClient
        initialUser={{ email: user.email ?? "" }}
        initialPlan={plan}
      />
      <DashboardAgent
        configured={Boolean(config)}
        connected={Boolean(config && link?.clientId === config.clientId)}
        callbackStatus={typeof chatgpt === "string" ? chatgpt : undefined}
      />
    </>
  );
}
