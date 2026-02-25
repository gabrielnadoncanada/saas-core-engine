"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";

import { loginAction, loginInitialState } from "@/features/auth/sign-in/api/sign-in.action";
import { DEMO_CREDENTIALS } from "@/features/auth/sign-in/model/sign-in.schema";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import { getOAuthStartUrl } from "@/features/auth/lib/auth-redirect.guard";

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

  function onOAuth(provider: "google" | "github") {
    setBusyAction(provider);
    window.location.href = getOAuthStartUrl(provider, redirectPath);
  }

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="redirect" value={redirectPath} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            name="email"
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
            defaultValue={demoMode ? DEMO_CREDENTIALS.email : ""}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Input
            id="login-password"
            name="password"
            placeholder="********"
            type="password"
            autoComplete="current-password"
            defaultValue={demoMode ? DEMO_CREDENTIALS.password : ""}
            required
          />
        </Field>
      </FieldGroup>
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

      <Button className="rounded-xl" disabled={isBusy}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      <div className="flex justify-between text-sm">
        <a className="underline text-muted-foreground" href="/forgot-password">
          Forgot password?
        </a>
      </div>

      <Separator />

      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() => onOAuth("google")}
        disabled={isBusy}
      >
        {busyAction === "google" ? "Redirecting..." : "Continue with Google"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() => onOAuth("github")}
        disabled={isBusy}
      >
        {busyAction === "github" ? "Redirecting..." : "Continue with GitHub"}
      </Button>
    </form>
  );
}
