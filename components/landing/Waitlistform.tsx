"use client";

import { useState, FormEvent } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm({
    id = "waitlist",
    align = "left",
}: {
    id?: string;
    align?: "left" | "center";
}) {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [message, setMessage] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (status === "loading") return;
        setStatus("loading");
        setMessage(null);

        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (!res.ok) {
                setStatus("error");
                setMessage(data.error ?? "Something went wrong. Try again.");
                return;
            }

            setStatus("success");
            setMessage(
                data.alreadyOnList
                    ? "You're already on the list — we'll be in touch."
                    : "You're on the list. We'll email you when it's ready."
            );
            setEmail("");
        } catch {
            setStatus("error");
            setMessage("Something went wrong. Try again.");
        }
    }

    if (status === "success") {
        return (
            <div
                id={id}
                className={`font-mono text-[13px] text-blue ${align === "center" ? "text-center" : ""}`}
            >
                {message}
            </div>
        );
    }

    return (
        <div id={id} className={align === "center" ? "text-center" : ""}>
            <form
                onSubmit={handleSubmit}
                className="flex items-stretch gap-2 flex-wrap"
            >
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    disabled={status === "loading"}
                    className="flex-1 min-w-[220px] bg-paper border border-line-strong text-ink text-[14px] placeholder:text-muted px-4 py-3 rounded-[7px] outline-none focus:border-ink transition-colors disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={status === "loading"}
                    className="bg-ink text-white text-[14px] font-medium px-7 py-3 rounded-[7px] hover:bg-[#0E0E10] transition-colors disabled:opacity-60 whitespace-nowrap"
                    style={{ backgroundColor: "#12213E" }}
                >
                    {status === "loading" ? "Joining…" : "Join the waitlist"}
                </button>
            </form>
            {status === "error" && message && (
                <p className="font-mono text-[11px] text-red-600 mt-2">{message}</p>
            )}
        </div>
    );
}