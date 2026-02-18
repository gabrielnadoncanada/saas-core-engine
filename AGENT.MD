No backward compatibility by default. Do not preserve legacy behaviors, deprecated APIs, old schemas, or old config formats unless explicitly requested in the task.

Prefer breaking changes over compatibility layers. If a refactor introduces breaking changes, do it cleanly rather than adding adapters, fallbacks, dual paths, feature flags, or “support both versions” code.

Delete legacy code aggressively. Remove dead code, deprecated branches, unused helpers, old DTOs/interfaces, legacy endpoints, and compatibility shims. If unsure whether something is used, search references; if still unclear, remove and rely on tests/CI.

Single source of truth. Do not keep multiple implementations of the same logic. Consolidate to one canonical path.
