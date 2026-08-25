"use client";

import { useState } from "react";
import { isWaitlistMode } from "@/lib/flags";

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
  surface: "#EAEAEA",
  surfaceChip: "#F5F5F5",
  textPrimary: "#1A1A1A",
  textMuted: "#5A5A5A",
  lightShadow: "rgba(255,255,255,0.75)",
  darkShadow: "rgba(0,0,0,0.14)",
  font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
  pressed
    ? `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`
    : `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`;

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#capabilities", label: "Capabilities" },
  ...(!isWaitlistMode ? [{ href: "#pricing", label: "Pricing" }] : []),
  ...(!isWaitlistMode ? [{ href: "/community", label: "Community" }] : []),
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [mobileCtaHovered, setMobileCtaHovered] = useState(false);

  return (
    <>
      <nav
        className="fixed z-[200] top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 h-16 px-4 md:px-3 md:pl-6 flex items-center justify-between md:justify-start md:gap-10 rounded-full"
        style={{
          background: CLAY.surface,
          boxShadow: clayRaised(false),
          fontFamily: CLAY.font,
        }}
      >
        <div className="flex items-center gap-2 shrink-0" style={{ fontSize: 19, letterSpacing: "normal", color: CLAY.textPrimary }}>
          <img src="/room-sketch-logo-removebg-preview.png" alt="" className="w-10 h-10 select-none mix-blend-multiply rounded-full hover:scale-110 transition-all duration-200" />
          <img src="/room-sketch-text.jpg" alt="" className="w-24 select-none mix-blend-multiply rounded-full" />
        </div>

        <div className="hidden md:flex items-center gap-7">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href}>{link.label}</NavLink>
          ))}
        </div>

        <a
          href="#get-started"
          onMouseEnter={() => setCtaHovered(true)}
          onMouseLeave={() => setCtaHovered(false)}
          className="hidden md:inline-flex items-center whitespace-nowrap ml-auto"
          style={{
            fontFamily: CLAY.font,
            fontSize: 13, fontWeight: 500, letterSpacing: "0.02em",
            color: CLAY.textPrimary,
            background: CLAY.surfaceChip,
            borderRadius: 999, padding: "10px 22px",
            boxShadow: ctaHovered ? clayRaised(true) : clayRaised(false),
            transition: "box-shadow 180ms ease",
          }}
        >
          Get started
        </a>

        {/* Burger toggle — mobile only */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="md:hidden relative w-10 h-10 flex items-center justify-center shrink-0 ml-2 rounded-full"
          style={{ background: open ? CLAY.surfaceChip : "transparent", boxShadow: open ? clayRaised(true) : "none", transition: "box-shadow 180ms ease, background 180ms ease" }}
        >
          <span
            className="absolute h-[2px] w-5 rounded-full transition-all duration-300"
            style={{ background: CLAY.textPrimary, transform: open ? "rotate(45deg)" : "translateY(-6px)" }}
          />
          <span
            className="absolute h-[2px] w-5 rounded-full transition-all duration-300"
            style={{ background: CLAY.textPrimary, opacity: open ? 0 : 1 }}
          />
          <span
            className="absolute h-[2px] w-5 rounded-full transition-all duration-300"
            style={{ background: CLAY.textPrimary, transform: open ? "rotate(-45deg)" : "translateY(6px)" }}
          />
        </button>
      </nav>

      {/* Mobile menu panel */}
      <div
        className={`md:hidden fixed z-[190] left-4 right-4 top-[80px] rounded-[24px] transition-all duration-200 origin-top ${open ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"
          }`}
        style={{
          background: CLAY.surface,
          boxShadow: clayRaised(false),
          fontFamily: CLAY.font,
        }}
      >
        <div className="flex flex-col py-3">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-6 py-3 transition-colors"
              style={{ fontFamily: CLAY.font, fontSize: 14, fontWeight: 400, color: CLAY.textMuted }}
              onMouseEnter={e => (e.currentTarget.style.color = CLAY.textPrimary)}
              onMouseLeave={e => (e.currentTarget.style.color = CLAY.textMuted)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#get-started"
            onClick={() => setOpen(false)}
            onMouseEnter={() => setMobileCtaHovered(true)}
            onMouseLeave={() => setMobileCtaHovered(false)}
            className="mx-4 mt-2 text-center"
            style={{
              fontFamily: CLAY.font,
              fontSize: 13, fontWeight: 500, letterSpacing: "0.02em",
              color: CLAY.textPrimary,
              background: CLAY.surfaceChip,
              borderRadius: 999, padding: "12px 20px",
              boxShadow: mobileCtaHovered ? clayRaised(true) : clayRaised(false),
              transition: "box-shadow 180ms ease",
            }}
          >
            Get started
          </a>
        </div>
      </div>
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: CLAY.font,
        fontSize: 14, fontWeight: 400, letterSpacing: "normal",
        color: hovered ? CLAY.textPrimary : CLAY.textMuted,
        transition: "color 160ms ease",
      }}
    >
      {children}
    </a>
  );
}