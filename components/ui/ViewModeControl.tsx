"use client";

import { useState, useRef, useEffect } from "react";

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    accentSoft: "rgba(99,102,241,0.14)",
    accentText: "#4C4FBF",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 7px ${CLAY.darkShadow}, inset -3px -3px 7px ${CLAY.lightShadow}`
        : `-3px -3px 7px ${CLAY.lightShadow}, 3px 3px 8px ${CLAY.darkShadow}`;

const OPTIONS: { value: 'single' | 'stacked' | 'stacked-full'; label: string }[] = [
    { value: 'single', label: 'Single' },
    { value: 'stacked', label: 'Stacked' },
    { value: 'stacked-full', label: 'Stacked full' },
];

export default function ViewModeControl({
    open,
    viewMode,
    onSetViewMode,
    onClose,
}: {
    open: boolean;
    viewMode: 'single' | 'stacked' | 'stacked-full';
    onSetViewMode: (mode: 'single' | 'stacked' | 'stacked-full') => void;
    onClose: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredValue, setHoveredValue] = useState<string | null>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        if (open) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            ref={containerRef}
            style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 30,
                minWidth: 160,
                borderRadius: 18,
                background: CLAY.surface,
                boxShadow: `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`,
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                fontFamily: CLAY.font,
            }}
        >
            {/* Connector tab — same surface color, bridges the small gap
                down to the dock so the popover reads as growing out of it
                rather than floating as a separate disconnected panel. */}
            <div
                style={{
                    position: "absolute",
                    bottom: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 16,
                    height: 8,
                    background: CLAY.surface,
                }}
            />

            {OPTIONS.map(opt => {
                const isSelected = viewMode === opt.value;
                const isHovered = hoveredValue === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => { onSetViewMode(opt.value); onClose(); }}
                        onMouseEnter={() => setHoveredValue(opt.value)}
                        onMouseLeave={() => setHoveredValue(null)}
                        style={{
                            display: "flex", alignItems: "center", gap: 9,
                            width: "100%", padding: "9px 12px", borderRadius: 12,
                            border: "none",
                            background: isSelected ? CLAY.accentSoft : isHovered ? CLAY.surfaceChip : "transparent",
                            color: isSelected ? CLAY.accentText : CLAY.textPrimary,
                            fontSize: 13, fontWeight: isSelected ? 500 : 400,
                            fontFamily: CLAY.font,
                            cursor: "pointer", textAlign: "left", whiteSpace: "nowrap",
                            boxShadow: isSelected ? clayRaised(true) : "none",
                            transition: "background 160ms ease, box-shadow 160ms ease, color 160ms ease",
                        }}
                    >
                        <span style={{
                            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                            background: isSelected ? CLAY.accentText : "transparent",
                            border: isSelected ? "none" : `1px solid ${CLAY.textMuted}`,
                            flexShrink: 0,
                        }} />
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}