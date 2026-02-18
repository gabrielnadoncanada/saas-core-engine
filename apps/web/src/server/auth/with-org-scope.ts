import "server-only";

import { requirePermission, type RbacAction } from "@rbac-core";
import { requireOrgContext, type OrgContext } from "@/server/auth/require-org";

export async function withRequiredOrgScope<T>(params: {
  organizationId?: string;
  action?: RbacAction;
  targetRole?: "owner" | "admin" | "member";
  run: (ctx: OrgContext) => Promise<T>;
}): Promise<T> {
  const ctx = await requireOrgContext({ organizationId: params.organizationId });

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
    );
  }

  return params.run(ctx);
}
