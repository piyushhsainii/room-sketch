import crypto from "node:crypto";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { ERRORS } from "@/constants/content";

export type AppSession = {
  userId: string;
  email: string;
};

const COOKIE_NAME = "renderai_session";
const ISSUER = "renderai";

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error(ERRORS.supabaseMisconfigured);
  return new TextEncoder().encode(secret);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function userIdFromGoogleSub(sub: string): string {
  const hash = crypto.createHash("sha256").update(`renderai:${sub}`).digest();
  const bytes = new Uint8Array(hash.subarray(0, 16));

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
}

export function getGuestUserId(): string {
  return "00000000-0000-4000-8000-000000000000";
}

export async function createSessionCookie(
  session: AppSession,
): Promise<string> {
  const token = await new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());

  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800",
  ];

  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function readSessionFromCookies(): Promise<AppSession | null> {
  if (process.env.DISABLE_AUTH === "true") {
    return { userId: getGuestUserId(), email: "" };
  }

  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const { payload } = await jwtVerify(raw, getJwtSecret(), {
      issuer: ISSUER,
    });
    const sub = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!sub) return null;
    return { userId: sub, email };
  } catch {
    return null;
  }
}
