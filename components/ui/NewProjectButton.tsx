// PATH: components/NewProjectButton.tsx
"use client";

import Link from "next/link";
import { usePlan } from "@/lib/hooks/usePlan";

type Props = {
    onCreate: () => void; // your existing create-project handler
    label?: string;
};

export function NewProjectButton({ onCreate, label = "New project" }: Props) {
    const { plan, loading, atProjectLimit } = usePlan();

    if (loading) {
        return (
            <button
                disabled
                className="px-5 py-[10px] rounded-[14px] text-[13px]"
                style={{ background: "#EAEAEA", color: "#999" }}
            >
                Loading…
            </button>
        );
    }

    if (atProjectLimit && plan) {
        return (
            <div className="flex items-center gap-3">
                <button
                    disabled
                    className="px-5 py-[10px] rounded-[14px] text-[13px]"
                    style={{ background: "#EAEAEA", color: "#999", cursor: "not-allowed" }}
                    title={`You've used ${plan.projectsUsed}/${plan.projectLimit} projects on the ${plan.planLabel} plan`}
                >
                    {label}
                </button>
                <Link
                    href="/pricing"
                    className="text-[12.5px]"
                    style={{ color: "#3D9A5C", textDecoration: "underline" }}
                >
                    Upgrade to add more projects →
                </Link>
            </div>
        );
    }

    return (
        <button
            onClick={onCreate}
            className="px-5 py-[10px] rounded-[14px] text-[13px] transition-shadow"
            style={{
                fontWeight: 500,
                color: "#1A1A1A",
                background: "#F5F5F5",
                boxShadow: "-4px -4px 8px rgba(255,255,255,0.8), 4px 4px 10px rgba(0,0,0,0.12)",
            }}
        >
            {label}
        </button>
    );
}