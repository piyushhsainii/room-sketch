"use client";

import { useState, useRef, useEffect } from "react";
import type { Floor } from "@/components/workspace/lib/floor-data";

import { ChevronDown, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react'
import { editorMenuTheme, menuSurface } from './editor-menu-theme'
const CLAY = editorMenuTheme

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
                padding: "6px 12px",
                marginBottom: 4,
                borderRadius: 12,
                background: isActive ? CLAY.accentSoft : hovered ? CLAY.surfaceChip : "transparent",
                cursor: isEditing ? "default" : "pointer",
                boxShadow: isDragOver ? "inset 0 2px #737373" : undefined,
                minHeight: 40,
                minWidth: 0,
                maxWidth: "100%",
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
                <GripVertical size={16} aria-hidden="true" />
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
                        flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, letterSpacing: "normal",
                        color: CLAY.textPrimary,
                        border: "none", borderBottom: `1px solid ${CLAY.accentText}`,
                        background: "transparent", outline: "none", padding: "0 0 3px",
                        fontFamily: CLAY.font,
                    }}
                />
            ) : (
                <span
                    title={floor.label}
                    onDoubleClick={e => { e.stopPropagation(); setIsEditing(true); }}
                    style={{
                        flex: 1, minWidth: 0, fontSize: 14, fontWeight: isActive ? 600 : 400,
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
                    color: floor.visible ? CLAY.textMuted : CLAY.textPlaceholder,
                    cursor: "pointer", flexShrink: 0,
                    transition: "background 160ms ease, box-shadow 160ms ease",
                }}
            >
                {floor.visible ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
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
                        color: trashHovered ? CLAY.dangerText : CLAY.textPlaceholder,
                        cursor: "pointer", flexShrink: 0,
                        opacity: hovered ? 1 : 0,
                        transition: "opacity 120ms, background 160ms ease, color 160ms ease, box-shadow 160ms ease",
                    }}
                >
                    <Trash2 size={16} aria-hidden="true" />
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
        <div ref={containerRef} style={{ position: "relative", minWidth: 0, maxWidth: "100%", fontFamily: CLAY.font }}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                style={{
                    display: "flex", alignItems: "center", gap: 8,
                    height: 40, padding: "0 12px", borderRadius: 12,
                    border: `1px solid ${CLAY.border}`,
                    background: open ? CLAY.accentSoft : CLAY.surface,
                    color: open ? CLAY.accentText : CLAY.textPrimary,
                    fontSize: 14, fontWeight: 500, letterSpacing: "normal",
                    fontFamily: CLAY.font,
                    minWidth: 0, maxWidth: "100%",
                    cursor: "pointer", whiteSpace: "nowrap",
                    transition: "background 160ms ease, box-shadow 160ms ease, color 160ms ease",
                }}
            >
                <span title={activeFloor?.label} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{activeFloor?.label ?? "Floor"}</span>
                <ChevronDown size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
            </button>

            {open && (
                <div className={`${menuSurface} absolute top-full left-0 z-20 mt-2 grid w-[320px] max-w-[calc(100vw-32px)] grid-cols-[minmax(0,1fr)] gap-1`}>
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

                    <div style={{ height: 1, background: CLAY.border, margin: "8px 4px" }} />

                    <button
                        type="button"
                        onClick={() => onAddFloor("above")}
                        onMouseEnter={() => setAddAboveHovered(true)}
                        onMouseLeave={() => setAddAboveHovered(false)}
                        style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%",
                            minHeight: 40, padding: "6px 12px", borderRadius: 12, border: "none",
                            background: addAboveHovered ? CLAY.surfaceChip : "transparent",
                            color: CLAY.accentText, fontSize: 14, fontWeight: 500, letterSpacing: "normal",
                            fontFamily: CLAY.font,
                            cursor: "pointer",
                            textAlign: "left", whiteSpace: "nowrap",
                            transition: "background 160ms ease, box-shadow 160ms ease",
                        }}
                    >
                        <Plus size={16} aria-hidden="true" /> Add Floor
                    </button>
                    <button
                        type="button"
                        onClick={() => onAddFloor("below")}
                        onMouseEnter={() => setAddBelowHovered(true)}
                        onMouseLeave={() => setAddBelowHovered(false)}
                        style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%",
                            minHeight: 40, padding: "6px 12px", borderRadius: 12, border: "none",
                            background: addBelowHovered ? CLAY.surfaceChip : "transparent",
                            color: CLAY.textMuted, fontSize: 14, fontWeight: 400, letterSpacing: "normal",
                            fontFamily: CLAY.font,
                            cursor: "pointer",
                            textAlign: "left", whiteSpace: "nowrap",
                            transition: "background 160ms ease, box-shadow 160ms ease",
                        }}
                    >
                        <Plus size={16} aria-hidden="true" /> Add Floor Below
                    </button>
                </div>
            )}
        </div>
    );
}
