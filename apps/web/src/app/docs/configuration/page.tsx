import { CodeBlock, DocsLayout } from "@/features/docs/ui";

export default function ConfigurationPage() {
  return (
    <DocsLayout
      title="Configuration"
      subtitle="Environment variables for auth, email, OAuth, and billing."
    >
      <h2>Required</h2>
      <CodeBlock>{`# App
APP_URL=http://localhost:3000
APP_NAME="SaaS Template"

# Database
DATABASE_URL="postgresql://..."

# Security
TOKEN_PEPPER="a-very-long-random-string"
SESSION_TTL_DAYS=30
SESSION_COOKIE_NAME="st_session"
SESSION_COOKIE_SECURE=false`}</CodeBlock>

      <h2>Email (Resend)</h2>
      <p>
        If <code>RESEND_API_KEY</code> is missing, emails are logged to the server console (dev fallback).
      </p>
      <CodeBlock>{`RESEND_API_KEY="re_..."
EMAIL_FROM="SaaS Template <noreply@yourdomain.com>"`}</CodeBlock>

      <h2>Google OAuth</h2>
      <CodeBlock>{`GOOGLE_OAUTH_CLIENT_ID="..."
GOOGLE_OAUTH_CLIENT_SECRET="..."
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/oauth/google/callback"
GOOGLE_OAUTH_SCOPES="openid email profile"`}</CodeBlock>

      <h2>GitHub OAuth</h2>
      <CodeBlock>{`GITHUB_OAUTH_CLIENT_ID="..."
GITHUB_OAUTH_CLIENT_SECRET="..."
GITHUB_OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/oauth/github/callback"
GITHUB_OAUTH_SCOPES="read:user user:email"`}</CodeBlock>

      <h2>Stripe</h2>
      <CodeBlock>{`STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_PRO_MONTHLY="price_..."

STRIPE_SUCCESS_URL="http://localhost:3000/dashboard/billing?success=1"
STRIPE_CANCEL_URL="http://localhost:3000/dashboard/billing?canceled=1"`}</CodeBlock>
    </DocsLayout>
  );
}
