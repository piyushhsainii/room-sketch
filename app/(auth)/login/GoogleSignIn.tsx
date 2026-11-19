"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleSignIn({ returnTo }: { returnTo: string }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    async function handleGoogleLogin() {
        setError(false);
        setLoading(true);
        try {
            const { error } = await createClient().auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?${new URLSearchParams({ next: returnTo })}`,
                    queryParams: { access_type: "offline", prompt: "consent" },
                },
            });
            if (!error) return;
        } catch {
            // Restore the button if the sign-in request cannot start.
        }
        setError(true);
        setLoading(false);
    }

    return (
        <>
            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                aria-busy={loading}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-neutral-300 bg-white px-5 text-sm font-medium transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900 disabled:cursor-wait disabled:opacity-60"
            >
                <GoogleIcon />
                {loading ? "Redirecting to Google…" : "Continue with Google"}
            </button>
            {error && (
                <p role="alert" className="mt-4 text-sm leading-relaxed text-red-800">
                    Google sign-in couldn’t start. Please try again.
                </p>
            )}
        </>
    );
}
function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
    );
}
