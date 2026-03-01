"use server";

import {
  orgMembershipRolesBodySchema,
  orgRoleCreateBodySchema,
  orgRolePermissionsBodySchema,
} from "@contracts";

import { orgErrorMessage } from "@/server/auth/org-error-message";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import {
  createOrgRole,
  listOrgRoles,
  setMembershipCustomRoles,
  setRolePermissions,
} from "@/server/services/org-rbac.service";
import { type ActionResult, fail, ok } from "@/shared/types/action-result";

export async function listRolesAction(): Promise<ActionResult<unknown[]>> {
  try {
    return await withRequiredOrgScope({
      action: "org:rbac:manage",
      run: async (ctx) => {
        const roles = await listOrgRoles(ctx.organizationId);
        return ok(roles);
      },
    });
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}

export async function createRoleAction(input: {
  name: string;
  description?: string;
}): Promise<ActionResult<unknown>> {
  const parsed = orgRoleCreateBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    return await withRequiredOrgScope({
      action: "org:rbac:manage",
      run: async (ctx) => {
        const role = await createOrgRole({
          organizationId: ctx.organizationId,
          name: parsed.data.name,
          description: parsed.data.description,
          createdByUserId: ctx.userId,
        });
        return ok(role);
      },
    });
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}

export async function setRolePermissionsAction(input: {
  roleId: string;
  permissions: Array<{ action: string; resource: string }>;
}): Promise<ActionResult> {
  const parsed = orgRolePermissionsBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    await withRequiredOrgScope({
      action: "org:rbac:manage",
      run: async (ctx) => {
        await setRolePermissions({
          organizationId: ctx.organizationId,
          roleId: input.roleId,
          permissions: parsed.data.permissions,
        });
      },
    });
    return ok();
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}

export async function setMemberRolesAction(input: {
  membershipId: string;
  roleIds: string[];
}): Promise<ActionResult> {
  const parsed = orgMembershipRolesBodySchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input.");

  try {
    await withRequiredOrgScope({
      action: "org:rbac:manage",
      run: async (ctx) => {
        await setMembershipCustomRoles({
          organizationId: ctx.organizationId,
          membershipId: input.membershipId,
          roleIds: parsed.data.roleIds,
        });
      },
    });
    return ok();
  } catch (error) {
    return fail(orgErrorMessage(error));
  }
}
