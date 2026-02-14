"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { Separator } from "@/shared/ui/shadcn/separator";
import { useToast } from "@/shared/ui/toast/use-toast";
import { routes } from "@/shared/constants/routes";

export function LoginForm() {
  const { push, ToastHost } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "password" | "magic" | "google">(null);

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) throw new Error(json.error ?? "Login failed");

      window.location.href = routes.app.dashboard;
    } catch (err) {
      push({ kind: "error", message: err instanceof Error ? err.message : "Login failed" });
    } finally {
      setBusy(null);
    }
  }

  async function sendMagic() {
    setBusy("magic");
    try {
      await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      push({ kind: "success", message: "If the email exists, a magic link was sent." });
    } catch {
      push({ kind: "error", message: "Failed to send magic link." });
    } finally {
      setBusy(null);
    }
  }

  function google() {
    setBusy("google");
    window.location.href = `/api/auth/oauth/google/start?redirect=${encodeURIComponent(routes.app.dashboard)}`;
  }

  return (
    <>
      <ToastHost />

      <form onSubmit={loginPassword} className="grid gap-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Password</label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
          />
        </div>

        <Button className="rounded-xl" disabled={busy !== null}>
          {busy === "password" ? "Signing in…" : "Sign in"}
        </Button>

        <div className="flex justify-between text-sm">
          <a className="underline text-muted-foreground" href="/forgot-password">
            Forgot password?
          </a>
          <button
            type="button"
            className="underline text-muted-foreground"
            onClick={sendMagic}
            disabled={busy !== null || !email}
          >
            {busy === "magic" ? "Sending…" : "Send magic link"}
          </button>
        </div>

        <Separator />

        <Button type="button" variant="outline" className="rounded-xl" onClick={google} disabled={busy !== null}>
          {busy === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>
      </form>
    </>
  );
}
