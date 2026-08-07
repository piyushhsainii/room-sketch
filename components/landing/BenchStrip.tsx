const items = [
  { num: "60+", label: "Materials across walls, floors & furniture" },
  { num: "4", label: "Lighting types — wall, strip, ceiling, string" },
  { num: "0", label: "Software to install" },
  { num: "1", label: "Free project, no card needed" },
];

export default function BenchStrip() {
  return (
    <div className=" bg-[#F2F0EA]">
      <div className="grid grid-cols-2  md:flex md:flex-wrap md:justify-center ">
        {items.map((it, i) => (
          <div
            key={i}
            className="px-4 py-6 text-center md:px-14 md:py-7"
          >
            <span className="text-[1.5rem] md:text-[1.9rem] font-semibold text-ink tracking-[-0.04em] leading-none ">
              {it.num}
            </span>
            <div className="text-lg  font-medium font-sans  mt-1.5 tracking-tighter  px-1">
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}