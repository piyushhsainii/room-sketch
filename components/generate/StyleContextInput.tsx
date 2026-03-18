"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STYLE_CONTEXT } from "@/constants/content";

export type StyleContextInputProps = {
  value: string;
  onChange: (value: string) => void;
  fileNamePreview?: string;
};

type Preset = (typeof STYLE_CONTEXT.presets)[number];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function truncateFilename(name: string): string {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base.slice(0, 3) + ext;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function PaletteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 17.5c-2.5 0-4.5-1-4.5-2.5h9c0 1.5-2 2.5-4.5 2.5z"
        fill="currentColor" stroke="none" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 200ms ease",
        flexShrink: 0,
      }}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Auto-resize textarea hook ─────────────────────────────────────────────────

function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Reset height to auto first so shrinking works
    el.style.height = "auto"
    // Set to scrollHeight so it grows with content
    el.style.height = `${Math.max(el.scrollHeight, 72)}px`
  }, [value])

  return ref
}

// ── Quick Style Selector ──────────────────────────────────────────────────────

function QuickStyleSelector({
  presets,
  activeId,
  onSelect,
}: {
  presets: readonly Preset[]
  activeId: string | null
  onSelect: (preset: Preset | null) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const activePreset = presets.find((p) => p.id === activeId) ?? null

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 26,
          padding: "0 9px",
          borderRadius: 7,
          border: activePreset
            ? "1px solid rgba(99,102,241,0.45)"
            : "1px solid #E2E8F0",
          background: activePreset
            ? "rgba(99,102,241,0.06)"
            : "#F8FAFC",
          color: activePreset ? "rgb(99,102,241)" : "#64748B",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 150ms",
          whiteSpace: "nowrap",
        }}
      >
        <PaletteIcon />
        <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>
          {activePreset ? activePreset.label : STYLE_CONTEXT.presetLabel}
        </span>
        <ChevronIcon open={open} />
      </button>

      {/* Dropdown — opens downward below the toolbar */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 50,
          background: "white",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
          padding: "6px 6px",
          minWidth: 220,
          maxWidth: 280,
          display: "flex",
          flexWrap: "wrap",
          gap: 5,
          animation: "styleDropIn 160ms ease both",
        }}>
          <style>{`
            @keyframes styleDropIn {
              from { opacity:0; transform:translateY(-4px) scale(0.97); }
              to   { opacity:1; transform:translateY(0)   scale(1); }
            }
            @keyframes chipIn {
              from { opacity:0; transform:scale(0.85); }
              to   { opacity:1; transform:scale(1); }
            }
          `}</style>

          {/* Clear */}
          {activePreset && (
            <button
              type="button"
              onClick={() => { onSelect(null); setOpen(false) }}
              style={{
                ...chipBase(false),
                animationName: "chipIn",
                animationDuration: "120ms",
                animationFillMode: "both",
                color: "#EF4444",
                borderColor: "rgba(239,68,68,0.3)",
              }}
            >
              ✕ Clear
            </button>
          )}

          {presets.map((preset, i) => {
            const active = preset.id === activeId
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => { onSelect(active ? null : preset); setOpen(false) }}
                style={{
                  ...chipBase(active),
                  animationName: "chipIn",
                  animationDuration: "120ms",
                  animationDelay: `${i * 22}ms`,
                  animationFillMode: "both",
                }}
              >
                {active && (
                  <span style={{ marginRight: 3, display: "inline-flex" }}>
                    <CheckIcon />
                  </span>
                )}
                {preset.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function chipBase(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 26,
    padding: "0 10px",
    borderRadius: 99,
    border: active ? "1px solid rgba(99,102,241,0.6)" : "1px solid #E2E8F0",
    background: active ? "rgba(99,102,241,0.08)" : "#F8FAFC",
    color: active ? "rgb(79,82,221)" : "#475569",
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 120ms",
    boxShadow: active ? "0 0 0 2px rgba(99,102,241,0.12)" : "none",
  }
}

// ── File Preview Pill ─────────────────────────────────────────────────────────

function FilePill({ name }: { name: string }) {
  const short = truncateFilename(name)
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      height: 26,
      padding: "0 9px",
      borderRadius: 7,
      border: "1px solid #E2E8F0",
      background: "#F8FAFC",
      color: "#475569",
      fontSize: 12,
      fontWeight: 500,
      flexShrink: 0,
      userSelect: "none",
    }}>
      <span style={{ color: "#6366F1" }}><FileIcon /></span>
      <span style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.02em" }}>
        {short}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StyleContextInput({
  value,
  onChange,
  fileNamePreview,
}: StyleContextInputProps) {
  const charLimit = STYLE_CONTEXT.charLimit
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const textareaRef = useAutoResize(value)

  const inferredPresetId = useMemo<string | null>(() => {
    const found = STYLE_CONTEXT.presets.find((p) => p.prompt === value)
    return found?.id ?? null
  }, [value])

  const activePresetId = selectedPreset ?? inferredPresetId

  useEffect(() => {
    if (isFocused || value.length > 0) return
    const len = STYLE_CONTEXT.placeholders.length
    if (len === 0) return
    const interval = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % len)
    }, 3000)
    return () => window.clearInterval(interval)
  }, [isFocused, value.length])

  const placeholder =
    STYLE_CONTEXT.placeholders[
    clamp(placeholderIndex, 0, STYLE_CONTEXT.placeholders.length - 1)
    ] ?? ""

  const showActive = value.length >= 20 || Boolean(activePresetId)

  function handlePresetSelect(preset: Preset | null) {
    if (!preset) {
      setSelectedPreset(null)
      onChange("")
    } else {
      setSelectedPreset(preset.id)
      onChange(preset.prompt)
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 760, margin: "16px auto 0" }}>

      {/* ── Textarea — full width, auto-height, no manual resize ─────────── */}
      <div style={{ position: "relative" }}>
        {/* Top row: label + char counter */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
            {STYLE_CONTEXT.textareaLabel}
          </label>
          <span style={{
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
            color: value.length >= 490
              ? "#EF4444"
              : value.length >= 400
                ? "#F59E0B"
                : "#9CA3AF",
            transition: "color 150ms",
          }}>
            {value.length} / {charLimit}
          </span>
        </div>

        {/* Textarea — resize:none, auto height via JS */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= charLimit) {
              onChange(e.target.value)
              if (selectedPreset) setSelectedPreset(null)
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          maxLength={charLimit}
          rows={1}
          style={{
            width: "100%",
            minHeight: 72,
            resize: "none",                // ← no manual resize
            overflow: "hidden",            // ← hide scrollbar while auto-sizing
            borderRadius: 10,
            border: isFocused
              ? "1px solid rgba(99,102,241,0.7)"
              : "1px solid #E2E8F0",
            boxShadow: isFocused
              ? "0 0 0 3px rgba(99,102,241,0.08)"
              : "none",
            padding: value.length > 0
              ? "10px 36px 10px 12px"
              : "10px 12px",
            fontSize: 13,
            lineHeight: 1.65,
            fontFamily: "inherit",
            color: "#111827",
            background: "white",
            outline: "none",
            transition: "border-color 200ms, box-shadow 200ms, height 100ms",
            display: "block",
          }}
        />

        {/* Clear button */}
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => { onChange(""); setSelectedPreset(null) }}
            aria-label={STYLE_CONTEXT.clearButton}
            style={{
              position: "absolute",
              // Aligns with first line of text
              top: 44,
              right: 8,
              width: 22,
              height: 22,
              borderRadius: 5,
              border: "none",
              background: "#F1F5F9",
              color: "#94A3B8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#E2E8F0")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F1F5F9")}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M1 1l8 8M9 1l-8 8"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Toolbar row below textarea: file pill + style selector ────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
        flexWrap: "wrap",
      }}>
        {/* File preview pill */}
        {fileNamePreview && <FilePill name={fileNamePreview} />}

        {/* Divider */}
        {fileNamePreview && (
          <div style={{
            width: 1,
            height: 16,
            background: "#E2E8F0",
            flexShrink: 0,
          }} />
        )}

        {/* Quick style selector */}
        <QuickStyleSelector
          presets={STYLE_CONTEXT.presets}
          activeId={activePresetId}
          onSelect={handlePresetSelect}
        />

        {/* Active style label */}
        {activePresetId && (
          <span style={{
            fontSize: 11,
            color: "rgb(99,102,241)",
            fontWeight: 500,
          }}>
            {STYLE_CONTEXT.selectedLabel}{" "}
            <strong>
              {STYLE_CONTEXT.presets.find((p) => p.id === activePresetId)?.label}
            </strong>
          </span>
        )}

        {/* Hint text — pushes to end */}
        <span style={{
          marginLeft: "auto",
          fontSize: 11,
          color: "#CBD5E1",
          whiteSpace: "nowrap",
        }}>
          {STYLE_CONTEXT.textareaHint}
        </span>
      </div>

      {/* Active shimmer bar */}
      {showActive && (
        <div style={{
          marginTop: 8,
          height: 2,
          borderRadius: 99,
          overflow: "hidden",
          background: "#F1F5F9",
        }}>
          <div style={{
            height: "100%",
            width: "100%",
            background: "linear-gradient(90deg, #6366F1, #A855F7, #EC4899)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s ease-in-out infinite",
          }} />
        </div>
      )}
    </div>
  )
}