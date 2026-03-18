"use client";

import { ERRORS } from "@/constants/content";
import { createClient } from "@/lib/supabase/client";

export async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? ERRORS.providerMisconfigured);
  }

  return data.signedUrl;
}
