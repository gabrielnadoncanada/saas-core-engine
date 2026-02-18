export function orgInviteEmail(params: {
  appName: string;
  url: string;
  organizationName?: string;
  inviterName?: string;
}) {
  const subject = params.organizationName
    ? `You are invited to join ${params.organizationName} on ${params.appName}`
    : `You are invited to join ${params.appName}`;

  const inviterLine = params.inviterName
    ? `<p><strong>${params.inviterName}</strong> invited you to join their workspace.</p>`
    : "<p>You were invited to join a workspace.</p>";

  const orgLine = params.organizationName
    ? `<p>Workspace: <strong>${params.organizationName}</strong></p>`
    : "";

  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5">
    <h2>Organization invite</h2>
    ${inviterLine}
    ${orgLine}
    <p>Click the button below to accept the invitation.</p>
    <p>
      <a href="${params.url}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
        Accept invitation
      </a>
    </p>
  </div>`;

  return { subject, html };
}
