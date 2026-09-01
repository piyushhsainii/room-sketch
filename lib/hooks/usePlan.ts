// PATH: lib/hooks/usePlan.ts
"use client";

import { useEffect, useState, useCallback } from "react";

export type PlanInfo = {
  planId: "free" | "pro";
  planLabel: string;
  projectLimit: number | null; // null = unlimited
  projectsUsed: number;
  features: string[];
};

export function usePlan() {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch("/api/me/plan")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            setPlan(null); // not logged in — not an error state, just no plan to show
            return;
          }
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed to load plan (${res.status})`);
        }
        setPlan(await res.json());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const atProjectLimit =
    plan?.projectLimit != null && plan.projectsUsed >= plan.projectLimit;

  return { plan, loading, error, atProjectLimit, refresh };
}
