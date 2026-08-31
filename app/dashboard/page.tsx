import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PlanId } from "@/lib/plan";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan: PlanId = (profile?.plan as PlanId) ?? "free";

  return (
    <DashboardClient
      initialUser={{ email: user.email ?? "" }}
      initialPlan={plan}
    />
  );
}