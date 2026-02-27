import { NextResponse } from "next/server";

import { createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { authErrorResponse } from "@/server/auth/auth-error-response";
import { requireUser } from "@/server/auth/require-user";
import { sessionToWire } from "@/server/mappers/auth.mapper";

export async function GET() {
  try {
    const user = await requireUser();
    const sessions = createSessionService();

    const list = await sessions.listActiveSessions(user.userId);

    return NextResponse.json({
      ok: true,
      sessions: list.map(sessionToWire),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
