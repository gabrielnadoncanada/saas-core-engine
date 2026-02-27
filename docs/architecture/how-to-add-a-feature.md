# How to add a feature

## 1. Route (thin handler)

Create a route handler in `apps/web/src/app/api/<feature>/...`.

- **Validation**: Parse the request body with Zod schema.
- **Logic**: Call a core service (via adapter factory from `server/adapters/core/`).
- **Response**: Map domain objects to wire types using a mapper, then return JSON.
- **No business logic** in routes — delegate to core packages.

```
apps/web/src/app/api/billing/checkout/route.ts
```

## 2. Schema (wire types)

Define Zod schemas and wire types in `packages/contracts/src/`.

- Domain types use `Date` and rich structures.
- Wire types (`*Wire`) use `string` for dates (ISO 8601), no `Date` objects.
- Wire types are what gets sent to/from the client.

```
packages/contracts/src/billing.ts
  → OrganizationSubscription (domain)
  → OrganizationSubscriptionWire (wire/API)
```

## 3. Mapper (conversions)

Create mappers in `apps/web/src/server/mappers/<feature>.mapper.ts`.

- One mapper per feature.
- Use `toIso()` / `toIsoOrNull()` from `./convert.ts` — never call `.toISOString()` directly.
- All Date ↔ string conversions happen **only** in mappers.

```
apps/web/src/server/mappers/billing.mapper.ts
  → subscriptionToWire(domain) => wire
```

## 4. Core service (business logic)

Add domain logic in `packages/<feature>-core/src/`.

- Define **ports** (interfaces) for repos and external services.
- Implement **services** that contain business rules.
- **Zero infra dependencies** — no Prisma, no Next.js, no HTTP.

```
packages/billing-core/src/subscription/subscription.sync.ts
  → SubscriptionSyncService (uses SubscriptionsRepo port)
```

## 5. Adapter (wiring)

Create Prisma-backed repos in `apps/web/src/server/db-repos/`.
Create factory functions in `apps/web/src/server/adapters/core/<feature>-core.adapter.ts`.

```
apps/web/src/server/adapters/core/billing-core.adapter.ts
  → createSubscriptionSyncService()
```

## 6. UI (feature component)

Add UI in `apps/web/src/features/<feature>/ui/`.

- Feature-specific components go in `features/<feature>/ui/`.
- Generic primitives go in `shared/components/ui/` (only if ≥3 usages).
- Client components receive wire types (strings for dates).

```
apps/web/src/features/billing/ui/plan-card.tsx
```

## Checklist

- [ ] Wire types defined in `@contracts` (no `Date` in API responses)
- [ ] Mapper created in `server/mappers/`
- [ ] Core service has no infra imports
- [ ] Route is thin (validate → call core → map → respond)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass
