import "server-only";

import { prisma } from "@db";
import { requireUser } from "@/server/auth/require-user";

export async function getDefaultOrgIdForUser(): Promise<string | null> {
  const user = await requireUser();

  const membership = await prisma.membership.findFirst({
    where: { userId: user.userId },
    orderBy: { createdAt: "asc" },
  });

  return membership?.organizationId ?? null;
}
