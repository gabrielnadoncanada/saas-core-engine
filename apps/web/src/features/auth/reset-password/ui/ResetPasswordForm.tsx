"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import {
  resetPasswordAction,
} from "@/features/auth/reset-password/api/reset-password.action";
import { resetPasswordInitialState } from "@/features/auth/reset-password/model/reset-password.form-state";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { useToastMessage } from "@/shared/hooks/use-toast-message";
import { PasswordInput } from "@/shared/components/forms/password-input";
import { Loader2 } from "lucide-react";

const MISSING_TOKEN_MESSAGE = "Missing token. Use the link from your email.";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    resetPasswordInitialState,
  );
  const fieldErrors = state.fieldErrors ?? {};
  const hasFieldErrors = Boolean(fieldErrors.password?.length || fieldErrors.confirmPassword?.length);

  useToastMessage(!token ? MISSING_TOKEN_MESSAGE : null, { kind: "error" });
  useToastMessage(state.error, { kind: "error", skip: hasFieldErrors });

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="token" value={token} />

      <Field data-invalid={fieldErrors.password?.length ? true : undefined}>
        <FieldLabel htmlFor="reset-password-password-input">New password</FieldLabel>
        <PasswordInput
          id="reset-password-password-input"
          name="password"
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          aria-invalid={fieldErrors.password?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.password?.[0]}</FieldError>
      </Field>

      <Field data-invalid={fieldErrors.confirmPassword?.length ? true : undefined}>
        <FieldLabel htmlFor="reset-password-confirm-password-input">Confirm new password</FieldLabel>
        <PasswordInput
          id="reset-password-confirm-password-input"
          name="confirmPassword"
          placeholder="Repeat your new password"
          autoComplete="new-password"
          aria-invalid={fieldErrors.confirmPassword?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.confirmPassword?.[0]}</FieldError>
      </Field>

      <Button disabled={pending || !token}>
        {pending ? <Loader2 className='animate-spin' /> : "Update password"}
      </Button>
    </form>
  );
}
