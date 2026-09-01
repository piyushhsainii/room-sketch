// PATH: app/admin/broadcast/page.tsx
"use client";

import { useEffect, useState } from "react";

type Person = { id: string; email: string; created_at: string };

export default function BroadcastPage() {
    const [users, setUsers] = useState<Person[]>([]);
    const [waitlist, setWaitlist] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [selectedWaitlist, setSelectedWaitlist] = useState<Set<string>>(new Set());
    const [customEmails, setCustomEmails] = useState("");

    const [subject, setSubject] = useState("");
    const [bodyText, setBodyText] = useState("");

    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/recipients")
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error ?? `Failed to load (${res.status})`);
                }
                return res.json();
            })
            .then((data) => {
                setUsers(data.users ?? []);
                setWaitlist(data.waitlist ?? []);
            })
            .catch((err) => setLoadError(err.message))
            .finally(() => setLoading(false));
    }, []);

    function toggle(set: Set<string>, setFn: (s: Set<string>) => void, email: string) {
        const next = new Set(set);
        if (next.has(email)) next.delete(email);
        else next.add(email);
        setFn(next);
    }

    function toggleAll(list: Person[], set: Set<string>, setFn: (s: Set<string>) => void) {
        if (set.size === list.length) setFn(new Set());
        else setFn(new Set(list.map((p) => p.email)));
    }

    const customList = customEmails
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter(Boolean);

    const finalEmails = Array.from(
        new Set([...selectedUsers, ...selectedWaitlist, ...customList])
    );

    const canSend = subject.trim().length > 0 && bodyText.trim().length > 0 && finalEmails.length > 0 && !sending;

    async function handleSend() {
        setSending(true);
        setSendError(null);
        setResult(null);
        try {
            const res = await fetch("/api/admin/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject, bodyHtml: bodyText, emails: finalEmails }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `Send failed (${res.status})`);
            setResult(data);
        } catch (err: any) {
            setSendError(err.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <div
            className="min-h-screen px-6 py-12"
            style={{ background: "#E5E5E5", fontFamily: "'Quicksand','Nunito',sans-serif" }}
        >
            <div className="max-w-[760px] mx-auto">
                <h1 className="text-[1.6rem] mb-1" style={{ color: "#1A1A1A", fontWeight: 500 }}>
                    Broadcast email
                </h1>
                <p className="text-[13px] mb-8" style={{ color: "#666" }}>
                    Pick recipients from app users, the waitlist, or paste custom addresses — all three combine into one send.
                </p>

                {loadError && (
                    <Card>
                        <p className="text-[13px]" style={{ color: "#C0392B" }}>{loadError}</p>
                    </Card>
                )}

                {loading ? (
                    <Card>
                        <p className="text-[13px]" style={{ color: "#999" }}>Loading recipients…</p>
                    </Card>
                ) : (
                    <>
                        <RecipientList
                            title={`App users (${users.length})`}
                            people={users}
                            selected={selectedUsers}
                            onToggle={(email) => toggle(selectedUsers, setSelectedUsers, email)}
                            onToggleAll={() => toggleAll(users, selectedUsers, setSelectedUsers)}
                        />

                        <RecipientList
                            title={`Waitlist (${waitlist.length})`}
                            people={waitlist}
                            selected={selectedWaitlist}
                            onToggle={(email) => toggle(selectedWaitlist, setSelectedWaitlist, email)}
                            onToggleAll={() => toggleAll(waitlist, selectedWaitlist, setSelectedWaitlist)}
                        />
                    </>
                )}

                <Card>
                    <SectionLabel>Custom emails</SectionLabel>
                    <textarea
                        value={customEmails}
                        onChange={(e) => setCustomEmails(e.target.value)}
                        placeholder="one@example.com, another@example.com&#10;or one per line"
                        rows={3}
                        className="w-full px-4 py-3 rounded-[14px] text-[13px] outline-none resize-y"
                        style={{ background: "#F5F5F5", border: "1px solid rgba(0,0,0,0.06)", color: "#1A1A1A" }}
                    />
                    {customList.length > 0 && (
                        <p className="text-[11px] mt-2" style={{ color: "#999" }}>
                            {customList.length} address{customList.length === 1 ? "" : "es"} parsed
                        </p>
                    )}
                </Card>

                <Card>
                    <SectionLabel>Compose</SectionLabel>
                    <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject line"
                        className="w-full mb-3 px-4 py-3 rounded-[14px] text-[13.5px] outline-none"
                        style={{ background: "#F5F5F5", border: "1px solid rgba(0,0,0,0.06)", color: "#1A1A1A" }}
                    />
                    <textarea
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder="Write your message. Separate paragraphs with a blank line."
                        rows={10}
                        className="w-full px-4 py-3 rounded-[14px] text-[13.5px] outline-none resize-y"
                        style={{ background: "#F5F5F5", border: "1px solid rgba(0,0,0,0.06)", color: "#1A1A1A" }}
                    />
                    <p className="text-[11px] mt-2" style={{ color: "#999" }}>
                        Wrapped automatically in the RoomSketch email theme — just write plain text.
                    </p>
                </Card>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSend}
                        disabled={!canSend}
                        className="px-6 py-[12px] rounded-[16px] text-[13.5px] transition-shadow"
                        style={{
                            fontWeight: 500,
                            color: "#1A1A1A",
                            background: "#F5F5F5",
                            boxShadow: "-5px -5px 10px rgba(255,255,255,0.8), 5px 5px 12px rgba(0,0,0,0.14)",
                            opacity: canSend ? 1 : 0.5,
                            cursor: canSend ? "pointer" : "default",
                        }}
                    >
                        {sending ? "Sending…" : `Send to ${finalEmails.length} ${finalEmails.length === 1 ? "person" : "people"}`}
                    </button>

                    {result && (
                        <span className="text-[12.5px]" style={{ color: "#3D9A5C" }}>
                            Sent {result.sent}/{result.total}{result.failed > 0 ? ` (${result.failed} failed)` : ""}
                        </span>
                    )}
                    {sendError && <span className="text-[12.5px]" style={{ color: "#C0392B" }}>{sendError}</span>}
                </div>
            </div>
        </div>
    );
}

function RecipientList({
    title,
    people,
    selected,
    onToggle,
    onToggleAll,
}: {
    title: string;
    people: Person[];
    selected: Set<string>;
    onToggle: (email: string) => void;
    onToggleAll: () => void;
}) {
    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <SectionLabel>{title}</SectionLabel>
                <button
                    onClick={onToggleAll}
                    className="text-[11.5px]"
                    style={{ color: "#556", textDecoration: "underline" }}
                >
                    {selected.size === people.length && people.length > 0 ? "Deselect all" : "Select all"}
                </button>
            </div>
            <div
                className="rounded-[14px] max-h-[220px] overflow-y-auto"
                style={{ background: "#F5F5F5", border: "1px solid rgba(0,0,0,0.06)" }}
            >
                {people.length === 0 ? (
                    <div className="p-4 text-[12.5px]" style={{ color: "#999" }}>None found.</div>
                ) : (
                    people.map((p) => (
                        <label
                            key={p.id}
                            className="flex items-center gap-2 px-4 py-2.5 text-[13px] cursor-pointer"
                            style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", color: "#333" }}
                        >
                            <input type="checkbox" checked={selected.has(p.email)} onChange={() => onToggle(p.email)} />
                            {p.email}
                        </label>
                    ))
                )}
            </div>
        </Card>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="rounded-[24px] p-6 mb-6"
            style={{
                background: "#EAEAEA",
                boxShadow: "-5px -5px 12px rgba(255,255,255,0.7), 5px 5px 14px rgba(0,0,0,0.10)",
            }}
        >
            {children}
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: "#8892A6" }}>
            {children}
        </div>
    );
}