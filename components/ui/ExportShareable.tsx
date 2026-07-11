// components/workspace/ShareDialog.tsx
import React, { useState } from 'react'
import { THEME } from '../workspace/FloorPlanEditor';

export function ShareDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    React.useEffect(() => {
        setLoading(true)
        fetch('/api/workspace/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, enabled: true }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.ok) setShareUrl(`${window.location.origin}/share/${data.share_token}`)
            })
            .finally(() => setLoading(false))
    }, [projectId])

    const handleCopy = () => {
        if (!shareUrl) return
        navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    const shareTargets = shareUrl ? [
        { label: 'Twitter', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check out my floor plan')}` },
        { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(shareUrl)}` },
        { label: 'Email', href: `mailto:?subject=${encodeURIComponent('Floor plan')}&body=${encodeURIComponent(shareUrl)}` },
    ] : []

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ width: 380, background: THEME.bgPanel, borderRadius: 12, padding: 20, boxShadow: THEME.shadowLg, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>Share Floor Plan</span>
                    <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: THEME.textMuted, cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>

                <p style={{ fontSize: 12, color: THEME.textMuted, margin: 0 }}>
                    Anyone with this link can view a read-only version of your floor plan — no account needed.
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        readOnly
                        value={loading ? 'Generating link…' : shareUrl ?? ''}
                        style={{ flex: 1, height: 34, borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA', color: THEME.text, fontSize: 12, padding: '0 10px', outline: 'none' }}
                    />
                    <button
                        onClick={handleCopy}
                        disabled={!shareUrl}
                        style={{ height: 34, padding: '0 14px', borderRadius: 6, border: 'none', background: copied ? '#10B981' : THEME.accent, color: 'white', fontSize: 12, fontWeight: 600, cursor: shareUrl ? 'pointer' : 'not-allowed' }}
                    >
                        {copied ? 'Copied ✓' : 'Copy'}
                    </button>
                </div>

                {shareUrl && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {shareTargets.map(t => (
                            <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer"
                                style={{ flex: 1, textAlign: 'center', height: 32, lineHeight: '32px', borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA', color: THEME.textMuted, fontSize: 11, textDecoration: 'none' }}>
                                {t.label}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}