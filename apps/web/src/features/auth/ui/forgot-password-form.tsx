"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      toast.success("If the email exists, a reset link was sent.");
    } catch {
      toast.error("Failed to send reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          void submit(e);
        }}
        className="grid gap-3"
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@company.com" />
        </div>

        <Button className="rounded-xl" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </>
  );
}
