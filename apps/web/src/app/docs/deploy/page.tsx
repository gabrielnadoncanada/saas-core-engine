import { CodeBlock, DocsLayout } from "@/features/docs/ui";

export default function DeployPage() {
  return (
    <DocsLayout
      title="Deploy"
      subtitle="Vercel or self-host. Don’t forget webhooks."
    >
      <h2>Vercel</h2>
      <ul>
        <li>Set all env vars in Vercel dashboard</li>
        <li>Use Postgres (Neon / Supabase Postgres / RDS)</li>
        <li>Set <code>APP_URL</code> to your Vercel URL</li>
        <li>Run <code>pnpm --filter ./packages/db exec prisma migrate deploy</code> before serving traffic</li>
      </ul>

      <h2>Stripe webhook</h2>
      <p>Set <code>BILLING_ENABLED=true</code> when using Stripe.</p>
      <p>
        Configure Stripe to send events to:
        <code> /api/billing/webhook</code>
      </p>
      <p>Minimum events:</p>
      <ul>
        <li><code>checkout.session.completed</code></li>
        <li><code>customer.subscription.created</code></li>
        <li><code>customer.subscription.updated</code></li>
        <li><code>customer.subscription.deleted</code></li>
      </ul>

      <h2>Local webhook testing</h2>
      <CodeBlock>{`stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook`}</CodeBlock>
      <p>
        For optional external scheduled reconciliation, see{" "}
        <code>docs/operations/enterprise-reliability.md</code>.
      </p>

      <h2>Resend</h2>
      <ul>
        <li>Verify your sender domain</li>
        <li>Set <code>EMAIL_FROM</code> to a verified address</li>
      </ul>

      <h2>Google OAuth</h2>
      <ul>
        <li>Set authorized redirect URI to your deployed callback URL</li>
        <li>Keep scopes: <code>openid email profile</code></li>
      </ul>

      <h2>GitHub OAuth</h2>
      <ul>
        <li>Set callback URL to <code>/api/auth/oauth/github/callback</code></li>
        <li>Keep scopes: <code>read:user user:email</code></li>
      </ul>
    </DocsLayout>
  );
}
