"use client";

import { useState, useRef, useEffect } from "react";
import type { Floor } from "@/components/workspace/lib/floor-data";

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    accentSoft: "rgba(99,102,241,0.14)",
    accentText: "#4C4FBF",
    dangerText: "#B3503F",
    dangerSoft: "rgba(179,80,63,0.14)",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 7px ${CLAY.darkShadow}, inset -3px -3px 7px ${CLAY.lightShadow}`
        : `-3px -3px 7px ${CLAY.lightShadow}, 3px 3px 8px ${CLAY.darkShadow}`;

function ChevronIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 9l6 6 6-6" />
        </svg>
    );
}

function EyeIcon({ off }: { off?: boolean }) {
    if (off) {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
        </svg>
    );
}

function DragHandleIcon() {
    return (
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2.5" cy="2.5" r="1.3" />
            <circle cx="7.5" cy="2.5" r="1.3" />
            <circle cx="2.5" cy="7" r="1.3" />
            <circle cx="7.5" cy="7" r="1.3" />
            <circle cx="2.5" cy="11.5" r="1.3" />
            <circle cx="7.5" cy="11.5" r="1.3" />
        </svg>
    );
}

function FloorRow({
    floor,
    isActive,
    canDelete,
    isDragOver,
    onSelect,
    onToggleVisible,
    onRename,
    onDelete,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
}: {
    floor: Floor;
    isActive: boolean;
    canDelete: boolean;
    isDragOver: boolean;
    onSelect: () => void;
    onToggleVisible: () => void;
    onRename: (newLabel: string) => void;
    onDelete: () => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDrop: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(floor.label);
    const [hovered, setHovered] = useState(false);
    const [dragEnabled, setDragEnabled] = useState(true);
    const [eyeHovered, setEyeHovered] = useState(false);
    const [trashHovered, setTrashHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    function commit() {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== floor.label) onRename(trimmed);
        else setEditValue(floor.label);
        setIsEditing(false);
    }

    return (
        <div
            draggable={!isEditing && dragEnabled}
            onDragStart={onDragStart}
            onDragOver={e => { e.preventDefault(); onDragOver(e); }}
            onDragEnd={onDragEnd}
            onDrop={e => { e.preventDefault(); onDrop(); }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                marginBottom: 4,
                borderRadius: 12,
                background: isActive ? CLAY.accentSoft : hovered ? CLAY.surfaceChip : "transparent",
                boxShadow: isActive ? clayRaised(true) : "none",
                cursor: isEditing ? "default" : "pointer",
                borderTop: isDragOver ? `2px solid ${CLAY.accentText}` : "2px solid transparent",
                minHeight: 40,
                transition: "background 160ms ease, box-shadow 160ms ease",
                fontFamily: CLAY.font,
            }}
            onClick={() => { if (!isEditing) onSelect(); }}
        >
            <span
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: CLAY.textPlaceholder, cursor: "grab", flexShrink: 0,
                    opacity: hovered ? 1 : 0, transition: "opacity 120ms",
                    width: 12,
                }}
            >
                <DragHandleIcon />
            </span>

            {isEditing ? (
                <input
                    ref={inputRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === "Enter") commit();
                        if (e.key === "Escape") { setEditValue(floor.label); setIsEditing(false); }
                    }}
                    style={{
                        flex: 1, fontSize: 13, fontWeight: 500, letterSpacing: "normal",
                        color: CLAY.textPrimary,
                        border: "none", borderBottom: `1px solid ${CLAY.accentText}`,
                        background: "transparent", outline: "none", padding: "0 0 3px",
                        fontFamily: CLAY.font,
                    }}
                />
            ) : (
                <span
                    onDoubleClick={e => { e.stopPropagation(); setIsEditing(true); }}
                    style={{
                        flex: 1, fontSize: 13, fontWeight: isActive ? 500 : 400,
                        letterSpacing: "normal",
                        color: isActive ? CLAY.accentText : CLAY.textPrimary,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                >
                    {floor.label}
                </span>
            )}

            <button
                title={floor.visible ? "Hide floor" : "Show floor"}
                onMouseEnter={() => { setDragEnabled(false); setEyeHovered(true); }}
                onMouseLeave={() => { setDragEnabled(true); setEyeHovered(false); }}
                onClick={e => { e.stopPropagation(); onToggleVisible(); }}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: "50%", border: "none",
                    background: eyeHovered ? CLAY.surfaceChip : "transparent",
                    boxShadow: eyeHovered ? clayRaised(true) : "none",
                    color: floor.visible ? CLAY.textMuted : CLAY.textPlaceholder,
                    cursor: "pointer", flexShrink: 0,
                    transition: "background 160ms ease, box-shadow 160ms ease",
                }}
            >
                <EyeIcon off={!floor.visible} />
            </button>

            {canDelete && (
                <button
                    title="Delete floor"
                    onMouseEnter={() => { setDragEnabled(false); setTrashHovered(true); }}
                    onMouseLeave={() => { setDragEnabled(true); setTrashHovered(false); }}
                    onClick={e => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 28, height: 28, borderRadius: "50%", border: "none",
                        background: trashHovered ? CLAY.dangerSoft : "transparent",
                        boxShadow: trashHovered ? clayRaised(true) : "none",
                        color: trashHovered ? CLAY.dangerText : CLAY.textPlaceholder,
                        cursor: "pointer", flexShrink: 0,
                        opacity: hovered ? 1 : 0,
                        transition: "opacity 120ms, background 160ms ease, color 160ms ease, box-shadow 160ms ease",
                    }}
                >
                    <TrashIcon />
                </button>
            )}
        </div>
    );
}

export default function FloorSwitcher({
    floors,
    activeFloorId,
    viewMode,
    onSelectFloor,
    onAddFloor,
    onToggleFloorVisible,
    onRenameFloor,
    onDeleteFloor,
    onReorderFloors,
    onSetViewMode,
}: {
    floors: Floor[];
    activeFloorId: string;
    viewMode: "single" | "stacked" | "stacked-full";
    onSelectFloor: (floorId: string) => void;
    onAddFloor: (direction: "above" | "below") => void;
    onToggleFloorVisible: (floorId: string) => void;
    onRenameFloor: (floorId: string, newLabel: string) => void;
    onDeleteFloor: (floorId: string) => void;
    onReorderFloors: (newFloors: Floor[]) => void;
    onSetViewMode: (mode: "single" | "stacked" | "stacked-full") => void;
}) {
    const [open, setOpen] = useState(false);
    const [dragFloorId, setDragFloorId] = useState<string | null>(null);
    const [dragOverFloorId, setDragOverFloorId] = useState<string | null>(null);
    const [addAboveHovered, setAddAboveHovered] = useState(false);
    const [addBelowHovered, setAddBelowHovered] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeFloor = floors.find(f => f.id === activeFloorId);
    const sortedFloors = [...floors].sort((a, b) => b.order - a.order); // top floor first, visually

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    function handleDrop(targetFloorId: string) {
        if (!dragFloorId || dragFloorId === targetFloorId) {
            setDragFloorId(null);
            setDragOverFloorId(null);
            return;
        }
        const fromIdx = sortedFloors.findIndex(f => f.id === dragFloorId);
        const toIdx = sortedFloors.findIndex(f => f.id === targetFloorId);
        if (fromIdx === -1 || toIdx === -1) {
            setDragFloorId(null);
            setDragOverFloorId(null);
            return;
        }
        const reordered = [...sortedFloors];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        // sortedFloors is top-first; reverse to bottom-first, then reassign order 0..n
        const bottomFirst = [...reordered].reverse();
        const withNewOrder = bottomFirst.map((f, i) => ({ ...f, order: i }));
        onReorderFloors(withNewOrder);
        setDragFloorId(null);
        setDragOverFloorId(null);
    }

    return (
        <div ref={containerRef} style={{ position: "relative", fontFamily: CLAY.font }}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                style={{
                    display: "flex", alignItems: "center", gap: 8,
                    height: 34, padding: "0 14px", borderRadius: 999,
                    border: "none",
                    background: open ? CLAY.accentSoft : CLAY.surface,
                    color: open ? CLAY.accentText : CLAY.textPrimary,
                    fontSize: 12.5, fontWeight: 500, letterSpacing: "normal",
                    fontFamily: CLAY.font,
                    cursor: "pointer", whiteSpace: "nowrap",
                    boxShadow: open ? clayRaised(true) : clayRaised(false),
                    transition: "background 160ms ease, box-shadow 160ms ease, color 160ms ease",
                }}
            >
                {activeFloor?.label ?? "Floor"}
                <ChevronIcon />
            </button>

            {open && (
                <div style={{
                    position: "absolute", top: 42, left: 0, zIndex: 20,
                    width: 260, borderRadius: 20,
                    border: "none",
                    background: CLAY.surface,
                    boxShadow: `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    fontFamily: CLAY.font,
                }}>
                    {sortedFloors.map(floor => (
                        <FloorRow
                            key={floor.id}
                            floor={floor}
                            isActive={floor.id === activeFloorId}
                            canDelete={floors.length > 1}
                            isDragOver={dragOverFloorId === floor.id && dragFloorId !== floor.id}
                            onSelect={() => { onSelectFloor(floor.id); setOpen(false) }}
                            onToggleVisible={() => onToggleFloorVisible(floor.id)}
                            onRename={label => onRenameFloor(floor.id, label)}
                            onDelete={() => onDeleteFloor(floor.id)}
                            onDragStart={() => setDragFloorId(floor.id)}
                            onDragOver={() => setDragOverFloorId(floor.id)}
                            onDragEnd={() => { setDragFloorId(null); setDragOverFloorId(null); }}
                            onDrop={() => handleDrop(floor.id)}
                        />
                    ))}

                    <div style={{ height: 1, boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`, margin: "8px 4px" }} />

                    <button
                        type="button"
                        onClick={() => onAddFloor("above")}
                        onMouseEnter={() => setAddAboveHovered(true)}
                        onMouseLeave={() => setAddAboveHovered(false)}
                        style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%",
                            padding: "9px 12px", borderRadius: 12, border: "none",
                            background: addAboveHovered ? CLAY.surfaceChip : "transparent",
                            boxShadow: addAboveHovered ? clayRaised(true) : "none",
                            color: CLAY.accentText, fontSize: 12.5, fontWeight: 500, letterSpacing: "normal",
                            fontFamily: CLAY.font,
                            cursor: "pointer",
                            textAlign: "left", whiteSpace: "nowrap",
                            transition: "background 160ms ease, box-shadow 160ms ease",
                        }}
                    >
                        <PlusIcon /> Add Floor
                    </button>
                    <button
                        type="button"
                        onClick={() => onAddFloor("below")}
                        onMouseEnter={() => setAddBelowHovered(true)}
                        onMouseLeave={() => setAddBelowHovered(false)}
                        style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%",
                            padding: "9px 12px", borderRadius: 12, border: "none",
                            background: addBelowHovered ? CLAY.surfaceChip : "transparent",
                            boxShadow: addBelowHovered ? clayRaised(true) : "none",
                            color: CLAY.textMuted, fontSize: 12.5, fontWeight: 400, letterSpacing: "normal",
                            fontFamily: CLAY.font,
                            cursor: "pointer",
                            textAlign: "left", whiteSpace: "nowrap",
                            transition: "background 160ms ease, box-shadow 160ms ease",
                        }}
                    >
                        <PlusIcon /> Add Floor Below
                    </button>
                </div>
            )}
        </div>
    );
}