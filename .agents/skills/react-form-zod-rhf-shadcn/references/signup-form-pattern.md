# Signup Form Pattern (Next.js 16 aligned)

Use this as baseline for auth/profile/settings forms.

Primary pattern: Server Action form (`action={...}` + `useActionState`).
RHF is optional for complex client-side form behavior.

## Target feature structure

```txt
features/auth/sign-in/
  index.ts
  LoginForm.tsx
  useLogin.ts
  sign-in.action.ts
  sign-in.schema.ts
  sign-in.types.ts
```

## Stable slice API (`index.ts`)

```ts
export { LoginForm } from "./LoginForm";
export { loginAction } from "./sign-in.action";
export type { LoginFormState } from "./sign-in.action";
export { loginFormSchema } from "./sign-in.schema";
export { useLogin } from "./useLogin";
```

## Server Action form example

```tsx
"use client";

import { useActionState } from "react";

import { loginAction, loginInitialState } from "./sign-in.action";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, loginInitialState);

  return (
    <form action={formAction} className="grid gap-3">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input id="login-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </FieldGroup>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <Button disabled={pending}>{pending ? "Signing in..." : "Sign in"}</Button>
    </form>
  );
}
```

## Action example (server-side validation)

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginFormState = { error: string | null };
export const loginInitialState: LoginFormState = { error: null };

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validated = loginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) return { error: "Invalid input" };

  // domain call...
  // await login(...)

  redirect("/dashboard");
}
```

## Command Action example (non-form interaction)

```ts
"use server";

import { ActionResult, fail, ok } from "@/shared/types";
import { authErrorMessage } from "@/server/auth/auth-error-message";

export async function resendVerificationAction(): Promise<ActionResult> {
  try {
    // domain flow...
    return ok();
  } catch (error) {
    return fail(authErrorMessage(error, "Request failed."));
  }
}
```

## Optional RHF usage

Use RHF only when the form needs controlled custom inputs or advanced client behavior.
When using RHF:

- prefer `register` for simple fields.
- use `Controller` only for controlled components.
- keep domain logic out of UI.
