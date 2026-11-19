import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authReturnPath } from "@/lib/auth/return-path";
import { redirectResponse } from "@/lib/auth/redirect-response";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = authReturnPath(url.searchParams.get("next"));
  const retry = `/login?${new URLSearchParams({ redirectTo: next, error: "auth" })}`;
  const redirect = (location: string) => redirectResponse(request, location, 303);
  try {
    const code = url.searchParams.get("code");
    if (!code) return redirect(retry);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirect(retry);

    return redirect(next);
  } catch {
    return redirect(retry);
  }
}
