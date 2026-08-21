"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
        <div className="min-h-screen bg-[#F4F6FC] flex justify-center">
            <div className="w-full max-w-[1600px] flex">
                {/* Left: auth */}
                <div className="w-full lg:w-[800px] shrink-0 flex flex-col items-center px-6 py-24 overflow-y-auto">
                    <div className="w-full max-w-[430px]">
                        {/* Logo */}
                        <div className="flex items-center gap-2.5 mb-16">
                            <CubeLogo />
                            <span className="font-display text-[1.15rem] tracking-tight text-ink lowercase">
                                roomsketch
                            </span>
                        </div>

                        {/* Heading */}
                        <h1 className="font-display text-[2.75rem] tracking-[-0.02em] text-ink leading-tight mb-2">
                            Welcome back
                        </h1>
                        <p className="text-[15px] text-graphite mb-9">
                            Log in to continue creating
                        </p>

                        {/* Google */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2.5 border border-line-strong bg-paper rounded-[6px] py-3.5 hover:border-ink transition-colors disabled:opacity-60"
                        >
                            <GoogleIcon />
                            <span className="font-mono text-[12px] font-medium tracking-[0.06em] text-ink uppercase">
                                {loading ? "Redirecting…" : "Continue with Google"}
                            </span>
                        </button>

                        {error && (
                            <p className="text-[12.5px] text-red-600 mt-4 text-center">{error}</p>
                        )}
                    </div>

                    {/* Footer links — pinned to the bottom of the column */}
                    <div className="w-full max-w-[430px] mt-auto pt-10">
                        <div className="h-px bg-line mb-7" />
                        <div className="flex items-center justify-center gap-6 font-mono text-[11.5px] text-graphite">
                            <a href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</a>
                            <a href="/terms" className="hover:text-ink transition-colors">Terms of Service</a>
                            <a href="/help" className="hover:text-ink transition-colors">Help Center</a>
                        </div>
                    </div>
                </div>

                {/* Right: image slideshow */}
                <div className="hidden lg:block relative flex-1 max-w-[800px]">
                    <ImageSlideshow images={SLIDESHOW_IMAGES} intervalMs={SLIDE_INTERVAL_MS} />
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

function CubeLogo() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
                d="M12 2L21 6.5V17.5L12 22L3 17.5V6.5L12 2Z"
                stroke="#12213E"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path d="M12 2V22M3 6.5L12 11M21 6.5L12 11" stroke="#12213E" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
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