// PATH: lib/admin.ts
import "server-only";

// No `role`/`is_admin` column exists on `users` right now — gating on a
// comma-separated email allowlist instead. Set ADMIN_EMAILS in env, e.g.:
//   ADMIN_EMAILS=you@example.com,cofounder@example.com
// If you later add a real role system, replace this with a DB check —
// this is a stopgap, not meant to scale past a couple of admins.
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

export function requireAdmin(
  email: string | null | undefined,
): Response | null {
  if (isAdminEmail(email)) return null;
  return Response.json({ error: "forbidden" }, { status: 403 });
}
