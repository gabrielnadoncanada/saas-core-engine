"use client";

import { useState } from "react";

export function BillingActions(props: { isPro: boolean; hasCustomer: boolean }) {
  const [loading, setLoading] = useState<null | "checkout" | "portal">(null);

  async function goCheckout() {
    setLoading("checkout");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.url;
    } finally {
      setLoading(null);
    }
  }

  async function goPortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Portal failed");
      window.location.href = json.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {!props.isPro ? (
        <button onClick={goCheckout} disabled={loading !== null} style={btnPrimary}>
          {loading === "checkout" ? "Redirecting..." : "Upgrade to Pro"}
        </button>
      ) : (
        <button onClick={goPortal} disabled={loading !== null} style={btnPrimary}>
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
