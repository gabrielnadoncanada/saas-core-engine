"use client";

import { useState } from "react";

import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { useToast } from "@/shared/ui/toast/use-toast";

export function SignupForm() {
  const { push, ToastHost } = useToast();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orgName, email, password }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) throw new Error(json.error ?? "Signup failed");

      window.location.href = routes.app.dashboard;
    } catch (err) {
      push({ kind: "error", message: err instanceof Error ? err.message : "Signup failed" });
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
          <label className="text-sm font-medium">Workspace name</label>
          <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" type="email" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Password</label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            type="password"
          />
        </div>

        <Button className="rounded-xl" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>
    </>
  );
}
