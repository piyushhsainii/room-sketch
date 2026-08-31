// Single source of truth for plan gating AND pricing-page display copy.
// Mirrors the `plans` table for gating fields — if you change limits here,
// update the `plans` row too. Superseded lib/pricing.ts — delete that file,
// nothing should import PRICING_PLANS anymore.

// PATH: lib/plan.ts
export type PlanId = "free" | "pro";

export type FeatureFlag =
  | "export3d" // 3D snapshot/image export
  | "glbImport" // custom GLB asset import
  | "fullMaterials"; // full material/texture library (vs basic subset)

export type Plan = {
  id: PlanId;
  label: string;
  priceMonthly: number; // USD, 0 for free
  projectLimit: number; // Infinity for unlimited
  features: Set<FeatureFlag>;
  // Display-only, for the pricing page — not used for gating
  tag: string;
  tagline: string;
  ctaLabel: string;
  displayFeatures: [string, boolean][]; // [label, included]
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Free",
    priceMonthly: 0,
    projectLimit: 1,
    features: new Set([]),
    tag: "Free forever",
    tagline: "See your first floor plan in 3D",
    ctaLabel: "Start for free",
    displayFeatures: [
      ["1 project included", true],
      ["Full floor plan editor", true],
      ["Live 3D preview", true],
      ["Basic material library", true],
      ["2D floor plan export", true],
      ["Client-shareable preview link", true],
      ["3D snapshot export", false],
      ["Custom GLB asset import", false],
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceMonthly: 30,
    projectLimit: 5,
    features: new Set(["export3d", "glbImport", "fullMaterials"]),
    tag: "Most popular",
    tagline: "For architects & designers",
    ctaLabel: "Start Pro",
    displayFeatures: [
      ["5 projects", true],
      ["Everything in Free", true],
      ["Full material library", true],
      ["3D snapshot export", true],
      ["Custom GLB asset import", true],
      ["Priority support", true],
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro"];

export function planFor(planId: string | null | undefined): Plan {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.free;
}

// ── Legacy compatibility export — DO NOT use in new code ──────────────────
// Old storage-tier shape, kept only so any not-yet-migrated import of
// PRICING_PLANS from the deleted lib/pricing.ts doesn't hard-break at
// import time. Its shape is intentionally NOT the same as `Plan` above
// (storageGb/features:string[] vs projectLimit/features:Set) — aliasing it
// directly to PLANS would compile but crash at runtime wherever old code
// calls array methods on `.features` or reads `.storageGb`. Find and
// migrate every remaining `from "@/lib/pricing"` or `PRICING_PLANS` import
// to `PLANS`/`displayFeatures` from this file, then delete this block.
export type LegacyPlanId = "free" | "basic" | "pro";
export const PRICING_PLANS: Record<
  LegacyPlanId,
  {
    id: LegacyPlanId;
    label: string;
    priceMonthly: number;
    storageGb: number;
    features: string[];
  }
> = {
  free: {
    id: "free",
    label: "Free",
    priceMonthly: 0,
    storageGb: 1,
    features: ["1 project included"],
  },
  basic: {
    id: "basic",
    label: "Basic",
    priceMonthly: 9,
    storageGb: 5,
    features: [],
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceMonthly: 30,
    storageGb: 10,
    features: ["5 projects"],
  },
};
export const CUSTOM_PLAN = {
  label: "Custom",
  tag: "For teams",
  tagline: "Agencies & real estate teams with custom needs",
  ctaLabel: "Contact sales",
  displayFeatures: [
    ["Everything in Pro", true],
    ["Custom project limits", true],
    ["Team workspace", true],
    ["Dedicated support", true],
  ] as [string, boolean][],
};
