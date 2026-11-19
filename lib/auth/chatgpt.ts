import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const issuer = "https://auth.openai.com";
export const transactionCookie = "roomsketch_chatgpt_transaction";
export const linkCookie = "roomsketch_chatgpt_link";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export function chatGPTConfig() {
  const clientId = process.env.CHATGPT_CLIENT_ID;
  const redirectUri = process.env.CHATGPT_REDIRECT_URI;
  const secret = process.env.AUTH_JWT_SECRET;
  if (!clientId || !redirectUri || !secret) return null;
  return { clientId, redirectUri, key: new TextEncoder().encode(secret) };
}

export async function seal(
  name: string,
  userId: string,
  claims: Record<string, string>,
  lifetime: number,
  key: Uint8Array,
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("roomsketch-chatgpt")
    .setAudience(name)
    .setSubject(userId)
    .setExpirationTime(Math.floor(Date.now() / 1000) + lifetime)
    .sign(key);
}

export async function readSealed(name: string, userId: string, key: Uint8Array) {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: "roomsketch-chatgpt",
      audience: name,
      subject: userId,
      requiredClaims: ["exp"],
    });
    return payload;
  } catch {
    return null;
  }
}
