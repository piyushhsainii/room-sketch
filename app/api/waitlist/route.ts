import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const email = (body as { email?: unknown })?.email;

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const supabase = createServerSupabaseClient();

    // Requires a `waitlist` table, e.g.:
    //   id uuid primary key default gen_random_uuid(),
    //   email text unique not null,
    //   source text,
    //   created_at timestamptz default now()
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: normalizedEmail, source: "landing_hero" });

    if (error) {
      // Unique-violation = already on the list; treat as a friendly success
      // rather than an error, so people can resubmit without confusion.
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, alreadyOnList: true });
      }
      console.error("Waitlist insert failed:", error);
      return NextResponse.json(
        { error: "Something went wrong. Try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Waitlist route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
