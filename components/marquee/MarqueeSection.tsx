// @ts-nocheck

import { MARQUEE } from "@/constants/content";
import type { Project } from "@/lib/models";

type Props = {
  projects: Project[];
};

type Item =
  | {
    kind: "image";
    background: string;
    placeholder?: boolean;
  }
  | {
    kind: "video";
    background: string;
    placeholder?: boolean;
  };

function PlayIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 7.5v9l8-4.5-8-4.5Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function buildItems(projects: Project[]): Item[] {
  const completed = projects.filter((p) => p.status === "completed" && Boolean(p.render_url));
  const items: Item[] = [];

  for (const p of completed) {
    if (p.render_url) items.push({ kind: "image", background: `url(${p.render_url})` });
    if (p.video_url && p.render_url) items.push({ kind: "video", background: `url(${p.render_url})` });
  }

  if (items.length > 0) return items;

  const gradients = [
    "linear-gradient(135deg, #1e1b4b, #312e81)",
    "linear-gradient(135deg, #0c4a6e, #0369a1)",
    "linear-gradient(135deg, #14532d, #166534)",
    "linear-gradient(135deg, #3b0764, #6b21a8)",
    "linear-gradient(135deg, #1c1917, #44403c)",
    "linear-gradient(135deg, #0f172a, #1e3a5f)",
  ];

  return Array.from({ length: 10 }).map((_, i) => {
    const background = gradients[i % gradients.length];
    return { kind: i % 3 === 0 ? "video" : "image", background, placeholder: true };
  });
}

export default function MarqueeSection({ projects }: Props) {
  const items = buildItems(projects);
  const loop = [...items, ...items];

  return (
    <section className="ra-marquee">
      <div className="ra-marqueeLabel">{MARQUEE.label}</div>
      <div className="ra-marqueeViewport">
        <div className="ra-marqueeTrack">
          {loop.map((item, idx) => (
            <div
              key={idx}
              className="ra-marqueeItem"
              style={{
                position: "relative",
                backgroundImage: item.background.startsWith("url(") ? item.background : undefined,
                background: item.background.startsWith("url(") ? undefined : item.background,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {item.placeholder ? (
                <div className="ra-marqueeCardLabel">
                  {item.kind === "video" ? MARQUEE.cinematicVideoCard : MARQUEE.interiorRenderCard}
                </div>
              ) : null}
              {item.kind === "video" ? (
                <div className="ra-playOverlay">
                  <div className="ra-playBadge">
                    <PlayIcon />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
