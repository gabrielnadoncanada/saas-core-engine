import "server-only";

import { cookies } from "next/headers";
import type { CreateSessionResult } from "@auth-core";
import { env } from "@/server/config/env";

export function setSessionCookie(result: CreateSessionResult): void {
  const cookieStore = cookies();

  cookieStore.set(env.SESSION_COOKIE_NAME, result.sessionToken, {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    expires: result.expiresAt,
  });
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();

  cookieStore.set(env.SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export function getSessionTokenFromCookie(): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value ?? null;
  return token && token.length > 0 ? token : null;
}
