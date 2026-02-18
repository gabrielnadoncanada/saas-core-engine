import "server-only";

import { prisma } from "@db";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function listOrgRoles(organizationId: string) {
  return prisma.role.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
    },
  });
}

export async function createOrgRole(params: {
  organizationId: string;
  name: string;
  description?: string;
  createdByUserId: string;
}) {
  const keyBase = slugify(params.name);
  const count = await prisma.role.count({
    where: {
      organizationId: params.organizationId,
      key: {
        startsWith: keyBase,
      },
    },
  });
  const key = count > 0 ? `${keyBase}-${count + 1}` : keyBase;

  return prisma.role.create({
    data: {
      organizationId: params.organizationId,
      key,
      name: params.name.trim(),
      description: params.description?.trim() || null,
      createdByUserId: params.createdByUserId,
    },
  });
}

export async function setRolePermissions(params: {
  organizationId: string;
  roleId: string;
  permissions: Array<{ action: string; resource: string }>;
}) {
  const role = await prisma.role.findFirst({
    where: {
      id: params.roleId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  });
  if (!role) throw new Error("FORBIDDEN");

  const permissions = await Promise.all(
    params.permissions.map((permission) =>
      prisma.permission.upsert({
        where: {
          action_resource: {
            action: permission.action,
            resource: permission.resource,
          },
        },
        create: {
          action: permission.action,
          resource: permission.resource,
        },
        update: {},
        select: { id: true },
      }),
    ),
  );

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: params.roleId } });

    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: params.roleId,
          permissionId: permission.id,
        })),
      });
    }
  });
}

export async function setMembershipCustomRoles(params: {
  organizationId: string;
  membershipId: string;
  roleIds: string[];
}) {
  const membership = await prisma.membership.findFirst({
    where: {
      id: params.membershipId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  });
  if (!membership) throw new Error("FORBIDDEN");

  const roles = await prisma.role.findMany({
    where: {
      organizationId: params.organizationId,
      id: { in: params.roleIds },
    },
    select: { id: true },
  });

  if (roles.length !== params.roleIds.length) {
    throw new Error("FORBIDDEN");
  }

  await prisma.$transaction(async (tx) => {
    await tx.membershipRoleAssignment.deleteMany({
      where: { membershipId: params.membershipId },
    });

    if (roles.length > 0) {
      await tx.membershipRoleAssignment.createMany({
        data: roles.map((role) => ({
          membershipId: params.membershipId,
          roleId: role.id,
        })),
      });
    }
  });
}

export async function getMembershipCustomPermissionKeys(params: {
  organizationId: string;
  userId: string;
}) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: params.userId,
        organizationId: params.organizationId,
      },
    },
    select: { id: true },
  });

  if (!membership) return [];

  const rows = await prisma.membershipRoleAssignment.findMany({
    where: { membershipId: membership.id },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const keys = new Set<string>();
  for (const row of rows) {
    for (const rolePermission of row.role.rolePermissions) {
      keys.add(`${rolePermission.permission.action}:${rolePermission.permission.resource}`);
    }
  }
  return [...keys];
}
