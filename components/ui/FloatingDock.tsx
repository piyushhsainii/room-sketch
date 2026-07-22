"use client";
import { cn } from "@/lib/utils";
/**
 * Note: Use position fixed according to your needs
 * Desktop navbar is better positioned at the bottom
 * Mobile navbar is better positioned at bottom right.
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

type DockItem = {
    id?: string;
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
};

export const FloatingDock = ({
    items,
    activeId,
    desktopClassName,
    mobileClassName,
}: {
    items: DockItem[];
    activeId?: string | null;
    desktopClassName?: string;
    mobileClassName?: string;
}) => {
    return (
        <>
            <FloatingDockDesktop items={items} activeId={activeId} className={desktopClassName} />
            <FloatingDockMobile items={items} activeId={activeId} className={mobileClassName} />
        </>
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
    return (
        <div className={cn("relative block md:hidden", className)}>
            <AnimatePresence>
                {open && (
                    <motion.div
                        layoutId="nav"
                        className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2"
                    >
                        {items.map((item, idx) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                    y: 10,
                                    transition: {
                                        delay: idx * 0.05,
                                    },
                                }}
                                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
                            >
                                <button
                                    key={item.title}
                                    type="button"
                                    onClick={() => {
                                        item.onClick();
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "flex h-10 w-10 items-center justify-center rounded-full",
                                        item.id && activeId === item.id
                                            ? "bg-blue-100 text-blue-600"
                                            : "bg-gray-50",
                                    )}
                                >
                                    <div className="h-4 w-4">{item.icon}</div>
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            <button
                onClick={() => setOpen(!open)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50"
            >
                <IconLayoutNavbarCollapse className="h-5 w-5 text-neutral-500" />
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
            className={cn(
                "mx-auto hidden h-16 items-end gap-4 rounded-2xl bg-gray-50 px-4 pb-3 md:flex",
                className,
            )}
        >
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

    let widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
    let heightTransformIcon = useTransform(
        distance,
        [-150, 0, 150],
        [20, 40, 20],
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
            style={{ width, height }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={cn(
                "relative flex aspect-square items-center justify-center rounded-full",
                isActive ? "bg-blue-100 text-blue-600" : "bg-gray-200",
            )}
        >
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 2, x: "-50%" }}
                        className="absolute -top-8 left-1/2 w-fit rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs whitespace-pre text-neutral-700"
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