"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  createCheckoutAction,
  createPortalAction,
} from "@/features/billing/api/billing.action";

export function BillingActions(props: { isPro: boolean; hasCustomer: boolean }) {
  const [loading, setLoading] = useState<null | "checkout" | "portal">(null);

  async function goCheckout() {
    setLoading("checkout");
    try {
      const result = await createCheckoutAction();
      if (!result.ok) throw new Error(result.error);
      window.location.href = result.data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  async function goPortal() {
    setLoading("portal");
    try {
      const result = await createPortalAction();
      if (!result.ok) throw new Error(result.error);
      window.location.href = result.data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Portal failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {!props.isPro ? (
        <button
          onClick={() => {
            void goCheckout();
          }}
          disabled={loading !== null}
          style={btnPrimary}
        >
          {loading === "checkout" ? "Redirecting..." : "Upgrade to Pro"}
        </button>
      ) : (
        <button
          onClick={() => {
            void goPortal();
          }}
          disabled={loading !== null}
          style={btnPrimary}
        >
          {loading === "portal" ? "Opening..." : "Manage subscription"}
        </button>
      )}

      <span style={{ fontSize: 12, color: "#666", alignSelf: "center" }}>
        Webhooks keep status in sync.
      </span>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};
