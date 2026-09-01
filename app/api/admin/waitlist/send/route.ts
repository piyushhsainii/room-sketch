// PATH: app/api/admin/waitlist/send/route.ts
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/resend";
import { requireAdmin } from "@/lib/emails/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { wrapCustomEmail } from "@/lib/emails/customBroadcast";

const BATCH_SIZE = 100; // Resend batch send limit per call

type SendBody = {
  subject: string;
  bodyHtml: string; // raw copy from the textarea, gets wrapped in the theme template
  recipientIds: string[] | "all";
};

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
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

  const admin = createSupabaseAdmin();
  let query = admin.from("waitlist").select("email");
  if (body.recipientIds !== "all") {
    if (!body.recipientIds.length) {
      return Response.json(
        { error: "No recipients selected" },
        { status: 400 },
      );
    }
    query = query.in("id", body.recipientIds);
  }

  const { data: rows, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const emails = (rows ?? []).map((r) => r.email).filter(Boolean) as string[];
  if (!emails.length) {
    return Response.json(
      { error: "No matching recipients found" },
      { status: 400 },
    );
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
    if (sendError) {
      failures.push(...batch);
    } else {
      sent += batch.length;
    }
  }

  return Response.json({ sent, failed: failures.length, total: emails.length });
}
