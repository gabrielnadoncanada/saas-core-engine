"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

import { signupAction, signupInitialState } from "@/features/auth/sign-up/api/sign-up.action";
import { useSignupInvite } from "@/features/auth/sign-up/model/useSignUpInvite";

export function SignupForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") ?? "";
  const inviteToken = searchParams.get("invite");

  const { inviteState, inviteEmail, inviteError, isInvited, inviteBlocked } =
    useSignupInvite({ inviteToken });

  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(signupAction, signupInitialState);

  useEffect(() => {
    if (inviteEmail) setEmail(inviteEmail);
  }, [inviteEmail]);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="redirect" value={redirectParam} />
      <input type="hidden" name="invite" value={inviteToken ?? ""} />

      <FieldGroup>
        {!isInvited ? (
          <Field>
            <FieldLabel htmlFor="signup-org-name">Workspace name</FieldLabel>
            <Input
              id="signup-org-name"
              name="orgName"
              placeholder="Acme Inc."
              autoComplete="organization"
              required
            />
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            name="email"
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={isInvited}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            name="password"
            placeholder="Minimum 8 characters"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
      </FieldGroup>

      {inviteToken && inviteState === "loading" ? (
        <p className="text-sm text-muted-foreground">Checking invitation...</p>
      ) : null}

      {inviteToken && inviteState === "error" ? (
        <p className="text-sm text-red-600">
          {inviteError ?? "Invitation is invalid or expired."}
        </p>
      ) : null}

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <Button type="submit" className="rounded-xl" disabled={pending || inviteBlocked}>
        {pending ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}