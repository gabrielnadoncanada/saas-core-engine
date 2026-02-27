# Refactor Hotspots — Baseline Diagnostic

## 1. `as unknown as` casts (4 occurrences)

| File | Line | Problem |
|------|------|---------|
| `apps/web/src/app/api/billing/webhook/route.ts` | 54 | `event as unknown as Record<string, unknown>` — casting Stripe event to persist as JSON |
| `apps/web/src/server/billing/process-billing-webhook-event.ts` | 27 | `payload as unknown as Stripe.Event` — recasting stored JSON back to Stripe.Event |
| `packages/auth-core/src/tests/flows/password-reset.flow.test.ts` | 31 | Test mock cast (acceptable) |
| `packages/auth-core/src/tests/flows/verify-email-request.flow.test.ts` | 30 | Test mock cast (acceptable) |

**Root cause**: Webhook route stores full Stripe event as JSON, processor re-casts it back. Classic type laundering.

## 2. Dates in contract interfaces sent to client

| Interface | File | Fields |
|-----------|------|--------|
| `SessionSummary` | `packages/contracts/src/auth.ts` | `createdAt`, `lastSeenAt`, `expiresAt`, `revokedAt` |
| `OrganizationSubscription` | `packages/contracts/src/billing.ts` | `currentPeriodEnd` |
| `OrganizationSummary` | `packages/contracts/src/org.ts` | `createdAt` |
| `MembershipSummary` | `packages/contracts/src/org.ts` | `createdAt` |
| `InvitationSummary` | `packages/contracts/src/org.ts` | `createdAt`, `expiresAt`, `acceptedAt` |

**Root cause**: Contracts use `Date` for domain types, but API routes manually call `.toISOString()` in every response. No wire types.

## 3. Manual `.toISOString()` conversion in routes (scattered)

| File | Conversion |
|------|-----------|
| `apps/web/src/app/api/auth/sessions/list/route.ts` | 4x `.toISOString()` inline |
| `apps/web/src/app/api/auth/sign-in-methods/route.ts` | `lastUsedAt?.toISOString()` inline |
| `apps/web/src/features/settings/model/get-settings-page-data.query.ts` | `lastUsedAt?.toISOString()` inline |

## 4. Webhook orchestration duplication

| File | Problem |
|------|---------|
| `apps/web/src/app/api/billing/webhook/route.ts` | Manually calls `eventsRepo.createReceived()` + `eventsRepo.markStatus()` |
| `apps/web/src/server/billing/process-billing-webhook-event.ts` | Re-extracts orgId/subId/createdAt, re-checks ordering (duplicating orchestrator logic) |
| `packages/billing-core/src/webhook/billing-webhook.orchestrator.ts` | `BillingWebhookOrchestrator` exists but is NOT used by the route or processor |

**Root cause**: Orchestrator was built but never wired. Route and processor duplicate its responsibility.

## 5. `new Date()` in core packages (appropriate — domain layer)

These are acceptable in core packages since they deal with domain logic (session expiry, token TTL, etc.). No action needed.

## 6. UI primitives — already exist

| Primitive | Status |
|-----------|--------|
| `Field` | Exists at `shared/components/ui/field.tsx` (rich, complete) |
| `ConfirmDialog` | Exists at `shared/components/confirm-dialog.tsx` |
| `Empty` (EmptyState) | Exists at `shared/components/ui/empty.tsx` |
| `FormRow` / `FormSection` | Not needed — Field components cover this |

## 7. `JSON.parse(JSON.stringify(` — 0 occurrences

## Summary — Priority Actions

1. **Phase 1**: Add `IsoDateString` + `*Wire` types in `@contracts`, create feature mappers
2. **Phase 2**: Wire `BillingWebhookOrchestrator` into route + eliminate type laundering
3. **Phase 3**: Create `toIso`/`fromIso` canonical helpers, enforce conversion budget
4. **Phase 4**: UI primitives already exist — verify usage, skip if sufficient
5. **Phase 5**: Add ESLint guardrails for `as unknown as` and `new Date(` outside mappers
