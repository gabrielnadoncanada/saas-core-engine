export function verifyEmailEmail(params: { appName: string; url: string }) {
  const subject = `Verify your email for ${params.appName}`;
  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5">
    <h2>Verify your email</h2>
    <p>Click the button below to verify your email.</p>
    <p>
      <a href="${params.url}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
        Verify email
      </a>
    </p>
  </div>`;
  return { subject, html };
}
