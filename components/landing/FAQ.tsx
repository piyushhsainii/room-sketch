"use client";

import { useState } from "react";
import { isWaitlistMode } from "@/lib/flags";

interface FaqItem {
    q: string;
    a: string;
}

const FAQS: FaqItem[] = [
    {
        q: "What is RoomSketch?",
        a: "RoomSketch is a browser-based floor plan editor. Draw rooms, walls, doors and windows on a 2D canvas, and a live 3D model updates the instant you draw — no exporting, no separate 3D tool, no re-modeling.",
    },
    {
        q: "Is it free to use?",
        a: "Yes. The Free plan includes one project with the full floor plan editor, live 3D preview, and undo history — no credit card required. Walk Mode and full scene finishes are available on Pro.",
    },
    {
        q: "Do I need to install anything?",
        a: "No. RoomSketch runs entirely in your browser — no plugins, downloads, or software installs, for you or anyone you share a plan with.",
    },
    {
        q: "What's the difference between Free, Pro, and Studio?",
        a: "Free gives you one project with the core editor and 3D preview. Pro unlocks unlimited projects, Walk Mode, full scene finishes, and client share links. Studio adds a team workspace for agencies and real estate teams working across multiple projects.",
    },
    {
        q: "Can I share a floor plan with a client?",
        a: "On Pro and Studio, you can generate a share link so clients can open your model on any device — no account or plugin needed on their end.",
    },
    {
        q: "Is my floor plan data private?",
        a: "Your projects are private by default and only visible to you. You can optionally list a project in the community gallery if you want to make it public.",
    },
    ...(isWaitlistMode
        ? [
            {
                q: "When will RoomSketch be available?",
                a: "We're onboarding new users in small batches. Join the waitlist and we'll email you the moment your access is ready.",
            },
        ]
        : []),
];

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
    canvas: "#E5E5E5",
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    accentText: "#4C4FBF",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 7px ${CLAY.darkShadow}, inset -3px -3px 7px ${CLAY.lightShadow}`
        : `-4px -4px 9px ${CLAY.lightShadow}, 4px 4px 10px ${CLAY.darkShadow}`;

// NOTE: FAQS is assumed to be defined/imported elsewhere in your project,
// same as in the original file — left untouched here.

export default function Faq() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <section
            id="faq"
            style={{ padding: "96px 24px", background: CLAY.canvas, fontFamily: CLAY.font }}
        >
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
                <div style={{ marginBottom: 48, textAlign: "center" }}>
                    <h2
                        style={{
                            fontFamily: CLAY.font,
                            fontSize: "clamp(1.9rem, 2.6rem, 2.6rem)",
                            fontWeight: 500,
                            letterSpacing: "-0.01em",
                            color: CLAY.textPrimary,
                            lineHeight: 1.1,
                            margin: 0,
                        }}
                    >
                        FAQ
                    </h2>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {FAQS.map((item, i) => {
                        const isOpen = openIndex === i;
                        const isHovered = hoveredIndex === i;
                        return (
                            <div
                                key={item.q}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                style={{
                                    borderRadius: 18,
                                    background: CLAY.surface,
                                    boxShadow: isOpen
                                        ? clayRaised(true)
                                        : isHovered
                                            ? clayRaised(false)
                                            : `-2px -2px 5px ${CLAY.lightShadow}, 2px 2px 6px ${CLAY.darkShadow}`,
                                    transition: "box-shadow 200ms ease",
                                    overflow: "hidden",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(isOpen ? null : i)}
                                    aria-expanded={isOpen}
                                    style={{
                                        width: "100%", display: "flex", alignItems: "center",
                                        justifyContent: "space-between", gap: 20,
                                        padding: "18px 20px", textAlign: "left",
                                        border: "none", background: "transparent", cursor: "pointer",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: CLAY.font,
                                            fontSize: "1.05rem",
                                            fontWeight: 500,
                                            letterSpacing: "normal",
                                            lineHeight: 1.4,
                                            color: CLAY.textPrimary,
                                        }}
                                    >
                                        {item.q}
                                    </span>
                                    <span
                                        style={{
                                            flexShrink: 0, width: 30, height: 30, borderRadius: "50%",
                                            background: CLAY.surfaceChip,
                                            color: CLAY.accentText,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            boxShadow: isOpen ? clayRaised(true) : clayRaised(false),
                                            transition: "transform 200ms ease, box-shadow 200ms ease",
                                            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                                        }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        </svg>
                                    </span>
                                </button>
                                <div
                                    style={{
                                        display: "grid",
                                        fontFamily: CLAY.font,
                                        letterSpacing: "normal",
                                        overflow: "hidden",
                                        transition: "grid-template-rows 300ms ease-out",
                                        gridTemplateRows: isOpen ? "1fr" : "0fr",
                                    }}
                                >
                                    <div style={{ overflow: "hidden" }}>
                                        <p
                                            style={{
                                                fontSize: 15.5, fontWeight: 400, letterSpacing: "normal",
                                                color: CLAY.textMuted, lineHeight: 1.7,
                                                margin: 0, padding: "0 20px 18px 20px",
                                            }}
                                        >
                                            {item.a}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}