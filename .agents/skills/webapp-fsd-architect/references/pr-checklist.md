# Architecture PR Checklist

Use this checklist in every architecture-sensitive PR.

1. Layer direction is respected (`app -> ... -> shared`).
2. No upward import and no cross-slice deep import.
3. Slice exposes a clean `index.ts` public API at slice root.
4. UI files contain no domain rules and no transport parsing.
5. Domain branching is in `lib` or dedicated hooks.
6. API layer contains transport details only.
7. Validation/types/defaults live in `model`.
8. Repeated logic is extracted once (DRY).
9. New abstractions are justified by repeated usage (KISS).
10. Tests cover at least one branch in extracted business logic.
11. `shared/**` imports nothing from `features/**` or `entities/**`.
12. Intra-slice imports are relative; inter-slice imports use absolute alias via public API.
13. No inline `fetch` in any UI component; move it to `lib` or `api`.
14. Internal navigation does not use `window.location.href`; use `router.push()` in client or `redirect()` in server actions.
15. File naming follows conventions: UI in `PascalCase.tsx`, hooks in `useXxx.ts`, API/model in consistent kebab-case or camelCase (recommended kebab-case with `*.action.ts`, `*.types.ts`, `*.schema.ts`, `*.query.ts`, `*.mutation.ts`).
16. Action profile is explicit per use case: `Form Action` (`useActionState` + form state) or `Command Action` (`ActionResult<T>` + `ok/fail`), no mixed contract.
17. Command actions centralize server error mapping (`authErrorMessage`) and avoid raw backend contract parsing in client UI.
