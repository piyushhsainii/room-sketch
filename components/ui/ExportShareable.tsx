// components/workspace/ShareDialog.tsx
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { THEME } from '../workspace/FloorPlanEditor';

function GlobeIcon({ color }: { color: string }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 4 6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6-4-9s1.5-6.3 4-9z" />
        </svg>
    );
}

function LinkIcon({ color }: { color: string }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17H7a5 5 0 0 1 0-10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </svg>
    );
}

function TwitterIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.7L4.6 22H1.4l8.1-9.3L1 2h7l4.9 6.1L18.9 2zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20z" />
        </svg>
    );
}

function WhatsAppIcon() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.52 3.63 1.42 5.13L2 22l5.13-1.5a9.87 9.87 0 0 0 4.9 1.3h.01c5.46 0 9.9-4.45 9.9-9.91S17.5 2 12.04 2zm0 18.1c-1.53 0-3-.4-4.29-1.16l-.31-.18-3.05.89.9-2.97-.2-.31a8.03 8.03 0 0 1-1.28-4.38c0-4.45 3.62-8.06 8.08-8.06a8.02 8.02 0 0 1 8.06 8.08c0 4.45-3.62 8.09-8.06 8.09zm4.42-6.06c-.24-.12-1.43-.7-1.65-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.28.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.11 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28z" />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M2 7l10 6 10-6" />
        </svg>
    );
}

const POPOVER_WIDTH = 360
const MARGIN = 12
const GAP = 10

export function ShareDialog({ projectId, onClose, anchorEl }: { projectId: string; onClose: () => void; anchorEl?: HTMLElement | null }) {
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [pos, setPos] = useState<{ top: number; left: number; pointerLeft: number; openUp: boolean } | null>(null)
    const [visible, setVisible] = useState(false)

    // Enter transition — mount at scale(0.95)/opacity 0, flip to full on
    // the next frame so the browser actually animates the change instead
    // of skipping straight to the end state.
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true))
        return () => cancelAnimationFrame(raf)
    }, [])

    // Exit transition — play the reverse animation, THEN unmount via
    // onClose. Without this, onClose() would remove the component
    // immediately and there'd be nothing left on screen to animate.
    function handleClose() {
        setVisible(false)
        setTimeout(onClose, 160)
    }

    useEffect(() => {
        function computePosition() {
            const popoverEstHeight = 260 // enough for the header+link+targets before first paint measures real height

            if (!anchorEl) {
                setPos({ top: 64, left: window.innerWidth - POPOVER_WIDTH - 24, pointerLeft: POPOVER_WIDTH - 40, openUp: false })
                return
            }

            const rect = anchorEl.getBoundingClientRect()

            // Right-align to the card's right edge, opening ABOVE the card
            // (top of card) with the popover's bottom sitting just above
            // the card's top — per "show it on right and top of this card".
            let left = rect.right - POPOVER_WIDTH
            left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN))

            const spaceAbove = rect.top
            const openUp = spaceAbove > popoverEstHeight + GAP

            const top = openUp
                ? rect.top - GAP // bottom-anchored via translateY in the style below
                : rect.bottom + GAP

            const pointerLeft = Math.min(
                Math.max(rect.left + rect.width / 2 - left - 6, 16),
                POPOVER_WIDTH - 28
            )

            setPos({ top, left, pointerLeft, openUp })
        }

        computePosition()
        window.addEventListener('resize', computePosition)
        window.addEventListener('scroll', computePosition, true)
        return () => {
            window.removeEventListener('resize', computePosition)
            window.removeEventListener('scroll', computePosition, true)
        }
    }, [anchorEl])

    useEffect(() => {
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
        { label: 'Twitter', icon: TwitterIcon, bg: '#000000', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check out my floor plan')}` },
        { label: 'WhatsApp', icon: WhatsAppIcon, bg: '#25D366', href: `https://wa.me/?text=${encodeURIComponent(shareUrl)}` },
        { label: 'Email', icon: MailIcon, bg: '#4F46E5', href: `mailto:?subject=${encodeURIComponent('Floor plan')}&body=${encodeURIComponent(shareUrl)}` },
    ] : []

    if (!pos) return null

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={handleClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    width: POPOVER_WIDTH,
                    background: THEME.bgPanel,
                    borderRadius: 14,
                    padding: 20,
                    boxShadow: '0 20px 48px rgba(15,23,42,0.18), 0 4px 14px rgba(15,23,42,0.08)',
                    border: `1px solid ${THEME.borderStrong}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    transformOrigin: pos.openUp ? 'bottom right' : 'top right',
                    transform: `translateY(${pos.openUp ? '-100%' : '0%'}) scale(${visible ? 1 : 0.95})`,
                    opacity: visible ? 1 : 0,
                    transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease',
                }}
            >
                {/* Pointer, anchored under/above the trigger button's actual
                    on-screen position, flipping side depending on open direction. */}
                <div style={{
                    position: 'absolute',
                    ...(pos.openUp
                        ? { bottom: -6, borderRight: `1px solid ${THEME.borderStrong}`, borderBottom: `1px solid ${THEME.borderStrong}` }
                        : { top: -6, borderLeft: `1px solid ${THEME.borderStrong}`, borderTop: `1px solid ${THEME.borderStrong}` }),
                    left: pos.pointerLeft, width: 12, height: 12,
                    background: THEME.bgPanel, transform: 'rotate(45deg)',
                }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: THEME.text, letterSpacing: '-0.01em' }}>Share Floor Plan</span>
                    <button
                        onClick={handleClose}
                        style={{
                            width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent',
                            color: THEME.textMuted, cursor: 'pointer', fontSize: 16, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', transition: 'background 120ms ease, color 120ms ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.06)'; e.currentTarget.style.color = THEME.text }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = THEME.textMuted }}
                    >
                        ×
                    </button>
                </div>

                <p style={{ fontSize: 12.5, color: THEME.textMuted, margin: 0, display: 'flex', alignItems: 'flex-start', gap: 7, lineHeight: 1.5 }}>
                    <span style={{ marginTop: 1, flexShrink: 0 }}><GlobeIcon color={THEME.textMuted} /></span>
                    Anyone with this link can view a read-only version — no account needed.
                </p>

                {/* Link + copy */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 8, height: 38, borderRadius: 8,
                        border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA', padding: '0 12px', minWidth: 0,
                    }}>
                        <span style={{ flexShrink: 0, display: 'flex' }}><LinkIcon color={THEME.textMuted} /></span>
                        <input
                            readOnly
                            value={loading ? 'Generating link…' : shareUrl ?? ''}
                            onFocus={(e) => e.currentTarget.select()}
                            style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: THEME.text, fontSize: 12.5, outline: 'none' }}
                        />
                    </div>
                    <button
                        onClick={handleCopy}
                        disabled={!shareUrl}
                        title="Copy link"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 8,
                            border: 'none', background: copied ? '#10B981' : THEME.accent, color: 'white',
                            fontSize: 12.5, fontWeight: 600, cursor: shareUrl ? 'pointer' : 'not-allowed',
                            transition: 'background 150ms ease, transform 100ms ease', flexShrink: 0,
                        }}
                        onMouseDown={e => { if (shareUrl) e.currentTarget.style.transform = 'scale(0.96)' }}
                        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                    >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>

                {/* Share targets — colored icon chips with labels underneath */}
                {shareUrl && (
                    <div style={{ display: 'flex', gap: 10 }}>
                        {shareTargets.map(t => {
                            const Icon = t.icon;
                            return (
                                <a
                                    key={t.label}
                                    href={t.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                                        padding: '12px 0 10px', borderRadius: 10, border: `1px solid ${THEME.borderStrong}`,
                                        background: '#FAFAFA', textDecoration: 'none',
                                        transition: 'background 150ms ease, border-color 150ms ease, transform 120ms ease',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = '#F0F1F5'
                                        e.currentTarget.style.borderColor = 'rgba(15,23,42,0.18)'
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = '#FAFAFA'
                                        e.currentTarget.style.borderColor = THEME.borderStrong
                                        e.currentTarget.style.transform = 'translateY(0)'
                                    }}
                                >
                                    <span style={{
                                        width: 30, height: 30, borderRadius: '50%', background: t.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <Icon />
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: THEME.textMuted }}>{t.label}</span>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}