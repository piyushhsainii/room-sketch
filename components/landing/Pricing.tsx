"use client";

import { useState } from "react";

type BillingCycle = "monthly" | "yearly";

const YEARLY_DISCOUNT = 0.2; // 20% off when billed yearly

// Server/build-time controlled only. Set NEXT_PUBLIC_PRICING_COMING_SOON=true
// in your env to show the "coming soon" panel instead of live pricing.
// Not exposed as a client-side toggle on purpose — flip the env var and redeploy.
const PRICING_COMING_SOON = process.env.NEXT_PUBLIC_PRICING_COMING_SOON === "true";

function priceFor(basePrice: number, cycle: BillingCycle) {
  if (basePrice === 0) return 0;
  const monthlyEquivalent = cycle === "yearly" ? basePrice * (1 - YEARLY_DISCOUNT) : basePrice;
  return Math.round(monthlyEquivalent);
}

export default function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const comingSoon = PRICING_COMING_SOON;

  return (
    <section
      id="pricing"
      className="py-24 px-6 md:px-10"
      style={{ background: "#E5E5E5", fontFamily: "'Quicksand','Nunito',sans-serif" }}
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="reveal mb-10">
          <span
            className="inline-block text-[11px] font-medium uppercase tracking-[0.1em] mb-4 px-4 py-[6px] rounded-full"
            style={{
              color: "#556",
              background:
                "linear-gradient(135deg, rgba(163,224,193,0.28), rgba(168,178,230,0.28)), #EAEAEA",
              boxShadow: "-4px -4px 10px rgba(255,255,255,0.7), 4px 4px 12px rgba(0,0,0,0.10)",
            }}
          >
            Pricing
          </span>
          <h2 className="text-[1.9rem] md:text-[2.6rem] tracking-[-0.02em] leading-[1.1] mb-3" style={{ color: "#1A1A1A", fontWeight: 500 }}>
            Free to try. <em className="italic" style={{ fontWeight: 500 }}>No card, no catch.</em>
          </h2>
          <p className="text-[14px] font-normal max-w-[460px] leading-[1.7]" style={{ color: "#666" }}>
            Draw your first floor plan and see it in 3D for free — one project included.
            Upgrade only once you need more.
          </p>
        </div>

        {comingSoon ? (
          <ComingSoonPanel />
        ) : (
          <>
            <BillingToggle cycle={cycle} onChange={setCycle} />

            <div
              className="rounded-[30px] p-2 md:p-3 grid md:grid-cols-3 gap-2"
              style={{ background: "#EAEAEA", boxShadow: "0 20px 40px rgba(0,0,0,0.10)" }}
            >
              <PriceCard
                plan="Free"
                basePrice={0}
                cycle={cycle}
                tag="Free forever"
                tagline="See your first floor plan in 3D"
                btn="Start for free"
                feats={[
                  ["1 project included", true],
                  ["Floor plan editor", true],
                  ["Live 3D preview", true],
                  ["Walk mode", false],
                  ["Scene finishes", false],
                  ["Undo history", true],
                ]}
              />
              <PriceCard
                plan="Pro"
                basePrice={19}
                cycle={cycle}
                tag="Most popular"
                tagline="For architects & designers"
                btn="Start Pro"
                featured
                feats={[
                  ["Unlimited projects", true],
                  ["Everything in Free", true],
                  ["Walk mode", true],
                  ["Full scene finishes", true],
                  ["Undo history", true],
                  ["Client share link", true],
                  ["Priority support", true],
                ]}
              />
              <PriceCard
                plan="Studio"
                basePrice={59}
                cycle={cycle}
                tag="For teams"
                tagline="Agencies & real estate teams"
                btn="Start Studio"
                feats={[
                  ["Everything in Pro", true],
                  ["Team workspace", true],
                  ["Shared project library", true],
                  ["Multiple seats", true],
                  ["Dedicated support", true],
                  ["Volume pricing", true],
                ]}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------------- Coming soon panel ---------------- */

function ComingSoonPanel() {
  return (
    <div
      className="reveal rounded-[30px] px-8 py-16 md:py-20 flex flex-col items-center text-center"
      style={{ background: "#EAEAEA", boxShadow: "0 20px 40px rgba(0,0,0,0.10)" }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "#F5F5F5",
          color: "#333",
          boxShadow: "-6px -6px 12px rgba(255,255,255,0.7), 6px 6px 14px rgba(0,0,0,0.12)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
          <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-[1.4rem] md:text-[1.7rem] mb-2" style={{ color: "#1A1A1A", fontWeight: 500 }}>
        Pricing is on its way
      </h3>
      <p className="text-[14px] max-w-[420px] leading-[1.7] mb-8" style={{ color: "#666" }}>
        We&apos;re finalizing plans for RoomSketch. Leave your email and we&apos;ll let you know
        the moment pricing goes live — early access included.
      </p>
      <form
        className="flex items-center gap-2 w-full max-w-[380px] p-1.5 rounded-full"
        style={{
          background: "#E5E5E5",
          boxShadow: "inset -3px -3px 7px rgba(255,255,255,0.6), inset 3px 3px 8px rgba(0,0,0,0.10)",
        }}
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="email"
          placeholder="ask anything…"
          className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-[14px]"
          style={{ color: "#1A1A1A" }}
        />
        <button
          type="submit"
          className="px-5 py-2 rounded-full text-[13px] shrink-0"
          style={{
            background: "#F5F5F5",
            color: "#1A1A1A",
            fontWeight: 500,
            boxShadow: "-4px -4px 8px rgba(255,255,255,0.75), 4px 4px 10px rgba(0,0,0,0.12)",
          }}
        >
          Notify me
        </button>
      </form>
    </div>
  );
}

/* ---------------- Billing cycle toggle ---------------- */

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (c: BillingCycle) => void;
}) {
  return (
    <div className="reveal flex items-center gap-3 mb-8">
      <div
        className="relative grid grid-cols-2 items-center p-1.5 rounded-full"
        style={{
          background: "#EAEAEA",
          boxShadow: "inset -3px -3px 7px rgba(255,255,255,0.6), inset 3px 3px 8px rgba(0,0,0,0.10)",
        }}
      >
        <div
          className="absolute top-1.5 bottom-1.5 left-1.5 rounded-full transition-transform duration-200 ease-out"
          style={{
            width: "calc(50% - 6px)",
            background: "#F5F5F5",
            boxShadow: "-3px -3px 6px rgba(255,255,255,0.8), 3px 3px 7px rgba(0,0,0,0.14)",
            transform: cycle === "yearly" ? "translateX(100%)" : "translateX(0%)",
          }}
        />
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className="relative z-10 px-5 py-2 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-colors"
          style={{ color: cycle === "monthly" ? "#1A1A1A" : "#888" }}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onChange("yearly")}
          className="relative z-10 flex items-center justify-center gap-2 px-5 py-2 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-colors"
          style={{ color: cycle === "yearly" ? "#1A1A1A" : "#888" }}
        >
          Yearly
          <span
            className="text-[9.5px] px-1.5 py-[2px] rounded-full"
            style={{
              color: "#3D9A5C",
              background: "rgba(61,154,92,0.12)",
            }}
          >
            Save 20%
          </span>
        </button>
      </div>
    </div>
  );
}

/* ---------------- Price card ---------------- */

function PriceCard({
  plan,
  basePrice,
  cycle,
  tag,
  tagline,
  btn,
  feats,
  featured = false,
}: {
  plan: string;
  basePrice: number;
  cycle: BillingCycle;
  tag: string;
  tagline: string;
  btn: string;
  feats: [string, boolean][];
  featured?: boolean;
}) {
  const displayPrice = priceFor(basePrice, cycle);
  const isFree = basePrice === 0;
  const showStrike = cycle === "yearly" && !isFree;

  return (
    <div
      className="reveal rounded-[24px] p-7"
      style={{
        background: featured ? "#F1F1F1" : "#EAEAEA",
        boxShadow: featured
          ? "-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 16px rgba(0,0,0,0.14)"
          : "-5px -5px 12px rgba(255,255,255,0.7), 5px 5px 14px rgba(0,0,0,0.10)",
      }}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: "#8892A6" }}>
        {plan}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-[2.6rem] tracking-[-0.02em] leading-none" style={{ color: "#1A1A1A", fontWeight: 500 }}>
          {isFree ? "$0" : `$${displayPrice}`}
          {!isFree && <span className="text-[1rem] font-normal" style={{ color: "#999" }}>/mo</span>}
        </div>
        {showStrike && (
          <span className="text-[12px] line-through" style={{ color: "#AAA" }}>
            ${basePrice}
          </span>
        )}
      </div>

      {!isFree ? (
        <div className="text-[10.5px] mb-4" style={{ color: "#999" }}>
          {cycle === "yearly" ? `Billed $${Math.round(displayPrice * 12)}/yr` : "Billed monthly"}
        </div>
      ) : (
        <div className="mb-4 h-[15px]" />
      )}

      <span
        className="inline-block mb-5 text-[10px] px-3 py-[5px] rounded-full"
        style={{
          color: "#556",
          background: "#EAEAEA",
          boxShadow: "-3px -3px 6px rgba(255,255,255,0.7), 3px 3px 8px rgba(0,0,0,0.10)",
        }}
      >
        {tag}
      </span>
      <div className="text-[12.5px] font-normal mb-5" style={{ color: "#777" }}>
        {tagline}
      </div>

      <button
        className="w-full py-[12px] rounded-[16px] text-[13.5px] mb-6 transition-shadow"
        style={{
          fontWeight: 500,
          color: featured ? "#1A1A1A" : "#333",
          background: "#F5F5F5",
          boxShadow: "-5px -5px 10px rgba(255,255,255,0.8), 5px 5px 12px rgba(0,0,0,0.14)",
        }}
      >
        {btn}
      </button>

      <ul>
        {feats.map(([label, on], i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 text-[12.5px] font-normal py-[9px]"
            style={{
              color: on ? "#444" : "#AAA",
              borderBottom: i === feats.length - 1 ? "none" : "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px]"
              style={{
                color: on ? "#3D9A5C" : "#BBB",
                background: "#F5F5F5",
                boxShadow: "-2px -2px 4px rgba(255,255,255,0.7), 2px 2px 5px rgba(0,0,0,0.10)",
              }}
            >
              {on ? "✓" : "–"}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}