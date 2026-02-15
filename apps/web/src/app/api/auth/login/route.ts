import { NextResponse } from "next/server";
import { env } from "@/server/config/env";
import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createLoginFlow,
  createSessionService,
} from "@/server/adapters/core/auth-core.adapter";

type Body = { email: string; password: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const login = createLoginFlow();
  const res = await login.execute({
    email: body.email,
    password: body.password,
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const sessions = createSessionService();
  const session = await sessions.createSession({
    userId: res.userId,
    ttlDays: env.SESSION_TTL_DAYS,
    ip: null,
    userAgent: req.headers.get("user-agent"),
  });

  setSessionCookie(session);

  return NextResponse.json({ ok: true });
}