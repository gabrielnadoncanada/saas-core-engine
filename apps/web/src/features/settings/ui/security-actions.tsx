"use client";

import { useState } from "react";

import { deleteAccountAction } from "@/features/settings/api/delete-account.action";
import { deleteCurrentOrganizationAction } from "@/features/settings/api/delete-current-organization.action";
import { requestPasswordResetAction } from "@/features/settings/api/request-password-reset.action";
import { revokeAllSessionsAction } from "@/features/settings/api/revoke-all-sessions.action";
import { routes } from "@/shared/constants/routes";

export function SecurityActions(props: { userEmail: string }) {
  const [busy, setBusy] = useState<null | "reset" | "revoke" | "delete_account" | "delete_org">(
    null,
  );
  const [msg, setMsg] = useState<string | null>(null);

  async function sendReset() {
    setBusy("reset");
    setMsg(null);
    try {
      await requestPasswordResetAction(props.userEmail);
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
      const result = await revokeAllSessionsAction();
      if (!result.ok) throw new Error(result.error);
      window.location.href = `${routes.auth.login}?revoked=1`;
    } catch {
      setMsg("Failed to revoke sessions.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteOrganization() {
    const confirmed = window.confirm(
      "Delete current organization permanently? This action cannot be undone.",
    );
    if (!confirmed) return;

    setBusy("delete_org");
    setMsg(null);
    try {
      const result = await deleteCurrentOrganizationAction();
      if (!result.ok) throw new Error(result.error);
      window.location.href = `${routes.app.dashboard}?org_deleted=1`;
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed to delete organization.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Delete account permanently? This revokes sessions and removes account access.",
    );
    if (!confirmed) return;

    setBusy("delete_account");
    setMsg(null);
    try {
      const result = await deleteAccountAction();
      if (!result.ok) throw new Error(result.error);
      window.location.href = `${routes.auth.login}?account_deleted=1`;
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed to delete account.");
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
        {busy === "reset" ? "Sending..." : "Send password reset link"}
      </button>

      <button
        onClick={() => {
          void revokeAll();
        }}
        disabled={busy !== null}
        style={btnDanger}
      >
        {busy === "revoke" ? "Revoking..." : "Revoke all sessions"}
      </button>

      <button
        onClick={() => {
          void deleteOrganization();
        }}
        disabled={busy !== null}
        style={btnDanger}
      >
        {busy === "delete_org" ? "Deleting..." : "Delete current organization"}
      </button>

      <button
        onClick={() => {
          void deleteAccount();
        }}
        disabled={busy !== null}
        style={btnDanger}
      >
        {busy === "delete_account" ? "Deleting..." : "Delete account"}
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
