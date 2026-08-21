"use client";

import { useState, useRef, useEffect } from "react";
import type { Floor } from "@/components/workspace/lib/floor-data";

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
                borderRadius: 8,
                background: isActive ? "rgba(99,102,241,0.14)" : hovered ? "rgba(255,255,255,0.06)" : "transparent",
                cursor: isEditing ? "default" : "pointer",
                borderTop: isDragOver ? "2px solid rgba(99,102,241,0.8)" : "2px solid transparent",
                minHeight: 40,
                transition: "background 120ms ease",
            }}
            onClick={() => { if (!isEditing) onSelect(); }}
        >
            <span
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(148,163,184,0.4)", cursor: "grab", flexShrink: 0,
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
                        flex: 1, fontSize: 13, fontWeight: 500, letterSpacing: "0.01em",
                        color: "rgba(226,232,240,0.9)",
                        border: "none", borderBottom: "1px solid rgba(99,102,241,0.5)",
                        background: "transparent", outline: "none", padding: "0 0 3px",
                    }}
                />
            ) : (
                <span
                    onDoubleClick={e => { e.stopPropagation(); setIsEditing(true); }}
                    style={{
                        flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400,
                        letterSpacing: "0.01em",
                        color: isActive ? "rgba(165,168,255,0.95)" : "rgba(226,232,240,0.85)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                >
                    {floor.label}
                </span>
            )}

            <button
                title={floor.visible ? "Hide floor" : "Show floor"}
                onMouseEnter={() => setDragEnabled(false)}
                onMouseLeave={() => setDragEnabled(true)}
                onClick={e => { e.stopPropagation(); onToggleVisible(); }}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 26, height: 26, borderRadius: 6, border: "none",
                    background: "transparent", color: floor.visible ? "rgba(148,163,184,0.75)" : "rgba(148,163,184,0.3)",
                    cursor: "pointer", flexShrink: 0,
                }}
            >
                <EyeIcon off={!floor.visible} />
            </button>

            {canDelete && (
                <button
                    title="Delete floor"
                    onMouseEnter={() => setDragEnabled(false)}
                    onMouseLeave={() => setDragEnabled(true)}
                    onClick={e => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 26, height: 26, borderRadius: 6, border: "none",
                        background: "transparent",
                        color: "rgba(148,163,184,0.5)",
                        cursor: "pointer", flexShrink: 0,
                        opacity: hovered ? 1 : 0, transition: "opacity 120ms, background 120ms, color 120ms",
                    }}
                    onFocus={e => {
                        e.currentTarget.style.background = "rgba(239,68,68,0.18)";
                        e.currentTarget.style.color = "rgba(248,113,113,0.95)";
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
        <div ref={containerRef} style={{ position: "relative" }}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                style={{
                    display: "flex", alignItems: "center", gap: 8,
                    height: 32, padding: "0 12px", borderRadius: 8,
                    border: open ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(148,163,184,0.18)",
                    background: open ? "rgba(99,102,241,0.18)" : "rgba(12,10,8,0.72)",
                    color: open ? "rgba(165,168,255,0.95)" : "rgba(226,232,240,0.85)",
                    fontSize: 12.5, fontWeight: 600, letterSpacing: "0.02em",
                    cursor: "pointer", whiteSpace: "nowrap",
                }}
            >
                {activeFloor?.label ?? "Floor"}
                <ChevronIcon />
            </button>

            {open && (
                <div style={{
                    position: "absolute", top: 40, left: 0, zIndex: 20,
                    width: 260, borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(10,9,7,0.96)",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 12px 48px rgba(0,0,0,0.65)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
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

                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "10px 4px" }} />

                    <button type="button" onClick={() => onAddFloor("above")} style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent",
                        color: "rgba(165,168,255,0.9)", fontSize: 12.5, fontWeight: 500, letterSpacing: "0.01em",
                        cursor: "pointer",
                        textAlign: "left", whiteSpace: "nowrap",
                    }}>
                        <PlusIcon /> Add Floor
                    </button>
                    <button type="button" onClick={() => onAddFloor("below")} style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent",
                        color: "rgba(148,163,184,0.65)", fontSize: 12.5, fontWeight: 400, letterSpacing: "0.01em",
                        cursor: "pointer",
                        textAlign: "left", whiteSpace: "nowrap",
                    }}>
                        <PlusIcon /> Add Floor Below
                    </button>
                </div>
            )}
        </div>
    );
}