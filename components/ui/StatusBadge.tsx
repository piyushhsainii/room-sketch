// @ts-nocheck

import type { ProjectStatus } from "@/lib/models";

type Props = {
  status: ProjectStatus;
};

function getStyles(status: ProjectStatus) {
  switch (status) {
    case "uploaded":
      return {
        color: "var(--color-text-tertiary)",
        background: "var(--color-surface-2)",
        dot: "rgba(255,255,255,0.28)",
        pulse: false,
      };
    case "rendering":
      return {
        color: "var(--color-warning)",
        background: "rgba(245, 158, 11, 0.12)",
        dot: "var(--color-warning)",
        pulse: true,
      };
    case "completed":
      return {
        color: "var(--color-success)",
        background: "var(--color-success-light)",
        dot: "var(--color-success)",
        pulse: false,
      };
    case "failed":
      return {
        color: "var(--color-danger)",
        background: "var(--color-danger-light)",
        dot: "var(--color-danger)",
        pulse: false,
      };
  }
}

function labelFor(status: ProjectStatus): string {
  return status;
}

export default function StatusBadge({ status }: Props) {
  const styles = getStyles(status);

  return (
    <span
      className="ra-statusBadge"
      style={{ color: styles.color, background: styles.background }}
    >
      <span
        className="ra-statusDot"
        style={{
          background: styles.dot,
          animation: styles.pulse ? "status-pulse 1s ease-in-out infinite" : "none",
        }}
        aria-hidden="true"
      />
      {labelFor(status)}
    </span>
  );
}
