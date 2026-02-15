# DB Boundary

`@db` is infrastructure-only.

## What `@db` exports

- `prisma`
- `DbTx`
- `getDb`
- `withTx`

## What does not belong in `@db`

- Domain repository implementations (`UsersRepo`, `SessionsRepo`, `OrgsRepo`, etc.)
- Domain service logic

## Where repositories live

Prisma-backed repository adapters live in `apps/web/src/server/db-repos`.

Core packages (`packages/*-core`) depend on ports/contracts only and must not import `@db` or `@prisma/client`.
