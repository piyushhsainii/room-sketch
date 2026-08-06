const items = [
  { num: "60+", label: "Materials across walls, floors & furniture" },
  { num: "4", label: "Lighting types — wall, strip, ceiling, string" },
  { num: "0", label: "Software to install" },
  { num: "1", label: "Free project, no card needed" },
];

export default function BenchStrip() {
  return (
    <div className="border-b border-line bg-[#F2F0EA]">
      <div className="grid grid-cols-2 divide-x divide-y divide-line md:flex md:flex-wrap md:justify-center md:divide-y-0">
        {items.map((it, i) => (
          <div
            key={i}
            className="px-4 py-6 text-center md:px-14 md:py-7 md:border-r md:border-line md:last:border-r-0"
          >
            <span className="font-mono text-[1.5rem] md:text-[1.9rem] font-medium text-ink tracking-[-0.04em] leading-none block">
              {it.num}
            </span>
            <div className="text-[14px]  font-medium text-muted mt-1.5 tracking-tighter  px-1">
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}