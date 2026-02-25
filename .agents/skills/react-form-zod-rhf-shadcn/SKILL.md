---
name: react-form-zod-rhf-shadcn
description: Architect and refactor Next.js forms with Zod + react-hook-form + shadcn Field primitives using strict FSD boundaries and senior-level separation of concerns. Use with webapp-fsd-architect as the base architecture contract when building signup/profile/settings forms, enforcing UI-vs-domain isolation, handling validation/errors, and standardizing form architecture at scale.
---

# Form Architecture Contract (Next.js + Zod + shadcn)

Apply this contract for every feature form.

## 0) Mandatory base skill

- Apply `webapp-fsd-architect` first.
- If a rule conflicts, `webapp-fsd-architect` wins for boundaries and naming.
- This skill specializes form implementation within that contract.

## 1) Naming conventions (mandatory)

- UI components: `PascalCase.tsx` and 1:1 with exported symbol.
- Examples: `LoginForm.tsx`, `InvoiceUpdateDialog.tsx`, `Sidebar.tsx`.
- Hooks: `useXxx.ts` (consistent style repo-wide).
- Examples: `useLogin.ts`, `useUpdateInvoice.ts`.
- API/actions/services: consistent style repo-wide, recommended kebab-case.
- Examples: `login.action.ts`, `request-password-reset.action.ts`, `invoice.repo.ts`.
- Model files: kebab-case.
- Examples: `login.schema.ts`, `invoice.types.ts`, `invoice.constants.ts`.

## 2) Slice public API (golden rule)

- Keep slice public API stable via `index.ts`.
- Re-export UI, actions, and exported types from `index.ts`.
- Do not force consumers to import internal paths.

```ts
// src/features/auth/login/index.ts
export { LoginForm } from "./LoginForm";
export { loginAction } from "./login.action";
export type { LoginFormState } from "./login.types";
```

## 3) Layer ownership

- Slice-level by default:
- `features/<feature>/<slice>/model`: schema, types, defaults, field constraints.
- `features/<feature>/<slice>/api`: server actions, queries, mutations, transport contracts.
- `features/<feature>/<slice>/lib`: payload builders, error mappers, domain rules (pure).
- `features/<feature>/<slice>/ui`: rendering and interaction only.
- `features/<feature>/<slice>/model/useXxx.ts`: orchestration hooks for async form flows.
- For multi-slice features, anything reused across slices goes in `features/<feature>/shared/*`.
- Do not keep root-level `features/<feature>/{model,api,lib,ui}` in multi-slice features.

## 4) Submission strategy (default)

- Default to Next.js Server Actions form pattern:
- `action={serverAction}` + `useActionState`.
- Server-side zod validation in the action.
- Return structured form state for errors; use `redirect()` for success navigation.
- Keep server actions pure: no client-only imports and no UI concerns in `*.action.ts`.
- Next.js 16 hard rule: in files with `"use server"`, export only `async function`.
- Never export `const` initial states, types, interfaces, enums, or re-exports from `*.action.ts`.
- Place form state types/defaults in `model/*.form-state.ts` and import them in both UI and action.

## 4.1) Action profile split (mandatory)

- For form submissions, use `Form Action` contract:
- signature `(_prevState, formData) => Promise<FormState>`.
- return field/global error state for rendering.
- For non-form commands (resend email, logout, toggle, etc.), use `Command Action` contract:
- signature `(input?) => Promise<ActionResult<T>>`.
- return `ok()/fail()` from `@/shared/types`.
- Current canonical command example: `features/auth/verify-email/verify-email.action.ts`.
- Do not mix both contracts in a single action.

## 5) RHF usage (optional, not default)

- Use RHF only when complexity requires it:
- controlled/custom inputs, heavy client-side validation UX, dynamic field arrays.
- If RHF is used:
- prefer `register` for simple fields.
- use `Controller` only for controlled/custom components.
- Do not keep dual form paths (RHF + Server Action) for the same use case unless explicitly requested.

## 6) shadcn field consistency

- Use `Field`, `FieldLabel`, and `FieldError` consistently.
- Keep accessibility wiring (`aria-invalid`, labels, descriptions) correct.
- If markup repeats, extract shared adapters in `shared/components/form/*`.

## 7) Error architecture

- Field validation errors: schema + field-level rendering.
- Domain/transport errors: map once in `lib` and return user-facing message.
- Avoid duplicating message strings across UI files.
- Command actions map server errors once with `authErrorMessage`; client hooks use `toMessage` only for unexpected failures.
- Canonical form-error contract (mandatory):
- `model/*.form-state.ts` defines `XxxFormState` with `error: string | null` and typed `fieldErrors`.
- Server action validates with zod `safeParse`, then returns:
  - `error`: first zod message (or fallback) for global feedback.
  - `fieldErrors`: from `validated.error.flatten().fieldErrors`.
- UI reads `const fieldErrors = state.fieldErrors ?? {}`.
- Each field must wire both invalid markers:
  - `<Field data-invalid={fieldErrors.fieldName?.length ? true : undefined}>`
  - input `aria-invalid={fieldErrors.fieldName?.length ? true : undefined}`
- Field message rendering must use first error only:
  - `<FieldError>{fieldErrors.fieldName?.[0]}</FieldError>`
- Global success/error feedback must use toast notifications (`sonner`) and not inline JSX blocks.
- Only field-level validation remains inline via `FieldError`.
- Do not invent per-form error shapes when this contract fits; this is the default standard.

## 8) Forbidden patterns

- `fetch` calls inside UI components when `api/lib` module exists.
- Domain branching in component bodies.
- Parsing backend contracts directly in JSX.
- Cross-slice deep imports bypassing `index.ts`.
- Inline payload transforms inside UI submit handlers.

## 9) PR Definition of Done

- Naming follows current conventions (PascalCase UI, `useXxx`, kebab-case API/model).
- Slice public API is stable and complete via `index.ts`.
- UI contains no domain rules and no transport parsing.
- Validation and domain errors are both covered.
- Loading/disabled/pending states are wired.
- Validation/error wiring matches canonical `LoginForm` contract (`fieldErrors`, `FieldError`, `aria-invalid`) and uses toast for global feedback.

## References

- Base architecture: `../webapp-fsd-architect/SKILL.md`
- Pattern reference: `references/signup-form-pattern.md`
