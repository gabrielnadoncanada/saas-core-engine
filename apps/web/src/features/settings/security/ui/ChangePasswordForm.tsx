"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { changePasswordAction } from "../api/change-password.action";
import { changePasswordInitialState } from "../model/change-password.form-state";
import { PasswordInput } from "@/shared/components/forms/password-input";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    changePasswordInitialState,
  );

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-3">
      <Field data-invalid={fieldErrors.currentPassword?.length ? true : undefined}>
        <FieldLabel htmlFor="security-current-password">Current password</FieldLabel>
        <PasswordInput
          id="security-current-password"
          name="currentPassword"
          placeholder="Enter your current password"
          autoComplete="current-password"
          aria-invalid={fieldErrors.currentPassword?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.currentPassword?.[0]}</FieldError>
      </Field>

      <Field data-invalid={fieldErrors.newPassword?.length ? true : undefined}>
        <FieldLabel htmlFor="security-new-password">New password</FieldLabel>
        <PasswordInput
          id="security-new-password"
          name="newPassword"
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          aria-invalid={fieldErrors.newPassword?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.newPassword?.[0]}</FieldError>
      </Field>

      <Field data-invalid={fieldErrors.confirmPassword?.length ? true : undefined}>
        <FieldLabel htmlFor="security-confirm-password">Confirm new password</FieldLabel>
        <PasswordInput
          id="security-confirm-password"
          name="confirmPassword"
          placeholder="Repeat your new password"
          autoComplete="new-password"
          aria-invalid={fieldErrors.confirmPassword?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.confirmPassword?.[0]}</FieldError>
      </Field>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <Button disabled={pending} className="w-fit">
        {pending ? <Loader2 className="animate-spin" /> : "Change password"}
      </Button>
    </form>
  );
}
