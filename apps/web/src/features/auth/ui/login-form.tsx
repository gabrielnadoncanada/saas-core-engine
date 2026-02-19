"use client";

import { useState } from "react";

import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import { toast } from "sonner";

type LoginFormProps = {
  demoMode?: boolean;
};

const DEMO_EMAIL = "demo@saastemplate.dev";
const DEMO_PASSWORD = "DemoPassw0rd!";

export function LoginForm({ demoMode = false }: LoginFormProps) {
  const [email, setEmail] = useState(demoMode ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(demoMode ? DEMO_PASSWORD : "");
  const [busy, setBusy] = useState<null | "password" | "magic" | "google" | "github">(null);

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
      toast.error(err instanceof Error ? err.message : "Login failed");
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
      toast.success("If the email exists, a magic link was sent.");
    } catch {
      toast.error("Failed to send magic link.");
    } finally {
      setBusy(null);
    }
  }

  function google() {
    setBusy("google");
    window.location.href = `/api/auth/oauth/google/start?redirect=${encodeURIComponent(routes.app.dashboard)}`;
  }

  function github() {
    setBusy("github");
    window.location.href = `/api/auth/oauth/github/start?redirect=${encodeURIComponent(routes.app.dashboard)}`;
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          void loginPassword(e);
        }}
        className="grid gap-3"
      >
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
            onClick={() => {
              void sendMagic();
            }}
            disabled={busy !== null || !email}
          >
            {busy === "magic" ? "Sending…" : "Send magic link"}
          </button>
        </div>

        <Separator />

        <Button type="button" variant="outline" className="rounded-xl" onClick={google} disabled={busy !== null}>
          {busy === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={github} disabled={busy !== null}>
          {busy === "github" ? "Redirecting…" : "Continue with GitHub"}
        </Button>
      </form>
    </>
  );
}
