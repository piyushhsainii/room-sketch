"use client";

import { GENERATE, WORKSPACE } from "@/constants/content";
import type { GenerationType } from "@/lib/models";

export type GenerateOptionType = GenerationType | "workspace";

type Props = {
  selected: GenerateOptionType;
  onSelect: (type: GenerateOptionType) => void;
};

export default function GenerateOptions({ selected, onSelect }: Props) {
  const renderOnly = GENERATE.options.renderOnly;
  const renderVideo = GENERATE.options.renderVideo;

  return (
    <div className="ra-options">
      <div
        className="ra-optionCard"
        data-selected={selected === renderOnly.id ? "true" : "false"}
        onClick={() => onSelect(renderOnly.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(renderOnly.id);
        }}
      >
        <div className="ra-optionIcon">{renderOnly.icon}</div>
        <div className="ra-optionLabel">{renderOnly.label}</div>
        <div className="ra-optionDesc">{renderOnly.description}</div>
      </div>

      <div
        className="ra-optionCard"
        data-selected={selected === renderVideo.id ? "true" : "false"}
        onClick={() => onSelect(renderVideo.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(renderVideo.id);
        }}
      >
        <div className="ra-optionIcon">{renderVideo.icon}</div>
        <div className="ra-optionLabel">{renderVideo.label}</div>
        <div className="ra-optionDesc">{renderVideo.description}</div>
      </div>

      <div
        className="ra-optionCard"
        data-selected={selected === "workspace" ? "true" : "false"}
        onClick={() => onSelect("workspace")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect("workspace");
        }}
        title={WORKSPACE.buttonTooltip}
      >
        <div className="ra-optionIcon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <div className="ra-optionLabel">{WORKSPACE.buttonLabel}</div>
        <div className="ra-optionDesc">{WORKSPACE.buttonTooltip}</div>
      </div>
    </div>
  );
}
