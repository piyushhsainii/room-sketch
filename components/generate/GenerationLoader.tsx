"use client";

import { useMemo } from "react";

import { GENERATE, STYLE_CONTEXT } from "@/constants/content";

export type GenerationLoaderProps = {
  type: "render" | "render_video";
  currentStep: string;
  elapsedSeconds: number;
  styleContext?: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${pad2(r)}`;
}

function CubeIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="ra-cube"
    >
      <path d="M24 6 38 14v20L24 42 10 34V14L24 6Z" stroke="var(--color-accent)" strokeWidth="1.6" />
      <path d="M24 6v20l14 8" stroke="var(--color-accent)" strokeWidth="1.6" />
      <path d="M24 26 10 34" stroke="var(--color-accent)" strokeWidth="1.6" />
      <path d="M10 14l14 8 14-8" stroke="var(--color-accent)" strokeWidth="1.6" />
    </svg>
  );
}

export default function GenerationLoader({ type, currentStep, elapsedSeconds, styleContext }: GenerationLoaderProps) {
  const steps = GENERATE.steps;
  const activeIndex = Math.max(0, steps.findIndex((s) => s === currentStep));
  const elapsed = formatElapsed(elapsedSeconds);

  const messages = useMemo(() => {
    if (type === "render_video" && currentStep === steps[steps.length - 1]) {
      return GENERATE.videoLoadingMessages;
    }
    return GENERATE.loadingMessages;
  }, [currentStep, steps, type]);

  const msgIndex = messages.length > 0 ? Math.floor(elapsedSeconds / 6) % messages.length : 0;
  const message = messages[msgIndex] ?? "";

  const styleText = (styleContext ?? "").trim();
  const showStyle = styleText.length > 0;
  const clippedStyle = showStyle ? (styleText.length > 64 ? `${styleText.slice(0, 64)}…` : styleText) : "";

  return (
    <div className="ra-genLoader">
      <div className="ra-genLoaderPreview">
        <div className="ra-genLoaderShimmer" />
        <div className="ra-genLoaderCenter">
          <CubeIcon />
          <div className="ra-genLoaderStep">{currentStep}</div>
          <div className="ra-genLoaderTime">{elapsed}</div>
        </div>

        {showStyle ? (
          <div className="ra-styleBadge" title={styleText}>
            {STYLE_CONTEXT.selectedLabel} {clippedStyle}
          </div>
        ) : null}
      </div>

      <div className="ra-stepper">
        {steps.map((label, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <div key={label} className="ra-stepperItem" data-state={state}>
              <div className="ra-stepperTop">
                <div className="ra-stepperCircle" aria-hidden="true">
                {state === "done" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : state === "active" ? (
                  <span className="ra-spin" />
                ) : (
                  <span className="ra-stepperNum">{i + 1}</span>
                )}
                </div>

                {i < steps.length - 1 ? (
                  <div className="ra-stepperLine" data-filled={i < activeIndex ? "true" : "false"} />
                ) : (
                  <div className="ra-stepperLine" data-last="true" />
                )}
              </div>

              <div className="ra-stepperLabel">{label}</div>
            </div>
          );
        })}
      </div>

      <div className="ra-loaderBar">
        <div className="ra-loaderFill" />
      </div>

      <div className="ra-loaderMsg" key={msgIndex}>
        {message}
      </div>
    </div>
  );
}
