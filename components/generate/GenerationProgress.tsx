"use client";

import { GENERATE } from "@/constants/content";

type Props = {
  stepIndex: number;
};

export default function GenerationProgress({ stepIndex }: Props) {
  return (
    <div className="ra-genProgress">
      <div className="ra-genBar">
        <div className="ra-genFill" />
      </div>

      <div className="ra-stepRow">
        {GENERATE.steps.map((label, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
          return (
            <div key={label} className="ra-step" data-state={state}>
              <span className="ra-stepDot" aria-hidden="true" />
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
          {GENERATE.progressHeadline}
        </div>
        <div style={{ marginTop: 4, color: "var(--color-text-secondary)", fontSize: 12 }}>
          {GENERATE.progressSubtext}
        </div>
      </div>
    </div>
  );
}
