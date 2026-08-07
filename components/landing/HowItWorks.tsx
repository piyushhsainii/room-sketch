import { Smartphone, Box, Home, Share2 } from "lucide-react";
import DotGrid from "./DotGrid";

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
    <section className="relative py-28 px-6 md:px-10 bg-paper border-b border-line overflow-hidden">
      <div className="relative z-10 max-w-[1200px] mx-auto">
        <div className=" text-center mb-16">
          <h2 className=" font-sans text-[3rem] md:text-[4.4rem] leading-[0.9] tracking-tighter text-ink mb-7">
            From blank sheet to <br className="hidden md:block" />
            walkable model
          </h2>
          <p className="text-[20px] font-normal text-muted text-black/70 tracking-tighter">
            Sketch your building and step into the result.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="reveal flex flex-col bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] transition-shadow p-7"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="w-11 h-11 rounded-[10px]   flex items-center justify-center mb-6">
                  <Icon size={30} strokeWidth={1.5} className="text-ink" />
                </div>

                <span className=" text-[10px] text-muted tracking-[0.08em] uppercase mb-1.5">
                  Step {s.n}
                </span>
                <h3 className="font-display font-medium text-[19px] text-ink tracking-tighter mb-2.5 leading-snug">
                  {s.title}
                </h3>
                <p className="text-[14px] font-medium tracking-tighter text-muted leading-[1.5] tracking-[-0.01em] mb-6">
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