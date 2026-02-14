export function magicLinkEmail(params: { appName: string; url: string }) {
  const subject = `Your sign-in link for ${params.appName}`;
  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5">
    <h2>Sign in to ${params.appName}</h2>
    <p>Click the button below to sign in. This link expires soon.</p>
    <p>
      <a href="${params.url}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
        Sign in
      </a>
    </p>
    <p>If you didn't request this, you can ignore this email.</p>
  </div>`;
  return { subject, html };
}
