// PATH: proxy.ts (project root, or src/proxy.ts if using a src/ layout)
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { authReturnPath } from "@/lib/auth/return-path";
import { redirectResponse } from "@/lib/auth/redirect-response";

// Saved projects and administration require an account. Drafts are public.
const PRIVATE_PREFIXES = ["/projects", "/admin"];

function isPrivatePath(pathname: string) {
  if (pathname === "/projects/new") return false;
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

// Next.js 16 convention: this file must be named `proxy.ts` (not
// `middleware.ts`) at the project root/src, with the exported function
// named `proxy` (or default export) — `middleware.ts`/`export function
// middleware` still works but is deprecated and logs a warning. This file
// is already correctly named/exported for 16; nothing to rename here.
export async function proxy(request: NextRequest) {
  // MCP authenticates every request with its own revocable bearer credential.
  // Cookie refresh must not redirect or gate native MCP clients.
  if (request.nextUrl.pathname === "/api/mcp") return NextResponse.next({ request });
  // Session refresh always runs, in every environment — this is
  // infrastructure (keeping the Supabase access token valid for
  // server-side reads), not a UX gate, so it shouldn't be dev-skipped.
  let session;
  try {
    session = await updateSession(request);
  } catch {
    session = { supabaseResponse: NextResponse.next({ request }), user: null, unavailable: true };
  }
  const { supabaseResponse, user } = session;
  const { pathname } = request.nextUrl;
  if (session.unavailable) {
    // An auth outage is different from a signed-out session. Do not send users
    // through a login loop or prevent guests from using the draft editor.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication is temporarily unavailable. Please try again." }, {
        status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" },
      });
    }
    if (isPrivatePath(pathname) || pathname === "/dashboard" || pathname === "/login") {
      return new NextResponse(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unable to check your session</title></head><body style="margin:0;background:#f5f5f5;color:#171717;font-family:system-ui"><main style="max-width:30rem;margin:15vh auto;padding:2rem"><h1>Unable to check your session</h1><p>Sign-in is temporarily unavailable. Please try again in a moment.</p><p><a href="">Try again</a> &middot; <a href="/projects/new">Open the draft editor</a> &middot; <a href="/">Go home</a></p></main></body></html>`, {
        status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "5" },
      });
    }
    return supabaseResponse;
  }
  const authed = !!user;

  // Keep refreshed or cleared session cookies on every redirect.
  function redirectTo(location: string) {
    const response = redirectResponse(request, location);
    for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie);
    return response;
  }

  if (pathname === "/dashboard" && !authed) {
    const query = new URLSearchParams();
    const template = request.nextUrl.searchParams.get("template");
    if (template) query.set("template", template);
    return redirectTo(`/projects/new${query.size ? `?${query}` : ""}`);
  }

  if (pathname === "/login" && authed) {
    const next = authReturnPath(request.nextUrl.searchParams.get("redirectTo"));
    return redirectTo(next);
  }

  // Unauthenticated users hitting a private route -> /login
  if (isPrivatePath(pathname) && !authed) {
    const query = new URLSearchParams({ redirectTo: pathname + request.nextUrl.search });
    return redirectTo(`/login?${query}`);
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
