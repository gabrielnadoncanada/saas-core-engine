"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

import { signupAction } from "@/features/auth/sign-up/api/sign-up.action";
import { signupInitialState } from "@/features/auth/sign-up/model/sign-up.form-state";
import { useSignupInvite } from "@/features/auth/sign-up/model/useSignUpInvite";
import { PasswordInput } from "@/shared/components/password-input";
import { getOAuthStartUrl } from "@/features/auth/lib/auth-redirect.guard";
import { IconGithub, IconGmail } from "@/assets/brand-icons";

export function SignupForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") ?? "";
  const inviteToken = searchParams.get("invite");

  const { inviteState, inviteEmail, inviteError, isInvited, inviteBlocked } =
    useSignupInvite({ inviteToken });

  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(signupAction, signupInitialState);
  const [busyAction, setBusyAction] = useState<null | "google" | "github">(null);
  const isBusy = pending || busyAction !== null;
  const showOauth = !isInvited;
  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    if (inviteEmail) setEmail(inviteEmail);
  }, [inviteEmail]);

  function onOAuth(provider: "google" | "github") {
    setBusyAction(provider);
    window.location.href = getOAuthStartUrl(provider, redirectParam);
  }

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="redirect" value={redirectParam} />
      <input type="hidden" name="invite" value={inviteToken ?? ""} />

      {!isInvited ? (
        <Field data-invalid={fieldErrors.orgName?.length ? true : undefined}>
          <FieldLabel htmlFor="signup-org-name">Workspace name</FieldLabel>
          <Input
            id="signup-org-name"
            name="orgName"
            placeholder="Acme Inc."
            autoComplete="organization"
            aria-invalid={fieldErrors.orgName?.length ? true : undefined}
            required
          />
          <FieldError>{fieldErrors.orgName?.[0]}</FieldError>
        </Field>
      ) : null}

      <Field data-invalid={fieldErrors.email?.length ? true : undefined}>
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
          aria-invalid={fieldErrors.email?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.email?.[0]}</FieldError>
      </Field>

      <Field data-invalid={fieldErrors.password?.length ? true : undefined}>
        <FieldLabel htmlFor="signup-password">Password</FieldLabel>
        <PasswordInput
          id="signup-password"
          name="password"
          placeholder="********"
          autoComplete="new-password"
          minLength={12}
          aria-invalid={fieldErrors.password?.length ? true : undefined}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use 12+ characters with uppercase, lowercase, number, and special character.
        </p>
        <FieldError>{fieldErrors.password?.[0]}</FieldError>
      </Field>

      <Field data-invalid={fieldErrors.passwordConfirm?.length ? true : undefined}>
        <FieldLabel htmlFor="signup-password-confirm">Confirm password</FieldLabel>
        <PasswordInput
          id="signup-password-confirm"
          name="passwordConfirm"
          placeholder="********"
          autoComplete="confirm-password"
          minLength={12}
          aria-invalid={fieldErrors.passwordConfirm?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.passwordConfirm?.[0]}</FieldError>
      </Field>
      {inviteToken && inviteState === "loading" ? (
        <p className="text-sm text-muted-foreground">Checking invitation...</p>
      ) : null}

      {inviteToken && inviteState === "error" ? (
        <p className="text-sm text-red-600">
          {inviteError ?? "Invitation is invalid or expired."}
        </p>
      ) : null}

      <Button type="submit" disabled={isBusy || inviteBlocked}>
        {pending ? "Creating..." : "Create account"}
      </Button>
      {showOauth ? (
        <>
          <div className='relative my-2'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>
                Or continue with email
              </span>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <Button variant='outline' type='button' onClick={() => onOAuth("google")} disabled={isBusy}>
              <IconGmail className='h-4 w-4' /> Google
            </Button>
            <Button variant='outline' type='button' onClick={() => onOAuth("github")} disabled={isBusy}>
              <IconGithub className='h-4 w-4' /> GitHub
            </Button>
          </div>
        </>
      ) : null}
    </form>
  );
}
