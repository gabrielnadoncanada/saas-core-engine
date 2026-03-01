"use client";

import { useState } from "react";

import { getMeAction } from "@/features/auth/api/me.action";
import { createCheckoutAction } from "@/features/billing/api/billing.action";
import { Button } from "@/shared/components/ui/button";
import { routes } from "@/shared/constants/routes";

export function PricingCheckoutButton() {
  const [busy, setBusy] = useState(false);

  async function upgrade() {
    setBusy(true);
    try {
      // If not logged in, redirect to signup first
      const me = await getMeAction();
      if (!me.ok || !me.data) {
        window.location.href = routes.auth.signup;
        return;
      }

      const result = await createCheckoutAction();
      if (!result.ok) throw new Error(result.error);

      window.location.href = result.data.url;
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
      {busy ? "Redirecting..." : "Upgrade to Pro"}
    </Button>
  );
}
