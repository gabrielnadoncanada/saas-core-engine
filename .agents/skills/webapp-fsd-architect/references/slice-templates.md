# Slice Templates

## Feature slice template

```txt
features/<feature-name>/
  index.ts
  model/
    <feature-name>.schema.ts
    <feature-name>.types.ts
    <feature-name>.constants.ts
    use<FeatureName>.ts
  api/
    <feature-name>.api.ts
    <feature-name>.action.ts
    <feature-name>.query.ts
    <feature-name>.mutation.ts
  lib/
    <feature-name>.builder.ts
    <feature-name>.mapper.ts
  ui/
    <FeatureName>Form.tsx
```

## Feature slice with sub-slices (auth example)

```txt
features/auth/
  index.ts
  lib/
    auth-redirect.guard.ts
  sign-in/
    index.ts
    api/
      sign-in.action.ts
    model/
      sign-in.schema.ts
      sign-in.types.ts
    ui/
      SignInForm.tsx
  sign-up/
    index.ts
    api/
      sign-up.action.ts
      signup-invite.query.ts
    lib/
      sign-up.builder.ts
      sign-up.mapper.ts
    model/
      sign-up.schema.ts
      sign-up.types.ts
      useSignUpInvite.ts
    ui/
      SignUpForm.tsx
  forgot-password/
    index.ts
    api/
      forgot-password.action.ts
    model/
      forgot-password.schema.ts
      forgot-password.types.ts
    ui/
      ForgotPasswordForm.tsx
  reset-password/
    index.ts
    api/
      reset-password.action.ts
    model/
      reset-password.schema.ts
      reset-password.types.ts
    ui/
      ResetPasswordForm.tsx
```

## Entity slice template

```txt
entities/<entity-name>/
  index.ts
  model/
    <entity-name>.types.ts
    <entity-name>.schema.ts
  lib/
    <entity-name>.normalizer.ts
  ui/
    <EntityName>Badge.tsx
```

## Widget template

```txt
widgets/<widget-name>/
  index.ts
  ui/
    <WidgetName>.tsx
```

## Process template (optional)

```txt
processes/<process-name>/
  index.ts
  model/
  ui/
```

## shared/api template (for cross-layer HTTP primitives)

```txt
shared/api/
  auth.api.ts
  <domain>.api.ts
```

Use `shared/api/<domain>.api.ts` when a shared component needs to call a domain endpoint
without importing from `features/`. Keep functions minimal and transport-only.

## Minimal `index.ts` pattern

```ts
export { SignInForm } from "./sign-in/ui/SignInForm";
export { SignUpForm } from "./sign-up/ui/SignUpForm";
```
