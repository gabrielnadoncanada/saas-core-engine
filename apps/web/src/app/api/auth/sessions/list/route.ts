import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/require-user";
import { createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { authErrorResponse } from "@/server/auth/auth-error-response";

export async function GET() {
  try {
    const user = await requireUser();
    const sessions = createSessionService();

    const list = await sessions.listActiveSessions(user.userId);

    return NextResponse.json({
      ok: true,
      sessions: list.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        lastSeenAt: s.lastSeenAt ? s.lastSeenAt.toISOString() : null,
        expiresAt: s.expiresAt.toISOString(),
        revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
        userAgent: s.userAgent,
        ip: s.ip,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
