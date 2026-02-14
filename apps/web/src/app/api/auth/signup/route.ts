import { NextResponse } from "next/server";
import { SignupFlow, SessionService } from "@auth-core";
import { env } from "@/server/config/env";
import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";

type Body = { email: string; password: string; orgName: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  if (!body?.email || !body?.password || !body?.orgName) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const signup = new SignupFlow();

  try {
    const { userId, organizationId } = await signup.execute({
      email: body.email,
      password: body.password,
      orgName: body.orgName,
    });

    const sessions = new SessionService();
    const session = await sessions.createSession({
      userId,
      ttlDays: env.SESSION_TTL_DAYS,
      pepper: env.TOKEN_PEPPER,
    });

    setSessionCookie(session);

    return NextResponse.json({ ok: true, userId, organizationId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signup failed";
    const status = msg.includes("already in use") ? 409 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
