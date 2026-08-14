"use client";

import { useEffect, useRef, useState } from "react";

const OPEN_DELAY_MS = 220;
const CLOSE_DELAY_MS = 150;

export function useHoverFlyout({
  id,
  enabled = true,
}: {
  id: string;
  enabled?: boolean;
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
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      const flyoutEl = document.getElementById(`flyout-${id}`);
      if (flyoutEl?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, id]);

  const scheduleOpen = () => {
    if (!enabled) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  };
  const scheduleClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
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
