const items = [
  { num: "<2s", label: "Sketch → live 3D" },
  { num: "90%", label: "Cheaper than a 3D studio" },
  { num: "0", label: "Software to install" },
  { num: "1", label: "Free project, no card needed" },
];

export default function BenchStrip() {
  return (
    <div className="border-b border-line bg-[#F2F0EA] flex flex-wrap justify-center">
      {items.map((it, i) => (
        <div
          key={i}
          className="px-8 md:px-14 py-7 text-center border-r border-line last:border-r-0"
        >
          <span className="font-mono text-[1.9rem] font-medium text-ink tracking-[-0.04em] leading-none block">
            {it.num}
          </span>
          <div className="text-[11px] font-light text-muted mt-1 tracking-[-0.005em]">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
