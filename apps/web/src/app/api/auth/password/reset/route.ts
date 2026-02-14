import { NextResponse } from "next/server";
import { PasswordResetFlow, SessionService } from "@auth-core";
import { env } from "@/server/config/env";
import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";

type Body = { token: string; newPassword: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  if (!body?.token || !body?.newPassword) {
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const flow = new PasswordResetFlow();
  const res = await flow.reset({
    token: body.token,
    newPassword: body.newPassword,
    pepper: env.TOKEN_PEPPER,
  });

  if (!res.ok)
    return NextResponse.json(
      { ok: false, error: "Invalid or expired token" },
      { status: 400 },
    );

  // Auto-login after reset
  const sessions = new SessionService();
  const session = await sessions.createSession({
    userId: res.userId,
    ttlDays: env.SESSION_TTL_DAYS,
    pepper: env.TOKEN_PEPPER,
    userAgent: req.headers.get("user-agent"),
  });

  setSessionCookie(session);
  return NextResponse.json({ ok: true });
}
