"use client";

import { useState } from "react";

import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/ui/shadcn/button";

type MeResponse = {
  user: {
    userId: string;
    organizationId: string;
  } | null;
};

export function PricingCheckoutButton() {
  const [busy, setBusy] = useState(false);

  async function upgrade() {
    setBusy(true);
    try {
      // If not logged in, redirect to signup first
      const me = await fetch("/api/auth/me").then((r) => r.json() as Promise<MeResponse>);
      if (!me.user) {
        window.location.href = routes.auth.signup;
        return;
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });

      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed");

      window.location.href = json.url;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      onClick={() => {
        void upgrade();
      }}
      className="w-full rounded-2xl"
      disabled={busy}
    >
      {busy ? "Redirecting…" : "Upgrade to Pro"}
    </Button>
  );
}
