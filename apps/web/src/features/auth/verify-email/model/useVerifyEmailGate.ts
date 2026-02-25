"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  logoutAction,
  requestEmailVerificationAction,
} from "@/features/auth/verify-email/api/verify-email.action";
import { routes } from "@/shared/constants/routes";
import { toMessage } from "@/shared/lib/errors/toMessage";

export function useVerifyEmailGate() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function resend() {
    if (sending || loggingOut) return;

    setSending(true);
    try {
      const result = await requestEmailVerificationAction();
      if (!result.ok) throw new Error(result.error ?? "Failed to send verification email.");
      toast.success("Verification email sent.");
    } catch (error) {
      toast.error(toMessage(error, "Failed to send verification email."));
    } finally {
      setSending(false);
    }
  }

  async function logout() {
    if (loggingOut || sending) return;
    setLoggingOut(true);
    try {
      await logoutAction();
    } finally {
      router.push(routes.auth.login);
      router.refresh();
    }
  }

  return {
    sending,
    loggingOut,
    resend,
    logout,
    disabled: sending || loggingOut,
  };
}
