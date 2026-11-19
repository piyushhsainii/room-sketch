// PATH: scripts/send-launch-email.ts
//
// One-time broadcast — NOT a route, NOT triggered automatically.
// Sends to everyone in `users` PLUS everyone in `waitlist`, deduped by
// email (case-insensitively) so nobody who's in both tables gets two
// copies. `waitlist` has no user_id/converted flag to link the two, so
// email string is the only join key available — good enough here since
// both tables enforce email uniqueness individually.
//
// TEST FIRST, before the real send:
//   bun run scripts/send-launch-email.ts --test=you@example.com
//   (sends ONLY to that address — no DB query, no other recipients touched)
//
// Real send, once you've confirmed rendering looks right:
//   bun run scripts/send-launch-email.ts
//   (sends to every deduped row from `users` + `waitlist` — filter the
//   queries below to exclude test accounts if needed)

import { readFileSync } from "fs";
import { join } from "path";
import { createSupabaseAdmin } from "../supabase/admin";
import { EMAIL_FROM, getResendClient } from "../resend";

const BATCH_SIZE = 100; // Resend's batch send endpoint limit per call
const SUBJECT = "RoomSketch is live 🎉";

function getTestEmail(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--test="));
  return arg ? arg.slice("--test=".length).trim() : null;
}

async function fetchAllRecipients(): Promise<string[]> {
  const supabase = createSupabaseAdmin();

  const [usersResult, waitlistResult] = await Promise.all([
    supabase.from("users").select("email"),
    supabase.from("waitlist").select("email"),
  ]);

  if (usersResult.error) {
    console.error("Failed to fetch users:", usersResult.error);
    process.exit(1);
  }
  if (waitlistResult.error) {
    console.error("Failed to fetch waitlist:", waitlistResult.error);
    process.exit(1);
  }

  const userEmails = (usersResult.data ?? [])
    .map((u) => u.email)
    .filter(Boolean) as string[];
  const waitlistEmails = (waitlistResult.data ?? [])
    .map((w) => w.email)
    .filter(Boolean) as string[];

  console.log(
    `Fetched ${userEmails.length} users, ${waitlistEmails.length} waitlist signups.`,
  );

  // Dedupe case-insensitively — keeps the first-seen casing (users takes
  // priority over waitlist, since it's listed first in the merge below).
  const seen = new Map<string, string>(); // lowercased -> original casing
  for (const email of [...userEmails, ...waitlistEmails]) {
    const key = email.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, email.trim());
  }

  const deduped = Array.from(seen.values());
  const dupesRemoved =
    userEmails.length + waitlistEmails.length - deduped.length;
  if (dupesRemoved > 0) {
    console.log(
      `Removed ${dupesRemoved} duplicate email(s) present in both tables.`,
    );
  }

  return deduped;
}

async function main() {
  const html = readFileSync(
    join(process.cwd(), "public/emails/roomsketch-launch.html"),
    "utf-8",
  );

  const testEmail = getTestEmail();
  let emails: string[];

  if (testEmail) {
    console.log(`TEST MODE — sending only to: ${testEmail}`);
    emails = [testEmail];
  } else {
    emails = await fetchAllRecipients();
    console.log("Recipients:");
    emails.forEach((email, i) => {
      console.log(`${i + 1}. ${email}`);
    });
    if (!emails.length) {
      console.log("No recipients found — nothing to send.");
      return;
    }

    // Real send — require an explicit confirmation so this never fires
    // by accident (e.g. running the script with no args out of habit
    // after testing).
    console.log(
      `About to send to ${emails.length} REAL recipients (users + waitlist, deduped). This is not a test.`,
    );
    console.log(
      `If this wasn't intentional, Ctrl+C now — sending in 5 seconds...`,
    );
    await new Promise((r) => setTimeout(r, 5000));
  }

  const resend = getResendClient();

  console.log(`Sending in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const { data, error: sendError } = await resend.batch.send(
      batch.map((to) => ({
        from: EMAIL_FROM,
        to: [to],
        subject: testEmail ? ` ${SUBJECT}` : SUBJECT,
        html,
      })),
    );

    if (sendError) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, sendError);
    } else {
      console.log(`Batch ${i / BATCH_SIZE + 1} sent: ${batch.length} emails`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Launch email script failed:", err);
  process.exit(1);
});
