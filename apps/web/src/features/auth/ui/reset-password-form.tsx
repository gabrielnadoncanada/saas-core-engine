"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("Missing token.");
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

      toast.success("Password updated. Redirecting...");
      window.setTimeout(() => (window.location.href = routes.app.dashboard), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
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
        {busy ? "Updating..." : "Update password"}
      </Button>

      {!token ? (
        <div className="text-xs text-destructive">
          Missing token. Use the link from your email.
        </div>
      ) : null}
    </form>
  );
}
