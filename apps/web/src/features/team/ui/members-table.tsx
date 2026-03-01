"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { MembershipRole } from "@contracts";

import {
  changeMemberRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/features/team/api/members.action";

type Member = {
  id: string;
  userId: string;
  email: string;
  role: MembershipRole;
  joinedAt: string;
};

function formatIsoDate(dateInput: string): string {
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) return dateInput;
  return parsed.toISOString().slice(0, 10);
}

export function TeamMembersTable(props: {
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = props.members.find((member) => member.userId === props.currentUserId) ?? null;
  const actorRole = current?.role;

  async function handleRemove(membershipId: string) {
    setBusyId(membershipId);
    setError(null);
    try {
      const result = await removeMemberAction({ membershipId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleChangeRole(membershipId: string, role: MembershipRole) {
    setBusyId(membershipId);
    setError(null);
    try {
      const result = await changeMemberRoleAction({ membershipId, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleTransferOwnership(membershipId: string) {
    setBusyId(membershipId);
    setError(null);
    try {
      const result = await transferOwnershipAction({ membershipId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ marginTop: 12, overflowX: "auto" }}>
      {error ? <div style={{ color: "crimson", marginBottom: 8 }}>Action failed: {error}</div> : null}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}>Joined</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {props.members.map((m) => {
            const isSelf = m.userId === props.currentUserId;
            const canManageRoles =
              actorRole === "owner" ||
              (actorRole === "admin" && m.role === "member");
            const canToggleAdminMember =
              canManageRoles && (m.role === "member" || m.role === "admin");
            const canRemove = !isSelf && canManageRoles;
            const canTransferOwnership = actorRole === "owner" && m.role !== "owner";

            return (
              <tr key={m.id}>
                <td style={td}>{m.email}</td>
                <td style={td}>{m.role}</td>
                <td style={td}>{formatIsoDate(m.joinedAt)}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {canToggleAdminMember ? (
                      <>
                        <button
                          style={btnGhost}
                          disabled={busyId === m.id}
                          onClick={() => {
                            const nextRole = m.role === "member" ? "admin" : "member";
                            void handleChangeRole(m.id, nextRole);
                          }}
                        >
                          {m.role === "member" ? "Promote admin" : "Demote member"}
                        </button>
                      </>
                    ) : null}

                    {canTransferOwnership ? (
                      <button
                        style={btnGhost}
                        disabled={busyId === m.id}
                        onClick={() => {
                          void handleTransferOwnership(m.id);
                        }}
                      >
                        Transfer owner
                      </button>
                    ) : null}

                    {canRemove ? (
                      <button
                        style={btnDanger}
                        disabled={busyId === m.id}
                        onClick={() => {
                          void handleRemove(m.id);
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid #eee",
  fontSize: 12,
  color: "#666",
};

const td: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #f1f1f1",
  fontSize: 14,
};

const btnGhost: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 12,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e66",
  background: "#fff",
  color: "#b00",
  fontSize: 12,
  cursor: "pointer",
};
