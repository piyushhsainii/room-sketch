// PATH: lib/hooks/useGatedCreate.ts
"use client";

import { usePlan } from "./usePlan";

// Wraps any "create a project" trigger (blank canvas, template, empty-state
// button) with a client-side check before calling through. This is UX only
// — the real enforcement is the guardProjectSlot() check already wired into
// POST /api/projects. This just avoids letting someone go through the
// create flow only to get a 402 at the very end.
export function useGatedCreate() {
    const { atProjectLimit, plan, loading } = usePlan();

    function guard(action: () => void) {
        if (loading) return; // don't block or allow while plan status is still resolving
        if (atProjectLimit) {
            window.location.href = "/pricing";
            return;
        }
        action();
    }

    return { guard, atProjectLimit, plan, loading };
}