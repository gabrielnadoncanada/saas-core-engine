# Architecture PR Checklist

Use this checklist in every architecture-sensitive PR.

1. Layer direction is respected (`app -> ... -> shared`).
2. No upward import and no cross-slice deep import.
3. Slice exposes a clean `index.ts` public API.
4. UI files contain no domain rules and no transport parsing.
5. Domain branching is in `lib` or dedicated hooks.
6. API layer contains transport details only.
7. Validation/types/defaults live in `model`.
8. Repeated logic is extracted once (DRY).
9. New abstractions are justified by repeated usage (KISS).
10. Tests cover at least one branch in extracted business logic.
