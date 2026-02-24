# FSD Contract

## Layer map (progressive)

```txt
Minimum: app -> features -> shared
Extended: app -> pages -> processes -> widgets -> features -> entities -> shared
```

Allowed dependency direction is left to right only for active layers.

Do not force `entities/widgets/pages` before they solve a real reuse/coupling issue.

## Module contract (per slice)

- `model`: types, schema, state contracts.
- `api`: HTTP clients, server actions, request/response DTO.
- `lib`: pure rules, mappers, builders.
- `ui`: components, form wiring, display logic.

## Hooks and actions rule

- Feature hooks go to `features/*/model/use*.ts`.
- Generic reusable hooks go to `shared/hooks`.
- Intent actions go to `features/*/api/*.action.ts`.
- Entity repos/queries go to `entities/*/api/*`.

## Public API rule

- Every slice exports from `index.ts`.
- All external imports target that `index.ts`.
- Internal files are not imported across slices.

## Naming conventions

- Slice names are use-case/domain explicit: `signup`, `invite-accept`, `profile-edit`.
- File names are intent-first: `build-signup-payload.ts`, `map-signup-error.ts`.
- Avoid generic names like `utils.ts`, `helpers.ts`.
