import Link from "next/link";
import { ArrowRight, Camera, Footprints, Layers, Link2, Palette, Users } from "lucide-react";

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
    desc: "Draw rooms, walls, doors, windows, and stairs to scale in metres. The live 3D view follows each edit, so you can refine the layout and check the result without rebuilding the model.",
    tags: ["Node editor", "Real units", "Real-time 3D sync"],
    image: "/preview-assets/floor2d-live-model.png",
  },
  {
    code: "A-150",
    title: "Snapshot exports",
    desc: "Capture any floor or room as a 2D or 3D image. Use a top-down view to review the layout, an angled view to show how rooms connect, or an eye-level shot to present the space.",
    tags: ["2D + 3D export", "Any angle", "Per floor/room"],
    image: "/preview-assets/floor2d-live-model2.png",
  },
  {
    code: "A-401",
    title: "Materials",
    desc: "Choose from more than 50 materials for walls, floors, doors, and furniture. Swap a finish for an individual room or wall face, then see how it looks next to the surrounding materials in 3D.",
    tags: ["50+ materials", "Per-room control", "Pro"],
    image: "/preview-assets/floor2d-live-model3.png",
  },
  {
    code: "A-301",
    title: "Walkthrough",
    desc: "Walk through your model at eye level and see the space as a visitor would. Check sightlines from a doorway, how furniture fits, and what you see as you move between rooms.",
    tags: ["Walk Mode", "Pro"],
    image: "/preview-assets/floor2d-live-model4.png",
  },
  {
    code: "A-501",
    title: "Live shareable link",
    desc: "Send a link to the active floor so clients or collaborators can open it straight in their browser. They can orbit, zoom, or walk through the model at their own pace without setting up an account.",
    tags: ["Interactive 3D", "No sign-up", "Active floor"],
    image: "/preview-assets/floor2d-live-model5.png",
  },
  {
    code: "A-601",
    title: "Community spotlight",
    desc: "Explore floor plans in the community showcase to see how others approach layouts and finishes. Standout projects can be featured so others can explore the design and its 3D model.",
    tags: ["Featured designs", "Community showcase"],
    image: "/preview-assets/floor2d-live-model6.png",
  },
];

export default function Capabilities() {
  return (
    <section
      id="capabilities"
      className="capabilities"
      aria-labelledby="capabilities-title"
    >
      <div className="capabilities-heading">
        <h2 id="capabilities-title">
          Every sheet you need, in one editor.
        </h2>
        <p>
          Like a real drawing set, each part of RoomSketch is numbered and cross-referenced —
          plan, model, finishes, walkthrough, revisions.
        </p>
      </div>

      <div className="capabilities-grid">
        {ITEMS.map((item, i) => (
          <Row key={item.code} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}

const ICONS = [Layers, Camera, Palette, Footprints, Link2, Users];
const LABELS = ["Plan & model", "Presentation", "Finishes", "Walk Mode", "Collaboration", "Community"];

function Row({ item, index }: { item: Item; index: number }) {
  const Icon = ICONS[index];
  return (
    <article className="capability-row" data-reversed={index % 2 === 1}>
      <div className="capability-copy">
        <div className="capability-eyebrow">
          <Icon size={14} strokeWidth={1.7} aria-hidden="true" />
          <span>{LABELS[index]}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.desc}</p>
        <Link className="capability-link" href={index === 5 ? "/community" : "/projects/new"}>
          {index === 5 ? "Explore the community" : "Start designing"}
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
      <div className="capability-visual">
        <div className="capability-image">
          <img src={item.image} alt={item.title} loading="lazy" decoding="async" width={2555} height={1113} />
        </div>
        <ul className="capability-tags" aria-label={`${item.title} features`}>
          {item.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
