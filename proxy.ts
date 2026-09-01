// PATH: proxy.ts (project root, or src/proxy.ts if using a src/ layout)
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes anyone can access, logged in or not
const PUBLIC_ROUTES = ["/", "/community", "/login"];
// Prefixes that are public (e.g. /share/xyz)
const PUBLIC_PREFIXES = ["/share"];

// Prefixes that require auth
const PRIVATE_PREFIXES = ["/projects", "/dashboard", "/admin"];

function isPublicPath(pathname: string) {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

function isPrivatePath(pathname: string) {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

const isProd = process.env.NODE_ENV === "production";

// Next.js 16 convention: this file must be named `proxy.ts` (not
// `middleware.ts`) at the project root/src, with the exported function
// named `proxy` (or default export) — `middleware.ts`/`export function
// middleware` still works but is deprecated and logs a warning. This file
// is already correctly named/exported for 16; nothing to rename here.
export async function proxy(request: NextRequest) {
  // Session refresh always runs, in every environment — this is
  // infrastructure (keeping the Supabase access token valid for
  // server-side reads), not a UX gate, so it shouldn't be dev-skipped.
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const authed = !!user;

  // Route gating (redirects) stays prod-only, matching prior behavior —
  // change this if you actually want auth walls enforced in dev/preview too.
  if (!isProd) {
    return supabaseResponse;
  }

  // Logged-in users shouldn't sit on /login — send them to dashboard
  if (pathname === "/login" && authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Unauthenticated users hitting a private route -> /login
  if (isPrivatePath(pathname) && !authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname); // optional: bounce back after login
    return NextResponse.redirect(url);
  }

  // Everything else (public routes, or authed users on private routes) passes through
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico, images, fonts etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
