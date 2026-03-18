"use client";

import { useRef, useState } from "react";
import { ERRORS, SKETCHUP, UPLOAD, UPLOAD_COMPACT } from "@/constants/content";

type UploadResponse = {
  project_id: string;
  floorplan_url: string;
  name?: string;
  status?: "uploaded" | "rendering" | "completed" | "failed";
  generation_type?: "render" | "render_video";
  created_at?: string;
};

type Props = {
  onUploaded: (result: UploadResponse) => void | Promise<void>;
  onUnauthorized?: () => void;
};

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_BYTES_SKETCHUP = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return ERRORS.invalidFileType;
  if (file.size > MAX_BYTES) return ERRORS.fileTooLarge;
  return null;
}

function validateSketchUpFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "skp") return SKETCHUP.errorInvalidFile;
  if (file.size > MAX_BYTES_SKETCHUP) return SKETCHUP.errorFileTooLarge;
  return null;
}

// Short filename: first 3 chars of base + extension
function shortName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base.slice(0, 3) + ext;
}

// ── Compact file pill shown after upload ─────────────────────────────────────
function FilePill({
  file,
  uploading,
  uploaded,
  onRemove,
}: {
  file: File
  uploading: boolean
  uploaded: boolean
  onRemove: () => void
}) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 34,
      padding: "0 10px",
      borderRadius: 8,
      border: uploaded
        ? "1px solid rgba(34,197,94,0.4)"
        : "1px solid #E2E8F0",
      background: uploaded ? "rgba(34,197,94,0.06)" : "#F8FAFC",
      fontSize: 12,
      color: uploaded ? "#16A34A" : "#374151",
      fontWeight: 500,
      flexShrink: 0,
    }}>
      {/* File icon */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>

      <span style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.02em" }}>
        {shortName(file.name)}
      </span>

      {/* Status indicator */}
      {uploading ? (
        <span style={{ fontSize: 10, color: "#6366F1" }}>•••</span>
      ) : uploaded ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}

      {/* Remove */}
      {!uploading && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            width: 16, height: 16,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: "#9CA3AF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            marginLeft: 2,
          }}
          aria-label="Remove file"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 1l8 8M9 1l-8 8"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function UploadInner({
  dragging,
  uploadMode,
  onBrowse,
}: {
  dragging: boolean
  uploadMode: "image" | "sketchup"
  onBrowse: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {/* Icon */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={dragging ? "#6366F1" : "#94A3B8"} strokeWidth="1.8"
          aria-hidden="true" style={{ flexShrink: 0 }}
        >
          {uploadMode === "sketchup" ? (
            <path d="M4 4l8 16 4-8 4 8 4-16" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <path d="M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.8 1.3A3.5 3.5 0 0 1 18.5 18" strokeLinecap="round" />
              <path d="M12 12v7" strokeLinecap="round" />
              <path d="M9.5 14.5 12 12l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
        </svg>

        {/* Text */}
        <span style={{ fontSize: 13, color: dragging ? "#6366F1" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {dragging
            ? "Drop to upload"
            : uploadMode === "sketchup"
              ? SKETCHUP.uploadHint
              : UPLOAD_COMPACT.hint}
        </span>
      </div>

      {/* Browse button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onBrowse(); }}
        style={{
          height: 28,
          padding: "0 12px",
          borderRadius: 7,
          border: "1px solid #E2E8F0",
          background: "white",
          color: "#374151",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
          transition: "border-color 150ms, background 150ms",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "#6366F1"
          e.currentTarget.style.color = "#6366F1"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "#E2E8F0"
          e.currentTarget.style.color = "#374151"
        }}
      >
        {uploadMode === "sketchup" ? "Browse .skp" : "Browse Files"}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UploadZone({ onUploaded, onUnauthorized }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sketchupRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"image" | "sketchup">("image");

  async function upload(selected: File) {
    setError("");
    setUploading(true);
    setUploadedId(null);
    try {
      const form = new FormData();
      form.set("file", selected);
      const endpoint = uploadMode === "sketchup" ? "/api/upload-sketchup" : "/api/upload";
      const res = await fetch(endpoint, { method: "POST", body: form });
      if (res.status === 401) { onUnauthorized?.(); return; }
      const body = (await res.json()) as Partial<UploadResponse> & { error?: string };
      if (!res.ok || !body.project_id) { setError(body.error ?? ERRORS.uploadFailed); return; }
      setUploadedId(body.project_id);
      await onUploaded({
        project_id: body.project_id,
        floorplan_url: body.floorplan_url ?? "",
        name: body.name,
        status: body.status,
        generation_type: body.generation_type,
        created_at: body.created_at,
      });
    } catch {
      setError(ERRORS.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  function handleFile(f: File | null) {
    if (!f) { setError(ERRORS.missingFile); return; }
    const err = uploadMode === "sketchup" ? validateSketchUpFile(f) : validateFile(f);
    if (err) { setError(err); return; }
    setFile(f);
    void upload(f);
  }

  function resetFile() {
    setFile(null);
    setError("");
    setUploadedId(null);
    if (inputRef.current) inputRef.current.value = "";
    if (sketchupRef.current) sketchupRef.current.value = "";
  }

  function switchMode(mode: "image" | "sketchup") {
    setUploadMode(mode);
    resetFile();
  }

  const activeRef = uploadMode === "sketchup" ? sketchupRef : inputRef;

  return (
    <div className="ra-uploadWrap">

      {/* ── Compact row: toggle + file pill side by side ──────────────── */}
      {/* ── Compact row: toggle + file pill ──────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
      }}>
        {/* Pill toggle */}
        <div style={{
          display: "inline-flex",
          background: "#F1F5F9",
          borderRadius: 8,
          padding: 3,
          gap: 2,
          flexShrink: 0,
        }}>
          {(["image", "sketchup"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => switchMode(mode)}
              style={{
                height: 26,
                padding: "0 12px",
                borderRadius: 6,
                border: "none",
                background: uploadMode === mode ? "white" : "transparent",
                color: uploadMode === mode ? "#1E293B" : "#94A3B8",
                fontSize: 12,
                fontWeight: uploadMode === mode ? 600 : 400,
                cursor: "pointer",
                transition: "all 150ms",
                boxShadow: uploadMode === mode ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {mode === "image" ? "Browse Files" : "SketchUp"}
            </button>
          ))}
        </div>

        {/* File pill — shown when a file is selected */}
        {file && (
          <FilePill
            file={file}
            uploading={uploading}
            uploaded={Boolean(uploadedId)}
            onRemove={resetFile}
          />
        )}

        {/* Inline error */}
        {error && !file && (
          <span style={{ fontSize: 11, color: "#EF4444" }}>{error}</span>
        )}
      </div>

      {/* ── Drop zone — only shown when no file ──────────────────────── */}
      {/* ── Drop zone — only shown when no file ──────────────────────── */}
      {!file && (
        <div
          onClick={() => { if (!uploading) activeRef.current?.click(); }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault(); e.stopPropagation(); setDragging(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          style={{
            borderRadius: 10,
            border: dragging
              ? "1.5px dashed rgba(99,102,241,0.6)"
              : "1.5px dashed #CBD5E1",
            background: dragging ? "rgba(99,102,241,0.03)" : "#FAFBFC",
            cursor: "pointer",
            transition: "border-color 150ms, background 150ms",
          }}
        >
          <UploadInner
            dragging={dragging}
            uploadMode={uploadMode}
            onBrowse={() => activeRef.current?.click()}
          />
        </div>
      )}
      {/* Hidden inputs */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.currentTarget.files?.[0] ?? null)}
      />
      <input
        ref={sketchupRef}
        type="file"
        accept=".skp"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.currentTarget.files?.[0] ?? null)}
      />
    </div>
  );
}