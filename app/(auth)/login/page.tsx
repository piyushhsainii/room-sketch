"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    dangerText: "#B3503F",
    font: "var(--font-clay, 'General Sans'), system-ui, -apple-system, sans-serif",
};

const clayRaised = (pressed = false) =>
    pressed
        ? `inset 3px 3px 8px ${CLAY.darkShadow}, inset -3px -3px 8px ${CLAY.lightShadow}`
        : `-6px -6px 12px ${CLAY.lightShadow}, 6px 6px 14px ${CLAY.darkShadow}`;

const SLIDESHOW_IMAGES = [
    '/login-asset-1.jpg',
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1574359411659-15573a27fd0c?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop",
];

const SLIDE_INTERVAL_MS = 5000;

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [googleHovered, setGoogleHovered] = useState(false);

    async function handleGoogleLogin() {
        setError(null);
        setLoading(true);
        const supabase = createClient();
        // Route through /auth/callback so Supabase can exchange the OAuth
        // code for a session before we land on /dashboard.
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                queryParams: { access_type: "offline", prompt: "consent" },
            },
        });
        if (error) {
            setError(error.message);
            setLoading(false);
        }
        // On success the browser redirects to Google, so no need to reset loading.
    }

    return (
        <div
            className="min-h-screen flex justify-center"
            style={{ background: CLAY.canvas, fontFamily: CLAY.font }}
        >
            <div className="w-full max-w-[1600px] flex">
                {/* Left: auth */}
                <div className="w-full lg:w-[800px] shrink-0 flex flex-col items-center px-6 py-24 overflow-y-auto">
                    <div className="w-full max-w-[430px]">
                        {/* Logo — links home, uses the actual app assets */}
                        <Link href="/" className="flex items-center gap-2.5 mb-16 select-none">
                            <img
                                src="/room-sketch-logo.jpg"
                                alt="roomsketch"
                                className="w-9 h-9 rounded-full object-cover"
                                style={{ boxShadow: clayRaised(false) }}
                            />
                            <img
                                src="/room-sketch-text.jpg"
                                alt="roomsketch"
                                className="h-5 w-auto object-contain"
                            />
                        </Link>

                        {/* Heading */}
                        <h1
                            style={{
                                fontSize: 44, fontWeight: 500, letterSpacing: "-0.01em",
                                color: CLAY.textPrimary, lineHeight: 1.15, margin: "0 0 8px",
                            }}
                        >
                            Welcome back
                        </h1>
                        <p style={{ fontSize: 15, color: CLAY.textMuted, margin: "0 0 36px" }}>
                            Log in to continue creating
                        </p>

                        {/* Google */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            onMouseEnter={() => setGoogleHovered(true)}
                            onMouseLeave={() => setGoogleHovered(false)}
                            style={{
                                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                                gap: 10, border: "none", background: CLAY.surface,
                                borderRadius: 16, padding: "14px 0",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.6 : 1,
                                boxShadow: googleHovered && !loading ? clayRaised(true) : clayRaised(false),
                                transition: "box-shadow 180ms ease, opacity 180ms ease",
                            }}
                        >
                            <GoogleIcon />
                            <span style={{
                                fontSize: 12.5, fontWeight: 500, letterSpacing: "0.04em",
                                color: CLAY.textPrimary, textTransform: "uppercase",
                                fontFamily: CLAY.font,
                            }}>
                                {loading ? "Redirecting…" : "Continue with Google"}
                            </span>
                        </button>

                        {error && (
                            <p style={{ fontSize: 12.5, color: CLAY.dangerText, marginTop: 16, textAlign: "center" }}>
                                {error}
                            </p>
                        )}
                    </div>

                    {/* Footer links — pinned to the bottom of the column */}
                    <div className="w-full max-w-[430px] mt-auto pt-10">
                        <div style={{ height: 1, boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.05)`, marginBottom: 28 }} />
                        <div
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 24,
                                fontSize: 11.5, color: CLAY.textMuted, fontFamily: CLAY.font,
                            }}
                        >
                            <a href="/privacy" style={{ color: CLAY.textMuted, textDecoration: "none" }}
                                onMouseEnter={e => (e.currentTarget.style.color = CLAY.textPrimary)}
                                onMouseLeave={e => (e.currentTarget.style.color = CLAY.textMuted)}
                            >Privacy Policy</a>
                            <a href="/terms" style={{ color: CLAY.textMuted, textDecoration: "none" }}
                                onMouseEnter={e => (e.currentTarget.style.color = CLAY.textPrimary)}
                                onMouseLeave={e => (e.currentTarget.style.color = CLAY.textMuted)}
                            >Terms of Service</a>
                            <a href="/help" style={{ color: CLAY.textMuted, textDecoration: "none" }}
                                onMouseEnter={e => (e.currentTarget.style.color = CLAY.textPrimary)}
                                onMouseLeave={e => (e.currentTarget.style.color = CLAY.textMuted)}
                            >Help Center</a>
                        </div>
                    </div>
                </div>

                {/* Right: image slideshow, set into a recessed clay frame so
                    it reads as part of the same surface as the left column
                    rather than a flat edge-to-edge photo. */}
                <div className="hidden lg:block relative flex-1 max-w-[800px] p-4">
                    <div
                        style={{
                            position: "relative", width: "100%", height: "100%",
                            borderRadius: 28, overflow: "hidden",
                            boxShadow: `inset 4px 4px 10px ${CLAY.darkShadow}, inset -4px -4px 10px ${CLAY.lightShadow}`,
                        }}
                    >
                        <ImageSlideshow images={SLIDESHOW_IMAGES} intervalMs={SLIDE_INTERVAL_MS} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ImageSlideshow({
    images,
    intervalMs = 5000,
}: {
    images: string[];
    intervalMs?: number;
}) {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (images.length <= 1) return;
        const id = setInterval(() => {
            setActiveIndex((i) => (i + 1) % images.length);
        }, intervalMs);
        return () => clearInterval(id);
    }, [images.length, intervalMs]);

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#12213E]">
            {images.map((src, i) => (
                <img
                    key={src}
                    src={src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
                    style={{ opacity: i === activeIndex ? 1 : 0 }}
                />
            ))}

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {images.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Go to slide ${i + 1}`}
                        onClick={() => setActiveIndex(i)}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                            width: i === activeIndex ? 24 : 8,
                            backgroundColor: i === activeIndex ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
    );
}