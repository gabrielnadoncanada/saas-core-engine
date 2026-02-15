# Contracts And Core Boundaries

## Architecture Audit

### Purpose of `packages/contracts`
`packages/contracts` is the canonical boundary language for cross-package communication.
It contains only stable domain contracts:
- shared types and DTOs
- enums and string unions
- domain error codes
- schema-friendly shapes

`contracts` must stay valid if the implementation changes (database, ORM, framework, billing provider, AI provider).

### What belongs where
- `packages/contracts`: shared contracts only, no infra imports.
- `packages/*-core`: domain logic and ports/interfaces only, no Prisma, no Stripe SDK, no Next.js, no direct DB/framework code.
- `apps/*`: adapters and integration, including Prisma/Stripe/Next.js and mapper files.

### Anti-patterns found and fixed
1. Prisma types inside core packages:
- `packages/auth-core/src/email-tokens/email-token.types.ts`
- `packages/auth-core/src/oauth/oauth.types.ts`
- `packages/auth-core/src/oauth/state.service.ts`
- `packages/auth-core/src/flows/oauth-login.flow.ts`
- `packages/billing-core/src/subscription/plans.ts`
- `packages/billing-core/src/subscription/subscription.sync.ts`

Fix: replaced with contract types from `@contracts`.

2. Core packages directly coupled to infra (`@db`, `stripe`):
- `packages/auth-core/*` had direct `@db` repository usage.
- `packages/org-core/*` had direct `@db` usage and token hashing wiring in service methods.
- `packages/billing-core/*` had direct Stripe SDK and `@db` usage.

Fix: introduced explicit ports in core and moved concrete wiring to app adapters:
- `apps/web/src/server/adapters/core/auth-core.adapter.ts`
- `apps/web/src/server/adapters/core/org-core.adapter.ts`
- `apps/web/src/server/adapters/core/billing-core.adapter.ts`

3. Provider DTOs leaking secrets in method payloads:
- `pepper` was passed per call in auth/org flows.

Fix: `pepper` moved into service construction (adapter configuration), not per-request DTOs.

4. Stripe objects leaking into core domain:
- `SubscriptionSyncService` accepted `Stripe.Subscription`.

Fix: `billing-core` now accepts contract snapshot type and app maps Stripe object:
- `apps/web/src/server/adapters/stripe/stripe-webhook.adapter.ts`

5. Empty/placeholder files in core/contracts:
- Deleted or implemented placeholders in `contracts`, `billing-core`, `auth-core`, `org-core`.

## Implemented Contract Modules
Implemented canonical contract modules:
- `packages/contracts/src/auth.ts`
- `packages/contracts/src/billing.ts`
- `packages/contracts/src/org.ts`
- `packages/contracts/src/ai.ts`
- exported via `packages/contracts/src/index.ts`

## How to add a new shared type
1. Add it to the correct contracts module (`auth.ts`, `billing.ts`, `org.ts`, `ai.ts`).
2. Export it from `packages/contracts/src/index.ts`.
3. Use it in core package ports/services.
4. Keep adapter-specific mapping in `apps/*`.

Example:
```ts
// packages/contracts/src/billing.ts
export type SubscriptionTier = "free" | "pro" | "enterprise";
```

## How to map Prisma/Stripe to contracts
Prisma mapping belongs in app adapter layer:
```ts
// apps/web/src/server/adapters/.../*.mapper.ts
import type { MembershipRole } from "@contracts";

export function mapPrismaRole(role: string): MembershipRole {
  if (role === "owner" || role === "admin" || role === "member") return role;
  throw new Error("Unsupported role");
}
```

Stripe mapping belongs in app adapter layer:
```ts
// apps/web/src/server/adapters/stripe/stripe-webhook.adapter.ts
import type Stripe from "stripe";
import type { BillingProviderSubscriptionSnapshot } from "@contracts";

export function mapStripeSubscriptionToSnapshot(
  sub: Stripe.Subscription,
): BillingProviderSubscriptionSnapshot {
  return {
    id: sub.id,
    status: sub.status,
    currentPeriodEndUnix: sub.current_period_end ?? null,
    priceId: sub.items.data[0]?.price?.id ?? null,
  };
}
```

## Guardrails
- Never import Prisma/Next.js/Stripe in `contracts` or any `*-core` package.
- Treat core packages as pure domain modules with ports.
- Treat apps as composition roots that inject adapters.
- If a shape crosses package boundaries, define it in `contracts`.