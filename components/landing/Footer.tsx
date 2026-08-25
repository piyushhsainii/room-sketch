"use client";

import { useState } from "react";

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
  canvas: "#E5E5E5",
  surface: "#EAEAEA",
  textPrimary: "#1A1A1A",
  textMuted: "#5A5A5A",
  lightShadow: "rgba(255,255,255,0.75)",
  darkShadow: "rgba(0,0,0,0.14)",
  accentText: "#4C4FBF",
  font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const FOOTER_LINKS = [
  { label: "Product", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Contact", href: "mailto:hello@roomsketch.com" },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: CLAY.canvas,
        borderTop: "none",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6), 0 -1px 0 rgba(0,0,0,0.05)`,
        padding: "28px 24px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 16,
        justifyContent: "space-between",
        fontSize: 12.5,
        fontWeight: 300,
        color: CLAY.textMuted,
        fontFamily: CLAY.font,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: CLAY.textPrimary, fontWeight: 500 }}>
        <img
          src="/room-sketch-logo.jpg"
          alt="RoomSketch"
          style={{
            width: 24, height: 24, borderRadius: 9, objectFit: "cover",
            boxShadow: `-2px -2px 5px ${CLAY.lightShadow}, 2px 2px 6px ${CLAY.darkShadow}`,
          }}
        />
        RoomSketch
      </div>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        {FOOTER_LINKS.map(link => (
          <FooterLink key={link.label} href={link.href}>{link.label}</FooterLink>
        ))}
      </div>

      <span style={{ fontSize: 10.5, color: CLAY.accentText, letterSpacing: "0.04em", fontFamily: CLAY.font }}>
        Floor plan → live 3D
      </span>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: hovered ? CLAY.textPrimary : CLAY.textMuted,
        textDecoration: "none",
        fontFamily: CLAY.font,
        transition: "color 160ms ease",
      }}
    >
      {children}
    </a>
  );
}