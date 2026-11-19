// components/workspace/ShareDialog.tsx
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Globe, Link, Mail, X } from 'lucide-react'
import { editorMenuTheme, menuButton, menuSurface } from './editor-menu-theme'
import { cn } from '@/lib/utils'

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

const POPOVER_WIDTH = 360
const MARGIN = 12
const GAP = 10

type ShareDetails = { token: string; published: boolean }
const shareDetailsCache = new Map<string, ShareDetails>()
const pendingShareDetails = new Map<string, Promise<ShareDetails>>()

function loadShareDetails(projectId: string): Promise<ShareDetails> {
    const pending = pendingShareDetails.get(projectId)
    if (pending) return pending

    const request = (async () => {
        const response = await fetch(`/api/projects/${projectId}?view=share`, { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) {
            if (response.status === 401 || response.status === 404) shareDetailsCache.delete(projectId)
            throw new Error(data.error ?? 'Unable to load sharing details.')
        }
        const project = data.project
        let token = project.share_token
        if (!token || !project.share_enabled) {
            const shareResponse = await fetch('/api/workspace/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId, enabled: true }),
            })
            const shareData = await shareResponse.json()
            if (!shareResponse.ok || !shareData.ok || !shareData.share_token) {
                throw new Error(shareData.error ?? 'Unable to create a share link.')
            }
            token = shareData.share_token
        }
        const details = { token, published: !!project.published }
        shareDetailsCache.set(projectId, details)
        return details
    })().finally(() => pendingShareDetails.delete(projectId))
    pendingShareDetails.set(projectId, request)
    return request
}

export function ShareDialog({ projectId, onClose, anchorEl }: { projectId: string; onClose: () => void; anchorEl?: HTMLElement | null }) {
    const cached = shareDetailsCache.get(projectId)
    const [shareUrl, setShareUrl] = useState<string | null>(() =>
        cached && typeof window !== 'undefined' ? `${window.location.origin}/share/${cached.token}` : null)
    const [loading, setLoading] = useState(!cached)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [retry, setRetry] = useState(0)
    const [copied, setCopied] = useState(false)
    const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null)
    const [visible, setVisible] = useState(false)

    const [published, setPublished] = useState(cached?.published ?? false)
    const [publishLoading, setPublishLoading] = useState(!cached)
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
            const popoverEstHeight = 400 // enough for the header+link+targets before first paint measures real height

            if (!anchorEl) {
                setPos({ top: 64, left: Math.max(MARGIN, window.innerWidth - POPOVER_WIDTH - 24), openUp: false })
                return
            }

            const rect = anchorEl.getBoundingClientRect()

            // Keep the panel aligned with its trigger and within the viewport.
            let left = rect.right - POPOVER_WIDTH
            left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN))

            const spaceAbove = rect.top
            const openUp = spaceAbove > popoverEstHeight + GAP

            const top = openUp
                ? rect.top - GAP // bottom-anchored via translateY in the style below
                : rect.bottom + GAP

            setPos({ top, left, openUp })
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
        let cancelled = false
        const previous = shareDetailsCache.get(projectId)
        setShareUrl(previous ? `${window.location.origin}/share/${previous.token}` : null)
        setPublished(previous?.published ?? false)
        setCopied(false)
        setLoading(!previous)
        setPublishLoading(!previous)
        setLoadError(null)
        loadShareDetails(projectId)
            .then(details => {
                if (cancelled) return
                setShareUrl(`${window.location.origin}/share/${details.token}`)
                setPublished(details.published)
            })
            .catch(error => {
                if (cancelled) return
                if (!shareDetailsCache.has(projectId)) setShareUrl(null)
                setLoadError(error instanceof Error ? error.message : 'Unable to load sharing details.')
            })
            .finally(() => {
                if (cancelled) return
                setLoading(false)
                setPublishLoading(false)
            })
        return () => { cancelled = true }
    }, [projectId, retry])

    const handleCopy = () => {
        if (!shareUrl) return
        navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    const shareTargets = shareUrl ? [
        { label: 'Twitter', icon: TwitterIcon, href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check out my floor plan')}` },
        { label: 'WhatsApp', icon: WhatsAppIcon, href: `https://wa.me/?text=${encodeURIComponent(shareUrl)}` },
        { label: 'Email', icon: Mail, href: `mailto:?subject=${encodeURIComponent('Floor plan')}&body=${encodeURIComponent(shareUrl)}` },
    ] : []

    const handleTogglePublish = async (next: boolean) => {
        setPublishBusy(true)
        setPublishError(null)
        try {
            await pendingShareDetails.get(projectId)
            const res = await fetch(`/api/projects/${projectId}/publish`, {
                method: next ? 'POST' : 'DELETE',
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? 'Failed to update.')
            }
            setPublished(next)
            const body = await res.json().catch(() => null)
            const previous = shareDetailsCache.get(projectId)
            const token = body?.share_token ?? previous?.token
            if (token) shareDetailsCache.set(projectId, { token, published: next })
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={handleClose}
            onKeyDown={event => {
                if (event.key === 'Escape') {
                    event.stopPropagation()
                    handleClose()
                }
            }}>
            <section
                role="dialog"
                aria-label="Share Floor Plan"
                onClick={event => event.stopPropagation()}
                className={cn(menuSurface, "flex flex-col gap-4 p-5 text-sm tracking-tight text-neutral-900")}
                style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    width: POPOVER_WIDTH,
                    maxWidth: 'calc(100vw - 24px)',
                    maxHeight: pos.openUp ? pos.top - MARGIN : `calc(100dvh - ${pos.top + MARGIN}px)`,
                    overflowY: 'auto',
                    fontFamily: editorMenuTheme.font,
                    transformOrigin: pos.openUp ? 'bottom right' : 'top right',
                    transform: `translateY(${pos.openUp ? '-100%' : '0%'}) scale(${visible ? 1 : 0.98})`,
                    opacity: visible ? 1 : 0,
                    transition: 'transform 160ms ease, opacity 160ms ease',
                }}
            >
                <header className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold tracking-tight">Share Floor Plan</h2>
                    <button type="button" autoFocus aria-label="Close share panel" onClick={handleClose}
                        className={cn(menuButton, "h-10 w-10 p-0 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900")}>
                        <X size={16} aria-hidden="true" />
                    </button>
                </header>

                <p className="flex items-start gap-2 leading-5 text-neutral-600">
                    <Globe size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>Anyone with this link can view a read-only version without an account.</span>
                </p>

                <div className="space-y-2">
                    <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 has-disabled:cursor-wait">
                        <input type="checkbox" checked={published} disabled={publishBusy || publishLoading || !!loadError}
                            className="h-4 w-4 accent-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                            onChange={event => handleTogglePublish(event.target.checked)} />
                        <span className="flex-1">List on Community page</span>
                        {(publishBusy || publishLoading) && (
                            <span className="text-xs text-neutral-500" role="status">
                                {publishLoading ? 'Loading…' : 'Saving…'}
                            </span>
                        )}
                    </label>
                    {publishError && <p role="alert" className="text-xs leading-5 text-red-800">{publishError}</p>}
                    {published && (
                        <p className="text-xs leading-5 text-neutral-500">
                            Visible on the <a href="/community" className="text-neutral-700 underline underline-offset-2">Community page</a>, ranked by stars.
                        </p>
                    )}
                </div>

                {loadError && (
                    <div role="alert" className="flex items-center justify-between gap-2 text-xs text-red-800">
                        <span>{loadError}</span>
                        <button type="button" onClick={() => setRetry(value => value + 1)}
                            className={cn(menuButton, "text-neutral-700 hover:bg-neutral-100")}>
                            Retry
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 focus-within:ring-2 focus-within:ring-neutral-900">
                        <Link size={16} className="shrink-0 text-neutral-500" aria-hidden="true" />
                        <input readOnly aria-label="Share link"
                            value={shareUrl ?? (loading ? 'Loading share link…' : '')}
                            onFocus={event => event.currentTarget.select()}
                            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
                    </div>
                    <button type="button" onClick={handleCopy} disabled={!shareUrl} title="Copy link"
                        className={cn(menuButton, "bg-neutral-900 text-white hover:bg-neutral-800")}>
                        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                        <span role="status">{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>

                {shareUrl && (
                    <div className="grid grid-cols-3 gap-2 border-t border-neutral-200 pt-4">
                        {shareTargets.map(target => {
                            const Icon = target.icon
                            return (
                                <a key={target.label} href={target.href} target="_blank" rel="noopener noreferrer"
                                    className={cn(menuButton, "flex-col gap-2 border border-neutral-200 py-3 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900")}>
                                    <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white [&>svg]:h-4 [&>svg]:w-4">
                                        <Icon />
                                    </span>
                                    {target.label}
                                </a>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>,
        document.body
    )
}
