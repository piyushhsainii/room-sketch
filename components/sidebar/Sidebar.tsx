"use client";

import { APP } from "@/constants/content";

export type ActiveFeature = "3d_viewer" | "generate_render" | "sketchup_render";

const FEATURE_TABS: { id: ActiveFeature; label: string; icon: React.ReactNode }[] = [
  {
    id: "3d_viewer",
    label: "Projects",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: "generate_render",
    label: "Generate Render",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "sketchup_render",
    label: "SketchUp → Render",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" strokeLinejoin="round" />
        <path d="M12 12v6" strokeLinecap="round" />
        <path d="M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

type Props = {
  open: boolean;
  userEmail: string;
  plan: "free" | "pro";
  authed: boolean;
  activeFeature: ActiveFeature;
  onFeatureChange: (feature: ActiveFeature) => void;
  onSignOut: () => void;
  onSignIn: () => void;
};

export function Sidebar({
  open,
  userEmail,
  plan,
  authed,
  activeFeature,
  onFeatureChange,
  onSignOut,
  onSignIn,
}: Props) {
  return (
    <aside
      className="ra-sidebar"
      data-open={open ? "true" : "false"}
      style={{
        width: 220,
        background: "var(--fp-bg)",
        borderRight: "1px solid var(--fp-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: "20px 18px 18px",
        borderBottom: "1px solid var(--fp-border)",
        display: "flex",
        alignItems: "center",
        gap: 9,
        flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2.6 20.6 7.6v8.8L12 21.4 3.4 16.4V7.6L12 2.6Z" fill="var(--fp-accent)" />
        </svg>
        <span style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--fp-text)",
          letterSpacing: "-0.02em",
        }}>
          {APP.name}
        </span>
      </div>

      {/* Section label */}
      <div style={{ padding: "18px 18px 8px" }}>
        <span style={{
          fontSize: 9.5,
          fontWeight: 500,
          color: "var(--fp-text-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}>
          Menu
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
        {FEATURE_TABS.map(tab => {
          const isActive = activeFeature === tab.id;
          return (
            <SidebarNavItem
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={isActive}
              onClick={() => onFeatureChange(tab.id)}
            />
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{
        borderTop: "1px solid var(--fp-border)",
        padding: "12px 14px 14px",
        flexShrink: 0,
      }}>
        {authed ? (
          <>
            {/* User info */}
            <div style={{ marginBottom: 10 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 300,
                color: "var(--fp-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginBottom: 4,
              }}>
                {userEmail}
              </div>
              <span style={{
                display: "inline-block",
                fontSize: 9.5,
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid var(--fp-border-strong)",
                color: plan === "pro" ? "var(--fp-accent)" : "var(--fp-text-faint)",
                background: plan === "pro" ? "var(--fp-accent-bg)" : "transparent",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                {plan === "pro" ? APP.proPlan : APP.freePlan}
              </span>
            </div>

            <SidebarFooterButton onClick={onSignOut} label={APP.signOut} />
          </>
        ) : (
          <SidebarFooterButton onClick={onSignIn} label={APP.signIn} />
        )}
      </div>
    </aside>
  );
}

function SidebarNavItem({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        height: 36,
        padding: "0 10px",
        borderRadius: 6,
        border: "none",
        background: isActive
          ? "var(--fp-accent-bg-strong)"
          : hovered
            ? "var(--fp-bg-hover)"
            : "transparent",
        color: isActive ? "var(--fp-accent)" : hovered ? "var(--fp-text)" : "var(--fp-text-muted)",
        fontSize: 12.5,
        fontWeight: isActive ? 500 : 300,
        cursor: "pointer",
        transition: "background 140ms ease, color 140ms ease",
        textAlign: "left",
        letterSpacing: "-0.01em",
      }}
    >
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 15,
        height: 15,
        flexShrink: 0,
        color: isActive ? "var(--fp-accent)" : hovered ? "var(--fp-text)" : "var(--fp-text-faint)",
        transition: "color 140ms ease",
      }}>
        {icon}
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {isActive && (
        <span style={{
          marginLeft: "auto",
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: "var(--fp-accent)",
          flexShrink: 0,
        }} />
      )}
    </button>
  );
}

function SidebarFooterButton({ onClick, label }: { onClick: () => void; label: string }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        height: 30,
        borderRadius: 6,
        border: "1px solid var(--fp-border)",
        background: hovered ? "var(--fp-bg-hover)" : "transparent",
        color: hovered ? "var(--fp-text)" : "var(--fp-text-muted)",
        fontSize: 11.5,
        fontWeight: 300,
        cursor: "pointer",
        transition: "background 140ms ease, color 140ms ease",
        letterSpacing: "-0.01em",
      }}
    >
      {label}
    </button>
  );
}

// Need React for useState in sub-components
import React from "react";