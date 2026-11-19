import Link from "next/link";
import { inter } from "../../fonts/inter";
import GoogleSignIn from "./GoogleSignIn";
import { authReturnPath } from "@/lib/auth/return-path";
import "../../landing.css";

export default async function LoginPage({ searchParams }: {
    searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
    const { redirectTo, error } = await searchParams;
    return (
        <main className={`login min-h-svh ${inter.variable}`}>
            <div className="mx-auto flex min-h-svh max-w-[80rem] flex-col px-5 py-6 sm:px-8 md:px-12 md:py-9">
                <header>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pr-4 pl-2 text-base font-semibold tracking-tight shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                    >
                        <img src="/room-sketch-logo-removebg-preview.png" alt="" width={36} height={36} />
                        roomsketch
                    </Link>
                </header>

                <div className="my-auto grid items-center gap-10 py-10 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
                    <section aria-labelledby="login-title" className="landing-card mx-auto w-full max-w-[26rem] rounded-3xl p-6 sm:p-9">
                        <h1 id="login-title" className="text-[clamp(2rem,5vw,2.75rem)] leading-[1.05] font-semibold tracking-tighter">
                            Welcome back
                        </h1>
                        <p className="mt-3 mb-7 text-base leading-relaxed text-neutral-600">
                            Sign in to open your floor plans and keep designing.
                        </p>
                        {error === "auth" && (
                            <p role="alert" className="mb-4 text-sm text-red-800">Sign-in couldn’t finish. Please try again.</p>
                        )}
                        <GoogleSignIn returnTo={authReturnPath(redirectTo)} />
                    </section>

                    <div className="landing-grid flex min-h-36 items-center justify-center px-1 md:min-h-80">
                        <img
                            src="/hero-floorplan-960.webp"
                            srcSet="/hero-floorplan-480.webp 480w, /hero-floorplan-960.webp 960w, /hero-floorplan-1440.webp 1440w"
                            sizes="(min-width: 1280px) 720px, (min-width: 768px) 60vw, calc(100vw - 48px)"
                            alt=""
                            width={2172}
                            height={724}
                            className="block h-auto w-full"
                        />
                    </div>
                </div>

                <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-300 pt-5 text-sm text-neutral-600">
                    <a href="/#faq" className="rounded-sm underline-offset-4 hover:text-neutral-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
                        Help &amp; FAQs
                    </a>
                </footer>
            </div>
        </main>
    );
}
