import { NextResponse } from "next/server";

// Middleware requires absolute redirect URLs. Use the incoming host so local
// aliases retain their own cookies, OAuth verifier, and browser draft storage.
export function redirectResponse(request: Request, location: string, status = 307) {
  const base = new URL(request.url);
  const host = request.headers.get("host");
  if (host) base.host = host;
  return NextResponse.redirect(new URL(location, base), status);
}
