import "server-only";

import { prisma } from "@db";
import { getSessionTokenFromCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import { createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { env } from "@/server/config/env";

export type SessionUser = {
  id: string;
  userId: string;
  sessionId: string;
  organizationId: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getSessionTokenFromCookie();
  if (!token) return null;

  const sessions = createSessionService();
  const valid = await sessions.validateSession({
    sessionToken: token,
    idleTimeoutMinutes: env.SESSION_IDLE_TIMEOUT_MINUTES,
  });
  if (!valid) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: valid.userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  if (!membership) return null;

  return {
    id: valid.userId,
    userId: valid.userId,
    sessionId: valid.sessionId,
    organizationId: membership.organizationId,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
