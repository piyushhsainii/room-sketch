// UI REVAMP - frontend only, no logic changes
"use client";

/**
 * EmptyState — shown when there are no projects yet.
 * Displays a simple SVG house illustration with a CTA to start drawing.
 */

type Props = {
  onDrawFloorPlan: () => void;
};

function HouseIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Roof */}
      <path
        d="M40 12 10 36h60L40 12Z"
        fill="rgba(79,70,229,0.08)"
        stroke="#4F46E5"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* House body */}
      <rect
        x="16"
        y="36"
        width="48"
        height="32"
        rx="2"
        fill="rgba(79,70,229,0.04)"
        stroke="#4F46E5"
        strokeWidth="1.5"
      />
      {/* Door */}
      <rect
        x="33"
        y="48"
        width="14"
        height="20"
        rx="2"
        fill="rgba(79,70,229,0.12)"
        stroke="#4F46E5"
        strokeWidth="1.5"
      />
      {/* Door knob */}
      <circle cx="44" cy="58" r="1.5" fill="#4F46E5" />
      {/* Window left */}
      <rect
        x="20"
        y="42"
        width="10"
        height="10"
        rx="1.5"
        fill="rgba(14,165,233,0.08)"
        stroke="#0EA5E9"
        strokeWidth="1.2"
      />
      {/* Window right */}
      <rect
        x="50"
        y="42"
        width="10"
        height="10"
        rx="1.5"
        fill="rgba(14,165,233,0.08)"
        stroke="#0EA5E9"
        strokeWidth="1.2"
      />
      {/* Window cross left */}
      <line x1="25" y1="42" x2="25" y2="52" stroke="#0EA5E9" strokeWidth="0.8" />
      <line x1="20" y1="47" x2="30" y2="47" stroke="#0EA5E9" strokeWidth="0.8" />
      {/* Window cross right */}
      <line x1="55" y1="42" x2="55" y2="52" stroke="#0EA5E9" strokeWidth="0.8" />
      <line x1="50" y1="47" x2="60" y2="47" stroke="#0EA5E9" strokeWidth="0.8" />
    </svg>
  );
}

export default function EmptyState({ onDrawFloorPlan }: Props) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "64px 24px",
      animation: "revampFadeIn 220ms ease-out both",
    }}>
      <HouseIllustration />
      <h2 style={{
        marginTop: 24,
        fontSize: 20,
        fontWeight: 700,
        color: "#0F172A",
        lineHeight: 1.2,
      }}>
        Start your first project
      </h2>
      <p style={{
        marginTop: 8,
        fontSize: 14,
        color: "#64748B",
        maxWidth: 320,
        lineHeight: 1.5,
      }}>
        Draw a floor plan or upload one to get started
      </p>
      <button
        type="button"
        onClick={onDrawFloorPlan}
        style={{
          marginTop: 24,
          height: 44,
          padding: "0 24px",
          borderRadius: 10,
          border: "none",
          background: "#4F46E5",
          color: "white",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 2px 12px rgba(79,70,229,0.3)",
          transition: "all 120ms ease",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 18px rgba(79,70,229,0.4)";
          e.currentTarget.style.background = "#4338CA";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(79,70,229,0.3)";
          e.currentTarget.style.background = "#4F46E5";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 19l7-7 3 3-7 7H12v-3z" strokeLinejoin="round" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" strokeLinejoin="round" />
          <path d="M2 2l7.586 7.586" strokeLinecap="round" />
        </svg>
        Draw Floor Plan
      </button>
    </div>
  );
}
