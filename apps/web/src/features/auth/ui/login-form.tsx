"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

import {
  DEMO_CREDENTIALS,
  getDashboardRedirectPath,
  getOAuthStartUrl,
  loginFormSchema,
  loginWithPassword,
  sendMagicLink,
  type LoginFormValues,
} from "@/features/auth/model";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";

type LoginFormProps = {
  demoMode?: boolean;
};

export function LoginForm({ demoMode = false }: LoginFormProps) {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: demoMode ? DEMO_CREDENTIALS.email : "",
      password: demoMode ? DEMO_CREDENTIALS.password : "",
    },
  });

  const [busyAction, setBusyAction] = useState<null | "magic" | "google" | "github">(null);
  const emailValue = form.watch("email");
  const isBusy = form.formState.isSubmitting || busyAction !== null;

  async function onSubmit(values: LoginFormValues) {
    try {
      await loginWithPassword(values);
      window.location.href = getDashboardRedirectPath(redirectPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function onSendMagic() {
    const valid = await form.trigger("email");
    if (!valid) return;

    setBusyAction("magic");
    try {
      await sendMagicLink({ email: form.getValues("email") });
      toast.success("If the email exists, a magic link was sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send magic link.");
    } finally {
      setBusyAction(null);
    }
  }

  function onOAuth(provider: "google" | "github") {
    setBusyAction(provider);
    window.location.href = getOAuthStartUrl(provider, redirectPath);
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
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                {...field}
                id="login-email"
                placeholder="you@company.com"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Input
                {...field}
                id="login-password"
                placeholder="********"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </FieldGroup>

      <Button className="rounded-xl" disabled={isBusy}>
        {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
      </Button>

      <div className="flex justify-between text-sm">
        <a className="underline text-muted-foreground" href="/forgot-password">
          Forgot password?
        </a>
        <button
          type="button"
          className="underline text-muted-foreground"
          onClick={() => {
            void onSendMagic();
          }}
          disabled={isBusy || !emailValue}
        >
          {busyAction === "magic" ? "Sending..." : "Send magic link"}
        </button>
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
