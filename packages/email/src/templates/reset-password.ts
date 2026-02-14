export function resetPasswordEmail(params: { appName: string; url: string }) {
  const subject = `Reset your password for ${params.appName}`;
  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5">
    <h2>Reset your password</h2>
    <p>Click the button below to reset your password. This link expires soon.</p>
    <p>
      <a href="${params.url}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
        Reset password
      </a>
    </p>
    <p>If you didn't request this, you can ignore this email.</p>
  </div>`;
  return { subject, html };
}
