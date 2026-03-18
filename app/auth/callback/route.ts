import { NextResponse } from "next/server";

import { ERRORS } from "@/constants/content";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const rawNext = url.searchParams.get("next") ?? "/";
    const next = rawNext.startsWith("/") ? rawNext : "/";

    if (code) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(new URL("/?error=auth", url.origin));
      }
    }

    return NextResponse.redirect(new URL(next, url.origin));
  } catch {
    return NextResponse.json({ error: ERRORS.unauthorized }, { status: 500 });
  }
}
