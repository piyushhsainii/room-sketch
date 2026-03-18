"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { A11Y, VIEWER } from "@/constants/content";
import LightboxModal, { type CarouselSlide } from "@/components/viewer/LightboxModal";

export type CarouselViewerProps = {
  floorplanUrl: string;
  renderUrl: string | null;
  videoUrl?: string | null;
  projectName: string;
};

const VIEW_EVENT = "renderai:view-slide";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d={dir === "left" ? "M14.5 6 8.5 12l6 6" : "M9.5 6 15.5 12l-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9 4H4v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CarouselViewer({ floorplanUrl, renderUrl, videoUrl, projectName }: CarouselViewerProps) {
  const slides = useMemo<CarouselSlide[]>(() => {
    const list: CarouselSlide[] = [{ kind: "floorplan", label: VIEWER.carousel.floorplanLabel, url: floorplanUrl }];
    if (renderUrl) list.push({ kind: "render", label: VIEWER.carousel.renderLabel, url: renderUrl });
    if (videoUrl) list.push({ kind: "video", label: VIEWER.carousel.videoLabel, url: videoUrl });
    return list;
  }, [floorplanUrl, renderUrl, videoUrl]);

  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    function onViewSlide(e: Event) {
      const ce = e as CustomEvent<{ index?: unknown }>;
      const raw = ce.detail?.index;
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return;

      const next = clamp(n, 0, Math.max(0, slides.length - 1));
      setIndex(next);
      setLightboxOpen(true);
    }

    window.addEventListener(VIEW_EVENT, onViewSlide);
    return () => window.removeEventListener(VIEW_EVENT, onViewSlide);
  }, [slides.length]);

  const maxIndex = Math.max(0, slides.length - 1);
  const safeIndex = clamp(index, 0, maxIndex);
  const current = slides[safeIndex];

  return (
    <div className="ra-carouselWrap">
      <div className="ra-carouselShell">
        <div className="ra-carouselViewport">
          <div className="ra-carouselTrack" style={{ transform: `translateX(-${safeIndex * 100}%)` }}>
            {slides.map((slide) => (
              <div key={slide.kind} className="ra-carouselSlide" data-kind={slide.kind}>
                {slide.kind === "video" ? (
                  <video
                    className="ra-carouselVideo"
                    src={slide.url}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : slide.kind === "floorplan" ? (
                  <div className="ra-floorplanStage">
                    <div className="ra-floorplanPad">
                      <Image src={slide.url} alt="" fill unoptimized style={{ objectFit: "contain" }} />
                    </div>
                  </div>
                ) : (
                  <Image src={slide.url} alt="" fill unoptimized style={{ objectFit: "cover" }} />
                )}
              </div>
            ))}
          </div>

          <div className="ra-carouselPill" style={{ left: 12, top: 12 }}>
            {current?.label}
          </div>
          <div className="ra-carouselPill" style={{ right: 12, top: 12 }}>
            {safeIndex + 1} / {slides.length}
          </div>

          <button
            type="button"
            className="ra-carNav"
            data-side="left"
            aria-label={A11Y.previous}
            disabled={safeIndex === 0}
            onClick={() => setIndex(clamp(safeIndex - 1, 0, maxIndex))}
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            className="ra-carNav"
            data-side="right"
            aria-label={A11Y.next}
            disabled={safeIndex === maxIndex}
            onClick={() => setIndex(clamp(safeIndex + 1, 0, maxIndex))}
          >
            <ChevronIcon dir="right" />
          </button>

          <button
            type="button"
            className="ra-carExpand"
            aria-label={A11Y.expand}
            onClick={() => setLightboxOpen(true)}
          >
            <ExpandIcon />
          </button>
        </div>
      </div>

      <div className="ra-carouselDots">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            className="ra-carouselDot"
            data-active={i === safeIndex ? "true" : "false"}
            onClick={() => setIndex(i)}
            aria-label={`${i + 1} / ${slides.length}`}
          />
        ))}
      </div>

      <LightboxModal
        open={lightboxOpen}
        slides={slides}
        index={safeIndex}
        onChangeIndex={setIndex}
        onClose={() => setLightboxOpen(false)}
        projectName={projectName}
      />
    </div>
  );
}
