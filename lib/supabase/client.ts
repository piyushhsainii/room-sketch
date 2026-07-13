import { createBrowserClient } from "@supabase/ssr";

import { ERRORS } from "@/constants/content";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(ERRORS.supabaseMisconfigured);
  }

  return createBrowserClient(url, anonKey);
}
