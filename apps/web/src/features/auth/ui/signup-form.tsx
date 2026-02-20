"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  getDashboardRedirectPath,
  signupFormSchema,
  signupWithWorkspace,
  type SignupFormValues,
} from "@/features/auth/model";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

export function SignupForm() {
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      orgName: "",
      email: "",
      password: "",
    },
  });

  async function submit(values: SignupFormValues) {
    try {
      await signupWithWorkspace(values);
      window.location.href = getDashboardRedirectPath();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
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
        <Controller
          name="orgName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-org-name">Workspace name</FieldLabel>
              <Input
                {...field}
                id="signup-org-name"
                placeholder="Acme Inc."
                autoComplete="organization"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <Input
                {...field}
                id="signup-email"
                placeholder="you@company.com"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <Input
                {...field}
                id="signup-password"
                placeholder="Minimum 8 characters"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </FieldGroup>

      <Button className="rounded-xl" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
