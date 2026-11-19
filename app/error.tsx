"use client";

import { useEffect } from "react";
import PageFailure from "@/components/ui/PageFailure";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Page failed", error); }, [error]);
  return <PageFailure onRetry={reset} />;
}
