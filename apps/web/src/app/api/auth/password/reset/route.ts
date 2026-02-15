import { NextResponse } from "next/server";
import { env } from "@/server/config/env";
import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createPasswordResetFlow,
  createSessionService,
} from "@/server/adapters/core/auth-core.adapter";

type Body = { token: string; newPassword: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  if (!body?.token || !body?.newPassword) {
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const flow = createPasswordResetFlow();
  const res = await flow.reset({
    token: body.token,
    newPassword: body.newPassword,
  });

  if (!res.ok)
    return NextResponse.json(
      { ok: false, error: "Invalid or expired token" },
      { status: 400 },
    );

  const sessions = createSessionService();
  const session = await sessions.createSession({
    userId: res.userId,
    ttlDays: env.SESSION_TTL_DAYS,
    userAgent: req.headers.get("user-agent"),
  });

  setSessionCookie(session);
  return NextResponse.json({ ok: true });
}