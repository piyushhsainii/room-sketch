// PATH: app/api/admin/send/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server"; // confirm this matches your actual export name
import { getResendClient, EMAIL_FROM } from "@/lib/resend";
import { wrapCustomEmail } from "@/lib/emails/customBroadcast";
import { requireAdmin } from "@/lib/emails/admin";

const BATCH_SIZE = 100; // Resend batch send limit per call

type SendBody = {
  subject: string;
  bodyHtml: string;
  emails: string[]; // final resolved list — client combines users/waitlist/custom into this
};

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const blocked = requireAdmin(user?.email);
  if (blocked) return blocked;

  const body = (await req.json()) as SendBody;
  if (!body.subject?.trim() || !body.bodyHtml?.trim()) {
    return Response.json(
      { error: "Subject and body are required" },
      { status: 400 },
    );
  }

  const emails = Array.from(
    new Set((body.emails ?? []).map((e) => e.trim()).filter(isValidEmail)),
  );
  if (!emails.length) {
    return Response.json({ error: "No valid recipients" }, { status: 400 });
  }

  const html = wrapCustomEmail(body.bodyHtml);
  const resend = getResendClient();

  let sent = 0;
  const failures: string[] = [];

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const { error: sendError } = await resend.batch.send(
      batch.map((to) => ({
        from: EMAIL_FROM,
        to,
        subject: body.subject,
        html,
      })),
    );
    if (sendError) failures.push(...batch);
    else sent += batch.length;
  }

  return Response.json({ sent, failed: failures.length, total: emails.length });
}
