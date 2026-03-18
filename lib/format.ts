export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"] as const;
  const k = 1024;
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k))
  );
  const value = bytes / Math.pow(k, i);
  const rounded = value >= 10 || i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

export function formatProjectDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}
