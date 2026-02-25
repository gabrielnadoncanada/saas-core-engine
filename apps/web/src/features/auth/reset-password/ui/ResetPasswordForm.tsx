"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import {
  resetPasswordAction,
} from "@/features/auth/reset-password/api/reset-password.action";
import { resetPasswordInitialState } from "@/features/auth/reset-password/model/reset-password.form-state";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    resetPasswordInitialState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="token" value={token} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reset-password-input">New password</FieldLabel>
          <Input
            id="reset-password-input"
            name="password"
            placeholder="Minimum 8 characters"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
      </FieldGroup>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <Button className="rounded-xl" disabled={pending || !token}>
        {pending ? "Updating..." : "Update password"}
      </Button>

      {!token ? (
        <div className="text-xs text-destructive">Missing token. Use the link from your email.</div>
      ) : null}
    </form>
  );
}
