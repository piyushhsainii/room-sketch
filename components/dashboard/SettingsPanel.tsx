"use client";

import { PLAN_ORDER, PlanId, PRICING_PLANS } from "@/lib/pricing";
import { useEffect, useState } from "react";

function EditIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    );
}

function SunIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
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
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            style={{
                width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
                background: checked ? "#16a34a" : "rgba(15,23,42,0.15)",
                position: "relative", transition: "background 160ms ease", flexShrink: 0, padding: 0,
            }}
        >
            <span style={{
                position: "absolute", top: 3, left: checked ? 21 : 3,
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 160ms ease",
            }} />
        </button>
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
        <div style={{ display: "inline-flex", border: "1px solid rgba(15,23,42,0.12)", borderRadius: 8, padding: 3, background: "#fff", gap: 2 }}>
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "7px 14px", borderRadius: 6, border: active ? "1px solid rgba(15,23,42,0.9)" : "1px solid transparent",
                            background: active ? "#e0e7ff" : "transparent",
                            color: active ? "#1e1b4b" : "rgba(15,23,42,0.55)",
                            fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
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
        <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(15,23,42,0.45)", marginBottom: 6 }}>
            {children}
        </label>
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
    onSave?: (values: { fullName: string; email: string; unit: "metric" | "imperial"; appearance: "light" | "dark"; highPrecision: boolean }) => Promise<void> | void;
}) {
    const derivedName = fullNameProp || (userEmail ? userEmail.split("@")[0] : "");

    const [fullName, setFullName] = useState(derivedName);
    const [email, setEmail] = useState(userEmail || "");
    const [unit, setUnit] = useState<"metric" | "imperial">("metric");
    const [appearance, setAppearance] = useState<"light" | "dark">("light");
    const [highPrecision, setHighPrecision] = useState(plan !== "free");
    const [saving, setSaving] = useState(false);
    const [upgradeOpen, setUpgradeOpen] = useState(false);

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
                await onSave({ fullName, email, unit, appearance, highPrecision });
            } else {
                await fetch("/api/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fullName, email, unit, appearance, highPrecision }),
                });
            }
        } catch (err) {
            console.error("Failed to save settings", err);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ padding: "28px 36px 60px", maxWidth: 720, marginInline: "auto" }}>
            {/* Header */}
            <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", color: "#0f172a" }}>
                Account Settings
            </h1>
            <p style={{ margin: "0 0 28px", fontSize: 13.5, color: "rgba(15,23,42,0.5)" }}>
                Manage your profile, application preferences, and subscription details.
            </p>

            {/* Profile card */}
            <section style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 14, background: "#fff", padding: 24, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: "50%", overflow: "hidden",
                            background: "#e2e8f0", border: "1px solid rgba(15,23,42,0.08)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <span style={{ fontSize: 20, fontWeight: 700, color: "rgba(15,23,42,0.4)" }}>
                                    {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            aria-label="Change avatar"
                            style={{
                                position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%",
                                background: "#0f172a", border: "2px solid #fff", display: "flex",
                                alignItems: "center", justifyContent: "center", cursor: "pointer",
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
                                    width: "100%", height: 38, borderRadius: 8, border: "1px solid rgba(15,23,42,0.15)",
                                    padding: "0 12px", fontSize: 13.5, color: "#0f172a", outline: "none",
                                }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                            <FieldLabel>Email address</FieldLabel>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: "100%", height: 38, borderRadius: 8, border: "1px solid rgba(15,23,42,0.15)",
                                    padding: "0 12px", fontSize: 13.5, color: "#2563eb", outline: "none",
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Preferences card */}
            <section style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 14, background: "#fff", overflow: "hidden", marginBottom: 24 }}>
                <div style={{ background: "#e8ecfb", padding: "14px 24px" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Preferences</h3>
                </div>

                <div style={{ padding: "6px 24px 4px" }}>
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
                    />
                    <PreferenceRow
                        title="Appearance"
                        description="Choose how RoomSketch looks on your device."
                        control={
                            <SegmentedControl
                                value={appearance}
                                onChange={setAppearance}
                                options={[
                                    { value: "light", label: "Light", icon: <SunIcon /> },
                                    { value: "dark", label: "Dark", icon: <MoonIcon /> },
                                ]}
                            />
                        }
                    />
                    <PreferenceRow
                        title="High-Precision Rendering"
                        description={plan === "free" ? "Available on Basic and Pro plans." : "Enables 4K export and sub-millimeter snapping."}
                        control={<Toggle checked={highPrecision && plan !== "free"} onChange={(v) => plan !== "free" && setHighPrecision(v)} />}
                        last
                    />
                </div>
            </section>

            {/* Account & Subscription card */}
            <section style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 14, background: "#fff", overflow: "hidden", marginBottom: 24 }}>
                <div style={{ background: "#e8ecfb", padding: "14px 24px" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Account &amp; Subscription</h3>
                </div>

                <div style={{ padding: "20px 24px 24px", display: "flex", gap: 40, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <FieldLabel>Current tier</FieldLabel>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                            <span style={{
                                background: "#0f172a", color: "#fff", fontSize: 11, fontWeight: 700,
                                padding: "3px 9px", borderRadius: 5, letterSpacing: "0.03em",
                            }}>
                                {currentPlan.label.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 13, color: "#2563eb", fontWeight: 500 }}>
                                {currentPlan.priceMonthly === 0
                                    ? "Free plan"
                                    : `Billed monthly ($${currentPlan.priceMonthly.toFixed(2)}/mo)`}
                            </span>
                        </div>

                        {currentPlan.priceMonthly > 0 && (
                            <>
                                <FieldLabel>Renewal date</FieldLabel>
                                <p style={{ margin: "0 0 14px", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                                    {renewalLabel}
                                </p>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => setUpgradeOpen((o) => !o)}
                            style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: 0, cursor: "pointer" }}
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
                            <span style={{ fontSize: 11.5, color: "rgba(15,23,42,0.45)" }}>
                                {storageUsedGb.toFixed(1)} GB of {storageTotalGb} GB
                            </span>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{storagePct}% used</p>
                        <div style={{ height: 8, borderRadius: 999, background: "rgba(15,23,42,0.08)", overflow: "hidden", marginBottom: 18 }}>
                            <div style={{ width: `${storagePct}%`, height: "100%", background: storagePct > 90 ? "#dc2626" : "#16a34a", borderRadius: 999 }} />
                        </div>

                        <button
                            type="button"
                            onClick={() => setUpgradeOpen(true)}
                            style={{
                                width: "100%", height: 38, borderRadius: 8, border: "none", background: "#0f172a",
                                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                            }}
                        >
                            <ArrowUpIcon />
                            Upgrade Storage
                        </button>
                    </div>
                </div>

                {/* Plan comparison */}
                {upgradeOpen && (
                    <div style={{ borderTop: "1px solid rgba(15,23,42,0.08)", padding: "20px 24px 24px" }}>
                        <p style={{ margin: "0 0 14px", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(15,23,42,0.45)" }}>
                            Choose a plan
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                            {PLAN_ORDER.map((id) => {
                                const p = PRICING_PLANS[id];
                                const isCurrent = id === plan;
                                return (
                                    <div
                                        key={id}
                                        style={{
                                            border: isCurrent ? "1.5px solid #0f172a" : "1px solid rgba(15,23,42,0.1)",
                                            borderRadius: 12, padding: 16, background: isCurrent ? "#f8fafc" : "#fff",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{p.label}</span>
                                            {isCurrent && (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", letterSpacing: "0.03em" }}>CURRENT</span>
                                            )}
                                        </div>
                                        <p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                                            {p.priceMonthly === 0 ? "$0" : `$${p.priceMonthly}`}
                                            <span style={{ fontSize: 11.5, fontWeight: 500, color: "rgba(15,23,42,0.45)" }}>/mo</span>
                                        </p>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                                            {p.features.map((f) => (
                                                <div key={f} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <CheckIcon />
                                                    <span style={{ fontSize: 12, color: "rgba(15,23,42,0.65)" }}>{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isCurrent}
                                            style={{
                                                width: "100%", height: 32, borderRadius: 7, fontSize: 12, fontWeight: 600,
                                                border: isCurrent ? "1px solid rgba(15,23,42,0.12)" : "none",
                                                background: isCurrent ? "transparent" : "#0f172a",
                                                color: isCurrent ? "rgba(15,23,42,0.4)" : "#fff",
                                                cursor: isCurrent ? "default" : "pointer",
                                            }}
                                        >
                                            {isCurrent ? "Current plan" : "Switch"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            {/* Footer actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
                <button
                    type="button"
                    style={{
                        display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                        color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0,
                    }}
                >
                    Deactivate Account
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        type="button"
                        style={{
                            height: 38, padding: "0 18px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.15)",
                            background: "#fff", color: "rgba(15,23,42,0.7)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            height: 38, padding: "0 18px", borderRadius: 8, border: "none",
                            background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600,
                            cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
                        }}
                    >
                        {saving ? "Saving…" : "Save Changes"}
                    </button>
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
            padding: "16px 0", borderBottom: last ? "none" : "1px solid rgba(15,23,42,0.06)",
        }}>
            <div style={{ maxWidth: 380 }}>
                <p style={{ margin: "0 0 3px", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{title}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: "rgba(15,23,42,0.5)" }}>{description}</p>
            </div>
            <div style={{ flexShrink: 0 }}>{control}</div>
        </div>
    );
}