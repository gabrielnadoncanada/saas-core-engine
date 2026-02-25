"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

import { signupWithWorkspace } from "../api/signup-api";
import { buildSignupPayload } from "../lib/signup-payload";
import { getSignupRedirect } from "../lib/signup-redirect";
import {
  signupDefaultValues,
  signupFormSchema,
  type SignupFormValues,
} from "../model/signup-schema";
import { useSignupInvite } from "../model/use-signup-invite";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const inviteToken = searchParams.get("invite");

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: signupDefaultValues,
  });

  const { inviteState, inviteEmail, isInvited, inviteBlocked } = useSignupInvite({
    inviteToken,
    form,
  });

  async function submit(values: SignupFormValues) {
    try {
      const inviteReady = inviteState === "ready";
      const signupPayload = buildSignupPayload({
        values,
        inviteToken,
        inviteEmail,
        inviteReady,
      });
      await signupWithWorkspace(signupPayload);

      if (signupPayload.inviteToken) {
        toast.success("Account created. Invitation accepted.");
        router.push(routes.app.dashboard);
        return;
      }

      const loginHref = getSignupRedirect(redirectParam);
      toast.success("Compte cree. Verifie ton email, puis connecte-toi.");
      router.push(loginHref);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void form.handleSubmit(submit)(e);
      }}
      className="grid gap-3"
    >
      <FieldGroup>
        {!isInvited ? (
          <Field data-invalid={Boolean(form.formState.errors.orgName)}>
            <FieldLabel htmlFor="signup-org-name">Workspace name</FieldLabel>
            <Input
              id="signup-org-name"
              placeholder="Acme Inc."
              autoComplete="organization"
              aria-invalid={Boolean(form.formState.errors.orgName)}
              {...form.register("orgName")}
            />
            {form.formState.errors.orgName ? (
              <FieldError errors={[form.formState.errors.orgName]} />
            ) : null}
          </Field>
        ) : null}

        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            disabled={isInvited}
            readOnly={isInvited}
            {...form.register("email")}
          />
          {form.formState.errors.email ? <FieldError errors={[form.formState.errors.email]} /> : null}
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            placeholder="Minimum 8 characters"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <FieldError errors={[form.formState.errors.password]} />
          ) : null}
        </Field>
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
