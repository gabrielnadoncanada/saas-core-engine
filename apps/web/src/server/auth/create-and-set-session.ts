import "server-only";

import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import { createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { env } from "@/server/config/env";

/**
 * Creates a session for the given user and sets the session cookie.
 * Centralises the repeated create-session + set-cookie pattern.
 */
export async function createAndSetSession(params: {
  userId: string;
  request: Request;
}): Promise<void> {
  const sessions = createSessionService();
  const session = await sessions.createSession({
    userId: params.userId,
    ttlDays: env.SESSION_TTL_DAYS,
    ip: params.request.headers.get("x-forwarded-for"),
    userAgent: params.request.headers.get("user-agent"),
  });

  await setSessionCookie(session);
}
