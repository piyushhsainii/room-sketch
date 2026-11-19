"use client";

import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

type DockItem = {
    id: string;
    title: string;
    icon: ReactNode;
    onClick: () => void;
    controls?: string;
    buttonRef?: Ref<HTMLButtonElement>;
};

export function FloatingDock({ items, activeId }: { items: DockItem[]; activeId?: string | null }) {
    return (
        <div role="group" aria-label="Editor panels" className="flex items-center gap-1 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-sm">
            {items.map(item => {
                const active = item.id === activeId;
                return (
                    <button
                        key={item.id}
                        ref={item.buttonRef}
                        type="button"
                        aria-label={item.title}
                        aria-expanded={active}
                        aria-controls={item.controls}
                        onClick={item.onClick}
                        className={cn(
                            "group relative grid size-11 place-items-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
                            active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
                        )}
                    >
                        <span aria-hidden="true" className="grid size-5 place-items-center">{item.icon}</span>
                        {!active && (
                            <span aria-hidden="true" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 shadow-sm md:group-hover:block md:group-focus-visible:block">
                                {item.title}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
