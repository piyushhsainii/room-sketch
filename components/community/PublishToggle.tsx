// components/community/PublishToggle.tsx
"use client"

import { useState } from "react"
import { THEME } from "@/components/workspace/FloorPlanEditor"

interface PublishToggleProps {
    projectId: string
    initialPublished: boolean
    onPublishedChange?: (published: boolean) => void
}

export default function PublishToggle({ projectId, initialPublished, onPublishedChange }: PublishToggleProps) {
    const [published, setPublished] = useState(initialPublished)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const toggle = async (next: boolean) => {
        setBusy(true)
        setError(null)
        try {
            const res = await fetch(`/api/projects/${projectId}/publish`, {
                method: next ? "POST" : "DELETE",
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? "Failed to update.")
            }
            setPublished(next)
            onPublishedChange?.(next)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: THEME.textMuted, cursor: busy ? "not-allowed" : "pointer" }}>
                <input
                    type="checkbox"
                    checked={published}
                    disabled={busy}
                    onChange={e => toggle(e.target.checked)}
                />
                List on Community page
                <span style={{ fontSize: 10.5, color: THEME.textFaint }}>
                    (anyone can view read-only, ranked by stars)
                </span>
            </label>
            {error && <div style={{ fontSize: 10.5, color: "#EF4444" }}>{error}</div>}
        </div>
    )
}