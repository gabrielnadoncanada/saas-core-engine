## Vision

Permettre à un développeur de lancer un SaaS B2B production-ready en moins de 7 jours, avec :

- Auth solide (magic + social + reset)
- Multi-tenant
- RBAC
- Billing Stripe
- Dashboard admin complet
- Architecture propre et scalable

---

# 🎯 CIBLE

### Persona primaire

- Indie hackers React / Next.js
- Freelancers SaaS builders
- CTO solo founder

### Persona secondaire

- Agences qui lancent plusieurs SaaS

---

# 🧱 MODULES PRINCIPAUX

---

## 1️⃣ AUTHENTICATION SYSTEM (Production-grade)

### Features

- Email/password
- Magic link
- Social auth (Google, GitHub)
- Forgot password
- Reset password
- Email verification
- Account linking
- Session management (list + revoke)
- Secure cookies HttpOnly
- Rate limiting

### Non-Goals

- MFA (V1)
- Enterprise SSO (V2+)

---

## 2️⃣ MULTI-TENANT SYSTEM

### Core tables

- organizations
- memberships
- roles
- permissions
- invitations

### Features

- Create organization
- Switch organization
- Multi-organization membership with active-org switcher (active org is user-level)
- Invite members
- Role assignment
- Org-scoped data isolation
- Owner/admin/member roles by default

---

## 3️⃣ RBAC ENGINE

### Features

- Role-based permissions
- Policy helpers
- Middleware guard
- Server-side enforcement
- Permission matrix

### Must have

- `can(user, action, resource)`
- `requirePermission(action)`

---

## 4️⃣ BILLING (Stripe Production)

### Features

- Subscription plans
- Checkout session
- Customer portal
- Webhooks idempotents
- Upgrade/downgrade
- Cancel
- Trial support
- Org-based billing

### Stripe events gérés

- checkout.session.completed
- invoice.payment_succeeded
- customer.subscription.updated
- customer.subscription.deleted

---

## 5️⃣ ADMIN DASHBOARD

### Sections

- Overview (stats)
- Users
- Organizations
- Subscriptions
- Audit logs (org actions + billing/webhook traces)
- Settings

### UX

- Clean ShadCN
- Dark/light
- Data tables
- Filtering
- Pagination

---

## 6️⃣ AI-READY INFRA (Sans être un produit IA)

### Features

- AI panel example
- Tool registry pattern
- Streaming example
- Prompt registry
- Structured output validation

But : montrer que l’architecture supporte l’IA.

---

## 7️⃣ DEV EXPERIENCE

### Must-have

- Monorepo structure
- Packages modulaires
- Zod schemas partagés
- Env validation
- Seed data
- Demo data
- Scripts CLI
- ESLint strict
- Prettier
- Type-safe routes

---

# 🏗 ARCHITECTURE

## Monorepo

```
apps/
  web/
packages/
  db/
  auth-core/
  billing/
  rbac/
  contracts/
  email/
  ui/
```

---

# 🧠 PRINCIPES ARCHITECTURAUX

- Framework-agnostic core
- Adapter pattern pour Next
- Server-only logic isolée
- Fichiers < 350 lignes
- No vendor lock-in
- Clear dependency graph

---

# 🔒 SECURITY REQUIREMENTS

- Argon2id password hashing
- PKCE OAuth
- State verification
- Token hashing
- Rate limiting
- CSRF-safe flows
- Strict cookie settings
- Idempotent webhooks

---
