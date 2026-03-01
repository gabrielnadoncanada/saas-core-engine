"use server";

import { withTx } from "@db";
import { prisma } from "@db";

import { clearSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import { writeAuditLog } from "@/server/audit/audit-log";
import { requireUser } from "@/server/auth/require-user";
import { buildActionRequest } from "@/server/http/build-server-action-request";
import { fail, ok, type ActionResult } from "@/shared/types/action-result";

export async function deleteAccountAction(): Promise<ActionResult> {
  const req = await buildActionRequest("/settings/security/delete-account");

  try {
    const sessionUser = await requireUser();

    const ownerMemberships = await prisma.membership.findMany({
      where: { userId: sessionUser.userId, role: "owner" },
      select: { organizationId: true },
    });
    const ownerOrgIds = ownerMemberships.map((row) => row.organizationId);

    if (ownerOrgIds.length > 0) {
      const ownerCounts = await prisma.membership.groupBy({
        by: ["organizationId"],
        where: {
          organizationId: { in: ownerOrgIds },
          role: "owner",
        },
        _count: { _all: true },
      });
      const blockedOrgIds = ownerCounts
        .filter((row) => row._count._all <= 1)
        .map((row) => row.organizationId);

      if (blockedOrgIds.length > 0) {
        const blockedOrgs = await prisma.organization.findMany({
          where: { id: { in: blockedOrgIds } },
          select: { name: true },
          orderBy: { name: "asc" },
        });
        const names = blockedOrgs.map((org) => org.name).join(", ");
        return fail(
          `Cannot delete account: transfer ownership or delete organization first (${names}).`,
        );
      }
    }

    const deletedAt = new Date();
    await withTx(async (tx) => {
      await tx.session.updateMany({
        where: { userId: sessionUser.userId, revokedAt: null },
        data: { revokedAt: deletedAt },
      });
      await tx.membership.deleteMany({
        where: { userId: sessionUser.userId },
      });
      await tx.oAuthAccount.deleteMany({
        where: { userId: sessionUser.userId },
      });
      await tx.emailToken.deleteMany({
        where: { userId: sessionUser.userId },
      });

      const replacementEmail = `deleted+${sessionUser.userId}@deleted.local`;
      await tx.user.update({
        where: { id: sessionUser.userId },
        data: {
          email: replacementEmail,
          pendingEmail: null,
          pendingEmailRequestedAt: null,
          passwordHash: null,
          avatarUrl: null,
          phoneNumber: null,
          firstName: null,
          lastName: null,
          username: null,
          activeOrganizationId: null,
          deletedAt,
        },
      });
    });

    await clearSessionCookie();

    await writeAuditLog({
      request: req,
      actorUserId: sessionUser.userId,
      organizationId: sessionUser.organizationId,
      action: "account.delete",
      targetType: "user",
      targetId: sessionUser.userId,
      result: "success",
    });
    return ok();
  } catch (error) {
    await writeAuditLog({
      request: req,
      action: "account.delete",
      result: "failure",
      metadata: {
        error: error instanceof Error ? error.message : "unknown_error",
      },
    });
    return fail("Failed to delete account.");
  }
}

