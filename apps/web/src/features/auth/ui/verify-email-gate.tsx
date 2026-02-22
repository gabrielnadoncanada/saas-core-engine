"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { routes } from "@/shared/constants/routes";

export function VerifyEmailGate(props: { email: string }) {
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function onResend() {
    setSending(true);
    try {
      const res = await fetch("/api/auth/verify-email/request", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send verification email");
      toast.success("Verification email sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send verification email.");
    } finally {
      setSending(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = routes.auth.login;
    } catch {
      window.location.href = routes.auth.login;
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        You are signed in as <strong>{props.email}</strong>, but your email is not verified yet.
      </p>
      <p className="text-sm text-muted-foreground">
        Verify your email to continue to the dashboard.
      </p>
      <Button className="rounded-xl" onClick={() => void onResend()} disabled={sending || loggingOut}>
        {sending ? "Sending..." : "Send verification email again"}
      </Button>
      <Button
        variant="outline"
        className="rounded-xl"
        onClick={() => void onLogout()}
        disabled={sending || loggingOut}
      >
        {loggingOut ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  );
}
