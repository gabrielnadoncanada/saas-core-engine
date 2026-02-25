# Slice Templates

## Feature slice template

```txt
features/<feature-name>/
  index.ts          ← public API (required)
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

## Feature slice with sub-module (e.g. auth with signup)

```txt
features/auth/
  index.ts          ← slice public API — exports from ui/, model/, and signup/
  lib/
    auth-client.ts  ← all HTTP calls for auth domain
    index.ts
  model/
    auth-schemas.ts
    auth-flows.ts
    auth-redirect.ts
    index.ts
  ui/
    login-form.tsx
    forgot-password-form.tsx
    verify-email-gate.tsx
    index.ts
  signup/           ← internal sub-module (NOT a separate slice)
    index.ts        ← sub-module public API
    api/
      signup-api.ts          ← imports ../../lib (relative)
      signup-invite-api.ts
    lib/
      signup-payload.ts
      signup-redirect.ts
    model/
      signup-schema.ts
      use-signup-invite.ts   ← imports ../api and ./signup-schema (relative)
    ui/
      signup-form.tsx        ← imports ../model, ../lib, ../api (relative)
      index.ts
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

## shared/api/ template (for cross-layer HTTP primitives)

```txt
shared/api/
  auth.ts    ← logout() used by shared/components/sign-out-dialog.tsx
  <domain>.ts
```

Use `shared/api/<domain>.ts` when a shared component needs to call a domain endpoint
without importing from `features/`. Keep functions minimal — transport only, no business logic.

## Minimal `index.ts` pattern

```ts
// Slice root public API — always required
export { LoginForm, ForgotPasswordForm, VerifyEmailGate } from "./ui";
export { loginFormSchema, loginWithPassword, type LoginFormValues } from "./model";
export { SignupForm } from "./signup";
```
