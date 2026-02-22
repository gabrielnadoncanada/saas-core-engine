# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start Next.js dev server (via Turbo)
pnpm build            # Build all packages + app
pnpm lint             # ESLint across entire monorepo
pnpm typecheck        # TypeScript check all packages
pnpm test             # Run all tests (Turbo)
pnpm clean            # Remove dist/, .next/, node_modules/

# Database (Prisma, schema at packages/db/prisma/schema.prisma)
pnpm db:migrate       # Run Prisma migrations
pnpm db:seed          # Seed the database
pnpm --filter @db exec prisma validate   # Validate schema (needs DATABASE_URL)
pnpm --filter @db exec prisma generate   # Regenerate Prisma client

# Single-package commands
pnpm --filter @auth-core run test        # Run auth-core tests only
pnpm --filter @auth-core run typecheck   # Typecheck one package
```

When running Prisma commands without a real database, prefix with `DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"`.

## Architecture

**pnpm monorepo** with Turbo. Three workspace roots: `apps/`, `packages/`, `tooling/`.

### Package dependency graph

```
@contracts          ← Pure types/enums, zero dependencies. Source of truth for domain types.
@auth-core          ← Auth flows + hashing + sessions. Depends only on @contracts.
@org-core           ← Org/team/invite logic. Depends only on @contracts.
@billing-core       ← Stripe subscription sync. Depends only on @contracts.
@email              ← Email service (Resend/SMTP) + templates.
@db                 ← Prisma client singleton, withTx helper.
@ui                 ← Shared React components (shadcn-style).
apps/web            ← Next.js 16 (App Router). Wires everything together.
```

### Ports/Adapters pattern (critical)

Core packages (`@auth-core`, `@org-core`, `@billing-core`) define **port interfaces** (e.g. `UsersRepo`, `SessionsRepo` in `auth-core/src/auth.ports.ts`) and have zero infrastructure dependencies — no Prisma, no Next.js, no database.

The web app provides **concrete adapters**:
- `apps/web/src/server/db-repos/` — Prisma-backed repository implementations
- `apps/web/src/server/adapters/core/` — Factory functions that wire repos + config into core services

Factory functions pattern (in `auth-core.adapter.ts`, `org-core.adapter.ts`, `billing-core.adapter.ts`):
```typescript
export function createLoginFlow() {
  return new LoginFlow(new UsersRepo());
}
```

API routes call these factories, never instantiate core classes directly.

### ESLint architecture boundaries (enforced)

- `packages/*-core` and `@contracts` **cannot** import `@db`, `@prisma/client`, or `next/*`
- `@contracts` cannot import any other package
- `@ui` cannot import `@db`, `@auth-core`, `@billing-core`, `@org-core`
- No package under `packages/` can import from `apps/`

### Web app structure (`apps/web/src/`)

- `app/` — Next.js App Router: `(marketing)` public pages, `(auth)` auth pages, `(app)` protected routes, `api/` route handlers
- `server/` — Server-only code: `adapters/`, `db-repos/`, `auth/`, `config/`, `services/`
- `features/` — Feature modules with page components and hooks
- `shared/` — UI layout, constants (routes), hooks, `lib/cn` utility
- `entities/` — Domain entity components (user avatar, org switcher)

### Token security pattern

All tokens (sessions, email tokens, OAuth state) are hashed with SHA-256 + pepper before storage. Raw tokens are returned to the client; only hashes exist in the database. The `TOKEN_PEPPER` env var (min 16 chars) is injected via service constructors.

## Conventions

- **Package aliases**: Use `@auth-core`, `@db`, `@contracts`, etc. Never deep-import like `@auth-core/src/...` — always go through barrel exports (`index.ts`).
- **Type imports**: Use `import type { ... }` (inline style enforced by ESLint).
- **Import order**: builtin → external → internal → parent → sibling → index → object → type, with newlines between groups, alphabetized.
- **Unused params**: Prefix with `_` (e.g. `_req`).
- **Prisma model mapping**: Models use `@@map("snake_case_table")` for DB column/table names.
- **Tests**: Vitest with constructor-injected mocks (no `vi.mock` globals). Test files live next to source as `*.test.ts`.
- **Server-only**: Files under `apps/web/src/server/` import `"server-only"` to prevent client bundling.
- **Rate limiting**: DB-backed windowed buckets (`AuthRateLimitBucket`). Applied via `enforceAuthRateLimit(req, route)` at route handler start.

