"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  signupFormSchema,
  signupWithWorkspace,
  type SignupFormValues,
} from "@/features/auth/model";
import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

type InviteLookupState = "idle" | "loading" | "ready" | "error";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const inviteToken = searchParams.get("invite");
  const [inviteState, setInviteState] = useState<InviteLookupState>(inviteToken ? "loading" : "idle");
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      orgName: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const token = inviteToken;
    if (!token) {
      setInviteState("idle");
      setInviteEmail(null);
      return;
    }

    let disposed = false;

    async function loadInvite() {
      setInviteState("loading");
      try {
        const res = await fetch(`/api/org/invite/token?token=${encodeURIComponent(token!)}`);
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          invite?: { email: string };
        };
        if (!res.ok || !json.ok || !json.invite?.email) {
          throw new Error(json.error ?? "invalid_invite");
        }
        if (disposed) return;
        setInviteEmail(json.invite.email);
        form.setValue("email", json.invite.email, { shouldValidate: true });
        form.setValue("orgName", "Invited workspace", { shouldValidate: true });
        setInviteState("ready");
      } catch {
        if (disposed) return;
        setInviteState("error");
        setInviteEmail(null);
      }
    }

    void loadInvite();

    return () => {
      disposed = true;
    };
  }, [inviteToken, form]);

  async function submit(values: SignupFormValues) {
    try {
      const invitedSignup = Boolean(inviteToken && inviteEmail && inviteState === "ready");
      await signupWithWorkspace({
        ...values,
        orgName: invitedSignup ? "Invited workspace" : values.orgName,
        inviteToken: invitedSignup ? inviteToken ?? undefined : undefined,
      });

      if (invitedSignup) {
        toast.success("Account created. Invitation accepted.");
        router.push(routes.app.dashboard);
        return;
      }

      const loginHref = redirectParam
        ? `${routes.auth.login}?redirect=${encodeURIComponent(redirectParam)}`
        : routes.auth.login;
      toast.success("Compte cree. Verifie ton email, puis connecte-toi.");
      router.push(loginHref);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    }
  }

  const isInvited = Boolean(inviteToken && inviteEmail && inviteState === "ready");
  const inviteBlocked = Boolean(inviteToken && inviteState !== "ready");

  return (
    <form
      onSubmit={(e) => {
        void form.handleSubmit(submit)(e);
      }}
      className="grid gap-3"
    >
      <FieldGroup>
        {!isInvited ? (
          <Controller
            name="orgName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="signup-org-name">Workspace name</FieldLabel>
                <Input
                  {...field}
                  id="signup-org-name"
                  placeholder="Acme Inc."
                  autoComplete="organization"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />
        ) : null}

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <Input
                {...field}
                id="signup-email"
                placeholder="you@company.com"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
                disabled={isInvited}
                readOnly={isInvited}
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
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <Input
                {...field}
                id="signup-password"
                placeholder="Minimum 8 characters"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </FieldGroup>

      {inviteToken && inviteState === "loading" ? (
        <p className="text-sm text-muted-foreground">Checking invitation...</p>
      ) : null}
      {inviteToken && inviteState === "error" ? (
        <p className="text-sm text-red-600">Invitation is invalid or expired.</p>
      ) : null}

      <Button className="rounded-xl" disabled={form.formState.isSubmitting || inviteBlocked}>
        {form.formState.isSubmitting ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
