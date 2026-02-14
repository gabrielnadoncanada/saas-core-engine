import { NextResponse } from "next/server";
import { SessionService } from "@auth-core";
import { env } from "@/server/config/env";
import {
  clearSessionCookie,
  getSessionTokenFromCookie,
} from "@/server/adapters/cookies/session-cookie.adapter";

export async function POST() {
  const token = getSessionTokenFromCookie();

  // Best-effort revoke (cookie may be missing/invalid)
  if (token) {
    const sessions = new SessionService();
    const valid = await sessions.validateSession({
      sessionToken: token,
      pepper: env.TOKEN_PEPPER,
    });
    if (valid) await sessions.revokeSession(valid.sessionId);
  }

  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
