"use client";

import { useEffect, useRef, useState } from "react";

export default function StartSketchingCta() {
    const [expanded, setExpanded] = useState(false);
    const container = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const signIn = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (!expanded) return;
        signIn.current?.focus({ preventScroll: true });
        const dismiss = (event: PointerEvent) => {
            if (!container.current?.contains(event.target as Node)) setExpanded(false);
        };
        document.addEventListener("pointerdown", dismiss);
        return () => document.removeEventListener("pointerdown", dismiss);
    }, [expanded]);

    return (
        <div
            ref={container}
            className={`inline-flex min-h-[47px] max-w-full items-center rounded-full bg-black text-[14px] font-normal tracking-[-0.01em] text-white transition-[width] duration-200 motion-reduce:transition-none ${expanded ? "w-[290px] p-1" : "w-[246px]"}`}
            style={{ boxShadow: "-5px -5px 10px rgba(155,155,155,0.2), 5px 5px 14px rgba(0,0,0,0.4)" }}
            onKeyDown={event => {
                if (event.key === "Escape") {
                    setExpanded(false);
                    requestAnimationFrame(() => trigger.current?.focus());
                }
            }}
        >
            {expanded ? (
                <div role="group" aria-label="Choose how to get started" className="flex w-full items-center gap-1">
                    <a
                        ref={signIn}
                        href="/login?redirectTo=/dashboard"
                        className="flex min-h-[39px] flex-1 items-center justify-center rounded-full px-4 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
                    >
                        Sign in
                    </a>
                    <a
                        href="/projects/new"
                        className="group flex min-h-[39px] flex-[1.6] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-black hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-black"
                    >
                        Start sketching <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">→</span>
                    </a>
                </div>
            ) : (
                <button
                    ref={trigger}
                    type="button"
                    aria-expanded={false}
                    onClick={() => setExpanded(true)}
                    className="group flex min-h-[47px] w-full items-center justify-center gap-2 rounded-full px-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
                >
                    Start sketching free
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">→</span>
                </button>
            )}
        </div>
    );
}
