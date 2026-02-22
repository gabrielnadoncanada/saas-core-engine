import "server-only";

import { getSessionTokenFromCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import { createSessionContextService } from "@/server/adapters/core/auth-core.adapter";
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

  const sessionContext = createSessionContextService();
  const resolved = await sessionContext.resolve({
    sessionToken: token,
    idleTimeoutMinutes: env.SESSION_IDLE_TIMEOUT_MINUTES,
  });
  if (!resolved) return null;

  const base = {
    id: resolved.userId,
    userId: resolved.userId,
    sessionId: resolved.sessionId,
    organizationId: resolved.organizationId,
  };

  return base;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
