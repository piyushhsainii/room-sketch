// PATH: components/sidebar/Sidebar.tsx
"use client";

import { dashboardTheme as CLAY } from "@/components/dashboard/dashboard-theme";

import { APP } from "@/constants/content";
import { PlanId } from "@/lib/plan";
import { usePlan } from "@/lib/hooks/usePlan";
import React from "react";
import Link from "next/link";
import { BookOpen, Plug } from "lucide-react";

export type ActiveFeature = "3d_viewer" | "collections" | "community" | "settings";

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
    id: "community",
    label: "Community",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 4 6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6-4-9s1.5-6.3 4-9z" strokeLinecap="round" />
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
  // Live plan is the source of truth for which branch renders below — the
  // `plan` prop is only used as a fallback while the fetch is in flight, to
  // avoid a flash of the wrong state. If `plan` prop was stale/hardcoded
  // upstream, this is what actually fixes it showing the right plan.
  const { plan: livePlan } = usePlan();
  const effectivePlan: PlanId = livePlan?.planId ?? plan;

  return (
    <aside
      className="ra-sidebar"
      data-open={open ? "true" : "false"}
      style={{
        width: 220,
        background: CLAY.surface,
        borderRight: `1px solid ${CLAY.border}`,
        boxShadow: "none",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
        fontFamily: CLAY.font,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 18px 18px" }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: CLAY.textPrimary, letterSpacing: "normal", display: "flex", alignItems: "center", gap: 6 }}>
          <img src="/room-sketch-logo-removebg-preview.png" alt="" className="h-9 w-9 select-none" />
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.04em" }}>roomsketch</span>
        </span>
      </div>

      {/* Section label */}
      <div style={{ padding: "6px 18px 8px" }}>
        <span style={{ fontSize: 9.5, fontWeight: 500, color: CLAY.textPlaceholder, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Menu
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
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

      <div style={{ padding: '24px 18px 8px', fontSize: 10, fontWeight: 500, color: CLAY.textPlaceholder, textTransform: 'uppercase', letterSpacing: '.1em' }}>Guides & connections</div>
      <nav aria-label="Guides and connections" style={{ padding: '0 12px', display: 'grid', gap: 6 }}>
        <Link href="/docs/mcp" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, color: CLAY.textMuted, fontSize: 13, textDecoration: 'none' }}><BookOpen size={15} />MCP documentation</Link>
        <Link href="/mcp" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, color: CLAY.textMuted, fontSize: 13, textDecoration: 'none' }}><Plug size={15} />Connect assistant</Link>
      </nav>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{ padding: "12px 14px 16px", flexShrink: 0 }}>
        {authed ? (
          <>
            {effectivePlan === "free" && (
              <div style={{
                background: CLAY.surface,
                border: `1px solid ${CLAY.border}`,
                borderRadius: 16,
                padding: "12px 14px",
                marginBottom: 12,
              }}>
                <span style={{
                  display: "inline-block",
                  fontSize: 9.5,
                  fontWeight: 500,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: CLAY.surfaceChip,
                  color: CLAY.textPrimary,
                  letterSpacing: "0.04em",
                  marginBottom: 8,
                  border: `1px solid ${CLAY.border}`,
                }}>
                  FREE PLAN{livePlan?.projectLimit != null ? ` · ${livePlan.projectsUsed}/${livePlan.projectLimit} PROJECTS` : ""}
                </span>
                <div style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.4, color: CLAY.textMuted, marginBottom: 6 }}>
                  Upgrade for more projects and exports.
                </div>
                <button
                  type="button"
                  onClick={() => { window.location.href = '/pricing' }}
                  style={{ fontSize: 11, fontWeight: 500, color: CLAY.textPrimary, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", fontFamily: CLAY.font }}
                >
                  Upgrade Now
                </button>
              </div>
            )}

            {effectivePlan === "pro" && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: CLAY.surface,
                border: `1px solid ${CLAY.border}`,
                borderRadius: 16,
                padding: "10px 14px",
                marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 9.5,
                  fontWeight: 500,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: CLAY.surfaceChip,
                  color: "#3D9A5C",
                  letterSpacing: "0.04em",
                  border: `1px solid ${CLAY.border}`,
                }}>
                  ✦ PRO
                </span>
                {livePlan?.projectLimit != null && (
                  <span style={{ fontSize: 10.5, color: CLAY.textMuted }}>
                    {livePlan.projectsUsed}/{livePlan.projectLimit} projects
                  </span>
                )}
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
        display: "flex", alignItems: "center", gap: 10, width: "100%", height: 40,
        padding: "0 12px", borderRadius: 12, border: `1px solid ${CLAY.border}`,
        background: isActive || hovered ? CLAY.surfaceChip : "transparent",
        color: isActive ? CLAY.textPrimary : CLAY.textMuted,
        fontSize: 13, fontWeight: isActive ? 500 : 400, cursor: "pointer",
        fontFamily: CLAY.font,
        boxShadow: "none",
        transition: "box-shadow 180ms ease, background 180ms ease, color 140ms ease",
        textAlign: "left",
      }}
    >
      <span style={{ display: "inline-flex", width: 15, height: 15, flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

function SidebarSignOutButton({ onClick, label }: { onClick: () => void; label: string }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", height: 32,
        border: `1px solid ${CLAY.border}`, background: hovered ? CLAY.surface : "transparent",
        borderRadius: 10,
        boxShadow: "none",
        color: CLAY.textMuted,
        fontSize: 12.5, fontWeight: 400, cursor: "pointer", padding: "0 8px",
        fontFamily: CLAY.font,
        transition: "box-shadow 180ms ease, background 180ms ease",
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
