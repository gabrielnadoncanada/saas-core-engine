"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { MembershipRole } from "@contracts";

import {
  createRoleAction,
  setMemberRolesAction,
  setRolePermissionsAction,
} from "@/features/rbac/api/rbac.action";

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
  role: MembershipRole;
  customRoleIds: string[];
};

type PermissionOption = {
  key: string;
  action: string;
  resource: string;
  label: string;
  description: string;
};

type PermissionGroup = {
  title: string;
  items: PermissionOption[];
};

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Organization",
    items: [
      {
        key: "org:create:organization",
        action: "org:create",
        resource: "organization",
        label: "Create org",
        description: "Create organizations",
      },
      {
        key: "org:list:organization",
        action: "org:list",
        resource: "organization",
        label: "List orgs",
        description: "List user organizations",
      },
      {
        key: "org:switch:organization",
        action: "org:switch",
        resource: "organization",
        label: "Switch org",
        description: "Switch active organization",
      },
      {
        key: "org:invite:create:invitation",
        action: "org:invite:create",
        resource: "invitation",
        label: "Invite members",
        description: "Create invitations",
      },
      {
        key: "org:member:role:change:membership",
        action: "org:member:role:change",
        resource: "membership",
        label: "Change member role",
        description: "Promote or demote members",
      },
      {
        key: "org:member:remove:membership",
        action: "org:member:remove",
        resource: "membership",
        label: "Remove members",
        description: "Remove user from org",
      },
      {
        key: "org:member:transfer_ownership:membership",
        action: "org:member:transfer_ownership",
        resource: "membership",
        label: "Transfer ownership",
        description: "Transfer owner role",
      },
      {
        key: "org:rbac:manage:role",
        action: "org:rbac:manage",
        resource: "role",
        label: "Manage RBAC",
        description: "Manage roles and permissions",
      },
    ],
  },
];

const KNOWN_PERMISSION_KEYS = new Set(
  PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key)),
);

function parsePermissionKey(key: string): { action: string; resource: string } | null {
  const idx = key.lastIndexOf(":");
  if (idx <= 0 || idx >= key.length - 1) return null;
  return {
    action: key.slice(0, idx),
    resource: key.slice(idx + 1),
  };
}

function buildPermissionState(roles: Role[]): Record<string, string[]> {
  return Object.fromEntries(
    roles.map((role) => [
      role.id,
      role.rolePermissions.map((entry) => `${entry.permission.action}:${entry.permission.resource}`),
    ]),
  );
}

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
  const [permissionDraft, setPermissionDraft] = useState<Record<string, string[]>>(
    buildPermissionState(props.roles),
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
      const result = await createRoleAction({
        name: newRoleName,
        description: newRoleDescription || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewRoleName("");
      setNewRoleDescription("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function setPermissionChecked(roleId: string, permissionKey: string, checked: boolean) {
    setPermissionDraft((prev) => {
      const currentKeys = new Set(prev[roleId] ?? []);
      if (checked) currentKeys.add(permissionKey);
      else currentKeys.delete(permissionKey);
      return {
        ...prev,
        [roleId]: Array.from(currentKeys),
      };
    });
  }

  async function saveRolePermissions(roleId: string) {
    setError(null);
    setBusy(`perm:${roleId}`);
    try {
      const permissions = (permissionDraft[roleId] ?? [])
        .map((key) => parsePermissionKey(key))
        .filter(Boolean) as Array<{ action: string; resource: string }>;

      const result = await setRolePermissionsAction({ roleId, permissions });
      if (!result.ok) {
        setError(result.error);
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
      const result = await setMemberRolesAction({ membershipId, roleIds: nextRoleIds });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
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
          Create roles, then toggle permissions in the matrix below.
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
          {props.roles.map((role) => {
            const selectedKeys = new Set(permissionDraft[role.id] ?? []);
            const unknownKeys = (permissionDraft[role.id] ?? []).filter((key) => !KNOWN_PERMISSION_KEYS.has(key));

            return (
              <article key={role.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{role.name}</div>
                <div style={{ color: "#666", fontSize: 12 }}>{role.key}</div>
                {role.description ? <div style={{ marginTop: 4 }}>{role.description}</div> : null}

                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.title} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{group.title}</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {group.items.map((item) => (
                          <label
                            key={item.key}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "18px 1fr",
                              gap: 8,
                              alignItems: "start",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedKeys.has(item.key)}
                              disabled={!canManage}
                              onChange={(event) => {
                                setPermissionChecked(role.id, item.key, event.target.checked);
                              }}
                            />
                            <span style={{ fontSize: 13 }}>
                              <strong>{item.label}</strong>
                              <span style={{ color: "#666", marginLeft: 6 }}>{item.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {unknownKeys.length > 0 ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                    Unknown permissions preserved: {unknownKeys.join(", ")}
                  </div>
                ) : null}

                {canManage ? (
                  <button
                    style={{ ...btnPrimary, marginTop: 12 }}
                    disabled={busy === `perm:${role.id}`}
                    onClick={() => {
                      void saveRolePermissions(role.id);
                    }}
                  >
                    Save permissions
                  </button>
                ) : null}
              </article>
            );
          })}
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
