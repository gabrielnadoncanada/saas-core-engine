import "server-only";

import { cookies } from "next/headers";

import type { CreateSessionResult } from "@auth-core";

import { env } from "@/server/config/env";

export async function setSessionCookie(
  result: CreateSessionResult,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(env.SESSION_COOKIE_NAME, result.sessionToken, {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: env.SESSION_COOKIE_SAME_SITE,
    path: "/",
    expires: result.expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(env.SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: env.SESSION_COOKIE_SAME_SITE,
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value ?? null;
  return token && token.length > 0 ? token : null;
}
