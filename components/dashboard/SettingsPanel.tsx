"use client";

import { PLAN_ORDER, PlanId, PRICING_PLANS } from "@/lib/plan";
import { useEffect, useState } from "react";

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
    accentText: "#4C4FBF",
    accentSoft: "rgba(99,102,241,0.14)",
    successText: "#3F9C63",
    dangerText: "#B3503F",
    dangerSoft: "rgba(179,80,63,0.14)",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`
        : `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`;

function EditIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    );
}

function ArrowUpIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={CLAY.successText} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );
}

function SegmentedControl<T extends string>({
    options, value, onChange,
}: {
    options: { value: T; label: string; icon?: React.ReactNode }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div style={{
            display: "inline-flex", border: "none", borderRadius: 999, padding: 4,
            background: CLAY.surface,
            boxShadow: `inset 2px 2px 6px ${CLAY.darkShadow}, inset -2px -2px 6px ${CLAY.lightShadow}`,
            gap: 2,
        }}>
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 14px", borderRadius: 999, border: "none",
                            background: active ? CLAY.surfaceChip : "transparent",
                            color: active ? CLAY.accentText : CLAY.textMuted,
                            fontSize: 12.5, fontWeight: active ? 500 : 400, fontFamily: CLAY.font,
                            cursor: "pointer", whiteSpace: "nowrap",
                            boxShadow: active ? "-2px -2px 5px rgba(255,255,255,0.7), 2px 2px 6px rgba(0,0,0,0.14)" : "none",
                            transition: "background 160ms ease, box-shadow 160ms ease, color 160ms ease",
                        }}
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label style={{ display: "block", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: CLAY.textPlaceholder, marginBottom: 8, fontFamily: CLAY.font }}>
            {children}
        </label>
    );
}

function ClayButton({
    children, onClick, disabled, variant = "secondary", fullWidth,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary" | "danger";
    fullWidth?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const color = variant === "danger" ? CLAY.dangerText : variant === "primary" ? CLAY.textPrimary : CLAY.textMuted;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: fullWidth ? "100%" : undefined,
                height: 40, padding: "0 20px", borderRadius: 999, border: "none",
                background: variant === "danger" ? CLAY.dangerSoft : CLAY.surface,
                color, fontSize: 13, fontWeight: 500, fontFamily: CLAY.font,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.55 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: (hovered && !disabled) ? clayRaised(true) : clayRaised(false),
                transition: "box-shadow 180ms ease, opacity 180ms ease",
            }}
        >
            {children}
        </button>
    );
}

export default function SettingsPanel({
    fullName: fullNameProp,
    userEmail,
    plan,
    avatarUrl,
    storageUsedGb = 0,
    renewalDate,
    onNavigate,
    onSave,
}: {
    fullName?: string;
    userEmail: string;
    plan: PlanId;
    avatarUrl?: string;
    storageUsedGb?: number;
    renewalDate?: string | number | Date;
    onNavigate?: (feature: "3d_viewer" | "collections" | "settings") => void;
    onSave?: (values: { fullName: string; email: string; unit: "metric" | "imperial" }) => Promise<void> | void;
}) {
    const derivedName = fullNameProp || (userEmail ? userEmail.split("@")[0] : "");

    const [fullName, setFullName] = useState(derivedName);
    const [email, setEmail] = useState(userEmail || "");
    const [unit, setUnit] = useState<"metric" | "imperial">("metric");
    const [saving, setSaving] = useState(false);
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [avatarEditHovered, setAvatarEditHovered] = useState(false);
    const [manageHovered, setManageHovered] = useState(false);

    // Keep local fields in sync if the parent's data arrives after mount
    // (e.g. /api/me resolves after the panel has already rendered).
    useEffect(() => setFullName(derivedName), [derivedName]);
    useEffect(() => setEmail(userEmail || ""), [userEmail]);

    const currentPlan = PRICING_PLANS[plan];
    const storageTotalGb = currentPlan.storageGb;
    const storagePct = storageTotalGb > 0 ? Math.min(100, Math.round((storageUsedGb / storageTotalGb) * 100)) : 0;
    const renewalLabel = renewalDate
        ? new Date(renewalDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
        : "—";

    async function handleSave() {
        setSaving(true);
        try {
            if (onSave) {
                await onSave({ fullName, email, unit });
            } else {
                await fetch("/api/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fullName, email, unit }),
                });
            }
        } catch (err) {
            console.error("Failed to save settings", err);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ padding: "28px 36px 60px", maxWidth: 720, marginInline: "auto", background: CLAY.canvas, fontFamily: CLAY.font }}>
            {/* Header */}
            <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 400, letterSpacing: "-0.01em", color: CLAY.textPrimary }}>
                Account Settings
            </h1>
            <p style={{ margin: "0 0 28px", fontSize: 13.5, color: CLAY.textMuted }}>
                Manage your profile, application preferences, and subscription details.
            </p>

            {/* Profile card */}
            <section style={{
                border: "none", borderRadius: 24, background: CLAY.surface, padding: 24, marginBottom: 24,
                boxShadow: `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: "50%", overflow: "hidden",
                            background: CLAY.surfaceChip,
                            boxShadow: "-3px -3px 7px rgba(255,255,255,0.75), 3px 3px 8px rgba(0,0,0,0.14)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <span style={{ fontSize: 20, fontWeight: 500, color: CLAY.textPlaceholder }}>
                                    {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            aria-label="Change avatar"
                            onMouseEnter={() => setAvatarEditHovered(true)}
                            onMouseLeave={() => setAvatarEditHovered(false)}
                            style={{
                                position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderRadius: "50%",
                                background: CLAY.accentText, border: `2px solid ${CLAY.surface}`, display: "flex",
                                alignItems: "center", justifyContent: "center", cursor: "pointer",
                                boxShadow: avatarEditHovered ? clayRaised(true) : "-2px -2px 4px rgba(255,255,255,0.5), 2px 2px 5px rgba(0,0,0,0.2)",
                                transition: "box-shadow 180ms ease",
                            }}
                        >
                            <EditIcon />
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: 24, flex: 1, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                            <FieldLabel>Full name</FieldLabel>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                style={{
                                    width: "100%", height: 40, borderRadius: 12, border: "none",
                                    padding: "0 14px", fontSize: 13.5, color: CLAY.textPrimary, outline: "none",
                                    fontFamily: CLAY.font, background: CLAY.surface,
                                    boxShadow: `inset 2px 2px 6px ${CLAY.darkShadow}, inset -2px -2px 6px ${CLAY.lightShadow}`,
                                }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                            <FieldLabel>Email address</FieldLabel>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: "100%", height: 40, borderRadius: 12, border: "none",
                                    padding: "0 14px", fontSize: 13.5, color: CLAY.accentText, outline: "none",
                                    fontFamily: CLAY.font, background: CLAY.surface,
                                    boxShadow: `inset 2px 2px 6px ${CLAY.darkShadow}, inset -2px -2px 6px ${CLAY.lightShadow}`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Preferences card */}
            <section style={{
                border: "none", borderRadius: 24, background: CLAY.surface, overflow: "hidden", marginBottom: 24,
                boxShadow: clayRaised(false),
            }}>
                <div style={{ padding: "16px 24px" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: CLAY.textPrimary }}>Preferences</h3>
                </div>

                <div style={{ padding: "6px 24px 8px" }}>
                    <PreferenceRow
                        title="Unit of Measure"
                        description="Default scaling for architectural drafting and 3D modeling."
                        control={
                            <SegmentedControl
                                value={unit}
                                onChange={setUnit}
                                options={[
                                    { value: "metric", label: "Metric (m, cm)" },
                                    { value: "imperial", label: "Imperial (ft, in)" },
                                ]}
                            />
                        }
                        last
                    />
                </div>
            </section>

            {/* Account & Subscription card */}
            <section style={{
                border: "none", borderRadius: 24, background: CLAY.surface, overflow: "hidden", marginBottom: 24,
                boxShadow: clayRaised(false),
            }}>
                <div style={{ padding: "16px 24px" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: CLAY.textPrimary }}>Account &amp; Subscription</h3>
                </div>

                <div style={{ padding: "12px 24px 24px", display: "flex", gap: 40, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <FieldLabel>Current tier</FieldLabel>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                            <span style={{
                                background: CLAY.surfaceChip, color: CLAY.textPrimary, fontSize: 11, fontWeight: 500,
                                padding: "4px 11px", borderRadius: 999, letterSpacing: "0.03em",
                                boxShadow: "-2px -2px 4px rgba(255,255,255,0.7), 2px 2px 5px rgba(0,0,0,0.14)",
                            }}>
                                {currentPlan.label.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 13, color: CLAY.accentText, fontWeight: 400 }}>
                                {currentPlan.priceMonthly === 0
                                    ? "Free plan"
                                    : `Billed monthly ($${currentPlan.priceMonthly.toFixed(2)}/mo)`}
                            </span>
                        </div>

                        {currentPlan.priceMonthly > 0 && (
                            <>
                                <FieldLabel>Renewal date</FieldLabel>
                                <p style={{ margin: "0 0 14px", fontSize: 13.5, fontWeight: 500, color: CLAY.textPrimary }}>
                                    {renewalLabel}
                                </p>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => setUpgradeOpen((o) => !o)}
                            onMouseEnter={() => setManageHovered(true)}
                            onMouseLeave={() => setManageHovered(false)}
                            style={{
                                fontSize: 13, fontWeight: 500, color: manageHovered ? CLAY.accentText : CLAY.textPrimary,
                                display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none",
                                padding: 0, cursor: "pointer", fontFamily: CLAY.font, transition: "color 160ms ease",
                            }}
                        >
                            {currentPlan.priceMonthly > 0 ? "Manage Subscription" : "View Plans"}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                        </button>
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                            <FieldLabel>Cloud storage</FieldLabel>
                            <span style={{ fontSize: 11.5, color: CLAY.textPlaceholder }}>
                                {storageUsedGb.toFixed(1)} GB of {storageTotalGb} GB
                            </span>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 500, color: CLAY.textPrimary }}>{storagePct}% used</p>
                        <div style={{
                            height: 10, borderRadius: 999, overflow: "hidden", marginBottom: 18,
                            background: CLAY.surface,
                            boxShadow: `inset 2px 2px 5px ${CLAY.darkShadow}, inset -2px -2px 5px ${CLAY.lightShadow}`,
                        }}>
                            <div style={{ width: `${storagePct}%`, height: "100%", background: storagePct > 90 ? CLAY.dangerText : CLAY.successText, borderRadius: 999 }} />
                        </div>

                        <ClayButton onClick={() => setUpgradeOpen(true)} fullWidth>
                            <ArrowUpIcon />
                            Upgrade Storage
                        </ClayButton>
                    </div>
                </div>

                {/* Plan comparison */}
                {upgradeOpen && (
                    <div style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6), 0 -1px 0 rgba(0,0,0,0.05)`, padding: "20px 24px 24px" }}>
                        <p style={{ margin: "0 0 14px", fontSize: 12.5, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: CLAY.textPlaceholder }}>
                            Choose a plan
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 14 }}>
                            {PLAN_ORDER.map((id) => {
                                const p = PRICING_PLANS[id];
                                const isCurrent = id === plan;
                                return (
                                    <div
                                        key={id}
                                        style={{
                                            border: "none", borderRadius: 18, padding: 16,
                                            background: isCurrent ? CLAY.accentSoft : CLAY.surface,
                                            boxShadow: isCurrent
                                                ? `inset 2px 2px 6px ${CLAY.darkShadow}, inset -2px -2px 6px ${CLAY.lightShadow}`
                                                : `inset 2px 2px 6px ${CLAY.darkShadow}, inset -2px -2px 6px ${CLAY.lightShadow}`,
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontSize: 13.5, fontWeight: 500, color: CLAY.textPrimary }}>{p.label}</span>
                                            {isCurrent && (
                                                <span style={{ fontSize: 10, fontWeight: 500, color: CLAY.successText, letterSpacing: "0.03em" }}>CURRENT</span>
                                            )}
                                        </div>
                                        <p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 500, color: CLAY.textPrimary }}>
                                            {p.priceMonthly === 0 ? "$0" : `$${p.priceMonthly}`}
                                            <span style={{ fontSize: 11.5, fontWeight: 400, color: CLAY.textPlaceholder }}>/mo</span>
                                        </p>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                                            {p.features.map((f) => (
                                                <div key={f} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <CheckIcon />
                                                    <span style={{ fontSize: 12, color: CLAY.textMuted }}>{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <ClayButton disabled={isCurrent} fullWidth variant={isCurrent ? "secondary" : "primary"}>
                                            {isCurrent ? "Current plan" : "Switch"}
                                        </ClayButton>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            {/* Footer actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, flexWrap: "wrap", gap: 12 }}>
                <button
                    type="button"
                    style={{
                        display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                        color: CLAY.dangerText, fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0,
                        fontFamily: CLAY.font,
                    }}
                >
                    Deactivate Account
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                    <ClayButton>Cancel</ClayButton>
                    <ClayButton onClick={handleSave} disabled={saving} variant="primary">
                        {saving ? "Saving…" : "Save Changes"}
                    </ClayButton>
                </div>
            </div>
        </div>
    );
}

function PreferenceRow({
    title, description, control, last,
}: {
    title: string;
    description: string;
    control: React.ReactNode;
    last?: boolean;
}) {
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
            padding: "18px 0",
            boxShadow: last ? "none" : `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`,
        }}>
            <div style={{ maxWidth: 380 }}>
                <p style={{ margin: "0 0 3px", fontSize: 13.5, fontWeight: 500, color: CLAY.textPrimary }}>{title}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: CLAY.textMuted }}>{description}</p>
            </div>
            <div style={{ flexShrink: 0 }}>{control}</div>
        </div>
    );
}