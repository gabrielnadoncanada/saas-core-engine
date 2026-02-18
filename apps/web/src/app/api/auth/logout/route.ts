import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  getSessionTokenFromCookie,
} from "@/server/adapters/cookies/session-cookie.adapter";
import { createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/auth/logout", async () => {
    const token = await getSessionTokenFromCookie();

    if (token) {
      const sessions = createSessionService();
      const valid = await sessions.validateSession({ sessionToken: token });
      if (valid) await sessions.revokeSession(valid.sessionId);
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  });
}
