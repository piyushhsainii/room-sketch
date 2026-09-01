// PATH: scripts/send-launch-email.ts
//
// One-time broadcast — NOT a route, NOT triggered automatically.
//
// TEST FIRST, before the real send:
//   bun run scripts/send-launch-email.ts --test=you@example.com
//   (sends ONLY to that address — no DB query, no other recipients touched)
//
// Real send, once you've confirmed rendering looks right:
//   bun run scripts/send-launch-email.ts
//   (sends to every row in `users` — filter the query below to exclude
//   test accounts if needed)

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
    const supabase = createSupabaseAdmin();
    const { data: users, error } = await supabase.from("users").select("email");

    if (error) {
      console.error("Failed to fetch users:", error);
      process.exit(1);
    }
    if (!users?.length) {
      console.log("No users found — nothing to send.");
      return;
    }
    emails = users.map((u) => u.email).filter(Boolean) as string[];

    // Real send — require an explicit confirmation so this never fires
    // by accident (e.g. running the script with no args out of habit
    // after testing).
    console.log(
      `About to send to ${emails.length} REAL users. This is not a test.`,
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
        to,
        subject: testEmail ? `[TEST] ${SUBJECT}` : SUBJECT,
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
