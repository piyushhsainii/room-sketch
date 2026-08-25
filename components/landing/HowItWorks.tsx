import { Smartphone, Box, Home, Share2 } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: Smartphone,
    title: "Sketch the plan",
    desc: "Place rooms, walls, doors, windows and stairs in the browser editor — every wall is set to solid, railing or open.",
  },
  {
    n: "02",
    icon: Box,
    title: "3D builds as you go",
    desc: "Every wall and opening becomes real geometry the moment you draw it. The preview pane never falls behind your cursor.",
  },
  {
    n: "03",
    icon: Home,
    title: "Set the finish",
    desc: "Choose flooring, wall colour, door style and lighting per room from Scene Config — changes apply on the spot.",
  },
  {
    n: "04",
    icon: Share2,
    title: "Send the link",
    desc: "Clients open it on any device and walk through it at eye level with Walk Mode. No plugin.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-28 px-6 md:px-10 overflow-hidden"
      style={{ background: "#E5E5E5", fontFamily: "'Quicksand','Nunito',sans-serif" }}
    >
      <div className="relative z-10 max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <span
            className="inline-block text-[11px] font-medium uppercase tracking-[0.1em] mb-5 px-4 py-[6px] rounded-full"
            style={{
              color: "#556",
              background:
                "linear-gradient(135deg, rgba(163,224,193,0.28), rgba(168,178,230,0.28)), #EAEAEA",
              boxShadow: "-4px -4px 10px rgba(255,255,255,0.7), 4px 4px 12px rgba(0,0,0,0.10)",
            }}
          >
            How it works
          </span>
          <h2
            className="text-[2.6rem] md:text-[3.6rem] leading-[0.95] tracking-[-0.03em] mb-6"
            style={{ color: "#1A1A1A", fontWeight: 500 }}
          >
            From blank sheet to <br className="hidden md:block" />
            walkable model
          </h2>
          <p className="text-[16px] md:text-[17px] font-normal tracking-[-0.005em]" style={{ color: "#777" }}>
            Sketch your building and step into the result.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="reveal flex flex-col rounded-[24px] p-7 transition-shadow"
                style={{
                  background: "#EAEAEA",
                  boxShadow: "-6px -6px 12px rgba(255,255,255,0.7), 6px 6px 14px rgba(0,0,0,0.12)",
                  transitionDelay: `${i * 80}ms`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
                  style={{
                    background: "#F5F5F5",
                    boxShadow: "-5px -5px 10px rgba(255,255,255,0.8), 5px 5px 12px rgba(0,0,0,0.14)",
                  }}
                >
                  <Icon size={24} strokeWidth={1.6} color="#333" />
                </div>

                <span className="text-[10px] tracking-[0.08em] uppercase mb-1.5" style={{ color: "#999" }}>
                  Step {s.n}
                </span>
                <h3
                  className="text-[19px] tracking-[-0.01em] mb-2.5 leading-snug"
                  style={{ color: "#1A1A1A", fontWeight: 500 }}
                >
                  {s.title}
                </h3>
                <p className="text-[14px] font-normal leading-[1.6] tracking-[-0.005em]" style={{ color: "#666" }}>
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}