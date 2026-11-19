import { inter } from "@/app/fonts/inter";

export const editorMenuTheme = {
    font: inter.style.fontFamily,
    canvas: "#f1f1f0",
    surface: "#fff",
    surfaceChip: "#f5f5f5",
    textPrimary: "#171717",
    textMuted: "#525252",
    textPlaceholder: "#737373",
    accentSoft: "#f5f5f5",
    accentText: "#171717",
    dangerText: "#991b1b",
    dangerSoft: "#fef2f2",
    border: "#e5e5e5",
    shadow: "0 10px 20px -5px rgb(0 0 0 / 14%), 0 2px 6px rgb(0 0 0 / 8%)",
};

export const menuSurface = "rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lg";
export const menuRow = "min-h-10 rounded-xl px-3 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900";
export const menuSelected = "bg-neutral-100 font-semibold text-neutral-950";
export const menuButton = "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-50";
