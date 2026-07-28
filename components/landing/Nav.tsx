import { isWaitlistMode } from "@/lib/flags";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[200] h-[60px] flex items-center justify-between px-6 md:px-10 bg-paper/95 backdrop-blur-md border-b border-line">
      <div className="flex items-center gap-2 font-display text-[19px] tracking-tight text-ink">
        <img src="/room-sketch-logo.jpg" alt="" className="w-14 h-14 select-none" />
        <img src="/room-sketch-text.jpg" alt="" className="w-28  select-none" />
      </div>
      <div className="hidden md:flex items-center gap-8">
        <a href="#how-it-works" className="text-[13.5px] text-graphite hover:text-ink transition-colors">How it works</a>
        <a href="#capabilities" className="text-[13.5px] text-graphite hover:text-ink transition-colors">Capabilities</a>
        {!isWaitlistMode && (
          <a href="#pricing" className="text-[13.5px] text-graphite hover:text-ink transition-colors">Pricing</a>
        )}
      </div>
      <div></div>
      {/* <a
        href={isWaitlistMode ? "#waitlist" : "/dashboard"}
        className="bg-blue text-white text-[13.5px] font-medium px-[18px] py-2 rounded-[6px] hover:opacity-85 transition-opacity whitespace-nowrap"
        style={{ backgroundColor: "#5B7FD6" }}
      > */}
      {/* {isWaitlistMode ? "Join waitlist →" : "Start sketching free →"} */}
      {/* </a> */}
    </nav>
  );
}