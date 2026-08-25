// app/community/CommunityPageClient.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Loading from "@/app/loading"

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
    dangerText: "#B3503F",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
}

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`
        : `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`

interface CommunityProject {
    id: string
    name: string
    thumbnail_url: string | null
    star_count: number
    share_token: string
    author_name: string
}

interface Cursor {
    cursor_stars: number
    cursor_id: string
}

export default function CommunityPageClient() {
    const [projects, setProjects] = useState<CommunityProject[]>([])
    const [cursor, setCursor] = useState<Cursor | null>(null)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchPage = useCallback(async (after: Cursor | null) => {
        const params = new URLSearchParams()
        if (after) {
            params.set("cursor_stars", String(after.cursor_stars))
            params.set("cursor_id", after.cursor_id)
        }
        const res = await fetch(`/api/community/projects?${params.toString()}`, { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load community projects.")
        return res.json() as Promise<{ projects: CommunityProject[]; nextCursor: Cursor | null }>
    }, [])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        fetchPage(null)
            .then(({ projects: first, nextCursor }) => {
                if (cancelled) return
                setProjects(first)
                setCursor(nextCursor)
                setHasMore(nextCursor !== null)
            })
            .catch(err => { if (!cancelled) setError(err.message) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [fetchPage])

    const loadMore = async () => {
        if (!cursor || loadingMore) return
        setLoadingMore(true)
        try {
            const { projects: more, nextCursor } = await fetchPage(cursor)
            setProjects(prev => [...prev, ...more])
            setCursor(nextCursor)
            setHasMore(nextCursor !== null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoadingMore(false)
        }
    }

    if (loading) return <Loading />

    return (
        <div style={{ minHeight: "100vh", height: "screen", background: CLAY.canvas, fontFamily: CLAY.font }}>
            <CommunityHeader />

            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontFamily: CLAY.font, fontSize: 26, fontWeight: 500, color: CLAY.textPrimary, letterSpacing: "normal", margin: 0 }}>
                        Community
                    </h1>
                    <p style={{ fontFamily: CLAY.font, fontSize: 14, color: CLAY.textMuted, letterSpacing: "normal", marginTop: 6 }}>
                        Public floor plans from the RoomSketch community, ranked by stars.
                    </p>
                </div>

                {error && (
                    <div style={{ color: CLAY.dangerText, fontSize: 13, marginBottom: 16 }}>{error}</div>
                )}

                {projects.length === 0 && !error && (
                    <EmptyState />
                )}

                {projects.length > 0 && (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
                            gap: 20,
                        }}
                    >
                        {projects.map(p => (
                            <CommunityCard key={p.id} project={p} />
                        ))}
                    </div>
                )}

                {hasMore && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
                        <LoadMoreButton onClick={loadMore} loading={loadingMore} />
                    </div>
                )}

                <CommunityCTA />
            </div>
        </div>
    )
}

function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
    const [hovered, setHovered] = useState(false)
    return (
        <button
            onClick={onClick}
            disabled={loading}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                height: 38, padding: "0 20px", borderRadius: 999,
                border: "none", background: CLAY.surface,
                color: CLAY.textPrimary, fontSize: 12.5, fontWeight: 500,
                fontFamily: CLAY.font,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                boxShadow: hovered && !loading ? clayRaised(true) : clayRaised(false),
                transition: "box-shadow 180ms ease, opacity 180ms ease",
            }}
        >
            {loading ? "Loading…" : "Load more"}
        </button>
    )
}

function CommunityHeader() {
    return (
        <header style={{
            height: 64, borderBottom: "none",
            boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px", background: CLAY.canvas,
            fontFamily: CLAY.font,
        }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <img
                    src="/room-sketch-logo-removebg-preview.png"
                    alt=""
                    style={{ width: 32, height: 32, filter: "drop-shadow(0 1px 1px rgba(255,255,255,0.5))" }}
                />
                <img src="/room-sketch-text.jpg" alt="RoomSketch" style={{ height: 18 }} />
            </Link>
            <HeaderCTA />
        </header>
    )
}

function HeaderCTA() {
    const [hovered, setHovered] = useState(false)
    return (
        <Link
            href="/dashboard"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                height: 36, padding: "0 18px", borderRadius: 999,
                background: CLAY.surface, color: CLAY.textPrimary,
                fontSize: 12.5, fontWeight: 500, fontFamily: CLAY.font,
                display: "flex", alignItems: "center",
                textDecoration: "none",
                boxShadow: hovered ? clayRaised(true) : clayRaised(false),
                transition: "box-shadow 180ms ease",
            }}
        >
            Open Dashboard
        </Link>
    )
}

function EmptyState() {
    return (
        <div style={{
            borderRadius: 20, padding: "64px 24px", textAlign: "center",
            background: CLAY.surface,
            boxShadow: `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`,
        }}>
            <p style={{ fontFamily: CLAY.font, fontSize: 14, color: CLAY.textMuted, letterSpacing: "normal", margin: 0 }}>
                No public projects yet — be the first to publish one.
            </p>
        </div>
    )
}

function CommunityCTA() {
    const [primaryHovered, setPrimaryHovered] = useState(false)
    const [secondaryHovered, setSecondaryHovered] = useState(false)
    return (
        <div style={{
            marginTop: 56, borderRadius: 24, padding: "44px 32px",
            background: "#141414", textAlign: "center",
            boxShadow: `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px rgba(0,0,0,0.35)`,
        }}>
            <h2 style={{ fontFamily: CLAY.font, fontSize: 20, fontWeight: 500, color: "#F5F5F5", letterSpacing: "normal", margin: 0 }}>
                Design your own floor plan in minutes
            </h2>
            <p style={{ fontFamily: CLAY.font, fontSize: 13, color: "#B5B5B5", margin: "8px 0 24px" }}>
                Draw, furnish, and render in 3D — free to start.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <Link
                    href="/signup"
                    onMouseEnter={() => setPrimaryHovered(true)}
                    onMouseLeave={() => setPrimaryHovered(false)}
                    style={{
                        height: 40, padding: "0 22px", borderRadius: 999,
                        background: "#F5F5F5", color: "#141414",
                        fontSize: 13, fontWeight: 500, fontFamily: CLAY.font,
                        display: "flex", alignItems: "center",
                        textDecoration: "none",
                        opacity: primaryHovered ? 0.85 : 1,
                        transition: "opacity 180ms ease",
                    }}
                >
                    Try RoomSketch Free
                </Link>
                <Link
                    href="/dashboard"
                    onMouseEnter={() => setSecondaryHovered(true)}
                    onMouseLeave={() => setSecondaryHovered(false)}
                    style={{
                        height: 40, padding: "0 22px", borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.25)", color: "#F5F5F5",
                        fontSize: 13, fontWeight: 500, fontFamily: CLAY.font,
                        display: "flex", alignItems: "center",
                        textDecoration: "none",
                        background: secondaryHovered ? "rgba(255,255,255,0.08)" : "transparent",
                        transition: "background 180ms ease",
                    }}
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    )
}

function CommunityCard({ project }: { project: CommunityProject }) {
    const [hovered, setHovered] = useState(false)
    return (
        <Link
            href={`/share/${project.share_token}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "block",
                borderRadius: 20,
                overflow: "hidden",
                border: "none",
                background: CLAY.surface,
                boxShadow: hovered
                    ? `0 20px 40px -14px rgba(0,0,0,0.16), -5px -5px 10px ${CLAY.lightShadow}, 5px 5px 12px ${CLAY.darkShadow}`
                    : `-4px -4px 9px ${CLAY.lightShadow}, 4px 4px 10px ${CLAY.darkShadow}`,
                textDecoration: "none",
                transform: hovered ? "translateY(-2px)" : "translateY(0)",
                transition: "transform 200ms ease, box-shadow 200ms ease",
            }}
        >
            <div style={{
                aspectRatio: "16 / 10", background: "#DEDEDE", position: "relative",
                margin: 10, borderRadius: 14, overflow: "hidden",
                boxShadow: `inset 3px 3px 7px ${CLAY.darkShadow}, inset -3px -3px 7px ${CLAY.lightShadow}`,
                width: "calc(100% - 20px)", height: "calc(100% - 20px)",
            }}>
                {project.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: CLAY.textPlaceholder, fontSize: 11, fontFamily: CLAY.font }}>
                        No preview
                    </div>
                )}

                {/* Interactive-view CTA, revealed on hover */}
                <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: hovered ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
                    opacity: hovered ? 1 : 0,
                    transition: "opacity 180ms ease, background 180ms ease",
                    pointerEvents: "none",
                }}>
                    <span style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 16px", borderRadius: 999,
                        background: "rgba(255,255,255,0.92)", color: "#141414",
                        fontFamily: CLAY.font, fontSize: 12.5, fontWeight: 500,
                        transform: hovered ? "translateY(0)" : "translateY(6px)",
                        transition: "transform 180ms ease",
                    }}>
                        View in 3D →
                    </span>
                </div>
            </div>
            <div style={{ padding: "8px 16px 16px" }}>
                <div style={{
                    fontFamily: CLAY.font, fontSize: 15, fontWeight: 500, color: CLAY.textPrimary, letterSpacing: "normal",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                    {project.name}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <span style={{ fontFamily: CLAY.font, fontSize: 12, color: CLAY.textMuted, letterSpacing: "normal" }}>{project.author_name}</span>
                    <span style={{ fontFamily: CLAY.font, fontSize: 12, color: CLAY.textMuted, letterSpacing: "normal", display: "flex", alignItems: "center", gap: 3 }}>
                        ★ {project.star_count}
                    </span>
                </div>
            </div>
        </Link>
    )
}