import { NextResponse } from "next/server";

import { ERRORS } from "@/constants/content";
import { createSessionCookie, userIdFromGoogleSub } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  credential: string;
  nonce?: string;
};

type TokenInfo = {
  aud: string;
  sub: string;
  email?: string;
  email_verified?: string;
  iss?: string;
  exp?: string;
};

function isGoogleIssuer(iss: string | undefined): boolean {
  return iss === "accounts.google.com" || iss === "https://accounts.google.com";
}

function isNotExpired(exp: string | undefined): boolean {
  if (!exp) return false;
  const n = Number(exp);
  if (!Number.isFinite(n)) return false;
  const now = Math.floor(Date.now() / 1000);
  return n > now;
}

async function fetchTokenInfo(idToken: string): Promise<TokenInfo> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const url = new URL("https://oauth2.googleapis.com/tokeninfo");
    url.searchParams.set("id_token", idToken);

    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("tokeninfo_failed");
    return (await res.json()) as TokenInfo;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Body>;
    const credential = body.credential;
    if (!credential) {
      return NextResponse.json({ error: ERRORS.unauthorized }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: ERRORS.supabaseMisconfigured },
        { status: 500 },
      );
    }

    const info = await fetchTokenInfo(credential);
    if (info.aud !== clientId) {
      return NextResponse.json({ error: ERRORS.unauthorized }, { status: 401 });
    }
    if (!isGoogleIssuer(info.iss) || !isNotExpired(info.exp)) {
      return NextResponse.json({ error: ERRORS.unauthorized }, { status: 401 });
    }

    const email = info.email ?? "";
    const userId = userIdFromGoogleSub(info.sub);
    const googleSub = info.sub;

    const admin = await createServerSupabaseClient();
    const { error: upsertError } = await admin
      .from("users")
      .upsert(
        { id: userId, email, google_sub: googleSub },
        { onConflict: "id" },
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const cookie = await createSessionCookie({ userId, email });
    const res = NextResponse.json({ ok: true, email });
    res.headers.append("Set-Cookie", cookie);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: message || ERRORS.unauthorized },
      { status: 500 },
    );
  }
}
