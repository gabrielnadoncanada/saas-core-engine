---
name: webapp-fsd-architect
description: Design, audit, and refactor web apps using Feature-Sliced Design with architect-level standards. Use when creating project structure, enforcing layer dependency rules, defining feature slices, splitting business logic from UI, reviewing PR architecture, or planning FSD migrations in Next.js/React codebases.
---

# Web App FSD Architect

Apply this skill to structure Next.js App Router projects with pragmatic FSD.

## 1) Use pragmatic layering for Next.js

- Start with `app`, `features`, `shared`.
- Add `entities` when domain objects are reused.
- Add `widgets` when screen blocks are reused across pages.
- Add `processes` only for multi-feature flows (onboarding, checkout, auth-flow).
- Keep `pages` only if Pages Router is still used.

## 2) Keep `app/` thin in App Router

- `app/` handles routing, layout, metadata, and composition.
- Do not place business logic, zod domain transforms, or heavy state orchestration in `app/`.
- Route handlers stay in `app/api` when needed.

## 3) Enforce dependency direction

- `app` can depend on all lower layers in use.
- `pages` can depend on `widgets`, `features`, `entities`, `shared`.
- `widgets` can depend on `features`, `entities`, `shared`.
- `features` can depend on `entities`, `shared`.
- `entities` can depend on `shared`.
- `processes` can depend on `widgets`, `features`, `entities`, `shared`.
- `shared` depends on nothing domain-specific.
- Never import upward.
- Never create lateral coupling between slices without explicit public API.

## 4) Define slice responsibility

- `entities/*`: core business nouns, stable domain model, reusable domain UI.
- `features/*`: user actions/use-cases (signup, invite-accept, edit-profile).
- `widgets/*`: page composition blocks.
- `processes/*`: multi-step flows crossing multiple features.
- `pages/*`: route-level assembly.
- `app/*`: bootstrapping, providers, routing, global policies.

## 5) Keep strict boundary per slice

- `model`: schema, types, state contracts, validation.
- `api`: server actions, queries, mutations, transport contracts.
- `lib`: pure domain rules, mappers, payload builders, error normalization.
- `ui`: presentation and interaction binding only.
- Place feature hooks in `model` by default (`model/useXxx.ts`), not `ui/hooks`.

## 6) Place Server Actions and hooks correctly

- Server Actions (`"use server"`) go to `features/*/api/*.action.ts` for user intent.
- Entity data primitives (repo/query) go to `entities/*/api`.
- Feature UI orchestration hooks (`useForm`, optimistic UI, pending state) go to `features/*/model/use*.ts`.
- Generic hooks with no domain knowledge go to `shared/hooks`.
- Avoid "god hooks" bundling unrelated actions.

## 7) Standardize public API

- Expose slice surface via `index.ts`.
- Import from public API, not deep internal paths.
- Keep internals private by default.
- Every app page imports from `@/features/auth` (slice root), never from `@/features/auth/ui` or `@/features/auth/model`.
- Do not create segment-level barrels by default (`ui/index.ts`, `model/index.ts`, `lib/index.ts`, `api/index.ts`) inside a slice.
- Prefer one `index.ts` at slice root as the only public API, and direct relative file imports for internals.

## 8) Apply SRP/DRY/KISS by policy

- SRP: one reason to change per module.
- DRY: shared primitives in `shared`, domain reuse in `entities`.
- KISS: prefer simple flows before abstractions.
- Do not introduce patterns without repeated need.

## 9) Architecture review workflow

- Identify violated boundaries first.
- Isolate business logic from UI.
- Remove duplicated mapping/validation paths.
- Add or fix public API exports.
- Validate import graph direction.
- Keep changes incremental per slice.

## 10) Forbidden patterns

- Direct `fetch` in `ui` when `api`/`lib` module exists - even for non-form components like gates or dialogs.
- Domain branching in JSX render blocks.
- Parsing backend error contracts in components.
- Shared layer importing feature/entity code.
- Cross-slice deep imports bypassing `index.ts`.
- Putting feature hooks under `ui/hooks` by default.
- `window.location.href` as redirect value - use `pathname + search + hash` to stay within safe redirect guards.
- Segment-level `index.ts` barrels inside a slice without a concrete, documented reason.

## 11) `shared/api/` - HTTP primitives used across layers

- When a UI component in `shared/` needs to call an HTTP endpoint that belongs to a feature domain (e.g. `logout`), do not import from `features/`.
- Instead, place a minimal HTTP function in `shared/api/<domain>.ts`.
- `shared/api/auth.ts` is a valid location for `logout()` called by shared dialogs.
- This keeps `shared` self-contained while avoiding the Shared -> Features violation.

## 12) Import locality rules

- Intra-slice imports (within the same slice, e.g. `features/auth/signup/`) must use relative paths (`../api/signup-api`, `./signup-schema`).
- Inter-slice imports (from another feature or `shared`) must use absolute alias paths (`@/features/auth`, `@/shared/constants/routes`).
- This makes slice boundaries visible at a glance and prevents accidental cross-slice coupling.

## 13) Migration strategy for legacy modules

- Pick one vertical flow (example: auth signup).
- Create target slice with `model/api/lib/ui`.
- Move logic from UI to `lib` and `api`.
- Keep compatibility adapters during transition.
- Remove old paths after usages are migrated.

## 14) Definition of Done (architecture PR)

- Layer dependencies follow FSD direction.
- Slice has clear public API (`index.ts` at slice root).
- UI files are view-focused only.
- Domain/transport concerns are isolated.
- Server actions and hooks are placed at correct layer.
- No duplicate rules/mappers across slices.
- Intra-slice imports are relative; inter-slice imports go through public API.
- Slice uses one root `index.ts` public API; segment-level barrels are avoided by default.
- `shared/**` imports nothing from `features/**` or `entities/**`.
- Review checklist is fully passed.

## References

- Architecture contract: [references/fsd-contract.md](references/fsd-contract.md)
- Slice templates: [references/slice-templates.md](references/slice-templates.md)
- PR review checklist: [references/pr-checklist.md](references/pr-checklist.md)
