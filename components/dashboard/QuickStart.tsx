"use client";

import { useState } from "react";
import { WORKSPACE_TEMPLATES, WorkspaceTemplate } from "./workspaceTemplates";

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

function TemplateCard({ template, onClick }: { template: WorkspaceTemplate; onClick: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: `1px solid ${hovered ? "rgba(15,23,42,0.12)" : "rgba(15,23,42,0.08)"}`,
                borderRadius: 14,
                overflow: "hidden",
                background: "#ffffff",
                cursor: "pointer",
                transition: "box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease",
                boxShadow: hovered
                    ? "0 8px 20px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)"
                    : "0 1px 2px rgba(15,23,42,0.03)",
                transform: hovered ? "translateY(-1px)" : "none",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    aspectRatio: "4/3",
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                }}
            >
                <img
                    src={template.thumbnail}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
            </div>

            <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", letterSpacing: "-0.01em" }}>
                    {template.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>
                    {template.description}
                </span>
            </div>
        </div>
    );
}

function BlankCanvasCard({ onClick }: { onClick: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: `1.5px dashed ${hovered ? "rgba(100,116,139,0.4)" : "rgba(100,116,139,0.28)"}`,
                borderRadius: 14,
                background: hovered ? "#f1f5f9" : "#f8fafc",
                cursor: "pointer",
                transition: "background 180ms ease, border-color 180ms ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                minHeight: "100%",
                padding: "20px 16px",
                textAlign: "center",
            }}
        >
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#ffffff",
                    boxShadow: "0 2px 6px rgba(15,23,42,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0f172a",
                }}
            >
                <PlusIcon />
            </div>
            <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", letterSpacing: "-0.01em", marginBottom: 2 }}>
                    Blank Canvas
                </div>
                <div style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>
                    Start from scratch
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
    return (
        <div style={{ marginTop: 28 }}>  {/* was: padding: "0 36px", marginTop: 28 */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <span style={{ color: "#22c55e", display: "inline-flex" }}>
                    <BoltIcon />
                </span>
                <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a", letterSpacing: "-0.01em" }} className="tracking-tight">
                    Quick Start
                </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
                {WORKSPACE_TEMPLATES.map((template) => (
                    <TemplateCard key={template.id} template={template} onClick={() => onCreateFromTemplate(template)} />
                ))}
                <BlankCanvasCard onClick={onBlankCanvas} />
            </div>
        </div>
    );
}