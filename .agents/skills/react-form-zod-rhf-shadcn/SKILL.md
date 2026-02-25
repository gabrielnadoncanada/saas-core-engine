---
name: react-form-zod-rhf-shadcn
description: Architect and refactor Next.js forms with Zod + react-hook-form + shadcn Field primitives using strict FSD boundaries and senior-level separation of concerns. Use with webapp-fsd-architect as the base architecture contract when building signup/profile/settings forms, enforcing UI-vs-domain isolation, handling validation/errors, and standardizing form architecture at scale.
---

# Pro Architecture Contract (Zod + RHF + shadcn)

Apply this contract for every feature form.

## 0) Mandatory base skill

- Apply `webapp-fsd-architect` first.
- If a rule conflicts, `webapp-fsd-architect` wins for layer boundaries and dependency direction.
- This skill specializes form implementation inside that architecture contract.

## 1) Layer ownership (non-negotiable)

- `features/*/model`: zod schema, TS types, default values, field constraints.
- `features/*/api`: server actions, HTTP calls, and DTO contracts.
- `features/*/lib`: domain decisions, payload builders, error mapping, pure helpers.
- `features/*/ui`: rendering, RHF bindings, toasts/navigation, no business branching.
- `features/*/model/use*.ts`: orchestration hooks for async form flows.

## 2) Golden data flow

- Input -> RHF state -> zod validation (`resolver`) -> `lib` payload builder -> `api` call -> `lib` error mapper -> UI feedback.
- Keep each arrow as a separate function/module boundary.

## 3) RHF strategy (KISS first)

- Use `register` for native/simple inputs.
- Use `Controller` only for controlled/custom inputs.
- Use one `defaultValues` object exported from `model`.
- Use `form.handleSubmit(submit)` and keep `submit` orchestration-only.

## 4) shadcn field strategy (consistency + DRY)

- Every field uses `Field`, `FieldLabel`, `FieldError`.
- Keep `aria-invalid` wired to RHF error state.
- If markup repeats across forms, create `shared/components/form/*` adapters.

## 5) Business logic isolation (SRP)

- Put branching like invite flow, role rules, and payload overrides in `lib` or `model/use*.ts`.
- Keep UI conditions view-centric only (`disabled`, `readonly`, loading text).
- Never parse backend error shapes directly in JSX/component body.

## 6) Error architecture

- Validation errors: field-level via RHF + `FieldError`.
- Domain/transport errors: map once in `lib/to-user-message.ts` and display from UI.
- Avoid duplicate message strings across components.

## 7) Complexity rule (when to extract hook)

- Extract a dedicated hook when one of these is true:
- More than one async side effect (`useEffect` + submit + preload).
- More than two business branches in submit path.
- More than one external state source (query params + API preload + feature flags).

## 8) Forbidden patterns

- `fetch` calls inside any `ui` component — including non-form UI like gates, dialogs, or banners — when a `lib` or `api` function can be imported instead.
- Inline payload transformation in `submit`.
- Inline domain constants/messages duplicated per view.
- Controller-by-default for all inputs.
- Mixed responsibilities across `ui` and `lib`.
- Feature hooks under `ui/hooks` by default.
- Intra-slice imports using absolute aliases (`@/features/x/model/y`) — use relative paths (`../model/y`) inside the same slice.

## 9) Intra-slice import discipline

- Within a slice (e.g. `features/auth/signup/`), always use **relative imports** between segments:
  - `signup/ui/signup-form.tsx` imports `../model/signup-schema` (not `@/features/auth/signup/model/signup-schema`).
  - `signup/model/use-signup-invite.ts` imports `../api/signup-invite-api` and `./signup-schema`.
  - `signup/api/signup-api.ts` imports `../../lib` when calling the parent slice's HTTP client.
- This enforces clear slice isolation and makes the dependency graph easy to lint.
- Do not add `index.ts` barrels inside slice segments (`ui/index.ts`, `model/index.ts`, `lib/index.ts`, `api/index.ts`) by default.
- Keep a single public API at slice root (`features/*/index.ts`); internal modules import concrete files with relative paths.

## 10) PR Definition of Done

- UI file contains no domain rules and no transport parsing.
- `model/api/lib/ui` boundaries are respected.
- Field errors + submit errors are both covered.
- Loading/disabled states are wired.
- At least one test exists for domain helper or hook with branching logic.
- No inline `fetch` in any UI component.
- Intra-slice imports are relative.
- No segment-level `index.ts` barrels inside the slice unless explicitly justified.

## References

- Base architecture: `../webapp-fsd-architect/SKILL.md`
- For a ready-to-copy scaffold, read [references/signup-form-pattern.md](references/signup-form-pattern.md).
