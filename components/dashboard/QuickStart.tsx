// PATH: components/dashboard/QuickStart.tsx
"use client";

import { dashboardTheme as CLAY } from "@/components/dashboard/dashboard-theme";

import { useState } from "react";
import { WORKSPACE_TEMPLATES, WorkspaceTemplate } from "./workspaceTemplates";
import { useGatedCreate } from "@/lib/hooks/useGatedCreate";

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

function TemplateCard({ template, onClick }: { template: WorkspaceTemplate; onClick: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: `1px solid ${CLAY.border}`,
                borderRadius: 16,
                overflow: "hidden",
                background: CLAY.surface,
                cursor: "pointer",
                transition: "box-shadow 200ms ease, transform 200ms ease",
                boxShadow: "none",
                transform: hovered ? "translateY(-2px)" : "none",
                display: "flex",
                flexDirection: "column",
                fontFamily: CLAY.font,
                textAlign: "left",
                padding: 0,
            }}
        >
            <span
                style={{
                    aspectRatio: "4/3",
                    background: CLAY.surfaceChip,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                    margin: 10,
                    borderRadius: 16,
                    boxShadow: "none",
                }}
            >
                <img
                    src={template.thumbnail}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
            </span>

            <span style={{ padding: "6px 16px 16px", display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: CLAY.textPrimary, letterSpacing: "normal" }}>
                    {template.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 400, color: CLAY.textMuted }}>
                    {template.description}
                </span>
            </span>
        </button>
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
                border: `1px solid ${CLAY.border}`,
                borderRadius: 16,
                background: CLAY.surface,
                cursor: "pointer",
                transition: "box-shadow 200ms ease",
                boxShadow: "none",
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
                    border: `1px solid ${CLAY.border}`,
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
                <span style={{ color: CLAY.textMuted, display: "inline-flex" }}>
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
                        onClick={() => onCreateFromTemplate(template)}
                    />
                ))}
                <BlankCanvasCard locked={atProjectLimit} onClick={() => guard(onBlankCanvas)} />
            </div>
        </div>
    );
}
