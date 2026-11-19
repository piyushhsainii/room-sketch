const items = [
  { num: "60+", label: "Materials across walls, floors & furniture" },
  { num: "4", label: "Lighting types — wall, strip, ceiling, string" },
  { num: "0", label: "Software to install" },
  { num: "1", label: "Free project, no card needed" },
];

export default function BenchStrip() {
  return (
    <div className="py-10 px-6 md:px-10">
      <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <div
            key={it.num}
            className="landing-card flex flex-col items-center text-center px-4 py-7 md:py-8 rounded-2xl"
          >
            <span
              className="text-[1.7rem] md:text-[2rem] tracking-[-0.03em] leading-none mb-2"
              style={{ color: "#1A1A1A", fontWeight: 400 }}
            >
              {it.num}
            </span>
            <div
              className="text-[13px] md:text-[16.5px] font-normal leading-[1.3] tracking-[-0.005em] max-w-[160px]"
              style={{ color: "#666" }}
            >
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
