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

## 4.1) Feature internal structure (mandatory)

- A feature may contain multiple slices (example: `sign-in`, `sign-up`, `forgot-password`).
- If a feature has multiple slices, shared internals must live in `features/<feature>/shared/*`.
- In multi-slice features, do not keep `model/`, `api/`, `lib/`, `ui/` directly at `features/<feature>/`.
- Root of a multi-slice feature is limited to:
  - slice folders,
  - one `shared/` folder for intra-feature reuse,
  - feature `index.ts` public API.
- Single-slice feature can keep `model/api/lib/ui` directly at feature root.

## 5) Keep strict boundary per slice

- `model`: schema, types, state contracts, validation.
- `api`: server actions, queries, mutations, transport contracts.
- `lib`: pure domain rules, mappers, payload builders, error normalization.
- `ui`: presentation and interaction binding only.
- Place feature hooks in `model` by default (`model/useXxx.ts`), not `ui/hooks`.
- For multi-slice features, put reusable code used by several slices under `features/<feature>/shared/{model,api,lib,ui}`.

## 6) Place Server Actions and hooks correctly

- Server Actions (`"use server"`) go to slice-level `features/<feature>/<slice>/api/{actionName}.action.ts` for user intent.
- Entity data primitives (repo/query) go to `entities/*/api`.
- Feature UI orchestration hooks (`useForm`, optimistic UI, pending state) go to `features/<feature>/<slice>/model/useXxx.ts`.
- Generic hooks with no domain knowledge go to `shared/hooks`.
- Avoid "god hooks" bundling unrelated actions.
- Hooks/helpers reused by several slices of the same feature go to `features/<feature>/shared/*`.

## 6.1) Server Action contract (mandatory)

- Standardize around two explicit action profiles:
- `Form Action` for `<form action={...}>` + `useActionState`: return a typed form state (`{ error: string | null, ... }`) and use `redirect()` on success when navigation is required.
- `Command Action` for client orchestration hooks (`useXxx`): return `ActionResult<T>` from `@/shared/types` using `ok()` / `fail()`.
- Use `verify-email.action.ts` as the canonical `Command Action` reference.
- For `Command Action`, keep this sequence: validate input, enforce rate-limit when needed, require auth when needed, execute domain flow, map errors once (`authErrorMessage`), return `ok/fail`.
- Keep action constants explicit (`ACTION_PATH`, `RATE_LIMIT_KEY`) and avoid magic strings.
- Next.js 16 enforcement: any `"use server"` file must export only `async function`.
- Do not export values or types from `*.action.ts` (`const`, `type`, `interface`, `enum`, re-export list).
- Form state contracts (`XxxFormState`, `xxxInitialState`) belong in `model/*.form-state.ts`.
- Default form validation/error standard (mandatory unless explicitly overridden):
- Action validates inputs with zod `safeParse`.
- On validation failure, return a typed form state with:
  - global `error` (first validation message or fallback),
  - structured `fieldErrors` from zod flatten.
- UI consumes `state.fieldErrors ?? {}` and wires:
  - `data-invalid` on `Field`,
  - `aria-invalid` on input control,
  - `FieldError` with first field message (`?.[0]`).
- Global success/error feedback for forms must use toast (`sonner`), not inline JSX messages.
- Use `features/auth/sign-in/ui/LoginForm.tsx` as canonical rendering reference.

## 7) Standardize public API

- Expose slice surface via `index.ts`.
- Import from public API, not deep internal paths.
- Keep internals private by default.
- Every app page imports from `@/features/auth` (slice root), never from `@/features/auth/ui` or `@/features/auth/model`.
- Do not create segment-level barrels by default (`ui/index.ts`, `model/index.ts`, `lib/index.ts`, `api/index.ts`) inside a slice.
- Prefer one `index.ts` at slice root as the only public API, and direct relative file imports for internals.

### Golden rule

- Keep each slice public API stable through its `index.ts`.
- Re-export UI, actions, and types from this single file, so consumers do not depend on internal file layout.
- Example:
```ts
// src/features/auth/login/index.ts
export { LoginForm } from "./LoginForm";
export { loginAction } from "./login.action";
export type { LoginFormState } from "./login.types";
```

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
- `window.location.href` for internal app navigation in App Router flows; use `router.push()` (client) or `redirect()` (server action).
- Segment-level `index.ts` barrels inside a slice without a concrete, documented reason.
- In a multi-slice feature, root-level `features/<feature>/{api,model,lib,ui}` folders.

## 11) `shared/api/` - HTTP primitives used across layers

- When a UI component in `shared/` needs to call an HTTP endpoint that belongs to a feature domain (e.g. `logout`), do not import from `features/`.
- Instead, place a minimal HTTP function in `shared/api/<domain>.ts`.
- `shared/api/auth.ts` is a valid location for `logout()` called by shared dialogs.
- This keeps `shared` self-contained while avoiding the Shared -> Features violation.

## 12) Import locality rules

- Intra-slice imports (within the same slice, e.g. `features/auth/signup/`) must use relative paths (`../api/sign-up.action`, `./sign-up.schema`).
- Inter-slice imports (from another feature or `shared`) must use absolute alias paths (`@/features/auth`, `@/shared/constants/routes`).
- This makes slice boundaries visible at a glance and prevents accidental cross-slice coupling.

## 12.1) File naming conventions (mandatory)

- UI components use PascalCase and map 1:1 with exported component name.
- Examples: `LoginForm.tsx`, `InvoiceUpdateDialog.tsx`, `Sidebar.tsx`, `InvoiceCard.tsx`.
- Hooks use `use` + PascalCase stem (`useXxx.ts`) and must be consistent repo-wide.
- Examples: `useLogin.ts`, `useUpdateInvoice.ts`.
- API/actions/services use kebab-case or camelCase, but one style must be used consistently in the repo.
- Recommended default: kebab-case for tree readability.
- API actions: `{actionName}.action.ts`.
- API queries: `{queryName}.query.ts`.
- API mutations (non-Server Action): `{mutationName}.mutation.ts`.
- API transport clients/adapters: `{domain}.api.ts`.
- Model schemas: `{domain}.schema.ts`.
- Model types: `{domain}.types.ts`.
- Model constants/defaults: `{domain}.constants.ts`.
- Lib mappers: `{domain}.mapper.ts`.
- Lib builders: `{domain}.builder.ts`.
- Lib normalizers: `{domain}.normalizer.ts`.
- Lib guards: `{domain}.guard.ts`.
- Models follow kebab-case by default (example: `login.schema.ts`, `invoice.types.ts`, `invoice.constants.ts`).
- Avoid `index.tsx` as a component file.

## 13) Migration strategy for legacy modules

- Pick one vertical flow (example: auth signup).
- Create target slice with `model/api/lib/ui`.
- Move logic from UI to `lib` and `api`.
- Apply clean breaking changes; do not keep compatibility adapters, dual paths, or legacy aliases unless explicitly requested.
- Remove old paths immediately once usages are migrated.

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
