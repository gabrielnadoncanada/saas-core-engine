"use client";

import { Button } from "@/shared/components/ui/button";
import { useVerifyEmailGate } from "@/features/auth/verify-email/model/useVerifyEmailGate";

export function VerifyEmailGate({ email }: { email: string }) {
  const { resend, logout, sending, loggingOut, disabled } = useVerifyEmailGate();

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        You are signed in as <strong>{email}</strong>, but your email is not verified yet.
      </p>
      <p className="text-sm text-muted-foreground">
        Verify your email to continue to the dashboard.
      </p>

      <Button type="button" className="rounded-xl" onClick={() => void resend()} disabled={disabled}>
        {sending ? "Sending..." : "Send verification email again"}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() => void logout()}
        disabled={disabled}
      >
        {loggingOut ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  );
}
