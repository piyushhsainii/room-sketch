"use client";

import { isWaitlistMode } from "@/lib/flags";

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
  canvas: "#E5E5E5",
  textPrimary: "#1A1A1A",
  textMuted: "#5A5A5A",
  font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

// The panel itself keeps a dark accent — same role as the "Save" button's
// beige gradient or a card's indigo tint elsewhere: one deliberate contrast
// point against the low-saturation clay canvas, not a second competing
// theme. Its shadow language still follows the clay dual-shadow system,
// just tuned for a dark surface (soft highlight, deep drop) instead of the
// light "-6/-6 light, 6/6 dark" pairing used on light clay panels.
const PANEL_BG = "#12213E";
const PANEL_LIGHT = "rgba(255,255,255,0.06)";
const PANEL_DARK = "rgba(0,0,0,0.35)";

export default function FinalCta() {
  return (
    <div style={{ padding: "0 24px 80px", background: CLAY.canvas, fontFamily: CLAY.font }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          borderRadius: 28,
          background: PANEL_BG,
          position: "relative",
          overflow: "hidden",
          padding: "56px 32px",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 48,
          alignItems: "center",
          boxShadow: `-6px -6px 14px ${PANEL_LIGHT}, 10px 14px 28px ${PANEL_DARK}`,
        }}
        className="max-md:grid-cols-1"
      >
        {/* corner glow — single source of truth, blends into the ink panel */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px]"
          style={{
            background:
              "radial-gradient(circle, rgba(91,127,214,0.28) 0%, rgba(91,127,214,0.12) 35%, transparent 70%)",
          }}
        />
        {/* faint secondary glow, lower-left, keeps the panel from reading as flat */}
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 w-[320px] h-[320px]"
          style={{
            background: "radial-gradient(circle, rgba(91,127,214,0.1) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10">
          <span style={{ fontFamily: CLAY.font, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 12 }}>
            {isWaitlistMode ? "Not yet public" : "No credit card required"}
          </span>
          <h2 style={{ fontFamily: CLAY.font, fontSize: "clamp(1.9rem, 2.6rem, 2.6rem)", fontWeight: 500, letterSpacing: "-0.01em", color: "#ffffff", lineHeight: 1.1, margin: "0 0 12px" }}>
            {isWaitlistMode ? (
              <>Be first to walk your <em style={{ fontStyle: "italic", color: "#8FA8E8" }}>plan.</em></>
            ) : (
              <>Your first floor plan is <em style={{ fontStyle: "italic", color: "#8FA8E8" }}>free.</em></>
            )}
          </h2>
          <p style={{ fontFamily: CLAY.font, fontSize: 15, fontWeight: 300, color: "rgba(255,255,255,0.55)", lineHeight: 1.75, maxWidth: 380, margin: 0 }}>
            {isWaitlistMode
              ? "We're onboarding new users in small batches. Join the waitlist and we'll email you the moment you're in."
              : "Open the editor, draw a room, and walk through it in 3D in under two minutes."}
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-2.5">
          <PrimaryLink href={isWaitlistMode ? "#waitlist" : "/dashboard"}>
            {isWaitlistMode ? "Join waitlist →" : "Start sketching free →"}
          </PrimaryLink>
          {!isWaitlistMode && (
            <SecondaryLink href="#">See example projects</SecondaryLink>
          )}
          <span style={{ fontFamily: CLAY.font, fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", letterSpacing: "0.04em" }}>
            {isWaitlistMode ? "No spam · unsubscribe anytime" : "Free · no credit card · 1 project included"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        fontFamily: CLAY.font,
        background: "#EAEAEA",
        color: "#12213E",
        fontSize: 14, fontWeight: 500,
        padding: "13px 32px", borderRadius: 999,
        textAlign: "center", whiteSpace: "nowrap",
        boxShadow: "-3px -3px 7px rgba(255,255,255,0.6), 3px 3px 8px rgba(0,0,0,0.35)",
        transition: "box-shadow 180ms ease, transform 180ms ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "inset 2px 2px 5px rgba(0,0,0,0.18), inset -2px -2px 5px rgba(255,255,255,0.7)";
        e.currentTarget.style.transform = "translateY(1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "-3px -3px 7px rgba(255,255,255,0.6), 3px 3px 8px rgba(0,0,0,0.35)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </a>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        fontFamily: CLAY.font,
        background: "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.7)",
        border: "none",
        fontSize: 13.5, fontWeight: 400,
        padding: "12px 24px", borderRadius: 999,
        textAlign: "center", whiteSpace: "nowrap",
        boxShadow: "inset 1px 1px 3px rgba(0,0,0,0.25), inset -1px -1px 3px rgba(255,255,255,0.05)",
        transition: "background 180ms ease, color 180ms ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.12)";
        e.currentTarget.style.color = "#ffffff";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = "rgba(255,255,255,0.7)";
      }}
    >
      {children}
    </a>
  );
}