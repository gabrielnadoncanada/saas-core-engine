# Slice Templates

## Feature slice template

```txt
features/<feature-name>/
  index.ts
  model/
    schema.ts
    types.ts
    defaults.ts
    use-<feature-name>.ts
  api/
    <feature-name>.api.ts
    <feature-name>.action.ts
  lib/
    build-payload.ts
    map-error.ts
  ui/
    <feature-name>-form.tsx
```

## Entity slice template

```txt
entities/<entity-name>/
  index.ts
  model/
    types.ts
    schema.ts
  lib/
    normalize-<entity-name>.ts
  ui/
    <entity-name>-badge.tsx
```

## Widget template

```txt
widgets/<widget-name>/
  index.ts
  ui/
    <widget-name>.tsx
```

## Process template (optional)

```txt
processes/<process-name>/
  index.ts
  model/
  ui/
```

## Minimal `index.ts` pattern

```ts
export { SignupForm } from "./ui/signup-form";
export type { SignupFormValues } from "./model/types";
```
