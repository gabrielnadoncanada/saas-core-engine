import type { MembershipRole } from "@contracts";

export interface OrgRolePermissionInput {
  action: string;
  resource: string;
}

export interface OrgRoleWithPermissions {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  rolePermissions: Array<{
    permission: {
      action: string;
      resource: string;
    };
  }>;
}

export interface OrgRbacRoleRepo {
  listOrgRoles(organizationId: string): Promise<OrgRoleWithPermissions[]>;
  countRolesByKeyPrefix(params: {
    organizationId: string;
    keyPrefix: string;
  }): Promise<number>;
  createRole(params: {
    organizationId: string;
    key: string;
    name: string;
    description?: string;
    createdByUserId: string;
  }): Promise<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    createdByUserId: string | null;
  }>;
  findRoleInOrg(params: {
    organizationId: string;
    roleId: string;
  }): Promise<{ id: string } | null>;
  findRolesInOrg(params: {
    organizationId: string;
    roleIds: string[];
  }): Promise<Array<{ id: string }>>;
}

export interface OrgRbacPermissionRepo {
  upsertPermission(params: {
    action: string;
    resource: string;
  }): Promise<{ id: string }>;
}

export interface OrgRbacMembershipRepo {
  findMembershipInOrg(params: {
    organizationId: string;
    membershipId: string;
  }): Promise<{ id: string } | null>;
  findMembershipByUserInOrg(params: {
    organizationId: string;
    userId: string;
  }): Promise<{ id: string } | null>;
}

export interface OrgRbacAssignmentsRepo {
  replaceRolePermissions(params: {
    roleId: string;
    permissionIds: string[];
  }): Promise<void>;
  replaceMembershipRoles(params: {
    membershipId: string;
    roleIds: string[];
  }): Promise<void>;
  listMembershipPermissionKeys(params: {
    membershipId: string;
  }): Promise<string[]>;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export class OrgRbacService {
  constructor(
    private readonly roles: OrgRbacRoleRepo,
    private readonly permissions: OrgRbacPermissionRepo,
    private readonly memberships: OrgRbacMembershipRepo,
    private readonly assignments: OrgRbacAssignmentsRepo,
  ) {}

  listOrgRoles(organizationId: string) {
    return this.roles.listOrgRoles(organizationId);
  }

  async createOrgRole(params: {
    organizationId: string;
    name: string;
    description?: string;
    createdByUserId: string;
  }) {
    const keyBase = slugify(params.name);
    const count = await this.roles.countRolesByKeyPrefix({
      organizationId: params.organizationId,
      keyPrefix: keyBase,
    });
    const key = count > 0 ? `${keyBase}-${count + 1}` : keyBase;

    return this.roles.createRole({
      organizationId: params.organizationId,
      key,
      name: params.name.trim(),
      description: params.description?.trim() || undefined,
      createdByUserId: params.createdByUserId,
    });
  }

  async setRolePermissions(params: {
    organizationId: string;
    roleId: string;
    permissions: OrgRolePermissionInput[];
  }) {
    const role = await this.roles.findRoleInOrg({
      organizationId: params.organizationId,
      roleId: params.roleId,
    });
    if (!role) throw new Error("FORBIDDEN");

    const permissionRows = await Promise.all(
      params.permissions.map((permission) =>
        this.permissions.upsertPermission({
          action: permission.action,
          resource: permission.resource,
        }),
      ),
    );

    await this.assignments.replaceRolePermissions({
      roleId: params.roleId,
      permissionIds: permissionRows.map((row) => row.id),
    });
  }

  async setMembershipCustomRoles(params: {
    organizationId: string;
    membershipId: string;
    roleIds: string[];
  }) {
    const membership = await this.memberships.findMembershipInOrg({
      organizationId: params.organizationId,
      membershipId: params.membershipId,
    });
    if (!membership) throw new Error("FORBIDDEN");

    const roles = await this.roles.findRolesInOrg({
      organizationId: params.organizationId,
      roleIds: params.roleIds,
    });

    if (roles.length !== params.roleIds.length) {
      throw new Error("FORBIDDEN");
    }

    await this.assignments.replaceMembershipRoles({
      membershipId: params.membershipId,
      roleIds: roles.map((role) => role.id),
    });
  }

  async getMembershipCustomPermissionKeys(params: {
    organizationId: string;
    userId: string;
  }): Promise<string[]> {
    const membership = await this.memberships.findMembershipByUserInOrg({
      organizationId: params.organizationId,
      userId: params.userId,
    });

    if (!membership) return [];

    return this.assignments.listMembershipPermissionKeys({
      membershipId: membership.id,
    });
  }
}
