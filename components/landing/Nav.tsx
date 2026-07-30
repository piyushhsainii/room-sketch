"use client";

import { useState } from "react";
import { isWaitlistMode } from "@/lib/flags";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#capabilities", label: "Capabilities" },
  ...(!isWaitlistMode ? [{ href: "#pricing", label: "Pricing" }] : []),
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        className="
          fixed z-[200] top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2
          h-14 px-4 md:px-2 md:pl-6
          flex items-center justify-between md:justify-start md:gap-10
          rounded-full shadow-[0_4px_20px_rgba(18,33,62,0.10)]
          bg-paper/95 backdrop-blur-md
        "
      >
        <div className="flex items-center gap-2 font-display text-[19px] tracking-tight text-ink shrink-0">
          <img src="/room-sketch-logo.jpg" alt="" className="w-10 h-10 select-none mix-blend-multiply rounded-full hover:scale-125 transition-all duration-200 hover:rotate-12" />
          <img src="/room-sketch-text.jpg" alt="" className="w-24 select-none mix-blend-multiply rounded-full" />
        </div>

        <div className="hidden md:flex items-center gap-7">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13.5px] text-graphite hover:text-ink transition-colors whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#get-started"
          className="hidden md:inline-flex items-center whitespace-nowrap text-[13px] font-medium tracking-[0.02em] text-white rounded-full px-5 py-2.5 ml-auto transition-colors hover:bg-[#0E0E10]"
          style={{ backgroundColor: "#12213E" }}
        >
          Get started
        </a>

        {/* Burger toggle — mobile only */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="md:hidden relative w-9 h-9 flex items-center justify-center shrink-0 ml-2"
        >
          <span
            className={`absolute h-[2px] w-5 rounded-full bg-ink transition-all duration-300 ${open ? "rotate-45" : "-translate-y-[6px]"
              }`}
          />
          <span
            className={`absolute h-[2px] w-5 rounded-full bg-ink transition-all duration-300 ${open ? "opacity-0" : "opacity-100"
              }`}
          />
          <span
            className={`absolute h-[2px] w-5 rounded-full bg-ink transition-all duration-300 ${open ? "-rotate-45" : "translate-y-[6px]"
              }`}
          />
        </button>
      </nav>

      {/* Mobile menu panel */}
      <div
        className={`
          md:hidden fixed z-[190] left-4 right-4 top-[76px]
          rounded-[20px] bg-paper/95 backdrop-blur-md
          shadow-[0_4px_20px_rgba(18,33,62,0.10)]
          transition-all duration-200 origin-top
          ${open ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"}
        `}
      >
        <div className="flex flex-col py-3">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-6 py-3 text-[14px] text-graphite hover:text-ink transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#get-started"
            onClick={() => setOpen(false)}
            className="mx-4 mt-2 text-center text-[13px] font-medium tracking-[0.02em] text-white rounded-full px-5 py-3 transition-colors"
            style={{ backgroundColor: "#12213E" }}
          >
            Get started
          </a>
        </div>
      </div>
    </>
  );
}