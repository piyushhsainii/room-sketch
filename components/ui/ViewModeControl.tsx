"use client";

import { useState, useRef, useEffect } from "react";

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
                bottom: "calc(100% + 10px)",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 30,
                minWidth: 140,
                borderRadius: 10,
                background: "#ffffff",
                boxShadow: "0 8px 28px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)",
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 1,
            }}
        >
            {OPTIONS.map(opt => {
                const isSelected = viewMode === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => { onSetViewMode(opt.value); onClose(); }}
                        style={{
                            display: "flex", alignItems: "center", gap: 8,
                            width: "100%", padding: "7px 10px", borderRadius: 6,
                            border: "none", background: "transparent",
                            color: "rgba(15,15,15,0.85)", fontSize: 13, fontWeight: isSelected ? 600 : 400,
                            cursor: "pointer", textAlign: "left", whiteSpace: "nowrap",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(15,15,15,0.05)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                        <span style={{
                            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                            background: isSelected ? "#111111" : "transparent",
                            border: isSelected ? "none" : "1px solid rgba(15,15,15,0.25)",
                            flexShrink: 0,
                        }} />
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}