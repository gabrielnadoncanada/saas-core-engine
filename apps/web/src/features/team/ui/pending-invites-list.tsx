"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { MembershipRole } from "@contracts";

import { revokeInviteAction } from "@/features/team/api/invites.action";

type PendingInvite = {
  id: string;
  email: string;
  role: MembershipRole;
  expiresAt: string;
};

function formatIsoDate(input: string) {
  const value = new Date(input);
  if (Number.isNaN(value.getTime())) return input;
  return value.toISOString().slice(0, 10);
}

export function PendingInvitesList(props: {
  invites: PendingInvite[];
  currentUserRole: MembershipRole;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageInvites = props.currentUserRole === "owner" || props.currentUserRole === "admin";

  async function revokeInvite(invitationId: string) {
    setBusyId(invitationId);
    setError(null);
    try {
      const result = await revokeInviteAction({ invitationId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (props.invites.length === 0) {
    return <p style={{ marginTop: 8, color: "#666" }}>No pending invites.</p>;
  }

  return (
    <div style={{ marginTop: 8 }}>
      {error ? <p style={{ color: "crimson", marginBottom: 8 }}>Action failed: {error}</p> : null}
      <ul>
        {props.invites.map((invite) => (
          <li key={invite.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span>
                {invite.email} - {invite.role} - expires {formatIsoDate(invite.expiresAt)}
              </span>
              {canManageInvites ? (
                <button
                  style={btnDanger}
                  disabled={busyId === invite.id}
                  onClick={() => {
                    void revokeInvite(invite.id);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const btnDanger: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e66",
  background: "#fff",
  color: "#b00",
  fontSize: 12,
  cursor: "pointer",
};
