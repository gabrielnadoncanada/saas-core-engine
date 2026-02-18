import "server-only";

import type { MembershipRole } from "@contracts";
import { prisma } from "@db";
import { requireUser } from "@/server/auth/require-user";

export type OrgContext = {
  organizationId: string;
  userId: string;
  role: MembershipRole;
};

export async function getActiveOrgIdForUser(): Promise<string | null> {
  const user = await requireUser();
  if (!user.organizationId) return null;

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.userId,
        organizationId: user.organizationId,
      },
    },
    select: { organizationId: true },
  });

  return membership?.organizationId ?? null;
}

export const getDefaultOrgIdForUser = getActiveOrgIdForUser;

export async function requireOrgContext(params?: {
  organizationId?: string;
}): Promise<OrgContext> {
  const user = await requireUser();
  const organizationId = params?.organizationId ?? user.organizationId ?? null;

  if (!organizationId) throw new Error("NO_ORG");

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.userId,
        organizationId,
      },
    },
    select: { role: true, organizationId: true },
  });

  if (!membership) throw new Error("FORBIDDEN");

  return {
    organizationId: membership.organizationId,
    userId: user.userId,
    role: membership.role,
  };
}
