"use client";

import { useActionState } from "react";

import {
  forgotPasswordAction,
} from "@/features/auth/forgot-password/api/forgot-password.action";
import { forgotPasswordInitialState } from "@/features/auth/forgot-password/model/forgot-password.form-state";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { useToastMessage } from "@/shared/hooks/use-toast-message";
import { Input } from "@/shared/components/ui/input";
import { Loader2, MailOpen } from "lucide-react";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    forgotPasswordInitialState,
  );
  const fieldErrors = state.fieldErrors ?? {};
  const hasFieldErrors = Boolean(fieldErrors.email?.length);

  useToastMessage(state.error, { kind: "error", skip: hasFieldErrors });
  useToastMessage(state.success, { kind: "success" });

  return (
    <form action={formAction} className="grid gap-3">
      <Field data-invalid={fieldErrors.email?.length ? true : undefined}>
        <FieldLabel htmlFor="forgot-password-email">Email</FieldLabel>
        <Input
          id="forgot-password-email"
          name="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          aria-invalid={fieldErrors.email?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.email?.[0]}</FieldError>
      </Field>

      <Button disabled={pending}>
        {pending ? <Loader2 className='animate-spin' /> : <MailOpen />}
        {pending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
