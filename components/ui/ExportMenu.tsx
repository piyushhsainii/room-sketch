// components/ExportMenu.tsx
//
// STEP 2 — Export trigger and entry point.
//
// Explicit user action ONLY (a toolbar/menu button) — never fires on state
// change. Presents a format choice, then calls the matching exporter.
// glTF/OBJ need a live THREE.Object3D ref from your R3F canvas (see
// exportGltfObj.ts's integration note) — pass it in as `sceneRootRef`.

import React, { useState } from "react";
import * as THREE from "three";
import { FloorPlanState } from "../workspace/lib/constants";
import { exportGLTF, exportOBJ } from "../workspace/lib/export/exportgltfobj";
import { exportDXF } from "../workspace/lib/export/exportDxf";
import { exportSVG } from "../workspace/lib/export/exportsvg";


type ExportFormat = "gltf" | "obj" | "dxf" | "svg";

export function ExportMenu({
    fp,
    sceneRootRef,
}: {
    fp: FloorPlanState;
    sceneRootRef: React.RefObject<THREE.Object3D>;
}) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    async function handleExport(format: ExportFormat) {
        setOpen(false);
        try {
            if (format === "gltf") {
                if (!sceneRootRef.current) throw new Error("3D scene not ready yet");
                setBusy("Exporting glTF…");
                await exportGLTF(sceneRootRef.current, "floor-plan.glb", (stage, pct) =>
                    setBusy(`${stage} (${pct}%)`),
                );
            } else if (format === "obj") {
                if (!sceneRootRef.current) throw new Error("3D scene not ready yet");
                setBusy("Exporting OBJ…");
                exportOBJ(sceneRootRef.current, "floor-plan.obj", (stage, pct) =>
                    setBusy(`${stage} (${pct}%)`),
                );
            } else if (format === "dxf") {
                setBusy("Exporting DXF…");
                exportDXF(fp, "floor-plan.dxf");
            } else if (format === "svg") {
                setBusy("Exporting SVG…");
                exportSVG(fp, "floor-plan.svg");
            }
        } catch (err) {
            console.error("[ExportMenu] export failed:", err);
            alert(`Export failed: ${(err as Error).message}`);
        } finally {
            setBusy(null);
        }
    }

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <button
                onClick={() => setOpen((v) => !v)}
                disabled={!!busy}
                style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid rgba(100,116,139,0.3)",
                    background: "white",
                    cursor: busy ? "wait" : "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                }}
            >
                {busy ?? "Export"}
            </button>
            {open && !busy && (
                <div
                    style={{
                        position: "absolute",
                        top: "110%",
                        right: 0,
                        background: "white",
                        border: "1px solid rgba(100,116,139,0.25)",
                        borderRadius: 8,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        minWidth: 160,
                        zIndex: 50,
                        overflow: "hidden",
                    }}
                >
                    {[
                        { fmt: "gltf" as const, label: "glTF (.glb)", sub: "3D model" },
                        { fmt: "obj" as const, label: "OBJ", sub: "3D model" },
                        { fmt: "dxf" as const, label: "DXF", sub: "2D CAD" },
                        { fmt: "svg" as const, label: "SVG", sub: "2D vector" },
                    ].map((opt) => (
                        <button
                            key={opt.fmt}
                            onClick={() => handleExport(opt.fmt)}
                            style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "8px 12px",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: 13,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                            <div style={{ fontWeight: 600 }}>{opt.label}</div>
                            <div style={{ fontSize: 11, color: "rgba(100,116,139,0.7)" }}>{opt.sub}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}