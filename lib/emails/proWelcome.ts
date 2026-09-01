// PATH: lib/emails/proWelcome.ts

export function proWelcomeEmail({
  dashboardUrl = "https://roomsketch.vercel.app/dashboard",
}: { dashboardUrl?: string } = {}) {
  const subject = "You're on RoomSketch Pro 🎉";

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
<style>
  body, table, td { font-family: 'Nunito', 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
  body { margin: 0; padding: 0; background-color: #E5E5E5; }
  table { border-collapse: collapse; }
  img { border: 0; display: block; }
  a { text-decoration: none; }
  @media screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .card { border-radius: 20px !important; padding: 28px 22px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#E5E5E5;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    Your Pro subscription is active — 3D export, custom GLB import, and the full material library are unlocked.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#E5E5E5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px;">

          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <img src="https://roomsketch.vercel.app/room-sketch-logo.jpg" width="140" alt="RoomSketch" style="width:140px; max-width:140px; height:auto; display:inline-block;">
            </td>
          </tr>

          <tr>
            <td class="card" style="background-color:#EAEAEA; border-radius:28px; padding:44px 40px; border:1px solid rgba(255,255,255,0.6);">

              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#F5F5F5; border-radius:999px; padding:6px 16px; font-size:11px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:#3D9A5C; border:1px solid rgba(255,255,255,0.7);">
                    Pro activated
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-top:20px; font-size:28px; line-height:1.2; letter-spacing:-0.02em; color:#1A1A1A; font-weight:500;">
                    You're all set — welcome to Pro.
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-top:16px; font-size:14.5px; line-height:1.7; color:#666;">
                    Your subscription is active. Here's what just unlocked on your account:
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="background-color:#F5F5F5; border-radius:16px; padding:18px 20px; border:1px solid rgba(255,255,255,0.7);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="font-size:13px; color:#333; padding:6px 0;">✓&nbsp;&nbsp;5 active projects</td></tr>
                      <tr><td style="font-size:13px; color:#333; padding:6px 0;">✓&nbsp;&nbsp;3D snapshot export</td></tr>
                      <tr><td style="font-size:13px; color:#333; padding:6px 0;">✓&nbsp;&nbsp;Custom GLB asset import</td></tr>
                      <tr><td style="font-size:13px; color:#333; padding:6px 0;">✓&nbsp;&nbsp;Full material library</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block; background-color:#1A1A1A; color:#F5F5F5; font-size:14px; font-weight:600; padding:15px 32px; border-radius:16px;">
                      Go to your dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-top:14px; font-size:12px; color:#999;">
                    Manage your subscription anytime from account settings.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 32px 20px 10px; font-size:11.5px; line-height:1.6; color:#999;">
              Questions about your subscription? Just reply to this email.<br>
              <a href="https://roomsketch.vercel.app" style="color:#999; text-decoration:underline;">roomsketch.vercel.app</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
