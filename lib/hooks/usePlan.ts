// PATH: lib/hooks/usePlan.ts
"use client";

import { useEffect, useState, useCallback } from "react";

export type PlanInfo = {
  planId: "free" | "pro";
  planLabel: string;
  projectLimit: number | null;
  projectsUsed: number;
  features: string[];
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

export function usePlan() {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch("/api/me/plan")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            setPlan(null);
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

  async function cancelSubscription(): Promise<boolean> {
    setCanceling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? `Cancel failed (${res.status})`);
      await refresh(); // pick up cancelAtPeriodEnd: true immediately
      return true;
    } catch (err: any) {
      setCancelError(err.message);
      return false;
    } finally {
      setCanceling(false);
    }
  }

  return {
    plan,
    loading,
    error,
    atProjectLimit,
    refresh,
    cancelSubscription,
    canceling,
    cancelError,
  };
}
