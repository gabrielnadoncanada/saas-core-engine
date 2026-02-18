# 📌 PRD — SaaS Core Engine (V1)

## Document Owner

Gabriel

## Product Type

Premium SaaS Starter Kit (Next.js)

## Target Launch

V1 commercialisable en 30 jours

## Business Goal

Template vendable à volume élevé ($149–199)

---

---

# 1. 🎯 Product Vision

Créer le template SaaS B2B le plus rapide à déployer et le plus fiable pour lancer un produit en production en moins de 7 jours.

**SaaS Core Engine** fournit :

- Auth complète sans NextAuth/Supabase Auth
- Teams + Organizations multi-tenant
- Billing Stripe production-grade
- Dashboard moderne ShadCN
- Architecture extensible (RBAC/Audit/AI packs)

---

---

# 2. 🎯 Target Audience

## Primary Persona: Indie SaaS Builders

- Dev React/Next.js
- Solo founder
- Besoin : ship vite

## Secondary Persona: Freelancers / Small Agencies

- Réutilisation sur plusieurs projets
- Besoin : base fiable, modulaire

---

---

# 3. 🔥 Value Proposition

## Buyer Outcome

> Stop wiring auth and billing. Launch your SaaS this weekend.

### Key Promises

- Deploy Vercel-ready in <15 min
- Auth + Stripe correct dès le jour 1
- No vendor lock-in
- Upgrade-ready architecture

---

---

# 4. ✅ V1 Scope (Strict)

V1 doit être lean, mais complet sur les fondamentaux SaaS.

---

## 4.1 Authentication System (Core)

### Features Included

| Feature                          | Included |
| -------------------------------- | -------- |
| Email/password login             | ✅       |
| Magic link login                 | ✅       |
| Social login (Google)            | ✅       |
| Forgot password                  | ✅       |
| Reset password                   | ✅       |
| Email verification               | ✅       |
| Session cookies HttpOnly         | ✅       |
| Session revoke/logout            | ✅       |
| Account linking (Google + email) | ✅       |
| Rate limiting                    | ✅       |

### Non-Goals V1

- MFA
- SAML/SSO
- Passkeys

---

## 4.2 Organization & Multi-Tenancy

### Model

- Every user can belong to multiple organizations
- One active organization is selected per user (global across sessions)
- Default org auto-created at signup

### Features

| Feature                            | Included |
| ---------------------------------- | -------- |
| Create org                         | ✅       |
| Switch org                         | ✅       |
| Invite team members                | ✅       |
| Accept invite flow                 | ✅       |
| Roles fixed: owner/admin/member    | ✅       |
| Org isolation enforced server-side | ✅       |

### Non-Goals

- Custom role builder (V2)

---

## 4.3 Billing & Subscriptions (Stripe)

### Billing Model

Org-based subscription

### Plans V1

- Free
- Pro (monthly)

### Features

| Feature                          | Included |
| -------------------------------- | -------- |
| Stripe Checkout                  | ✅       |
| Customer Portal                  | ✅       |
| Webhooks sync                    | ✅       |
| Subscription status stored in DB | ✅       |
| Cancel subscription              | ✅       |
| Upgrade subscription             | ✅       |
| Trial optional                   | ✅       |
| Idempotency handling             | ✅       |

### Stripe Events Supported

- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

### Non-Goals

- Usage billing
- Stripe Connect

---

## 4.4 Dashboard UI

### Pages Required

| Route               | Page               |
| ------------------- | ------------------ |
| /login              | Login UI           |
| /signup             | Signup UI          |
| /verify-email       | Email verification |
| /forgot-password    | Request reset      |
| /reset-password     | Reset form         |
| /onboarding         | Create org         |
| /dashboard          | Overview           |
| /dashboard/billing  | Subscription       |
| /dashboard/team     | Members + invites  |
| /dashboard/settings | Profile + security |
| /dashboard/sessions | Active sessions    |

### UI Requirements

- ShadCN + Tailwind
- Dark/light mode
- Responsive
- Table component (members)
- Toast feedback

---

## 4.5 Developer Experience (Mandatory)

### Setup Requirements

- Clone repo
- Add `.env`
- `pnpm install`
- `pnpm db:migrate`
- `pnpm dev`
- Deploy to Vercel

### Must Include

| Feature                  | Included |
| ------------------------ | -------- |
| Seed demo data           | ✅       |
| Env validation with Zod  | ✅       |
| Stripe CLI dev mode      | ✅       |
| One-click deploy guide   | ✅       |
| Strict ESLint + Prettier | ✅       |

---

---

# 5. 🧱 Architecture Requirements

## Monorepo Structure

```
apps/
  web/
packages/
  contracts/
  db/
  auth-core/
  billing-core/
  org-core/
  ui/
  email/
```

---

## Dependency Rules (Non-negotiable)

- `contracts` depends on nothing
- `db` depends only on `contracts`
- `auth-core` depends on `db`
- `apps/web` is the only layer allowed to use Next APIs

No circular imports.

---

## Contracts Package

Contains:

- Zod schemas
- Shared enums
- API types

Example:

```ts
export const LoginSchema = z.object({
  email: z.string().email(),
});
```

---

## Auth-Core Package

Contains:

- session creation
- token hashing
- OAuth PKCE logic
- magic link issuance

No cookies logic inside.

Returns:

```ts
{
  (sessionToken, user);
}
```

---

---

# 6. 🗄 Database Schema (V1)

## users

- id UUID
- email UNIQUE
- password_hash nullable
- email_verified_at nullable
- created_at

## sessions

- id UUID
- user_id FK
- token_hash UNIQUE
- expires_at
- revoked_at nullable
- user_agent nullable

## organizations

- id UUID
- name
- created_at

## memberships

- id UUID
- user_id
- organization_id
- role enum(owner/admin/member)

## invitations

- id UUID
- organization_id
- email
- role
- token_hash
- expires_at
- accepted_at nullable

## subscriptions

- id UUID
- organization_id UNIQUE
- stripe_customer_id
- stripe_subscription_id
- plan
- status
- current_period_end

## email_tokens

- id UUID
- email
- type enum(magic_login/reset/verify)
- token_hash
- expires_at
- used_at nullable

## oauth_accounts

- id UUID
- user_id
- provider
- provider_account_id
- email nullable

---

---

# 7. 🔒 Security Requirements

Mandatory checklist:

- Password hashing = Argon2id
- Tokens stored only hashed
- Magic/reset tokens TTL < 20 min
- OAuth PKCE + state
- Cookie flags:
  - HttpOnly
  - Secure
  - SameSite=Lax

- Rate limiting auth endpoints
- Anti-enumeration responses
- Webhook signature verification
- Stripe webhook idempotency keys

---

---

# 8. 📡 API Endpoints (V1)

## Auth

- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/logout

## Magic Link

- POST /api/auth/magic/request
- GET /api/auth/magic/confirm

## Password Reset

- POST /api/auth/password/forgot
- POST /api/auth/password/reset

## OAuth

- GET /api/auth/oauth/google/start
- GET /api/auth/oauth/google/callback

## Org

- POST /api/org/create
- POST /api/org/invite
- POST /api/org/switch

## Billing

- POST /api/billing/checkout
- POST /api/billing/portal
- POST /api/billing/webhook

---

---

# 9. 📦 Upgrade Hooks (V2/V3)

## V2 Agency Pack

- Advanced RBAC engine
- Audit logs (advanced querying/export)
- Impersonation

## V3 AI Automation Pack

- AI assistant panel
- Tool calling registry
- Background jobs BullMQ
- Webhook retry engine

---

---

# 10. 🚀 Launch Checklist

Before selling:

- Demo SaaS deployed live
- Docs complete
- Video walkthrough (10 min)
- “Deploy in 10 minutes” verified
- License + Gumroad/LemonSqueezy ready

---

---

# 11. Success Metrics

| Metric                    | Target         |
| ------------------------- | -------------- |
| Deploy time               | <15 min        |
| Setup errors              | <5% users      |
| Support tickets           | <5 / 100 sales |
| Conversion landing → sale | >2%            |

---

---
