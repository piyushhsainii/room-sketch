// PATH: components/PlanBadge.tsx
"use client";

import Link from "next/link";
import { usePlan } from "@/lib/hooks/usePlan";

export function PlanBadge() {
    const { plan, loading } = usePlan();

    if (loading || !plan) return null; // logged out, or still loading — render nothing rather than a flash of wrong state

    const isPro = plan.planId === "pro";

    return (
        <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-3 py-[6px] rounded-full text-[11.5px] font-medium transition-shadow"
            style={{
                color: isPro ? "#3D9A5C" : "#556",
                background: "#EAEAEA",
                boxShadow: "-3px -3px 6px rgba(255,255,255,0.7), 3px 3px 8px rgba(0,0,0,0.10)",
            }}
            title={
                plan.projectLimit != null
                    ? `${plan.projectsUsed}/${plan.projectLimit} projects used`
                    : "Unlimited projects"
            }
        >
            {isPro && <span aria-hidden>✦</span>}
            {plan.planLabel}
            {plan.projectLimit != null && (
                <span style={{ color: "#999" }}>
                    · {plan.projectsUsed}/{plan.projectLimit}
                </span>
            )}
        </Link>
    );
}