# Signup Form Pattern (from `apps/web/src/features/auth/ui/signup-form.tsx`)

Use this as the baseline when creating a new form.

Principle: use `register` for simple inputs, `Controller` for controlled/custom inputs only.

## Target feature structure

```txt
features/auth/signup/
  model/
    signup-schema.ts
    use-signup-flow.ts
  api/
    signup.api.ts
    signup-invite.action.ts
  lib/
    signup-payload.ts
    signup-error.ts
    signup-redirect.ts
  ui/
    signup-form.tsx
  index.ts
```

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { myFormSchema, type MyFormValues } from "@/features/x";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

export function MyForm() {
  const defaultValues: MyFormValues = {
    email: "",
    password: "",
    phoneNumber: "",
  };

  const form = useForm<MyFormValues>({
    resolver: zodResolver(myFormSchema),
    defaultValues,
  });

  async function submit(values: MyFormValues) {
    try {
      await save(values);
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void form.handleSubmit(submit)(e);
      }}
      className="grid gap-3"
    >
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="my-email">Email</FieldLabel>
          <Input
            id="my-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
          {form.formState.errors.email ? <FieldError errors={[form.formState.errors.email]} /> : null}
        </Field>
      </FieldGroup>

      <Button disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
```

## Controlled custom input example (`PhoneInput`)

```tsx
<Controller
  name="phoneNumber"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="profile-phone">Phone number</FieldLabel>
      <PhoneInput
        id="profile-phone"
        value={field.value ?? ""}
        onChange={field.onChange}
        onBlur={field.onBlur}
        aria-invalid={fieldState.invalid}
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  )}
/>
```
