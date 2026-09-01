// PATH: components/dashboard/QuickStart.tsx
"use client";

import { useState } from "react";
import { WORKSPACE_TEMPLATES, WorkspaceTemplate } from "./workspaceTemplates";
import { useGatedCreate } from "@/lib/hooks/useGatedCreate";

// ---- Claymorphism theme tokens (shared with ProjectCard / CollectionsPanel / Sidebar) ----
const CLAY = {
    canvas: "#E5E5E5",
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`
        : `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`;

function BoltIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
    );
}

function TemplateCard({ template, onClick, locked }: { template: WorkspaceTemplate; onClick: () => void; locked: boolean }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: "none",
                borderRadius: 22,
                overflow: "hidden",
                background: CLAY.surface,
                cursor: "pointer",
                transition: "box-shadow 200ms ease, transform 200ms ease",
                boxShadow: hovered
                    ? "0 16px 32px rgba(0,0,0,0.12), -6px -6px 12px rgba(255,255,255,0.6), 6px 6px 14px rgba(0,0,0,0.10)"
                    : "0 8px 18px rgba(0,0,0,0.08), -5px -5px 10px rgba(255,255,255,0.55), 5px 5px 12px rgba(0,0,0,0.08)",
                transform: hovered ? "translateY(-2px)" : "none",
                display: "flex",
                flexDirection: "column",
                fontFamily: CLAY.font,
                position: "relative",
                opacity: locked ? 0.7 : 1,
            }}
        >
            {locked && (
                <div style={{
                    position: "absolute", top: 18, right: 18, zIndex: 1,
                    width: 26, height: 26, borderRadius: "50%",
                    background: CLAY.surfaceChip, display: "flex", alignItems: "center", justifyContent: "center",
                    color: CLAY.textMuted,
                    boxShadow: "-2px -2px 5px rgba(255,255,255,0.75), 2px 2px 6px rgba(0,0,0,0.14)",
                }}>
                    <LockIcon />
                </div>
            )}
            <div
                style={{
                    aspectRatio: "4/3",
                    background: "#DEDEDE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                    margin: 10,
                    borderRadius: 16,
                    boxShadow: `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`,
                }}
            >
                <img
                    src={template.thumbnail}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
            </div>

            <div style={{ padding: "6px 16px 16px", display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: CLAY.textPrimary, letterSpacing: "normal" }}>
                    {template.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 400, color: CLAY.textMuted }}>
                    {locked ? "Upgrade to start a new project" : template.description}
                </span>
            </div>
        </div>
    );
}

function BlankCanvasCard({ onClick, locked }: { onClick: () => void; locked: boolean }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: "none",
                borderRadius: 22,
                background: CLAY.surface,
                cursor: "pointer",
                transition: "box-shadow 200ms ease",
                boxShadow: hovered ? clayRaised(true) : clayRaised(false),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                minHeight: "100%",
                padding: "20px 16px",
                textAlign: "center",
                fontFamily: CLAY.font,
                opacity: locked ? 0.7 : 1,
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: CLAY.surfaceChip,
                    boxShadow: "-3px -3px 7px rgba(255,255,255,0.75), 3px 3px 8px rgba(0,0,0,0.16)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: CLAY.textPrimary,
                }}
            >
                {locked ? <LockIcon /> : <PlusIcon />}
            </div>
            <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: CLAY.textPrimary, letterSpacing: "normal", marginBottom: 2 }}>
                    Blank Canvas
                </div>
                <div style={{ fontSize: 12, fontWeight: 400, color: CLAY.textMuted }}>
                    {locked ? "Upgrade to start a new project" : "Start from scratch"}
                </div>
            </div>
        </div>
    );
}

export default function QuickStart({
    onCreateFromTemplate,
    onBlankCanvas,
}: {
    onCreateFromTemplate: (template: WorkspaceTemplate) => void;
    onBlankCanvas: () => void;
}) {
    const { guard, atProjectLimit } = useGatedCreate();

    return (
        <div style={{ marginTop: 28, fontFamily: CLAY.font }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <span style={{ color: "#22c55e", display: "inline-flex" }}>
                    <BoltIcon />
                </span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: CLAY.textPrimary, letterSpacing: "normal" }}>
                    Quick Start
                </h3>
            </div>

            <div
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 20 }}
            >
                {WORKSPACE_TEMPLATES.map((template) => (
                    <TemplateCard
                        key={template.id}
                        template={template}
                        locked={atProjectLimit}
                        onClick={() => guard(() => onCreateFromTemplate(template))}
                    />
                ))}
                <BlankCanvasCard locked={atProjectLimit} onClick={() => guard(onBlankCanvas)} />
            </div>
        </div>
    );
}