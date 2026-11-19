import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { chatGPTConfig, cookieOptions, issuer, seal, transactionCookie } from "@/lib/auth/chatgpt";

export async function GET() {
  const config = chatGPTConfig();
  if (!config) return new Response("ChatGPT connection is unavailable.", { status: 503 });
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) return new Response("Sign in to RoomSketch first.", { status: 401 });

  const random = () => randomBytes(32).toString("base64url");
  const state = random();
  const nonce = random();
  const verifier = random();
  const url = new URL("/api/accounts/authorize", issuer);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();

  const response = NextResponse.redirect(url);
  const transaction = await seal(transactionCookie, user.id, { state, nonce, verifier }, 600, config.key);
  response.cookies.set(transactionCookie, transaction, { ...cookieOptions, maxAge: 600 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
