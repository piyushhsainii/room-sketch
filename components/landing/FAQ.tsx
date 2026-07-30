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

export default function Faq() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 px-6 md:px-10 bg-paper border-b border-line">
            <div className="max-w-[760px] mx-auto">
                <div className="reveal mb-12 text-center">
                    <span className="font-mono text-[10px] font-medium text-blue uppercase tracking-[0.1em] block mb-3">
                        FAQ
                    </span>
                    <h2 className="font-display text-[1.9rem] md:text-[2.6rem] tracking-[-0.025em] text-ink leading-[1.1]">
                        Questions, <em className="italic">answered.</em>
                    </h2>
                </div>

                <div className="reveal border-t border-line">
                    {FAQS.map((item, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div key={item.q} className="border-b border-line">
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(isOpen ? null : i)}
                                    aria-expanded={isOpen}
                                    className="w-full flex items-center justify-between gap-6 py-5 text-left"
                                >
                                    <span className="font-display text-[1.05rem] text-ink tracking-[-0.01em] leading-snug">
                                        {item.q}
                                    </span>
                                    <span
                                        className="flex-none w-7 h-7 rounded-full border border-line-strong flex items-center justify-center text-blue transition-transform duration-200"
                                        style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                        </svg>
                                    </span>
                                </button>
                                <div
                                    className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
                                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                                >
                                    <div className="overflow-hidden">
                                        <p className="text-[13.5px] font-light text-graphite leading-[1.75] tracking-[-0.005em] pb-5 pr-12">
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