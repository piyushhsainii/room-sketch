// PATH: lib/resend.ts
import { Resend } from "resend";

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set — check .env.local");
  }
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL ?? "RoomSketch <roomsketch@piyushsaini.me>";
// ^ Replace with your verified sending domain once set up in Resend —
// Resend requires domain verification (SPF/DKIM records) before you can
// send from a custom domain; until then their default onboarding domain
// (onboarding@resend.dev) works for testing but looks unprofessional and
// has stricter rate limits.

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, replyTo }: SendEmailArgs) {
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    // Log but don't throw by default — a failed transactional email
    // (e.g. "you upgraded to Pro") shouldn't roll back or crash the
    // caller (e.g. the webhook handler that already wrote to the DB).
    // Callers that need to know can check the returned `error`.
    console.error("Resend send failed:", { to, subject, error });
  }

  return { data, error };
}
