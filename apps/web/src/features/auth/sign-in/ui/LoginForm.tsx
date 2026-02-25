"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";

import { loginAction } from "@/features/auth/sign-in/api/sign-in.action";
import { loginInitialState } from "@/features/auth/sign-in/model/sign-in.form-state";
import { DEMO_CREDENTIALS } from "@/features/auth/sign-in/model/sign-in.schema";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { getOAuthStartUrl } from "@/features/auth/lib/auth-redirect.guard";
import Link from "next/link";
import { IconGithub, IconGmail } from "@/assets/brand-icons";
import { Loader2, LogIn } from "lucide-react";
import { PasswordInput } from "@/shared/components/password-input";

type LoginFormProps = {
  demoMode?: boolean;
};

export function LoginForm({ demoMode = false }: LoginFormProps) {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") ?? "";
  const [state, formAction, pending] = useActionState(loginAction, loginInitialState);
  const [busyAction, setBusyAction] = useState<null | "google" | "github">(null);
  const isBusy = pending || busyAction !== null;
  const signupSuccess = searchParams.get("signup") === "success";
  const emailInUse = searchParams.get("reason") === "email_in_use";
  const fieldErrors = state.fieldErrors ?? {};

  function onOAuth(provider: "google" | "github") {
    setBusyAction(provider);
    window.location.href = getOAuthStartUrl(provider, redirectPath);
  }

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="redirect" value={redirectPath} />

      <Field data-invalid={fieldErrors.email?.length ? true : undefined}>
        <FieldLabel htmlFor="login-email">Email</FieldLabel>
        <Input
          id="login-email"
          name="email"
          placeholder="you@company.com"
          type="email"
          autoComplete="email"
          defaultValue={demoMode ? DEMO_CREDENTIALS.email : ""}
          aria-invalid={fieldErrors.email?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.email?.[0]}</FieldError>
      </Field>

      <Field data-invalid={fieldErrors.password?.length ? true : undefined}>
        <div className="relative flex items-end justify-between">
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Link
            href='/forgot-password'
            className=' text-sm font-medium text-muted-foreground hover:opacity-75'
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="login-password"
          name="password"
          placeholder="********"
          autoComplete="current-password"
          defaultValue={demoMode ? DEMO_CREDENTIALS.password : ""}
          aria-invalid={fieldErrors.password?.length ? true : undefined}
          required
        />
        <FieldError>{fieldErrors.password?.[0]}</FieldError>
      </Field>
      {signupSuccess && (
        <p className="text-sm text-green-600">
          Account created successfully. Please check your email to verify your account.
        </p>
      )}

      {emailInUse && (
        <p className="text-sm text-muted-foreground">
          An account with this email already exists. Please sign in.
        </p>
      )}
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <Button disabled={isBusy}>
        {isBusy ? <Loader2 className='animate-spin' /> : <LogIn />}
        Sign in
      </Button>

      <div className='relative my-2'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-background px-2 text-muted-foreground'>
            Or continue with
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
    </form>
  );
}
