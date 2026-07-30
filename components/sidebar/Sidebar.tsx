"use client";

import { APP } from "@/constants/content";
import { PlanId } from "@/lib/pricing";
import React from "react";

export type ActiveFeature = "3d_viewer" | "collections" | "settings";

const FEATURE_TABS: { id: ActiveFeature; label: string; icon: React.ReactNode }[] = [
  {
    id: "3d_viewer",
    label: "Projects",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "collections",
    label: "Collections",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
];

type Props = {
  open: boolean;
  userEmail: string;
  plan: PlanId;
  authed: boolean;
  activeFeature: ActiveFeature;
  onFeatureChange: (feature: ActiveFeature) => void;
  onSignOut: () => void;
  onSignIn: () => void;
};

export function Sidebar({
  open, userEmail, plan, authed, activeFeature, onFeatureChange, onSignOut, onSignIn,
}: Props) {
  return (
    <aside
      className="ra-sidebar"
      data-open={open ? "true" : "false"}
      style={{
        width: 220,
        background: "#ffffff",
        borderRight: "1px solid rgba(15,15,15,0.08)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 18px 18px" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(15,15,15,0.92)", letterSpacing: "-0.01em" }}>
          <img src="/room-sketch-logo-removebg-preview.png" alt="" className="w-12 rounded-full select-none" />
          <img src="/room-sketch-text.jpg" alt="" className="w-16 rounded-full select-none" />
        </span>
      </div>

      {/* Section label */}
      <div style={{ padding: "6px 18px 8px" }}>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: "rgba(15,15,15,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Menu
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
        {FEATURE_TABS.map(tab => (
          <SidebarNavItem
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            isActive={activeFeature === tab.id}
            onClick={() => onFeatureChange(tab.id)}
          />
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{ padding: "12px 14px 16px", flexShrink: 0 }}>
        {authed ? (
          <>
            {plan === "free" && (
              <div style={{
                background: "rgba(15,15,15,0.04)",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 12,
              }}>
                <span style={{
                  display: "inline-block",
                  fontSize: 9.5,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "#111111",
                  color: "#ffffff",
                  letterSpacing: "0.04em",
                  marginBottom: 6,
                }}>
                  FREE PLAN
                </span>
                <div style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.4, color: "rgba(15,15,15,0.6)", marginBottom: 4 }}>
                  Unlock HD exports and unlimited projects.
                </div>
                <button
                  type="button"
                  onClick={() => { /* wire to upgrade flow */ }}
                  style={{ fontSize: 11, fontWeight: 600, color: "rgba(15,15,15,0.85)", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}
                >
                  Upgrade Now
                </button>
              </div>
            )}
            <SidebarSignOutButton onClick={onSignOut} label={APP.signOut} />
          </>
        ) : (
          <SidebarSignOutButton onClick={onSignIn} label={APP.signIn} />
        )}
      </div>
    </aside>
  );
}

function SidebarNavItem({ label, icon, isActive, onClick }: { label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9, width: "100%", height: 34,
        padding: "0 10px", borderRadius: 7, border: "none",
        background: isActive ? "rgba(15,15,15,0.06)" : hovered ? "rgba(15,15,15,0.03)" : "transparent",
        color: isActive ? "rgba(15,15,15,0.95)" : "rgba(15,15,15,0.55)",
        fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: "pointer",
        transition: "background 140ms ease, color 140ms ease", textAlign: "left",
      }}
    >
      <span style={{ display: "inline-flex", width: 15, height: 15, flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

function SidebarSignOutButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 7, width: "100%", height: 28,
        border: "none", background: "transparent", color: "rgba(15,15,15,0.5)",
        fontSize: 12.5, fontWeight: 400, cursor: "pointer", padding: 0,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
      </svg>
      {label}
    </button>
  );
}