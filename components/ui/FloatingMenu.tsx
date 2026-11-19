import { useEffect, useRef, useState, type ReactNode } from "react";
import { Armchair, Check, Eye, Grid2X2, MousePointer2, Notebook, Tag, PersonStanding } from "lucide-react";
import { cn } from "@/lib/utils";
import { editorMenuTheme, menuButton, menuRow, menuSelected, menuSurface } from "./editor-menu-theme";
import { QualityControl } from '../workspace/QualityControl';

function DockButton({ active, expanded, disabled, onClick, icon, label }: {
    active?: boolean; expanded?: boolean; disabled?: boolean; onClick: () => void; icon: ReactNode; label: string;
}) {
    return (
        <button type="button" disabled={disabled} aria-label={label} title={label}
            aria-expanded={expanded} aria-pressed={expanded === undefined ? active : undefined}
            onClick={onClick}
            className={cn(menuButton, "px-2.5 sm:px-3", active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100")}>
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

function ToggleRow({ icon, label, checked, onChange }: {
    icon: ReactNode; label: string; checked: boolean; onChange: () => void;
}) {
    return (
        <button type="button" aria-pressed={checked} onClick={onChange}
            className={cn(menuRow, "flex w-full items-center gap-2 text-left", checked ? menuSelected : "text-neutral-700 hover:bg-neutral-50")}>
            {icon}<span className="flex-1">{label}</span>{checked && <Check size={16} aria-hidden="true" />}
        </button>
    );
}

export function FloatingMenu({
    walkMode, onToggleWalkMode, interactiveMode, onToggleInteractive,
    showFurniture, onToggleShowFurniture, showLabels, onToggleShowLabels,
    previewOpen, onTogglePreview, cameraViewPickerSlot, practicalToolsSlot, onOpenProjectTools,
}: {
    walkMode: boolean;
    onToggleWalkMode: () => void;
    interactiveMode: boolean;
    onToggleInteractive: () => void;
    showFurniture: boolean;
    onToggleShowFurniture: () => void;
    showLabels: boolean;
    onToggleShowLabels: () => void;
    previewOpen: boolean;
    onTogglePreview: () => void;
    cameraViewPickerSlot: ReactNode;
    practicalToolsSlot?: ReactNode;
    onOpenProjectTools?: () => void;
}) {
    const [displayOpen, setDisplayOpen] = useState(false);
    const displayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!displayOpen) return;
        function dismiss(event: PointerEvent) {
            if (event.target instanceof Node && !displayRef.current?.contains(event.target)) setDisplayOpen(false);
        }
        document.addEventListener("pointerdown", dismiss);
        return () => document.removeEventListener("pointerdown", dismiss);
    }, [displayOpen]);

    return (
        <div role="group" aria-label="3D preview controls" className={cn(menuSurface, "flex items-center gap-1 shadow-sm")} style={{ fontFamily: editorMenuTheme.font }}>
            <DockButton active={walkMode} disabled={interactiveMode} onClick={onToggleWalkMode}
                label={walkMode ? "Exit Walk" : "Walk Mode"} icon={<PersonStanding size={16} aria-hidden="true" />} />
            <DockButton active={interactiveMode} onClick={onToggleInteractive}
                label={interactiveMode ? "Interactive: On" : "Interactive: Off"} icon={<MousePointer2 size={16} aria-hidden="true" />} />
            <div ref={displayRef} className="relative" onKeyDown={event => {
                if (event.key === "Escape" && displayOpen) {
                    event.stopPropagation();
                    setDisplayOpen(false);
                    displayRef.current?.querySelector("button")?.focus();
                }
            }}>
                <DockButton active={displayOpen} expanded={displayOpen} onClick={() => setDisplayOpen(open => !open)}
                    label="Display" icon={<Grid2X2 size={16} aria-hidden="true" />} />
                {displayOpen && (
                    <div role="group" aria-label="Display options" className={cn(menuSurface, "absolute top-full right-0 z-10 mt-2 grid w-56 gap-1")}>
                        <div className={cn(menuRow, "flex items-center gap-2 text-neutral-500")}><Grid2X2 size={16} aria-hidden="true" />Grid</div>
                        <ToggleRow label="Furniture" checked={showFurniture} onChange={onToggleShowFurniture} icon={<Armchair size={16} aria-hidden="true" />} />
                        <ToggleRow label="Labels" checked={showLabels} onChange={onToggleShowLabels} icon={<Tag size={16} aria-hidden="true" />} />
                        <div className={cn(menuRow, "flex items-center gap-2 text-neutral-500")}><Notebook size={16} aria-hidden="true" />Floor plan annotations</div>
                        {practicalToolsSlot}
                        <QualityControl />
                        {onOpenProjectTools && <button type="button" className={cn(menuRow, "text-left text-neutral-700 hover:bg-neutral-100")}
                            onClick={() => { setDisplayOpen(false); onOpenProjectTools() }}>Project tools</button>}
                    </div>
                )}
            </div>
            {cameraViewPickerSlot}
            <DockButton active={previewOpen} onClick={onTogglePreview} label="Preview" icon={<Eye size={16} aria-hidden="true" />} />
        </div>
    );
}
