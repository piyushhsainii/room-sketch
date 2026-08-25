const items = [
  { num: "60+", label: "Materials across walls, floors & furniture" },
  { num: "4", label: "Lighting types — wall, strip, ceiling, string" },
  { num: "0", label: "Software to install" },
  { num: "1", label: "Free project, no card needed" },
];

export default function BenchStrip() {
  return (
    <div
      className="py-10 px-6 md:px-10"
      style={{ background: "#E5E5E5", fontFamily: "'Quicksand','Nunito',sans-serif" }}
    >
      <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center px-4 py-7 md:py-8 rounded-[24px]"
            style={{
              background: "#EAEAEA",
              boxShadow: "-6px -6px 12px rgba(255,255,255,0.7), 6px 6px 14px rgba(0,0,0,0.12)",
            }}
          >
            <span
              className="text-[1.7rem] md:text-[2rem] tracking-[-0.03em] leading-none mb-2"
              style={{ color: "#1A1A1A", fontWeight: 400 }}
            >
              {it.num}
            </span>
            <div
              className="text-[13px] md:text-[13.5px] font-normal leading-[1.5] tracking-[-0.005em] max-w-[160px]"
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