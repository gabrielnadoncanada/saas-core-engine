import "server-only";

import {
  getImpersonationTokenFromCookie,
  getSessionTokenFromCookie,
} from "@/server/adapters/cookies/session-cookie.adapter";
import { createSessionContextService } from "@/server/adapters/core/auth-core.adapter";
import { env } from "@/server/config/env";
import { resolveActiveImpersonation } from "@/server/services/impersonation.service";

export type SessionUser = {
  id: string;
  userId: string;
  sessionId: string;
  organizationId: string;
  impersonation?: {
    sessionId: string;
    actorUserId: string;
    targetUserId: string;
  };
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

  const impersonationToken = await getImpersonationTokenFromCookie();
  if (!impersonationToken) return base;

  const impersonation = await resolveActiveImpersonation(impersonationToken);
  if (!impersonation) return base;
  if (impersonation.actorUserId !== resolved.userId) return base;

  return {
    ...base,
    id: impersonation.targetUserId,
    userId: impersonation.targetUserId,
    impersonation: {
      sessionId: impersonation.id,
      actorUserId: impersonation.actorUserId,
      targetUserId: impersonation.targetUserId,
    },
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
