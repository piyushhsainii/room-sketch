"use client";
import { cn } from "@/lib/utils";
/**
 * Note: Use position fixed according to your needs
 * Desktop navbar is better positioned at the bottom
 * Mobile navbar is better positioned at bottom right.
 * Vertical dock is better positioned at a side edge (e.g. right-4 top-1/2 -translate-y-1/2).
 **/

import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
    AnimatePresence,
    MotionValue,
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from "motion/react";

import { useRef, useState } from "react";

// ---- Claymorphism theme tokens (shared across the app) ----
const CLAY = {
    canvas: "#E5E5E5",
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    accentSoft: "rgba(99,102,241,0.14)", // faint accent tint for the active tool, kept low-saturation
    accentText: "#4C4FBF",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 7px ${CLAY.darkShadow}, inset -3px -3px 7px ${CLAY.lightShadow}`
        : `-3px -3px 7px ${CLAY.lightShadow}, 3px 3px 8px ${CLAY.darkShadow}`;

type DockItem = {
    id?: string;
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
};

export const FloatingDock = ({
    items,
    activeId,
    orientation = "horizontal",
    desktopClassName,
    mobileClassName,
}: {
    items: DockItem[];
    activeId?: string | null;
    // "vertical" renders the plain stacked pill dock (matches the reference
    // screenshot: static icon size, no magnify-on-hover physics). Mobile
    // collapse behavior is unchanged either way.
    orientation?: "horizontal" | "vertical";
    desktopClassName?: string;
    mobileClassName?: string;
}) => {
    if (orientation === "vertical") {
        return <FloatingDockVertical items={items} activeId={activeId} className={desktopClassName} />;
    }
    return (
        <>
            <FloatingDockDesktop items={items} activeId={activeId} className={desktopClassName} />
            <FloatingDockMobile items={items} activeId={activeId} className={mobileClassName} />
        </>
    );
};

/* Shared style helpers so all three dock variants (vertical / mobile /
   desktop) render icons the same crisp, high-contrast, "popping out" way —
   dark stroke, no faded default icon-library color, plus a raised clay
   circle behind each icon instead of a flat gray fill. */
function iconWrapStyle(active: boolean, hovered: boolean): React.CSSProperties {
    return {
        background: active ? CLAY.accentSoft : CLAY.surfaceChip,
        boxShadow: active
            ? clayRaised(true)
            : hovered
                ? clayRaised(true)
                : clayRaised(false),
        color: active ? CLAY.accentText : CLAY.textPrimary,
        transition: "box-shadow 180ms ease, background 180ms ease, color 180ms ease",
    };
}

const iconCss = `
    .ra-dock-icon svg {
        stroke: currentColor !important;
        filter: drop-shadow(0 1px 0.5px rgba(255,255,255,0.5));
    }
    .ra-dock-icon svg[fill]:not([fill="none"]) {
        fill: currentColor !important;
    }
`;

// ── Static vertical pill dock ──
// Matches the reference: a rounded-full clay pill, icons stacked with even
// spacing, no size magnification on hover — just a raised/inset clay swap
// on hover/active, with crisp dark icons instead of faded gray ones.
const FloatingDockVertical = ({
    items,
    activeId,
    className,
}: {
    items: DockItem[];
    activeId?: string | null;
    className?: string;
}) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    return (
        <div
            className={cn("flex flex-col items-center gap-1.5 rounded-full p-1.5", className)}
            style={{
                background: CLAY.surface,
                boxShadow: `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`,
                fontFamily: CLAY.font,
            }}
        >
            <style>{iconCss}</style>
            {items.map((item) => {
                const isActive = !!item.id && item.id === activeId;
                const isHovered = hoveredId === item.title;
                return (
                    <button
                        key={item.title}
                        type="button"
                        title={item.title}
                        onClick={item.onClick}
                        onMouseEnter={() => setHoveredId(item.title)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="ra-dock-icon flex h-9 w-9 items-center justify-center rounded-full"
                        style={iconWrapStyle(isActive, isHovered)}
                    >
                        <div className="h-5 w-5">{item.icon}</div>
                    </button>
                );
            })}
        </div>
    );
};

const FloatingDockMobile = ({
    items,
    activeId,
    className,
}: {
    items: DockItem[];
    activeId?: string | null;
    className?: string;
}) => {
    const [open, setOpen] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    return (
        <div className={cn("relative block md:hidden", className)} style={{ fontFamily: CLAY.font }}>
            <style>{iconCss}</style>
            <AnimatePresence>
                {open && (
                    <motion.div
                        layoutId="nav"
                        className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2"
                    >
                        {items.map((item, idx) => {
                            const isActive = !!item.id && item.id === activeId;
                            const isHovered = hoveredId === item.title;
                            return (
                                <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10, transition: { delay: idx * 0.05 } }}
                                    transition={{ delay: (items.length - 1 - idx) * 0.05 }}
                                >
                                    <button
                                        key={item.title}
                                        type="button"
                                        onClick={() => {
                                            item.onClick();
                                            setOpen(false);
                                        }}
                                        onMouseEnter={() => setHoveredId(item.title)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        className="ra-dock-icon flex h-10 w-10 items-center justify-center rounded-full"
                                        style={iconWrapStyle(isActive, isHovered)}
                                    >
                                        <div className="h-5 w-5">{item.icon}</div>
                                    </button>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
            <button
                onClick={() => setOpen(!open)}
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                    background: CLAY.surfaceChip,
                    boxShadow: clayRaised(false),
                }}
            >
                <IconLayoutNavbarCollapse className="h-5 w-5" style={{ color: CLAY.textPrimary }} />
            </button>
        </div>
    );
};

const FloatingDockDesktop = ({
    items,
    activeId,
    className,
}: {
    items: DockItem[];
    activeId?: string | null;
    className?: string;
}) => {
    let mouseX = useMotionValue(Infinity);
    return (
        <motion.div
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className={cn("mx-auto hidden h-20 items-end gap-3 rounded-2xl px-3 pb-2.5 md:flex", className)}
            style={{
                background: CLAY.surface,
                boxShadow: `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`,
                fontFamily: CLAY.font,
            }}
        >
            <style>{iconCss}</style>
            {items.map((item) => (
                <IconContainer
                    mouseX={mouseX}
                    key={item.title}
                    isActive={!!item.id && item.id === activeId}
                    {...item}
                />
            ))}
        </motion.div>
    );
};

function IconContainer({
    mouseX,
    title,
    icon,
    onClick,
    isActive,
}: {
    mouseX: MotionValue;
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
    isActive?: boolean;
}) {
    let ref = useRef<HTMLDivElement>(null);

    let distance = useTransform(mouseX, (val) => {
        let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

        return val - bounds.x - bounds.width / 2;
    });

    let widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
    let heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

    let widthTransformIcon = useTransform(distance, [-150, 0, 150], [24, 46, 24]);
    let heightTransformIcon = useTransform(
        distance,
        [-150, 0, 150],
        [24, 46, 24],
    );

    let width = useSpring(widthTransform, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });
    let height = useSpring(heightTransform, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    let widthIcon = useSpring(widthTransformIcon, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });
    let heightIcon = useSpring(heightTransformIcon, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    const [hovered, setHovered] = useState(false);

    return (
        <motion.button
            type="button"
            onClick={onClick}
            // @ts-ignore
            ref={ref}
            style={{
                width, height,
                ...iconWrapStyle(!!isActive, hovered),
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="ra-dock-icon relative flex aspect-square items-center justify-center rounded-full"
        >
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 2, x: "-50%" }}
                        className="absolute -top-9 left-1/2 w-fit whitespace-pre rounded-full px-3 py-1 text-xs"
                        style={{
                            background: CLAY.surface,
                            color: CLAY.textPrimary,
                            fontFamily: CLAY.font,
                            fontWeight: 500,
                            boxShadow: `-3px -3px 7px ${CLAY.lightShadow}, 3px 3px 8px ${CLAY.darkShadow}`,
                        }}
                    >
                        {title}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                style={{ width: widthIcon, height: heightIcon }}
                className="flex items-center justify-center"
            >
                {icon}
            </motion.div>
        </motion.button>
    );
}