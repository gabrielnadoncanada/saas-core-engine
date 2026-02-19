"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  rolePermissions: Array<{
    permission: {
      action: string;
      resource: string;
    };
  }>;
};

type Member = {
  id: string;
  userId: string;
  email: string;
  role: "owner" | "admin" | "member";
  customRoleIds: string[];
};

export function RolesPermissionsPanel(props: {
  roles: Role[];
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [permissionDraft, setPermissionDraft] = useState<Record<string, string>>(
    Object.fromEntries(
      props.roles.map((role) => [
        role.id,
        role.rolePermissions
          .map((entry) => `${entry.permission.action}:${entry.permission.resource}`)
          .join("\n"),
      ]),
    ),
  );

  const current = useMemo(
    () => props.members.find((member) => member.userId === props.currentUserId) ?? null,
    [props.members, props.currentUserId],
  );

  const canManage = current?.role === "owner";

  async function createRole() {
    setError(null);
    setBusy("create-role");
    try {
      const res = await fetch("/api/org/rbac/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDescription || undefined,
        }),
      });
      if (!res.ok) {
        setError("role_create_failed");
        return;
      }
      setNewRoleName("");
      setNewRoleDescription("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function saveRolePermissions(roleId: string) {
    setError(null);
    setBusy(`perm:${roleId}`);
    try {
      const lines = (permissionDraft[roleId] ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const permissions = lines
        .map((line) => {
          const [action, resource] = line.split(":");
          if (!action || !resource) return null;
          return {
            action: action.trim(),
            resource: resource.trim(),
          };
        })
        .filter(Boolean) as Array<{ action: string; resource: string }>;

      const res = await fetch(`/api/org/rbac/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) {
        setError("role_permissions_save_failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleMemberRole(membershipId: string, roleId: string, selected: boolean) {
    const member = props.members.find((item) => item.id === membershipId);
    if (!member) return;

    const nextRoleIds = selected
      ? [...member.customRoleIds, roleId]
      : member.customRoleIds.filter((id) => id !== roleId);

    setError(null);
    setBusy(`member:${membershipId}`);
    try {
      const res = await fetch(`/api/org/rbac/memberships/${membershipId}/roles`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleIds: nextRoleIds }),
      });
      if (!res.ok) {
        setError("member_roles_save_failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function startImpersonation(targetUserId: string) {
    setError(null);
    setBusy(`imp:${targetUserId}`);
    try {
      const res = await fetch("/api/org/impersonation/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (!res.ok) {
        setError("impersonation_start_failed");
        return;
      }
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {error ? <div style={{ color: "crimson" }}>Error: {error}</div> : null}

      <section style={{ border: "1px solid #e9e9e9", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Custom roles</h2>
        <p style={{ marginTop: 8, color: "#666" }}>
          Define org-level role bundles and attach permissions as action:resource.
        </p>

        {canManage ? (
          <div style={{ display: "grid", gap: 8, marginTop: 12, maxWidth: 520 }}>
            <input
              value={newRoleName}
              onChange={(event) => setNewRoleName(event.target.value)}
              placeholder="Role name (ex: support-agent)"
              style={input}
            />
            <input
              value={newRoleDescription}
              onChange={(event) => setNewRoleDescription(event.target.value)}
              placeholder="Description (optional)"
              style={input}
            />
            <button
              style={btnPrimary}
              disabled={busy === "create-role" || newRoleName.trim().length < 2}
              onClick={() => {
                void createRole();
              }}
            >
              Create role
            </button>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {props.roles.length === 0 ? <div style={{ color: "#666" }}>No custom roles yet.</div> : null}
          {props.roles.map((role) => (
            <article key={role.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{role.name}</div>
              <div style={{ color: "#666", fontSize: 12 }}>{role.key}</div>
              {role.description ? <div style={{ marginTop: 4 }}>{role.description}</div> : null}

              <textarea
                value={permissionDraft[role.id] ?? ""}
                onChange={(event) =>
                  setPermissionDraft((prev) => ({
                    ...prev,
                    [role.id]: event.target.value,
                  }))
                }
                rows={6}
                style={{ ...input, marginTop: 10, fontFamily: "monospace" }}
                disabled={!canManage}
              />

              {canManage ? (
                <button
                  style={{ ...btnPrimary, marginTop: 8 }}
                  disabled={busy === `perm:${role.id}`}
                  onClick={() => {
                    void saveRolePermissions(role.id);
                  }}
                >
                  Save permissions
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #e9e9e9", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Membership role assignment</h2>
        <p style={{ marginTop: 8, color: "#666" }}>
          Assign one or more custom roles to each membership.
        </p>

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Email</th>
                <th style={th}>Built-in role</th>
                <th style={th}>Custom roles</th>
                <th style={th}>Impersonation</th>
              </tr>
            </thead>
            <tbody>
              {props.members.map((member) => (
                <tr key={member.id}>
                  <td style={td}>{member.email}</td>
                  <td style={td}>{member.role}</td>
                  <td style={td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {props.roles.map((role) => {
                        const checked = member.customRoleIds.includes(role.id);
                        return (
                          <label key={role.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canManage || busy === `member:${member.id}`}
                              onChange={(event) => {
                                void toggleMemberRole(member.id, role.id, event.target.checked);
                              }}
                            />
                            <span style={{ fontSize: 12 }}>{role.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td style={td}>
                    {canManage && member.role !== "owner" && member.userId !== props.currentUserId ? (
                      <button
                        style={btnGhost}
                        disabled={busy === `imp:${member.userId}`}
                        onClick={() => {
                          void startImpersonation(member.userId);
                        }}
                      >
                        Start
                      </button>
                    ) : (
                      <span style={{ color: "#666", fontSize: 12 }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const input: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 14,
  width: "100%",
};

const btnPrimary: React.CSSProperties = {
  border: "1px solid #111",
  borderRadius: 10,
  padding: "8px 12px",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  width: "fit-content",
};

const btnGhost: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: "6px 10px",
  background: "#fff",
  cursor: "pointer",
};

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #eee",
  padding: "10px 8px",
  fontSize: 12,
  color: "#666",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #f3f3f3",
  padding: "10px 8px",
  verticalAlign: "top",
};
