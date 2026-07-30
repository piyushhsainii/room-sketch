"use client";

import { useState } from "react";

type BillingCycle = "monthly" | "yearly";

const YEARLY_DISCOUNT = 0.2; // 20% off when billed yearly

function priceFor(basePrice: number, cycle: BillingCycle) {
  if (basePrice === 0) return 0;
  const monthlyEquivalent = cycle === "yearly" ? basePrice * (1 - YEARLY_DISCOUNT) : basePrice;
  return Math.round(monthlyEquivalent);
}

export default function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section id="pricing" className="py-24 px-6 md:px-10 bg-paper">
      <div className="max-w-[1100px] mx-auto">
        <div className="reveal mb-10">
          <span className="font-mono text-[10px] font-medium text-blue uppercase tracking-[0.1em] block mb-3">
            Pricing
          </span>
          <h2 className="font-display text-[1.9rem] md:text-[2.6rem] tracking-[-0.025em] text-ink leading-[1.1] mb-3">
            Free to try. <em className="italic">No card, no catch.</em>
          </h2>
          <p className="text-[13.5px] font-light text-muted max-w-[460px] leading-[1.7]">
            Draw your first floor plan and see it in 3D for free — one project included.
            Upgrade only once you need more.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="reveal flex items-center gap-3 mb-10">
          <div className="relative grid grid-cols-2 items-center p-1 rounded-full border border-line-strong bg-[#F2F0EA]">
            <div
              className="absolute top-1 bottom-1 left-1 rounded-full bg-ink transition-transform duration-200 ease-out"
              style={{
                width: "calc(50% - 4px)",
                transform: cycle === "yearly" ? "translateX(100%)" : "translateX(0%)",
              }}
            />
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`relative z-10 px-4 py-2 rounded-full text-[12.5px] font-medium tracking-[-0.005em] whitespace-nowrap transition-colors ${cycle === "monthly" ? "text-white bg-black" : "text-graphite hover:text-ink"
                }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("yearly")}
              className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-medium tracking-[-0.005em] whitespace-nowrap transition-colors ${cycle === "yearly" ? "bg-black text-white" : "text-graphite hover:text-ink"
                }`}
            >
              Yearly
              <span
                className={`font-mono text-[9.5px] px-1.5 py-[2px] rounded-[4px] transition-colors ${cycle === "yearly" ? "bg-white/15 text-paper" : "bg-[#3D9A5C]/12 text-[#3D9A5C]"
                  }`}
              >
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <PriceCard
            plan="Free"
            basePrice={0}
            cycle={cycle}
            tag="Free forever"
            tagline="See your first floor plan in 3D"
            btn="Start for free"
            btnClass="bg-transparent text-ink border border-line-strong hover:border-ink"
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
            btn="Start Pro →"
            btnClass="bg-black text-white hover:opacity-90"
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
            btn="Start Studio →"
            btnClass="bg-blue border hover:opacity-85"
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
      </div>
    </section>
  );
}

function PriceCard({
  plan,
  basePrice,
  cycle,
  tag,
  tagline,
  btn,
  btnClass,
  feats,
  featured = false,
}: {
  plan: string;
  basePrice: number;
  cycle: BillingCycle;
  tag: string;
  tagline: string;
  btn: string;
  btnClass: string;
  feats: [string, boolean][];
  featured?: boolean;
}) {
  const displayPrice = priceFor(basePrice, cycle);
  const isFree = basePrice === 0;
  const showStrike = cycle === "yearly" && !isFree;

  return (
    <div
      className={`reveal rounded-[10px] p-7 border ${featured ? "bg-ink border-ink shadow-sheetLg" : "bg-[#F2F0EA] border-line hover:border-line-strong transition-colors"
        }`}
    >
      <div className={`font-mono text-[10px] font-medium uppercase tracking-[0.1em] mb-3 ${featured ? "text-blue-dim" : "text-blue"}`}>
        {plan}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <div className={`font-display text-[2.7rem] tracking-[-0.03em] leading-none ${featured ? "text-black" : "text-ink"}`}>
          {isFree ? "$0" : `$${displayPrice}`}
          {!isFree && <span className="text-[1rem] font-body font-light text-muted">/mo</span>}
        </div>
        {showStrike && (
          <span className={`font-mono text-[12px] line-through ${featured ? "text-white/35" : "text-muted"}`}>
            ${basePrice}
          </span>
        )}
      </div>

      {!isFree && (
        <div className={`font-mono text-[10px] mb-4 ${featured ? "text-white/40" : "text-muted"}`}>
          {cycle === "yearly" ? `Billed $${Math.round(displayPrice * 12)}/yr` : "Billed monthly"}
        </div>
      )}
      {isFree && <div className="mb-4" />}

      <span
        className={`inline-block mb-5 font-mono text-[10px] px-2 py-[3px] rounded-[4px] ${featured ? "bg-blue/15 text-blue-dim border border-blue/25" : "bg-white  border border-line"
          }`}
      >
        {tag}
      </span>
      <div className={`text-[12.5px] font-light mb-5 ${featured ? "/40" : "text-muted"}`}>{tagline}</div>
      <button className={`w-full py-[11px] rounded-[7px] text-[13.5px] font-medium mb-5 transition-opacity ${btnClass}`}>
        {btn}
      </button>
      <ul>
        {feats.map(([label, on], i) => (
          <li
            key={i}
            className={`flex items-center gap-2.5 text-[12.5px] font-light py-[7px] border-b last:border-b-0 ${featured ? "/45 border-white/8" : " border-line"
              }`}
          >
            <span className={on ? "text-[#3D9A5C]" : "text-muted"}>{on ? "✓" : "–"}</span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}