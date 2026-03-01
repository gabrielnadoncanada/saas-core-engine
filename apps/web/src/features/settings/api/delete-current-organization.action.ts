"use server";

import { withTx } from "@db";
import { prisma } from "@db";

import { writeAuditLog } from "@/server/audit/audit-log";
import { requireOrgContext } from "@/server/auth/require-org";
import { buildActionRequest } from "@/server/http/build-server-action-request";
import { env } from "@/server/config/env";
import { stripe } from "@/server/services/stripe.service";
import { fail, ok, type ActionResult } from "@/shared/types/action-result";

export async function deleteCurrentOrganizationAction(): Promise<ActionResult> {
  const req = await buildActionRequest("/settings/security/delete-organization");

  try {
    const ctx = await requireOrgContext();
    if (ctx.role !== "owner") {
      return fail("Only organization owners can delete an organization.");
    }

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: ctx.organizationId },
      select: { providerSubscriptionId: true },
    });

    if (env.BILLING_ENABLED && subscription?.providerSubscriptionId) {
      const s = stripe();
      await s.subscriptions.cancel(subscription.providerSubscriptionId);
    }

    await withTx(async (tx) => {
      await tx.organization.delete({ where: { id: ctx.organizationId } });

      const fallbackMembership = await tx.membership.findFirst({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "asc" },
        select: { organizationId: true },
      });

      await tx.user.updateMany({
        where: { id: ctx.userId, deletedAt: null },
        data: { activeOrganizationId: fallbackMembership?.organizationId ?? null },
      });
    });

    await writeAuditLog({
      request: req,
      actorUserId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "organization.delete",
      targetType: "organization",
      targetId: ctx.organizationId,
      result: "success",
    });

    return ok();
  } catch (error) {
    await writeAuditLog({
      request: req,
      action: "organization.delete",
      result: "failure",
      metadata: {
        error: error instanceof Error ? error.message : "unknown_error",
      },
    });
    return fail("Failed to delete organization.");
  }
}

