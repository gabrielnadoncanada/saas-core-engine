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
13. No inline `fetch` in any UI component — moved to `lib` or `api` segment.
14. `window.location.href` is never passed as a redirect value — use `pathname + search + hash`.
