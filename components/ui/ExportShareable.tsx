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

// ---- Claymorphism theme tokens (shared across dashboard components) ----
const CLAY = {
    canvas: "#E5E5E5",
    surface: "#EAEAEA",
    surfaceChip: "#F5F5F5",
    textPrimary: "#1A1A1A",
    textMuted: "#5A5A5A",
    textPlaceholder: "#999999",
    lightShadow: "rgba(255,255,255,0.75)",
    darkShadow: "rgba(0,0,0,0.14)",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
}

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`
        : `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`

export function ShareDialog({ projectId, onClose, anchorEl }: { projectId: string; onClose: () => void; anchorEl?: HTMLElement | null }) {
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [pos, setPos] = useState<{ top: number; left: number; pointerLeft: number; openUp: boolean } | null>(null)
    const [visible, setVisible] = useState(false)
    const [closeHovered, setCloseHovered] = useState(false)
    const [copyHovered, setCopyHovered] = useState(false)
    const [hoveredTarget, setHoveredTarget] = useState<string | null>(null)

    const [published, setPublished] = useState(false)
    const [publishLoading, setPublishLoading] = useState(true)
    const [publishBusy, setPublishBusy] = useState(false)
    const [publishError, setPublishError] = useState<string | null>(null)

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true))
        return () => cancelAnimationFrame(raf)
    }, [])
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

    useEffect(() => {
        let cancelled = false
        setPublishLoading(true)
        fetch(`/api/projects/${projectId}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (cancelled) return
                const proj = data.project ?? data
                setPublished(!!proj.published)
            })
            .catch(err => console.error('[ShareDialog] failed to load publish state:', err))
            .finally(() => { if (!cancelled) setPublishLoading(false) })
        return () => { cancelled = true }
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

    const handleTogglePublish = async (next: boolean) => {
        setPublishBusy(true)
        setPublishError(null)
        try {
            const res = await fetch(`/api/projects/${projectId}/publish`, {
                method: next ? 'POST' : 'DELETE',
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? 'Failed to update.')
            }
            setPublished(next)
            const body = await res.json().catch(() => null)
            if (next && body?.share_token && !shareUrl) {
                setShareUrl(`${window.location.origin}/share/${body.share_token}`)
            }
        } catch (err: any) {
            setPublishError(err.message)
        } finally {
            setPublishBusy(false)
        }
    }

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
                    background: CLAY.surface,
                    borderRadius: 24,
                    padding: 22,
                    boxShadow: `0 24px 48px rgba(0,0,0,0.16), -6px -6px 14px ${CLAY.lightShadow}, 6px 6px 16px ${CLAY.darkShadow}`,
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    fontFamily: CLAY.font,
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
                        ? { bottom: -6 }
                        : { top: -6 }),
                    left: pos.pointerLeft, width: 12, height: 12,
                    background: CLAY.surface, transform: 'rotate(45deg)',
                    boxShadow: pos.openUp
                        ? `4px 4px 6px -2px rgba(0,0,0,0.10)`
                        : `-4px -4px 6px -2px rgba(0,0,0,0.10)`,
                }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: CLAY.textPrimary, letterSpacing: 'normal' }}>Share Floor Plan</span>
                    <button
                        onClick={handleClose}
                        onMouseEnter={() => setCloseHovered(true)}
                        onMouseLeave={() => setCloseHovered(false)}
                        style={{
                            width: 28, height: 28, borderRadius: '50%', border: 'none', background: closeHovered ? CLAY.surfaceChip : 'transparent',
                            color: CLAY.textMuted, cursor: 'pointer', fontSize: 16, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            boxShadow: closeHovered ? 'inset 2px 2px 5px rgba(0,0,0,0.14), inset -2px -2px 5px rgba(255,255,255,0.7)' : 'none',
                            transition: 'background 160ms ease, color 160ms ease, box-shadow 160ms ease',
                        }}
                    >
                        ×
                    </button>
                </div>

                <p style={{ fontSize: 12.5, color: CLAY.textMuted, margin: 0, display: 'flex', alignItems: 'flex-start', gap: 7, lineHeight: 1.5 }}>
                    <span style={{ marginTop: 1, flexShrink: 0 }}><GlobeIcon color={CLAY.textMuted} /></span>
                    Anyone with this link can view a read-only version — no account needed.
                </p>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    height: 42, borderRadius: 999, border: 'none',
                    background: CLAY.surface, padding: '0 14px',
                    boxShadow: `inset 3px 3px 7px ${CLAY.darkShadow}, inset -3px -3px 7px ${CLAY.lightShadow}`,
                }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: CLAY.textPrimary,
                        cursor: publishBusy || publishLoading ? 'not-allowed' : 'pointer',
                    }}>
                        <input
                            type="checkbox"
                            checked={published}
                            disabled={publishBusy || publishLoading}
                            onChange={e => handleTogglePublish(e.target.checked)}
                        />
                        List on Community page
                    </label>
                    {(publishBusy || publishLoading) && (
                        <span style={{ fontSize: 10.5, color: CLAY.textPlaceholder }}>
                            {publishLoading ? '' : 'Saving…'}
                        </span>
                    )}
                </div>
                {publishError && (
                    <div style={{ fontSize: 10.5, color: '#c2483f', marginTop: -8 }}>{publishError}</div>
                )}
                {published && (
                    <p style={{ fontSize: 11, color: CLAY.textPlaceholder, margin: '-8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        ★ Visible on the <a href="/community" style={{ color: CLAY.textPrimary, textDecoration: 'underline' }}>Community page</a>, ranked by stars.
                    </p>
                )}

                {/* Link + copy */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 8, height: 42, borderRadius: 999,
                        border: 'none', background: CLAY.surface, padding: '0 14px', minWidth: 0,
                        boxShadow: `inset 3px 3px 7px ${CLAY.darkShadow}, inset -3px -3px 7px ${CLAY.lightShadow}`,
                    }}>
                        <span style={{ flexShrink: 0, display: 'flex' }}><LinkIcon color={CLAY.textMuted} /></span>
                        <input
                            readOnly
                            value={loading ? 'Generating link…' : shareUrl ?? ''}
                            onFocus={(e) => e.currentTarget.select()}
                            style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: CLAY.textPrimary, fontSize: 12.5, outline: 'none', fontFamily: CLAY.font }}
                        />
                    </div>
                    <button
                        onClick={handleCopy}
                        disabled={!shareUrl}
                        title="Copy link"
                        onMouseEnter={() => setCopyHovered(true)}
                        onMouseLeave={() => setCopyHovered(false)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, height: 42, padding: '0 18px', borderRadius: 999,
                            border: 'none',
                            background: copied
                                ? 'linear-gradient(145deg, #8fe3c0, #5fcf9e)'
                                : CLAY.surface,
                            color: CLAY.textPrimary,
                            fontSize: 12.5, fontWeight: 500, cursor: shareUrl ? 'pointer' : 'not-allowed',
                            fontFamily: CLAY.font,
                            boxShadow: copied
                                ? '0 6px 14px -4px rgba(95,207,158,0.45), inset 0 1px 1px rgba(255,255,255,0.4)'
                                : copyHovered ? clayRaised(true) : clayRaised(false),
                            transition: 'background 160ms ease, box-shadow 160ms ease, transform 100ms ease',
                            flexShrink: 0,
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
                            const isHovered = hoveredTarget === t.label
                            return (
                                <a
                                    key={t.label}
                                    href={t.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onMouseEnter={() => setHoveredTarget(t.label)}
                                    onMouseLeave={() => setHoveredTarget(null)}
                                    style={{
                                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                                        padding: '13px 0 11px', borderRadius: 16, border: 'none',
                                        background: CLAY.surface, textDecoration: 'none',
                                        boxShadow: isHovered ? clayRaised(true) : clayRaised(false),
                                        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                                        transition: 'box-shadow 180ms ease, transform 180ms ease',
                                    }}
                                >
                                    <span style={{
                                        width: 30, height: 30, borderRadius: '50%', background: t.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <Icon />
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 400, color: CLAY.textMuted }}>{t.label}</span>
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