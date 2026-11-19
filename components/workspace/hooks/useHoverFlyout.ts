"use client";

import { useEffect, useRef, useState } from "react";

const OPEN_DELAY_MS = 220;
const CLOSE_DELAY_MS = 150;

export function useHoverFlyout({
  id,
  enabled = true,
  trigger = "hover",
}: {
  id: string;
  enabled?: boolean;
  trigger?: "hover" | "click";
}) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && anchorRef.current) {
      setAnchorRect(anchorRef.current.getBoundingClientRect());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      const flyoutEl = document.getElementById(`flyout-${id}`);
      if (flyoutEl?.contains(target)) return;
      setOpen(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, id]);

  const scheduleOpen = () => {
    if (!enabled || trigger !== "hover") return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  };
  const scheduleClose = () => {
    if (trigger !== "hover") return;
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  const cancelClose = () => {
    if (trigger !== "hover") return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const toggleOpen = () => {
    if (!enabled || trigger !== "click") return;
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return {
    open,
    anchorRect,
    setOpen,
    toggleOpen,
    anchorProps: {
      ref: anchorRef,
      onMouseEnter: scheduleOpen,
      onMouseLeave: scheduleClose,
    },
    flyoutTriggerProps: {
      id: `flyout-${id}`,
      onMouseEnter: cancelClose,
      onMouseLeave: scheduleClose,
    },
  };
}
