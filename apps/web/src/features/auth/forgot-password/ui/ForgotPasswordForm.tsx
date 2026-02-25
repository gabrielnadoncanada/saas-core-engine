"use client";

import { useActionState } from "react";

import {
  forgotPasswordAction,
} from "@/features/auth/forgot-password/api/forgot-password.action";
import { forgotPasswordInitialState } from "@/features/auth/forgot-password/model/forgot-password.form-state";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Loader2, MailOpen } from "lucide-react";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    forgotPasswordInitialState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="forgot-password-email">Email</FieldLabel>
          <Input
            id="forgot-password-email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </Field>
      </FieldGroup>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <Button disabled={pending}>
        {pending ? <Loader2 className='animate-spin' /> : <MailOpen />}
        {pending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
