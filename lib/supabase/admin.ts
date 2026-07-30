import { createClient } from "@supabase/supabase-js";

import { ERRORS } from "@/constants/content";

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(ERRORS.supabaseMisconfigured);
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
