"use client";

import { useState } from "react";

export function SecurityActions(props: { userEmail: string }) {
  const [busy, setBusy] = useState<null | "reset" | "revoke">(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendReset() {
    setBusy("reset");
    setMsg(null);
    try {
      await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: props.userEmail }),
      });
      setMsg("If the email exists, a reset link has been sent.");
    } catch {
      setMsg("Failed to send reset link.");
    } finally {
      setBusy(null);
    }
  }

  async function revokeAll() {
    setBusy("revoke");
    setMsg(null);
    try {
      await fetch("/api/auth/sessions/revoke-all", { method: "POST" });
      setMsg("All sessions revoked. You may need to log in again.");
    } catch {
      setMsg("Failed to revoke sessions.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <button
        onClick={() => {
          void sendReset();
        }}
        disabled={busy !== null || !props.userEmail}
        style={btnPrimary}
      >
        {busy === "reset" ? "Sending…" : "Send password reset link"}
      </button>

      <button
        onClick={() => {
          void revokeAll();
        }}
        disabled={busy !== null}
        style={btnDanger}
      >
        {busy === "revoke" ? "Revoking…" : "Revoke all sessions"}
      </button>

      {msg && <div style={{ fontSize: 12, color: "#666" }}>{msg}</div>}
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

const btnDanger: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #7f1d1d",
  background: "#991b1b",
  color: "#fff",
  cursor: "pointer",
};
