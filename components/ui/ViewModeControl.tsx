"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuRow, menuSelected, menuSurface } from "./editor-menu-theme";

const OPTIONS = [
    { value: "single", label: "Single" },
    { value: "stacked", label: "Stacked" },
    { value: "stacked-full", label: "Stacked full" },
] as const;

type ViewMode = (typeof OPTIONS)[number]["value"];

export default function ViewModeControl({
    id, viewMode, onSetViewMode, onClose, dockRef, triggerRef,
}: {
    id: string;
    viewMode: ViewMode;
    onSetViewMode: (mode: ViewMode) => void;
    onClose: () => void;
    dockRef: RefObject<HTMLDivElement | null>;
    triggerRef: RefObject<HTMLButtonElement | null>;
}) {
    const selectedRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        selectedRef.current?.focus({ preventScroll: true });
        function handleOutside(event: PointerEvent) {
            if (event.target instanceof Node && !dockRef.current?.contains(event.target)) onClose();
        }
        document.addEventListener("pointerdown", handleOutside, true);
        return () => document.removeEventListener("pointerdown", handleOutside, true);
    }, [dockRef, onClose]);

    function closeAndRestoreFocus() {
        triggerRef.current?.focus({ preventScroll: true });
        onClose();
    }

    return (
        <div
            id={id}
            role="group"
            aria-label="Floor view options"
            onKeyDown={event => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                closeAndRestoreFocus();
            }}
            className={cn(menuSurface, "absolute bottom-full left-1/2 z-30 mb-2 grid w-44 -translate-x-1/2 gap-1")}
        >
            {OPTIONS.map(option => {
                const selected = viewMode === option.value;
                return (
                    <button
                        key={option.value}
                        ref={selected ? selectedRef : undefined}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => { onSetViewMode(option.value); closeAndRestoreFocus(); }}
                        className={cn(menuRow, "flex items-center justify-between text-left", selected ? menuSelected : "text-neutral-700 hover:bg-neutral-50")}
                    >
                        {option.label}
                        {selected && <Check aria-hidden="true" size={16} />}
                    </button>
                );
            })}
        </div>
    );
}
