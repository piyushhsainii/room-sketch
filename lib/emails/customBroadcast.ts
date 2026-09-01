// PATH: lib/emails/customBroadcast.ts

// Takes the admin's raw message body (plain text, newlines preserved) and
// wraps it in the same card/logo/footer shell as the other emails, so
// custom sends still look on-brand without the admin hand-writing HTML.
export function wrapCustomEmail(bodyText: string): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px; font-size:14.5px; line-height:1.7; color:#444;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body, table, td { font-family: 'Nunito', 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
  body { margin: 0; padding: 0; background-color: #E5E5E5; }
  table { border-collapse: collapse; }
  img { border: 0; display: block; }
  @media screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .card { border-radius: 20px !important; padding: 28px 22px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#E5E5E5;">
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
              ${paragraphs}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 32px 20px 10px; font-size:11.5px; line-height:1.6; color:#999;">
              You're receiving this because you joined the RoomSketch waitlist.<br>
              <a href="https://roomsketch.vercel.app" style="color:#999; text-decoration:underline;">roomsketch.vercel.app</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
