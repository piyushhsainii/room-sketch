"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import { A11Y } from "@/constants/content";

export type CarouselSlide =
  | { kind: "floorplan"; label: string; url: string }
  | { kind: "render"; label: string; url: string }
  | { kind: "video"; label: string; url: string };

type Props = {
  open: boolean;
  slides: CarouselSlide[];
  index: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
  projectName: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
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

export default function LightboxModal({ open, slides, index, onChangeIndex, onClose }: Props) {
  const mounted = typeof document !== "undefined";

  const maxIndex = useMemo(() => Math.max(0, slides.length - 1), [slides.length]);
  const safeIndex = clamp(index, 0, maxIndex);
  const current = slides[safeIndex];

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onChangeIndex(clamp(safeIndex - 1, 0, maxIndex));
      if (e.key === "ArrowRight") onChangeIndex(clamp(safeIndex + 1, 0, maxIndex));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [maxIndex, onChangeIndex, onClose, open, safeIndex]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="ra-lbOverlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      data-open={open ? "true" : "false"}
    >
      <button type="button" className="ra-lbClose" aria-label={A11Y.closePreview} onClick={onClose}>
        <CloseIcon />
      </button>

      <div className="ra-lbContent" onClick={(e) => e.stopPropagation()}>
        <div className="ra-lbViewport">
          <div
            className="ra-carouselTrack"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {slides.map((slide) => {
              if (slide.kind === "video") {
                return (
                  <div key={slide.kind} className="ra-carouselSlide" data-kind={slide.kind}>
                    <video className="ra-carouselVideo" src={slide.url} controls autoPlay muted loop playsInline />
                  </div>
                );
              }

              return (
                <div key={slide.kind} className="ra-carouselSlide" data-kind={slide.kind}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="ra-lbImage" src={slide.url} alt="" />
                </div>
              );
            })}
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
            onClick={() => onChangeIndex(clamp(safeIndex - 1, 0, maxIndex))}
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            className="ra-carNav"
            data-side="right"
            aria-label={A11Y.next}
            disabled={safeIndex === maxIndex}
            onClick={() => onChangeIndex(clamp(safeIndex + 1, 0, maxIndex))}
          >
            <ChevronIcon dir="right" />
          </button>
        </div>

        <div className="ra-lbDots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className="ra-carouselDot"
              data-active={i === safeIndex ? "true" : "false"}
              aria-label={`${i + 1} / ${slides.length}`}
              onClick={() => onChangeIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
