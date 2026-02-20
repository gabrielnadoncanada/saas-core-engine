import "server-only";

import type { MembershipRole } from "@contracts";
import { requirePermission, type RbacAction } from "@rbac-core";

import { requireOrgContext, type OrgContext } from "@/server/auth/require-org";
import { getMembershipCustomPermissionKeys } from "@/server/services/org-rbac.service";

export async function withRequiredOrgScope<T>(params: {
  organizationId?: string;
  action?: RbacAction;
  targetRole?: MembershipRole;
  run: (ctx: OrgContext) => Promise<T>;
}): Promise<T> {
  const ctx = await requireOrgContext({ organizationId: params.organizationId });
  const customPermissions = await getMembershipCustomPermissionKeys({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
  });

  if (params.action) {
    requirePermission(
      {
        userId: ctx.userId,
        role: ctx.role,
        organizationId: ctx.organizationId,
      },
      params.action,
      {
        organizationId: ctx.organizationId,
        targetRole: params.targetRole,
      },
      {
        customPermissions,
        isImpersonating: Boolean(ctx.impersonation),
      },
    );
  }

  return params.run(ctx);
}
