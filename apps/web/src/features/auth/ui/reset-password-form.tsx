"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  resetPasswordFormSchema,
  type ResetPasswordValues,
} from "../model/auth-schemas";
import { getDashboardRedirectPath } from "../model/auth-redirect";
import { resetUserPassword } from "../model/auth-flows";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) {
      toast.error("Missing token.");
      return;
    }

    try {
      await resetUserPassword({ token, newPassword: values.password });
      toast.success("Password updated. Redirecting...");
      window.setTimeout(() => (window.location.href = getDashboardRedirectPath()), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void form.handleSubmit(onSubmit)(e);
      }}
      className="grid gap-3"
    >
      <FieldGroup>
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-password-input">New password</FieldLabel>
              <Input
                {...field}
                id="reset-password-input"
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
        {form.formState.isSubmitting ? "Updating..." : "Update password"}
      </Button>

      {!token ? (
        <div className="text-xs text-destructive">Missing token. Use the link from your email.</div>
      ) : null}
    </form>
  );
}
