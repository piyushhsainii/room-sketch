import { Box, Layers3, PencilRuler, Share2 } from "lucide-react";

const steps = [
  {
    icon: PencilRuler,
    title: "Sketch the plan",
    desc: "Lay out rooms in the browser, then add doors, windows, and stairs where you need them. Set each wall segment to solid, railing, or open to define how the rooms connect.",
  },
  {
    icon: Box,
    title: "3D builds as you go",
    desc: "Watch walls and openings take shape in the live 3D preview as you draw. Change the plan to check how a wider doorway or a different layout looks in the model.",
  },
  {
    icon: Layers3,
    title: "Set the finish",
    desc: "Choose flooring, wall colours, door styles, and lighting for each room in Scene Config. See how finishes look together in 3D as you try different combinations.",
  },
  {
    icon: Share2,
    title: "Send the link",
    desc: "Share a browser link so clients can orbit the model, zoom in, or use Walk Mode to explore it at eye level. They can open it without installing a plugin or creating an account.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="landing-grid relative py-24 px-6 md:px-10 overflow-hidden"
    >
      <div className="relative z-10 max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <span
            className="landing-chip inline-block text-[11px] font-medium uppercase tracking-[0.08em] mb-5 px-4 py-1.5 rounded-full"
          >
            How it works
          </span>
          <h2
            className="text-[2.6rem] md:text-[3.6rem] leading-[1.02] mb-6"
            style={{ color: "#1A1A1A", fontWeight: 500 }}
          >
            From blank sheet to <br className="hidden md:block" />
            walkable model
          </h2>
          <p className="text-base md:text-[17px] text-neutral-700">
            Sketch your building and step into the result.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="landing-card reveal flex flex-col rounded-2xl p-7"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div
                  className="landing-chip w-12 h-12 rounded-lg flex items-center justify-center mb-5"
                >
                  <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
                </div>

                <span className="text-[11px] tracking-wide uppercase mb-1.5 text-neutral-600">
                  Step {i + 1}
                </span>
                <h3
                  className="text-[19px] tracking-[-0.01em] mb-2.5 leading-snug"
                  style={{ color: "#1A1A1A", fontWeight: 500 }}
                >
                  {s.title}
                </h3>
                <p className="landing-description">
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
