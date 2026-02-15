import "server-only";

import { getSessionTokenFromCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import { createSessionService } from "@/server/adapters/core/auth-core.adapter";

export type SessionUser = {
  userId: string;
  sessionId: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getSessionTokenFromCookie();
  if (!token) return null;

  const sessions = createSessionService();
  const valid = await sessions.validateSession({
    sessionToken: token,
  });
  if (!valid) return null;

  return { userId: valid.userId, sessionId: valid.sessionId };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}