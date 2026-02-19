import "server-only";

import { prisma } from "@db";

import { requireUser } from "@/server/auth/require-user";

export default async function OrganizationsPage() {
  const user = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      },
    },
  });

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Organizations</h1>
      <p style={{ marginTop: 8, color: "#666" }}>
        Organizations linked to your account.
      </p>

      <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={th}>Name</th>
              <th style={th}>Role</th>
              <th style={th}>Active</th>
              <th style={th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={td}>{item.organization.name}</td>
                <td style={td}>{item.role}</td>
                <td style={td}>
                  {item.organization.id === user.organizationId ? "yes" : "no"}
                </td>
                <td style={td}>{item.organization.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {memberships.length === 0 ? (
              <tr>
                <td style={td} colSpan={4}>
                  No organizations found.
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
