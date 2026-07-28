export default function Capabilities() {
  return (
    <section id="capabilities" className="py-24 px-6 md:px-10 bg-[#F2F0EA] border-b border-line">
      <div className="max-w-[1100px] mx-auto">
        <div className="reveal mb-4">
          <span className="font-mono text-[10px] font-medium text-blue uppercase tracking-[0.1em] block mb-3">
            The drawing set
          </span>
          <h2 className="font-display text-[1.9rem] md:text-[2.6rem] tracking-[-0.025em] text-ink leading-[1.1] mb-3">
            Every sheet you need, <em className="italic">in one editor.</em>
          </h2>
          <p className="text-[13.5px] font-light text-muted max-w-[440px] leading-[1.7]">
            Like a real drawing set, each part of RoomSketch is numbered and cross-referenced —
            plan, model, finishes, walkthrough, revisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 md:auto-rows-[260px]">
          {/* Floor plan editor — tall */}
          <Sheet
            code="A-101"
            title="Floor plan"
            desc="Node-based drawing. Rooms, walls, doors, windows, stairs — every coordinate is real metres. Set each wall to solid, railing or open per segment."
            tags={["Node editor", "Real units", "3 wall types"]}
            className="md:row-span-2"
          >
            <PlanIcon />
          </Sheet>

          {/* Live 3D */}
          <Sheet
            code="A-201"
            title="Live 3D model"
            desc="Your plan renders as a full 3D scene in a resizable split view — add a wall, watch it appear on the right, no re-modeling."
            tags={["Real-time sync", "Resizable split view"]}
          >
            <CubeIcon />
          </Sheet>

          {/* Scene config */}
          <Sheet
            code="A-401"
            title="Materials"
            desc="60+ materials across walls, floors, doors and furniture, in one registry — swap a finish per room and see it update instantly."
            tags={["60+ materials", "Per-room control", "Pro"]}
          >
            <SwatchIcon />
          </Sheet>

          {/* Walk mode */}
          <Sheet
            code="A-301"
            title="Walkthrough"
            desc="First-person Walk Mode moves a client through the space at eye level, not from above — see it exactly as they would standing in the room."
            tags={["Walk Mode", "Pro"]}
          >
            <WalkIcon />
          </Sheet>

          {/* Duplicate & undo */}
          <Sheet
            code="A-501"
            title="Duplicate & undo"
            desc="Duplicate or mirror any room or furniture group instead of redrawing it — and every edit is a step you can undo."
            tags={["Duplicate & mirror", "Undo history"]}
          >
            <HistoryIcon />
          </Sheet>
        </div>
      </div>
    </section>
  );
}

function Sheet({
  code,
  title,
  desc,
  tags,
  children,
  className = "",
}: {
  code: string;
  title: string;
  desc: string;
  tags: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`reveal relative bg-paper border border-line rounded-[8px] p-6 flex flex-col shadow-sheet ${className}`}
    >
      <div className="flex items-start justify-between mb-5">
        <span className="font-mono text-[10px] text-muted tracking-[0.06em]">{code}</span>
        <div className="w-9 h-9 rounded-[6px] bg-blue-soft border border-blue-border flex items-center justify-center text-blue">
          {children}
        </div>
      </div>
      <h3 className="font-display text-[1.25rem] text-ink tracking-[-0.015em] mb-2 leading-tight">{title}</h3>
      <p className="text-[13px] font-light text-graphite leading-[1.7] tracking-[-0.005em] mb-4 flex-1">{desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span key={i} className="font-mono text-[9.5px] text-blue bg-blue-soft border border-blue-border rounded-[4px] px-2 py-[3px]">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="14" height="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="2" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1" />
      <line x1="9" y1="2" x2="9" y2="9" stroke="currentColor" strokeWidth="1" />
      <circle cx="2" cy="2" r="1.1" fill="currentColor" />
      <circle cx="16" cy="9" r="1.1" fill="currentColor" />
    </svg>
  );
}
function CubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2l7 3.5v7L9 16l-7-3.5v-7L9 2z" stroke="currentColor" strokeWidth="1.1" fill="none" />
      <path d="M2 5.5L9 9l7-3.5M9 9v7" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
function SwatchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="6" cy="6" r="3.3" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="12" cy="6" r="3.3" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="9" cy="12" r="3.3" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
function WalkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="3.5" r="1.6" stroke="currentColor" strokeWidth="1.1" />
      <path d="M9 6v5M9 11l-3 5M9 11l3 5M6 8l3-1 3 1" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.1" />
      <path d="M9 5v4l3 2" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}
