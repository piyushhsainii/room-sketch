export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 md:px-10 bg-paper">
      <div className="max-w-[1100px] mx-auto">
        <div className="reveal mb-14">
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

        <div className="grid md:grid-cols-3 gap-4">
          <PriceCard
            plan="Free"
            price="$0"
            tag="Free forever"
            tagline="See your first floor plan in 3D"
            btn="Start for free"
            btnClass="bg-transparent text-ink border border-line-strong hover:border-ink"
            feats={[
              ["1 project included", true],
              ["Floor plan editor", true],
              ["Live 3D preview", true],
              ["Orbit + top-down view", true],
              ["Walk mode", false],
              ["Scene finishes", false],
              ["Revision history", false],
            ]}
          />
          <PriceCard
            plan="Pro"
            price="$19"
            suffix="/mo"
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
              ["Revision history", true],
              ["Client share link", true],
              ["Priority support", true],
            ]}
          />
          <PriceCard
            plan="Studio"
            price="$59"
            suffix="/mo"
            tag="For teams"
            tagline="Agencies & real estate teams"
            btn="Start Studio →"
            btnClass="bg-blue border hover:opacity-85"
            feats={[
              ["Everything in Pro", true],
              ["Team workspace", true],
              ["White-label exports", true],
              ["API access", true],
              ["Custom branding", true],
              ["Dedicated support", true],
              ["SSO", true],
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function PriceCard({
  plan,
  price,
  suffix,
  tag,
  tagline,
  btn,
  btnClass,
  feats,
  featured = false,
}: {
  plan: string;
  price: string;
  suffix?: string;
  tag: string;
  tagline: string;
  btn: string;
  btnClass: string;
  feats: [string, boolean][];
  featured?: boolean;
}) {
  return (
    <div
      className={`reveal rounded-[10px] p-7 border ${featured ? "bg-ink border-ink shadow-sheetLg" : "bg-[#F2F0EA] border-line hover:border-line-strong transition-colors"
        }`}
    >
      <div className={`font-mono text-[10px] font-medium uppercase tracking-[0.1em] mb-3 ${featured ? "text-blue-dim" : "text-blue"}`}>
        {plan}
      </div>
      <div className={`font-display text-[2.7rem] tracking-[-0.03em] leading-none mb-1 ${featured ? "text-black" : "text-ink"}`}>
        {price}
        {suffix && <span className="text-[1rem] font-body font-light text-muted">{suffix}</span>}
      </div>
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
