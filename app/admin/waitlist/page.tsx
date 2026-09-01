// PATH: app/admin/waitlist/page.tsx
"use client";

import { useEffect, useState } from "react";

type WaitlistEntry = {
    id: string;
    email: string;
    created_at: string;
};

export default function WaitlistBroadcastPage() {
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sendToAll, setSendToAll] = useState(true);

    const [subject, setSubject] = useState("");
    const [bodyText, setBodyText] = useState("");

    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/waitlist")
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error ?? `Failed to load (${res.status})`);
                }
                return res.json();
            })
            .then((data) => setEntries(data.entries ?? []))
            .catch((err) => setLoadError(err.message))
            .finally(() => setLoadingEntries(false));
    }, []);

    function toggleSelected(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleSend() {
        setSending(true);
        setSendError(null);
        setResult(null);
        try {
            const res = await fetch("/api/admin/waitlist/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject,
                    bodyHtml: bodyText,
                    recipientIds: sendToAll ? "all" : Array.from(selected),
                }),
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

    const recipientCount = sendToAll ? entries.length : selected.size;
    const canSend = subject.trim().length > 0 && bodyText.trim().length > 0 && recipientCount > 0 && !sending;

    return (
        <div
            className="min-h-screen px-6 py-12"
            style={{ background: "#E5E5E5", fontFamily: "'Quicksand','Nunito',sans-serif" }}
        >
            <div className="max-w-[720px] mx-auto">
                <h1 className="text-[1.6rem] mb-1" style={{ color: "#1A1A1A", fontWeight: 500 }}>
                    Waitlist broadcast
                </h1>
                <p className="text-[13px] mb-8" style={{ color: "#666" }}>
                    Send a custom email to your waitlist. Recipients are pulled live from the{" "}
                    <code style={{ background: "#EAEAEA", padding: "1px 5px", borderRadius: 4 }}>waitlist</code> table.
                </p>

                {/* Recipients */}
                <Card>
                    <SectionLabel>Recipients</SectionLabel>

                    {loadingEntries ? (
                        <p className="text-[13px]" style={{ color: "#999" }}>Loading waitlist…</p>
                    ) : loadError ? (
                        <p className="text-[13px]" style={{ color: "#C0392B" }}>{loadError}</p>
                    ) : (
                        <>
                            <label className="flex items-center gap-2 mb-3 text-[13.5px]" style={{ color: "#333" }}>
                                <input
                                    type="checkbox"
                                    checked={sendToAll}
                                    onChange={(e) => setSendToAll(e.target.checked)}
                                />
                                Send to everyone ({entries.length})
                            </label>

                            {!sendToAll && (
                                <div
                                    className="rounded-[14px] max-h-[260px] overflow-y-auto"
                                    style={{ background: "#F5F5F5", border: "1px solid rgba(0,0,0,0.06)" }}
                                >
                                    {entries.length === 0 ? (
                                        <div className="p-4 text-[12.5px]" style={{ color: "#999" }}>No waitlist entries.</div>
                                    ) : (
                                        entries.map((e) => (
                                            <label
                                                key={e.id}
                                                className="flex items-center gap-2 px-4 py-2.5 text-[13px] cursor-pointer"
                                                style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", color: "#333" }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(e.id)}
                                                    onChange={() => toggleSelected(e.id)}
                                                />
                                                {e.email}
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </Card>

                {/* Compose */}
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
                        Your message is wrapped in the RoomSketch email theme automatically — just write plain text.
                    </p>
                </Card>

                {/* Send */}
                <div className="flex items-center gap-3 mt-2">
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
                        {sending ? "Sending…" : `Send to ${recipientCount} ${recipientCount === 1 ? "person" : "people"}`}
                    </button>

                    {result && (
                        <span className="text-[12.5px]" style={{ color: "#3D9A5C" }}>
                            Sent {result.sent}/{result.total}{result.failed > 0 ? ` (${result.failed} failed)` : ""}
                        </span>
                    )}
                    {sendError && (
                        <span className="text-[12.5px]" style={{ color: "#C0392B" }}>{sendError}</span>
                    )}
                </div>
            </div>
        </div>
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
        <div
            className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4"
            style={{ color: "#8892A6" }}
        >
            {children}
        </div>
    );
}