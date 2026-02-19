import { NextResponse } from "next/server";

import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createLoginFlow,
  createSessionService,
} from "@/server/adapters/core/auth-core.adapter";
import { authErrorResponse } from "@/server/auth/auth-error-response";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { env } from "@/server/config/env";
import { withApiTelemetry } from "@/server/telemetry/otel";

type Body = { email: string; password: string };

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/auth/login", async () => {
    try {
      await enforceAuthRateLimit(req, "login");

    const body = (await req.json()) as Body;

    if (!body?.email || !body?.password) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const login = createLoginFlow();
    const res = await login.execute({
      email: body.email,
      password: body.password,
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
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

    await setSessionCookie(session);

      return NextResponse.json({ ok: true });
    } catch (error) {
      return authErrorResponse(error);
    }
  });
}
