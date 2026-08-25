"use client";

interface Item {
  code: string;
  title: string;
  desc: string;
  tags: string[];
  image: string;
}

const ITEMS: Item[] = [
  {
    code: "A-101",
    title: "Floor plan → live 3D",
    desc: "Node-based drawing with real-metre coordinates — rooms, walls, doors, windows, stairs, per-segment wall types (solid, railing, open). Every edit renders instantly in a synced 3D split view, no re-modeling step.",
    tags: ["Node editor", "Real units", "Real-time 3D sync"],
    image: "/preview-assets/floor2d-live-model.png",
  },
  {
    code: "A-150",
    title: "Snapshot exports",
    desc: "Capture any floor or room as a 2D or 3D image from any camera angle — top-down for plans, eye-level for presentation, anything in between.",
    tags: ["2D + 3D export", "Any angle", "Per floor/room"],
    image: "/preview-assets/floor2d-live-model2.png",
  },
  {
    code: "A-401",
    title: "Materials",
    desc: "50+ materials across walls, floors, doors and furniture in one registry — swap a finish per room, per wall face, and see it update instantly.",
    tags: ["50+ materials", "Per-room control", "Pro"],
    image: "/preview-assets/floor2d-live-model3.png",
  },
  {
    code: "A-301",
    title: "Walkthrough",
    desc: "First-person Walk Mode moves a client through the space at eye level, not from above — see it exactly as they would standing in the room.",
    tags: ["Walk Mode", "Pro"],
    image: "/preview-assets/floor2d-live-model4.png",
  },
  {
    code: "A-501",
    title: "Live shareable link",
    desc: "Send a link and anyone can explore your active floor's 3D model in the browser — orbit, zoom, walk through, no account or install needed.",
    tags: ["Interactive 3D", "No sign-up", "Active floor"],
    image: "/preview-assets/floor2d-live-model5.png",
  },
  {
    code: "A-601",
    title: "Community spotlight",
    desc: "Standout designs get picked for the community showcase — a chance to get your floor plan seen and featured.",
    tags: ["Featured designs", "Community showcase"],
    image: "/preview-assets/floor2d-live-model6.png",
  },
];

export default function Capabilities() {
  return (
    <section
      id="capabilities"
      className="py-24 px-6 md:px-10"
      style={{ background: "#E5E5E5", fontFamily: "'Quicksand','Nunito',sans-serif" }}
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="reveal mb-4">
          <h2
            className="text-[1.9rem] md:text-[2.6rem] tracking-[-0.02em] leading-[1.1] mb-3"
            style={{ color: "#1A1A1A", fontWeight: 500 }}
          >
            Every sheet you need, <em className="italic" style={{ fontWeight: 500 }}>in one editor.</em>
          </h2>
          <p className="text-[14px] font-normal max-w-[440px] leading-[1.7]" style={{ color: "#666" }}>
            Like a real drawing set, each part of RoomSketch is numbered and cross-referenced —
            plan, model, finishes, walkthrough, revisions.
          </p>
        </div>

        <div
          className="rounded-[30px] mt-12 overflow-hidden"
          style={{ background: "#EAEAEA", boxShadow: "0 20px 40px rgba(0,0,0,0.10)" }}
        >
          {ITEMS.map((item, i) => (
            <Row key={item.code} item={item} last={i === ITEMS.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({ item, last }: { item: Item; last: boolean }) {
  return (
    <div
      className="reveal relative flex flex-col md:flex-row items-stretch gap-6 md:gap-8 px-6 md:px-8 py-7"
      style={!last ? { borderBottom: "1px solid #00000010" } : undefined}
    >
      {/* Image preview card — 50% width, tall enough to actually read */}
      <div
        className="w-full md:w-1/2 h-56 md:h-72 rounded-[20px] overflow-hidden shrink-0"
        style={{
          background: "#F5F5F5",
          boxShadow:
            "-6px -6px 12px rgba(255,255,255,0.75), 6px 6px 16px rgba(0,0,0,0.12)",
        }}
      >
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center min-w-0">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-[18px] md:text-[20px] leading-tight" style={{ color: "#1A1A1A", fontWeight: 500 }}>
              {item.title}
            </span>
            <span className="text-[10px] tracking-wide" style={{ color: "#999" }}>
              {item.code}
            </span>
          </div>
          <ChevronIcon />
        </div>

        <p className="text-[14px] font-normal leading-[1.7] mb-4" style={{ color: "#666" }}>
          {item.desc}
        </p>

        <div className="flex flex-wrap gap-2">
          {item.tags.map((t, i) => (
            <span
              key={i}
              className="text-[10.5px] rounded-full px-3 py-[5px]"
              style={{
                color: "#556",
                background: "#EAEAEA",
                boxShadow:
                  "-3px -3px 6px rgba(255,255,255,0.7), 3px 3px 8px rgba(0,0,0,0.10)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-1">
      <path d="M6 3.5L10.5 8L6 12.5" stroke="#888" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}