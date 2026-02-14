import "server-only";

import { SessionService } from "@auth-core";
import { env } from "@/server/config/env";
import { getSessionTokenFromCookie } from "@/server/adapters/cookies/session-cookie.adapter";

export type SessionUser = {
  userId: string;
  sessionId: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getSessionTokenFromCookie();
  if (!token) return null;

  const sessions = new SessionService();
  const valid = await sessions.validateSession({
    sessionToken: token,
    pepper: env.TOKEN_PEPPER,
  });
  if (!valid) return null;

  return { userId: valid.userId, sessionId: valid.sessionId };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
