import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { chatGPTConfig, cookieOptions, issuer, linkCookie, readSealed, seal, transactionCookie } from "@/lib/auth/chatgpt";

export async function GET(request: NextRequest) {
  const config = chatGPTConfig();
  if (!config) return new Response("ChatGPT connection is unavailable.", { status: 503 });
  const dashboard = new URL("/dashboard?chatgpt=failed", config.redirectUri);
  const response = NextResponse.redirect(dashboard);
  response.cookies.set(transactionCookie, "", { ...cookieOptions, maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");

  try {
    const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
    if (!user) return response;
    const transaction = await readSealed(transactionCookie, user.id, config.key);
    const params = request.nextUrl.searchParams;
    const code = params.get("code");
    if (!code || params.has("error") || !transaction ||
        params.get("state") !== transaction.state ||
        typeof transaction.verifier !== "string" || typeof transaction.nonce !== "string") {
      return response;
    }

    const metadataResponse = await fetch(new URL("/.well-known/openid-configuration", issuer), {
      signal: AbortSignal.timeout(8000),
    });
    if (!metadataResponse.ok) return response;
    const metadata = await metadataResponse.json();
    const tokenEndpoint = new URL(metadata.token_endpoint);
    const jwksUri = new URL(metadata.jwks_uri);
    if (metadata.issuer !== issuer || tokenEndpoint.origin !== issuer || jwksUri.origin !== issuer) {
      return response;
    }

    const headers = new Headers({ accept: "application/json" });
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      code_verifier: transaction.verifier,
    });
    const secret = process.env.CHATGPT_CLIENT_SECRET;
    if (secret) {
      const encode = (value: string) => new URLSearchParams({ value }).toString().slice(6);
      const credentials = Buffer.from(encode(config.clientId) + ":" + encode(secret)).toString("base64");
      headers.set("authorization", "Basic " + credentials);
    } else {
      body.set("client_id", config.clientId);
    }
    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) return response;
    const tokens = await tokenResponse.json();
    if (typeof tokens.id_token !== "string") return response;
    const { payload } = await jwtVerify(tokens.id_token, createRemoteJWKSet(jwksUri), {
      issuer,
      audience: config.clientId,
      requiredClaims: ["sub", "iat", "exp"],
    });
    if (payload.nonce !== transaction.nonce || !payload.sub) return response;

    const lifetime = 7 * 24 * 60 * 60;
    const link = await seal(linkCookie, user.id, {
      account: payload.sub,
      clientId: config.clientId,
    }, lifetime, config.key);
    response.cookies.set(linkCookie, link, { ...cookieOptions, maxAge: lifetime });
    dashboard.searchParams.set("chatgpt", "connected");
    response.headers.set("Location", dashboard.href);
  } catch {
    return response;
  }
  return response;
}
