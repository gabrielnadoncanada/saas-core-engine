import "server-only";

import { prisma } from "@db";

import { RolesPermissionsPanel } from "@/features/rbac/ui/roles-permissions-panel";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { requireUser } from "@/server/auth/require-user";
import { listOrgRoles } from "@/server/services/org-rbac.service";

export default async function RolesPage() {
  const user = await requireUser();
  const orgId = await getDefaultOrgIdForUser();

  if (!orgId) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Roles & Permissions</h1>
        <p>No organization found.</p>
      </div>
    );
  }

  const [roles, members] = await Promise.all([
    listOrgRoles(orgId),
    prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: true,
        customRoles: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Roles & Permissions</h1>
      <p style={{ marginTop: 8, color: "#666" }}>
        Build custom RBAC roles and assign them to memberships.
      </p>

      <div style={{ marginTop: 24 }}>
        <RolesPermissionsPanel
          roles={roles}
          members={members.map((member) => ({
            id: member.id,
            userId: member.userId,
            email: member.user.email,
            role: member.role,
            customRoleIds: member.customRoles.map((row) => row.roleId),
          }))}
          currentUserId={user.userId}
        />
      </div>
    </div>
  );
}
