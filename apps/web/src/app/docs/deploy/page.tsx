import { CodeBlock } from "@/features/docs/ui/code-block";
import { DocsLayout } from "@/features/docs/ui/docs-layout";

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
      </ul>

      <h2>Stripe webhook</h2>
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
    </DocsLayout>
  );
}
