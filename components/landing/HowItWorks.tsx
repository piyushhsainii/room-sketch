const steps = [
  {
    n: "01",
    title: "Sketch the plan",
    desc: "Place rooms, walls, doors, windows and stairs in the browser editor — every wall is set to solid, railing or open.",
  },
  {
    n: "02",
    title: "3D builds as you go",
    desc: "Every wall and opening becomes real geometry the moment you draw it. The preview pane never falls behind your cursor.",
  },
  {
    n: "03",
    title: "Set the finish",
    desc: "Choose flooring, wall colour, door style and lighting per room from Scene Config — changes apply on the spot.",
  },
  {
    n: "04",
    title: "Send the link",
    desc: "Clients open it on any device and walk through it at eye level with Walk Mode. No plugin.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 md:px-10 bg-paper border-b border-line">
      <div className="max-w-[1100px] mx-auto">
        <div className="reveal mb-14">
          <span className="font-mono text-[10px] font-medium text-blue uppercase tracking-[0.1em] block mb-3">
            Process
          </span>
          <h2 className="font-display text-[1.9rem] md:text-[2.6rem] tracking-[-0.025em] text-ink leading-[1.1]">
            From blank sheet to <em className="italic">walkable model</em>.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 relative">
          <div className="hidden md:block absolute top-5 left-[12.5%] right-[12.5%] h-px bg-line" />
          {steps.map((s, i) => (
            <div key={i} className={`reveal relative z-10 px-0 md:px-4 ${i === 0 ? "md:pl-0" : ""}`} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="w-10 h-10 rounded-full bg-paper border border-line-strong flex items-center justify-center font-mono text-[11px] font-medium text-blue mb-4 shadow-sheet">
                {s.n}
              </div>
              <div className="text-[14px] font-medium text-ink tracking-[-0.015em] mb-2 leading-snug">{s.title}</div>
              <p className="text-[12.5px] font-light text-muted leading-[1.7] tracking-[-0.01em] pr-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
