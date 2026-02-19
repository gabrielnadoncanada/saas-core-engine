import "server-only";

import { prisma } from "@db";

import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { requireUser } from "@/server/auth/require-user";

export default async function UsersPage() {
  await requireUser();
  const orgId = await getDefaultOrgIdForUser();

  if (!orgId) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Users</h1>
        <p>No organization found.</p>
      </div>
    );
  }

  const memberships = await prisma.membership.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
        },
      },
    },
  });

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Users</h1>
      <p style={{ marginTop: 8, color: "#666" }}>
        Members in the active organization.
      </p>

      <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Verified</th>
              <th style={th}>Last login</th>
              <th style={th}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={td}>{item.user.email}</td>
                <td style={td}>{item.role}</td>
                <td style={td}>{item.user.emailVerifiedAt ? "yes" : "no"}</td>
                <td style={td}>
                  {item.user.lastLoginAt
                    ? item.user.lastLoginAt.toLocaleString()
                    : "never"}
                </td>
                <td style={td}>{item.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {memberships.length === 0 ? (
              <tr>
                <td style={td} colSpan={5}>
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "#666",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 14,
};
