import { NextResponse } from "next/server";
import { env } from "@/server/config/env";
import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createMagicLoginFlow,
  createSessionService,
} from "@/server/adapters/core/auth-core.adapter";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token)
    return NextResponse.redirect(new URL("/login?error=invalid_link", req.url));

  const flow = createMagicLoginFlow();
  const res = await flow.confirm({ token });

  if (!res.ok)
    return NextResponse.redirect(new URL("/login?error=expired_link", req.url));

  const sessions = createSessionService();
  const session = await sessions.createSession({
    userId: res.userId,
    ttlDays: env.SESSION_TTL_DAYS,
    userAgent: req.headers.get("user-agent"),
  });

  setSessionCookie(session);

  return NextResponse.redirect(new URL("/dashboard", req.url));
}