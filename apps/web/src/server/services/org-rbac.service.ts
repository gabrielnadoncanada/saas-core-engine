import "server-only";

import { prisma } from "@db";
import {
  OrgRbacService,
  type OrgRbacAssignmentsRepo,
  type OrgRbacMembershipRepo,
  type OrgRbacPermissionRepo,
  type OrgRbacRoleRepo,
} from "@rbac-core";

class PrismaOrgRbacRoleRepo implements OrgRbacRoleRepo {
  listOrgRoles(organizationId: string) {
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

  countRolesByKeyPrefix(params: { organizationId: string; keyPrefix: string }) {
    return prisma.role.count({
      where: {
        organizationId: params.organizationId,
        key: {
          startsWith: params.keyPrefix,
        },
      },
    });
  }

  createRole(params: {
    organizationId: string;
    key: string;
    name: string;
    description?: string;
    createdByUserId: string;
  }) {
    return prisma.role.create({
      data: {
        organizationId: params.organizationId,
        key: params.key,
        name: params.name,
        description: params.description ?? null,
        createdByUserId: params.createdByUserId,
      },
    });
  }

  findRoleInOrg(params: { organizationId: string; roleId: string }) {
    return prisma.role.findFirst({
      where: {
        id: params.roleId,
        organizationId: params.organizationId,
      },
      select: { id: true },
    });
  }

  findRolesInOrg(params: { organizationId: string; roleIds: string[] }) {
    return prisma.role.findMany({
      where: {
        organizationId: params.organizationId,
        id: { in: params.roleIds },
      },
      select: { id: true },
    });
  }
}

class PrismaOrgRbacPermissionRepo implements OrgRbacPermissionRepo {
  upsertPermission(params: { action: string; resource: string }) {
    return prisma.permission.upsert({
      where: {
        action_resource: {
          action: params.action,
          resource: params.resource,
        },
      },
      create: {
        action: params.action,
        resource: params.resource,
      },
      update: {},
      select: { id: true },
    });
  }
}

class PrismaOrgRbacMembershipRepo implements OrgRbacMembershipRepo {
  findMembershipInOrg(params: { organizationId: string; membershipId: string }) {
    return prisma.membership.findFirst({
      where: {
        id: params.membershipId,
        organizationId: params.organizationId,
      },
      select: { id: true },
    });
  }

  findMembershipByUserInOrg(params: { organizationId: string; userId: string }) {
    return prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: params.userId,
          organizationId: params.organizationId,
        },
      },
      select: { id: true },
    });
  }
}

class PrismaOrgRbacAssignmentsRepo implements OrgRbacAssignmentsRepo {
  async replaceRolePermissions(params: {
    roleId: string;
    permissionIds: string[];
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: params.roleId } });

      if (params.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: params.permissionIds.map((permissionId) => ({
            roleId: params.roleId,
            permissionId,
          })),
        });
      }
    });
  }

  async replaceMembershipRoles(params: {
    membershipId: string;
    roleIds: string[];
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.membershipRoleAssignment.deleteMany({
        where: { membershipId: params.membershipId },
      });

      if (params.roleIds.length > 0) {
        await tx.membershipRoleAssignment.createMany({
          data: params.roleIds.map((roleId) => ({
            membershipId: params.membershipId,
            roleId,
          })),
        });
      }
    });
  }

  async listMembershipPermissionKeys(params: {
    membershipId: string;
  }): Promise<string[]> {
    const rows = await prisma.membershipRoleAssignment.findMany({
      where: { membershipId: params.membershipId },
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
        keys.add(
          `${rolePermission.permission.action}:${rolePermission.permission.resource}`,
        );
      }
    }

    return [...keys];
  }
}

function createOrgRbacService() {
  return new OrgRbacService(
    new PrismaOrgRbacRoleRepo(),
    new PrismaOrgRbacPermissionRepo(),
    new PrismaOrgRbacMembershipRepo(),
    new PrismaOrgRbacAssignmentsRepo(),
  );
}

export function listOrgRoles(organizationId: string) {
  return createOrgRbacService().listOrgRoles(organizationId);
}

export function createOrgRole(params: {
  organizationId: string;
  name: string;
  description?: string;
  createdByUserId: string;
}) {
  return createOrgRbacService().createOrgRole(params);
}

export function setRolePermissions(params: {
  organizationId: string;
  roleId: string;
  permissions: Array<{ action: string; resource: string }>;
}) {
  return createOrgRbacService().setRolePermissions(params);
}

export function setMembershipCustomRoles(params: {
  organizationId: string;
  membershipId: string;
  roleIds: string[];
}) {
  return createOrgRbacService().setMembershipCustomRoles(params);
}

export function getMembershipCustomPermissionKeys(params: {
  organizationId: string;
  userId: string;
}) {
  return createOrgRbacService().getMembershipCustomPermissionKeys(params);
}
