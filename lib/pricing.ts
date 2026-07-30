export type PlanId = "free" | "basic" | "pro";

export type Plan = {
  id: PlanId;
  label: string;
  priceMonthly: number; // USD, 0 for free
  storageGb: number;
  features: string[];
};

export const PRICING_PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Free",
    priceMonthly: 0,
    storageGb: 1,
    features: [
      "3 active projects",
      "Standard-resolution exports",
      "Community support",
    ],
  },
  basic: {
    id: "basic",
    label: "Basic",
    priceMonthly: 9,
    storageGb: 5,
    features: ["Unlimited projects", "HD exports", "Email support"],
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceMonthly: 19,
    storageGb: 10,
    features: [
      "Unlimited projects",
      "4K exports & sub-millimeter snapping",
      "Priority support",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "basic", "pro"];
