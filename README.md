# SaaS Template — Next.js + Auth + Orgs + Stripe (Production-ready)

A developer-first SaaS starter you can ship in days.
Includes real flows: password + magic link + Google/GitHub OAuth, organizations & invites, sessions/security, and Stripe subscriptions with webhook sync.

## Features

**Authentication**

- Email/password
- Magic link
- Reset password
- Google OAuth (PKCE)
- GitHub OAuth (PKCE)
- OAuth account linking

**Multi-tenant / Workspace**

- Organizations
- Membership roles (owner/admin/member)
- Team invites (email-based acceptance)

**Security**

- Sessions list
- Revoke session / revoke all

**Billing (Stripe)**

- Checkout Session (subscriptions)
- Billing Portal
- Webhook sync to local `Subscription` table

**UI**

- ShadCN + Tailwind
- App shell: sidebar + topbar
- Dark mode (data-theme)

---

## Quickstart

### 1) Configure `.env`

Copy `.env.example` → `.env` and fill required vars:

- `DATABASE_URL`
- `APP_URL`
- `TOKEN_PEPPER`

Optional:

- Resend (email)
- Google/GitHub OAuth
- Stripe (enable with `BILLING_ENABLED=true`)

### 2) Run setup

```bash
pnpm setup
```

### 3) Start dev server

```bash
pnpm dev
```

If `DEMO_MODE=true`, you can log in with:

- `demo@saastemplate.dev`
- `DemoPassw0rd!`

---

## Environment variables

### Required

- `DATABASE_URL`
- `APP_URL`
- `TOKEN_PEPPER`

### Email (Resend)

- `RESEND_API_KEY`
- `EMAIL_FROM`

In production, `RESEND_API_KEY` is required.

### Google OAuth

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_SCOPES="openid email profile"`

### GitHub OAuth

- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`
- `GITHUB_OAUTH_REDIRECT_URI`
- `GITHUB_OAUTH_SCOPES="read:user user:email"`

### Stripe

Set `BILLING_ENABLED=true` to enable billing.

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`

---

## Stripe Webhooks (local testing)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copy the `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

---

## Architecture (why it’s easy to extend)

Core logic is separated into packages:

- `@auth-core` → sessions, tokens, password, OAuth state
- `@org-core` → organizations, memberships, invites
- `@billing-core` → Stripe sync logic
- `@db` → Prisma + repositories

The Next.js app (`apps/web`) is an adapter layer:

- routes in `app/api/*`
- UI in `app/*`, `features/*`, `shared/*`

---

## License

See `/license` for commercial license terms.

---

## Roadmap (suggested)

- Mobile sidebar drawer (Sheet)
- ShadCN Toast + RHF/Zod forms
- Audit log + activity events
- Multi-org switching preferences
- Admin panel & feature flags

---

## Support / Issues

This template is intended for developers.
If you use it in production, do your own security review and compliance checks.

```

```
