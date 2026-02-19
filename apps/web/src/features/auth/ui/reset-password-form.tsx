"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { useToast } from "@/shared/ui/toast/use-toast";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const { push, ToastHost } = useToast();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      push({ kind: "error", message: "Missing token." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Reset failed");

      push({ kind: "success", message: "Password updated. Redirecting…" });
      window.setTimeout(() => (window.location.href = routes.app.dashboard), 600);
    } catch (err) {
      push({ kind: "error", message: err instanceof Error ? err.message : "Reset failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ToastHost />

      <form
        onSubmit={(e) => {
          void submit(e);
        }}
        className="grid gap-3"
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium">New password</label>
          <Input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Minimum 8 characters"
            type="password"
          />
        </div>

        <Button className="rounded-xl" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </Button>

        {!token ? (
          <div className="text-xs text-destructive">
            Missing token. Use the link from your email.
          </div>
        ) : null}
      </form>
    </>
  );
}
